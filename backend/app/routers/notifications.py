from datetime import date, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user
from app.models import Notificacao, Tarefa, Usuario
from app.services import notificar

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("")
def list_notifications(
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    return (
        db.query(Notificacao)
        .filter(Notificacao.usuario_id == user.id)
        .order_by(Notificacao.created_at.desc())
        .limit(100)
        .all()
    )


@router.post("/schedule-d1")
def schedule_due_soon_alerts(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    tomorrow = date.today() + timedelta(days=1)
    tasks = db.query(Tarefa).filter(Tarefa.prazo == tomorrow).all()
    for task in tasks:
        notificar(db, task.responsavel_id, f"Tarefa vence amanhã (D-1): {task.titulo}")
    db.commit()
    return {"alerts_created": len(tasks)}
