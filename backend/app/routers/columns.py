from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import require_roles
from app.models import Coluna, UserRole, Usuario

router = APIRouter(prefix="/columns", tags=["columns"])


class ColumnCreate(BaseModel):
    nome: str
    quadro_id: int
    is_done: bool = False
    exige_anexo_para_entrada: bool = False


class ColumnUpdate(BaseModel):
    nome: str | None = None
    is_done: bool | None = None
    exige_anexo_para_entrada: bool | None = None
    ordem: int | None = None


@router.post("")
def create_column(
    payload: ColumnCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles(UserRole.ADMIN)),
):
    ultima_ordem = (
        db.query(Coluna)
        .filter(Coluna.quadro_id == payload.quadro_id)
        .order_by(Coluna.ordem.desc())
        .first()
    )
    nova_ordem = (ultima_ordem.ordem + 1) if ultima_ordem else 0
    col = Coluna(
        nome=payload.nome,
        quadro_id=payload.quadro_id,
        is_done=payload.is_done,
        exige_anexo_para_entrada=payload.exige_anexo_para_entrada,
        ordem=nova_ordem,
    )
    db.add(col)
    db.commit()
    db.refresh(col)
    return col


@router.patch("/{column_id}")
def update_column(
    column_id: int,
    payload: ColumnUpdate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles(UserRole.ADMIN)),
):
    col = db.query(Coluna).filter(Coluna.id == column_id).first()
    if not col:
        raise HTTPException(404, "Coluna não encontrada")
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(col, field, value)
    db.commit()
    db.refresh(col)
    return col


@router.delete("/{column_id}")
def delete_column(
    column_id: int,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles(UserRole.ADMIN)),
):
    col = db.query(Coluna).filter(Coluna.id == column_id).first()
    if not col:
        raise HTTPException(404, "Coluna não encontrada")
    if col.tarefas:
        raise HTTPException(422, "Não é possível remover uma coluna com tarefas. Mova-as antes.")
    db.delete(col)
    db.commit()
    return {"ok": True}
