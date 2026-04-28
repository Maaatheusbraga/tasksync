from datetime import date, datetime, timezone

from sqlalchemy.orm import Session

from app.models import (
    Coluna,
    LogActionType,
    LogAtividade,
    Notificacao,
    Subtarefa,
    Tarefa,
)


def calcular_status_prazo(prazo: date) -> str:
    hoje = date.today()
    if prazo < hoje:
        return "RED"
    if prazo == hoje:
        return "YELLOW"
    return "GREEN"


def registrar_log(
    db: Session,
    *,
    tarefa_id: int,
    usuario_id: int,
    tipo_acao: LogActionType,
    detalhe: str,
    coluna_origem_id: int | None = None,
    coluna_destino_id: int | None = None,
):
    db.add(
        LogAtividade(
            tarefa_id=tarefa_id,
            usuario_id=usuario_id,
            tipo_acao=tipo_acao,
            detalhe=detalhe,
            coluna_origem_id=coluna_origem_id,
            coluna_destino_id=coluna_destino_id,
        )
    )


def notificar(db: Session, usuario_id: int, mensagem: str):
    db.add(Notificacao(usuario_id=usuario_id, mensagem=mensagem))


def validar_conclusao(db: Session, tarefa: Tarefa, coluna_atual: Coluna | None = None):
    subtarefas_abertas = (
        db.query(Subtarefa)
        .filter(Subtarefa.tarefa_id == tarefa.id, Subtarefa.concluida == False)  # noqa: E712
        .count()
    )
    if subtarefas_abertas > 0:
        raise ValueError("Não é possível concluir: há subtarefas em aberto.")

    if coluna_atual and coluna_atual.exige_anexo_para_entrada:
        from app.models import Anexo

        anexos = db.query(Anexo).filter(Anexo.tarefa_id == tarefa.id).count()
        if anexos == 0:
            raise ValueError("Não é possível concluir: anexo obrigatório não enviado.")


def validar_movimento_para_coluna(db: Session, tarefa: Tarefa, coluna_destino: Coluna):
    if not coluna_destino.is_done:
        return
    validar_conclusao(db, tarefa, coluna_destino)


def aplicar_regra_prioridade_atrasados(db: Session, coluna_id: int):
    tarefas = db.query(Tarefa).filter(Tarefa.coluna_id == coluna_id).all()
    atrasadas = [t for t in tarefas if calcular_status_prazo(t.prazo) == "RED"]
    outras = [t for t in tarefas if calcular_status_prazo(t.prazo) != "RED"]

    ordenadas = sorted(atrasadas, key=lambda t: t.prazo) + sorted(
        outras, key=lambda t: t.ordem_coluna
    )
    for idx, t in enumerate(ordenadas):
        t.ordem_coluna = idx
        t.status_prazo = calcular_status_prazo(t.prazo)


def set_data_conclusao(tarefa: Tarefa, coluna_destino: Coluna):
    if coluna_destino.is_done:
        tarefa.data_conclusao = datetime.now(timezone.utc)
    else:
        tarefa.data_conclusao = None
