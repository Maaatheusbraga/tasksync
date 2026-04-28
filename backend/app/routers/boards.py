from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session, joinedload

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import Coluna, LogAtividade, Quadro, Tarefa, UserRole, Usuario
from app.services import calcular_status_prazo

router = APIRouter(prefix="/boards", tags=["boards"])


class BoardCreate(BaseModel):
    nome: str
    setor_id: int


class BoardUpdate(BaseModel):
    nome: str


@router.get("")
def list_boards(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return db.query(Quadro).all()


@router.post("")
def create_board(
    payload: BoardCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(require_roles(UserRole.ADMIN)),
):
    board = Quadro(nome=payload.nome, setor_id=payload.setor_id, created_by=user.id)
    db.add(board)
    db.commit()
    db.refresh(board)
    return board


@router.patch("/{board_id}")
def rename_board(
    board_id: int,
    payload: BoardUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles(UserRole.ADMIN)),
):
    board = db.query(Quadro).filter(Quadro.id == board_id).first()
    if not board:
        raise HTTPException(404, "Quadro não encontrado")
    board.nome = payload.nome.strip()
    db.commit()
    db.refresh(board)
    return board


@router.get("/{board_id}")
def get_board_data(
    board_id: int,
    only_me: bool = False,
    q: str | None = None,
    prazo_status: str | None = None,
    setor_id: str | None = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    quadro = db.query(Quadro).filter(Quadro.id == board_id).first()
    if not quadro:
        raise HTTPException(404, "Quadro não encontrado")

    setor_id_int = None
    if setor_id and str(setor_id).strip():
        try:
            setor_id_int = int(setor_id)
        except (TypeError, ValueError):
            setor_id_int = None
    if q is not None and not q.strip():
        q = None
    if prazo_status is not None and not prazo_status.strip():
        prazo_status = None

    colunas = (
        db.query(Coluna)
        .filter(Coluna.quadro_id == board_id)
        .order_by(Coluna.ordem.asc())
        .all()
    )

    query = (
        db.query(Tarefa)
        .options(joinedload(Tarefa.responsavel))
        .filter(Tarefa.quadro_id == board_id)
    )

    if only_me:
        query = query.filter(Tarefa.responsavel_id == user.id)
    if q:
        term = f"%{q}%"
        query = query.filter(Tarefa.titulo.ilike(term))
    if prazo_status:
        query = query.filter(Tarefa.status_prazo == prazo_status.upper())
    if setor_id_int:
        query = query.join(Tarefa.responsavel).filter(Usuario.setor_id == setor_id_int)

    tarefas = query.all()
    for t in tarefas:
        t.status_prazo = calcular_status_prazo(t.prazo)

    logs = (
        db.query(LogAtividade)
        .join(Tarefa, Tarefa.id == LogAtividade.tarefa_id)
        .filter(Tarefa.quadro_id == board_id)
        .order_by(LogAtividade.created_at.desc())
        .limit(300)
        .all()
    )
    db.commit()

    return {
        "quadro": {"id": quadro.id, "nome": quadro.nome, "setor_id": quadro.setor_id},
        "colunas": [
            {
                "id": c.id,
                "nome": c.nome,
                "ordem": c.ordem,
                "is_done": c.is_done,
                "exige_anexo_para_entrada": c.exige_anexo_para_entrada,
            }
            for c in colunas
        ],
        "tarefas": [
            {
                "id": t.id,
                "titulo": t.titulo,
                "descricao": t.descricao,
                "prazo": t.prazo.isoformat(),
                "status_prazo": t.status_prazo,
                "ordem_coluna": t.ordem_coluna,
                "data_conclusao": t.data_conclusao.isoformat() if t.data_conclusao else None,
                "coluna_id": t.coluna_id,
                "quadro_id": t.quadro_id,
                "responsavel": (
                    {
                        "id": t.responsavel.id,
                        "nome": t.responsavel.nome,
                        "email": t.responsavel.email,
                        "avatar_url": t.responsavel.avatar_url,
                        "role": t.responsavel.role.value,
                    }
                    if t.responsavel
                    else None
                ),
            }
            for t in tarefas
        ],
        "logs": [
            {
                "id": log.id,
                "tipo_acao": log.tipo_acao.value,
                "detalhe": log.detalhe,
                "usuario_id": log.usuario_id,
                "coluna_origem_id": log.coluna_origem_id,
                "coluna_destino_id": log.coluna_destino_id,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ],
    }
