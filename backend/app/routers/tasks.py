import os
import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import FileResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import (
    Anexo,
    Coluna,
    Comentario,
    LogActionType,
    LogAtividade,
    Subtarefa,
    Tarefa,
    UserRole,
    Usuario,
)
from app.schemas import MoveTaskRequest, TarefaCreate, TarefaOut, TarefaUpdate
from app.services import (
    calcular_status_prazo,
    notificar,
    registrar_log,
    set_data_conclusao,
    validar_conclusao,
    validar_movimento_para_coluna,
)

router = APIRouter(prefix="/tasks", tags=["tasks"])
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("", response_model=TarefaOut)
def create_task(
    payload: TarefaCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    task = Tarefa(
        titulo=payload.titulo,
        descricao=payload.descricao,
        prazo=payload.prazo,
        status_prazo=calcular_status_prazo(payload.prazo),
        quadro_id=payload.quadro_id,
        coluna_id=payload.coluna_id,
        responsavel_id=payload.responsavel_id,
        created_by=user.id,
    )
    db.add(task)
    db.flush()
    registrar_log(
        db,
        tarefa_id=task.id,
        usuario_id=user.id,
        tipo_acao=LogActionType.CREATE,
        detalhe="Tarefa criada",
    )
    if task.responsavel_id:
        notificar(db, task.responsavel_id, f"Nova tarefa atribuída: {task.titulo}")
    db.commit()
    db.refresh(task)
    return task


@router.patch("/{task_id}", response_model=TarefaOut)
def update_task(
    task_id: int,
    payload: TarefaUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")

    if payload.titulo is not None:
        task.titulo = payload.titulo
    if payload.descricao is not None:
        task.descricao = payload.descricao
    if payload.prazo is not None:
        task.prazo = payload.prazo
        task.status_prazo = calcular_status_prazo(payload.prazo)
        registrar_log(
            db,
            tarefa_id=task.id,
            usuario_id=user.id,
            tipo_acao=LogActionType.UPDATE,
            detalhe=f"Prazo alterado para {payload.prazo}",
        )
    if payload.responsavel_id is not None and payload.responsavel_id != task.responsavel_id:
        antigo = task.responsavel_id
        task.responsavel_id = payload.responsavel_id
        registrar_log(
            db,
            tarefa_id=task.id,
            usuario_id=user.id,
            tipo_acao=LogActionType.UPDATE,
            detalhe=f"Responsável alterado de {antigo} para {payload.responsavel_id}",
        )
        notificar(db, payload.responsavel_id, f"Você agora é responsável por: {task.titulo}")

    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/move", response_model=TarefaOut)
def move_task(
    task_id: int,
    payload: MoveTaskRequest,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")
    col_destino = db.query(Coluna).filter(Coluna.id == payload.coluna_id).first()
    if not col_destino:
        raise HTTPException(404, "Coluna destino não encontrada")

    try:
        validar_movimento_para_coluna(db, task, col_destino)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    origem = task.coluna_id
    origem_ordem = task.ordem_coluna

    # Remove a tarefa da coluna de origem (se mudou de coluna) e compacta a ordem
    if origem != payload.coluna_id:
        origem_tasks = (
            db.query(Tarefa)
            .filter(Tarefa.coluna_id == origem, Tarefa.id != task.id)
            .order_by(Tarefa.ordem_coluna.asc(), Tarefa.id.asc())
            .all()
        )
        for idx, t in enumerate(origem_tasks):
            t.ordem_coluna = idx

    # Lista de destino sem a tarefa atual para inserção por índice
    destino_tasks = (
        db.query(Tarefa)
        .filter(Tarefa.coluna_id == payload.coluna_id, Tarefa.id != task.id)
        .order_by(Tarefa.ordem_coluna.asc(), Tarefa.id.asc())
        .all()
    )

    insert_at = max(0, min(payload.ordem_coluna, len(destino_tasks)))

    task.coluna_id = payload.coluna_id
    task.ordem_coluna = insert_at
    task.status_prazo = calcular_status_prazo(task.prazo)
    set_data_conclusao(task, col_destino)

    destino_tasks.insert(insert_at, task)
    for idx, t in enumerate(destino_tasks):
        t.ordem_coluna = idx

    registrar_log(
        db,
        tarefa_id=task.id,
        usuario_id=user.id,
        tipo_acao=LogActionType.MOVE,
        detalhe=(
            f"Movimentação de tarefa (ordem {origem_ordem} → {insert_at})"
            if origem == payload.coluna_id
            else "Movimentação de tarefa"
        ),
        coluna_origem_id=origem,
        coluna_destino_id=payload.coluna_id,
    )
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/complete", response_model=TarefaOut)
def complete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    from datetime import datetime, timezone

    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")

    coluna = db.query(Coluna).filter(Coluna.id == task.coluna_id).first()
    try:
        validar_conclusao(db, task, coluna)
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    if task.data_conclusao is not None:
        return task

    task.data_conclusao = datetime.now(timezone.utc)
    coluna_done = (
        db.query(Coluna)
        .filter(Coluna.quadro_id == task.quadro_id, Coluna.is_done == True)  # noqa: E712
        .order_by(Coluna.ordem.asc())
        .first()
    )
    if coluna_done and task.coluna_id != coluna_done.id:
        origem = task.coluna_id
        task.coluna_id = coluna_done.id
        registrar_log(
            db,
            tarefa_id=task.id,
            usuario_id=user.id,
            tipo_acao=LogActionType.MOVE,
            detalhe="Tarefa concluída — movida para coluna de conclusão",
            coluna_origem_id=origem,
            coluna_destino_id=coluna_done.id,
        )

    registrar_log(
        db,
        tarefa_id=task.id,
        usuario_id=user.id,
        tipo_acao=LogActionType.UPDATE,
        detalhe="Tarefa marcada como concluída",
    )
    if task.responsavel_id:
        notificar(db, task.responsavel_id, f"Tarefa concluída: {task.titulo}")
    db.commit()
    db.refresh(task)
    return task


@router.post("/{task_id}/uncomplete", response_model=TarefaOut)
def uncomplete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")
    if task.data_conclusao is None:
        return task

    task.data_conclusao = None
    registrar_log(
        db,
        tarefa_id=task.id,
        usuario_id=user.id,
        tipo_acao=LogActionType.UPDATE,
        detalhe="Tarefa reaberta",
    )
    db.commit()
    db.refresh(task)
    return task


@router.delete("/{task_id}")
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")
    db.query(LogAtividade).filter(LogAtividade.tarefa_id == task_id).delete()
    db.query(Anexo).filter(Anexo.tarefa_id == task_id).delete()
    db.query(Comentario).filter(Comentario.tarefa_id == task_id).delete()
    db.query(Subtarefa).filter(Subtarefa.tarefa_id == task_id).delete()
    db.delete(task)
    db.commit()
    return {"ok": True}


@router.get("/{task_id}/timeline")
def task_timeline(
    task_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    return (
        db.query(LogAtividade)
        .filter(LogAtividade.tarefa_id == task_id)
        .order_by(LogAtividade.created_at.desc())
        .all()
    )


# ============================================================================
# SUBTAREFAS
# ============================================================================
class SubtaskCreate(BaseModel):
    titulo: str


class SubtaskUpdate(BaseModel):
    titulo: str | None = None
    concluida: bool | None = None


def _subtask_to_dict(s: Subtarefa) -> dict:
    return {
        "id": s.id,
        "titulo": s.titulo,
        "concluida": bool(s.concluida),
        "tarefa_id": s.tarefa_id,
        "created_at": s.created_at.isoformat() if s.created_at else None,
    }


@router.get("/{task_id}/subtasks")
def list_subtasks(
    task_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    rows = (
        db.query(Subtarefa)
        .filter(Subtarefa.tarefa_id == task_id)
        .order_by(Subtarefa.id.asc())
        .all()
    )
    return [_subtask_to_dict(s) for s in rows]


@router.post("/{task_id}/subtasks")
def create_subtask(
    task_id: int,
    payload: SubtaskCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")
    sub = Subtarefa(titulo=payload.titulo.strip(), tarefa_id=task_id)
    db.add(sub)
    registrar_log(
        db,
        tarefa_id=task_id,
        usuario_id=user.id,
        tipo_acao=LogActionType.UPDATE,
        detalhe=f"Subtarefa criada: {payload.titulo[:80]}",
    )
    db.commit()
    db.refresh(sub)
    return _subtask_to_dict(sub)


@router.patch("/subtasks/{subtask_id}")
def update_subtask(
    subtask_id: int,
    payload: SubtaskUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    sub = db.query(Subtarefa).filter(Subtarefa.id == subtask_id).first()
    if not sub:
        raise HTTPException(404, "Subtarefa não encontrada")
    if payload.titulo is not None:
        sub.titulo = payload.titulo.strip()
    if payload.concluida is not None and payload.concluida != sub.concluida:
        sub.concluida = payload.concluida
        registrar_log(
            db,
            tarefa_id=sub.tarefa_id,
            usuario_id=user.id,
            tipo_acao=LogActionType.UPDATE,
            detalhe=("Subtarefa concluída: " if payload.concluida else "Subtarefa reaberta: ")
            + sub.titulo[:80],
        )
    db.commit()
    db.refresh(sub)
    return _subtask_to_dict(sub)


@router.delete("/subtasks/{subtask_id}")
def delete_subtask(
    subtask_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    sub = db.query(Subtarefa).filter(Subtarefa.id == subtask_id).first()
    if not sub:
        raise HTTPException(404, "Subtarefa não encontrada")
    titulo = sub.titulo
    tarefa_id = sub.tarefa_id
    db.delete(sub)
    registrar_log(
        db,
        tarefa_id=tarefa_id,
        usuario_id=user.id,
        tipo_acao=LogActionType.UPDATE,
        detalhe=f"Subtarefa removida: {titulo[:80]}",
    )
    db.commit()
    return {"ok": True}


# ============================================================================
# COMENTÁRIOS
# ============================================================================
class CommentCreate(BaseModel):
    conteudo: str


@router.get("/{task_id}/comments")
def list_comments(
    task_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    rows = (
        db.query(Comentario, Usuario)
        .join(Usuario, Usuario.id == Comentario.usuario_id)
        .filter(Comentario.tarefa_id == task_id)
        .order_by(Comentario.created_at.desc())
        .all()
    )
    return [
        {
            "id": c.id,
            "conteudo": c.conteudo,
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "usuario": {"id": u.id, "nome": u.nome, "avatar_url": u.avatar_url},
        }
        for c, u in rows
    ]


@router.post("/{task_id}/comments")
def add_comment(
    task_id: int,
    payload: CommentCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")
    conteudo = payload.conteudo.strip()
    if not conteudo:
        raise HTTPException(422, "Comentário vazio.")
    comentario = Comentario(conteudo=conteudo, tarefa_id=task_id, usuario_id=user.id)
    db.add(comentario)
    registrar_log(
        db,
        tarefa_id=task_id,
        usuario_id=user.id,
        tipo_acao=LogActionType.UPDATE,
        detalhe=f"Comentário adicionado: {conteudo[:80]}",
    )
    if task.responsavel_id and task.responsavel_id != user.id:
        notificar(db, task.responsavel_id, f"Novo comentário em: {task.titulo}")
    db.commit()
    db.refresh(comentario)
    return {
        "id": comentario.id,
        "conteudo": comentario.conteudo,
        "created_at": comentario.created_at.isoformat(),
        "usuario": {"id": user.id, "nome": user.nome, "avatar_url": user.avatar_url},
    }


@router.delete("/comments/{comment_id}")
def delete_comment(
    comment_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    c = db.query(Comentario).filter(Comentario.id == comment_id).first()
    if not c:
        raise HTTPException(404, "Comentário não encontrado")
    if user.role != UserRole.ADMIN and c.usuario_id != user.id:
        raise HTTPException(403, "Sem permissão para excluir este comentário.")
    db.delete(c)
    db.commit()
    return {"ok": True}


# ============================================================================
# ANEXOS
# ============================================================================
@router.get("/{task_id}/attachments")
def list_attachments(
    task_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    rows = (
        db.query(Anexo, Usuario)
        .join(Usuario, Usuario.id == Anexo.uploaded_by)
        .filter(Anexo.tarefa_id == task_id)
        .order_by(Anexo.created_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "nome_arquivo": a.nome_arquivo,
            "tamanho": (
                os.path.getsize(a.caminho_arquivo)
                if os.path.exists(a.caminho_arquivo)
                else 0
            ),
            "created_at": a.created_at.isoformat() if a.created_at else None,
            "uploaded_by": {"id": u.id, "nome": u.nome},
        }
        for a, u in rows
    ]


@router.post("/{task_id}/attachments")
def upload_attachment(
    task_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    task = db.query(Tarefa).filter(Tarefa.id == task_id).first()
    if not task:
        raise HTTPException(404, "Tarefa não encontrada")
    ext = os.path.splitext(file.filename or "")[1]
    filename = f"{uuid.uuid4().hex}{ext}"
    target = UPLOAD_DIR / filename
    with target.open("wb") as out:
        out.write(file.file.read())

    anexo = Anexo(
        nome_arquivo=file.filename or filename,
        caminho_arquivo=str(target),
        tarefa_id=task_id,
        uploaded_by=user.id,
    )
    db.add(anexo)
    registrar_log(
        db,
        tarefa_id=task_id,
        usuario_id=user.id,
        tipo_acao=LogActionType.UPDATE,
        detalhe=f"Anexo enviado: {anexo.nome_arquivo[:80]}",
    )
    db.commit()
    db.refresh(anexo)
    return {
        "id": anexo.id,
        "nome_arquivo": anexo.nome_arquivo,
        "tamanho": os.path.getsize(target),
        "created_at": anexo.created_at.isoformat(),
        "uploaded_by": {"id": user.id, "nome": user.nome},
    }


@router.get("/attachments/{attachment_id}/download")
def download_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    anexo = db.query(Anexo).filter(Anexo.id == attachment_id).first()
    if not anexo:
        raise HTTPException(404, "Anexo não encontrado")
    if not os.path.exists(anexo.caminho_arquivo):
        raise HTTPException(404, "Arquivo físico não encontrado no servidor.")
    return FileResponse(
        path=anexo.caminho_arquivo,
        filename=anexo.nome_arquivo,
        media_type="application/octet-stream",
    )


@router.delete("/attachments/{attachment_id}")
def delete_attachment(
    attachment_id: int,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN, UserRole.EDITOR)),
):
    anexo = db.query(Anexo).filter(Anexo.id == attachment_id).first()
    if not anexo:
        raise HTTPException(404, "Anexo não encontrado")
    if user.role != UserRole.ADMIN and anexo.uploaded_by != user.id:
        raise HTTPException(403, "Sem permissão para excluir este anexo.")
    try:
        if os.path.exists(anexo.caminho_arquivo):
            os.remove(anexo.caminho_arquivo)
    except OSError:
        pass
    nome = anexo.nome_arquivo
    tarefa_id = anexo.tarefa_id
    db.delete(anexo)
    registrar_log(
        db,
        tarefa_id=tarefa_id,
        usuario_id=user.id,
        tipo_acao=LogActionType.UPDATE,
        detalhe=f"Anexo removido: {nome[:80]}",
    )
    db.commit()
    return {"ok": True}
