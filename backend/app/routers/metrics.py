from fastapi import APIRouter, Depends
from sqlalchemy import func, literal_column
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Coluna, LogActionType, LogAtividade, Tarefa, Usuario
from app.schemas import MetricsOut

router = APIRouter(prefix="/metrics", tags=["metrics"])


HOUR = literal_column("hour")


@router.get("/boards/{board_id}", response_model=MetricsOut)
def get_board_metrics(
    board_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(get_current_user),
):
    avg_by_column = (
        db.query(Coluna.nome, func.avg(func.datediff(HOUR, Tarefa.created_at, Tarefa.updated_at)))
        .join(Tarefa, Tarefa.coluna_id == Coluna.id)
        .filter(Tarefa.quadro_id == board_id)
        .group_by(Coluna.nome)
        .all()
    )
    tempo_medio_por_coluna = [
        {"coluna": nome, "media_horas": float(media or 0)} for nome, media in avg_by_column
    ]

    lead_time = (
        db.query(func.avg(func.datediff(HOUR, Tarefa.created_at, Tarefa.data_conclusao)))
        .filter(Tarefa.quadro_id == board_id, Tarefa.data_conclusao.isnot(None))
        .scalar()
    )

    gargalo = (
        db.query(Coluna.nome, func.count(Tarefa.id).label("qtd"))
        .join(Tarefa, Tarefa.coluna_id == Coluna.id)
        .filter(Tarefa.quadro_id == board_id)
        .group_by(Coluna.nome)
        .order_by(func.count(Tarefa.id).desc())
        .first()
    )

    concluidas = (
        db.query(Usuario.nome, func.count(Tarefa.id))
        .join(Tarefa, Tarefa.responsavel_id == Usuario.id)
        .join(Coluna, Tarefa.coluna_id == Coluna.id)
        .filter(Tarefa.quadro_id == board_id, Coluna.is_done == True)  # noqa: E712
        .group_by(Usuario.nome)
        .order_by(func.count(Tarefa.id).desc())
        .all()
    )

    atrasadas = (
        db.query(Usuario.nome, func.count(Tarefa.id))
        .join(Tarefa, Tarefa.responsavel_id == Usuario.id)
        .filter(Tarefa.quadro_id == board_id, Tarefa.status_prazo == "RED")
        .group_by(Usuario.nome)
        .order_by(func.count(Tarefa.id).desc())
        .all()
    )

    return MetricsOut(
        tempo_medio_por_coluna=tempo_medio_por_coluna,
        lead_time_medio_horas=float(lead_time or 0),
        gargalo_coluna=gargalo[0] if gargalo else None,
        concluidas_por_usuario=[{"usuario": u, "total": t} for u, t in concluidas],
        atrasadas_por_usuario=[{"usuario": u, "total": t} for u, t in atrasadas],
    )


@router.get("/tasks/{task_id}/column-time")
def task_column_time(task_id: int, db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    logs = (
        db.query(LogAtividade)
        .filter(LogAtividade.tarefa_id == task_id, LogAtividade.tipo_acao == LogActionType.MOVE)
        .order_by(LogAtividade.created_at.asc())
        .all()
    )
    return logs
