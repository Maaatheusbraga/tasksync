from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

from app.database import get_db
from app.deps import get_current_user, require_roles
from app.models import Setor, UserRole, Usuario
from app.security import hash_senha

router = APIRouter(prefix="/users", tags=["users"])


class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    senha: str
    role: UserRole = UserRole.VIEWER
    setor_id: int | None = None
    avatar_url: str | None = None


@router.get("")
def list_users(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return [
        {
            "id": u.id,
            "nome": u.nome,
            "email": u.email,
            "role": u.role.value,
            "avatar_url": u.avatar_url,
            "setor_id": u.setor_id,
        }
        for u in db.query(Usuario).filter(Usuario.ativo == True).all()  # noqa: E712
    ]


@router.get("/me")
def me(user: Usuario = Depends(get_current_user)):
    return {
        "id": user.id,
        "nome": user.nome,
        "email": user.email,
        "role": user.role.value,
        "avatar_url": user.avatar_url,
        "setor_id": user.setor_id,
    }


@router.post("")
def create_user(
    payload: UserCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles(UserRole.ADMIN)),
):
    if db.query(Usuario).filter(Usuario.email == payload.email).first():
        raise HTTPException(409, "E-mail já cadastrado")
    if payload.setor_id and not db.query(Setor).filter(Setor.id == payload.setor_id).first():
        raise HTTPException(404, "Setor não encontrado")

    novo = Usuario(
        nome=payload.nome,
        email=payload.email,
        senha_hash=hash_senha(payload.senha),
        role=payload.role,
        setor_id=payload.setor_id,
        avatar_url=payload.avatar_url,
        ativo=True,
    )
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return {"id": novo.id, "email": novo.email, "role": novo.role.value}


class SetorCreate(BaseModel):
    nome: str


@router.get("/setores/list")
def list_setores(db: Session = Depends(get_db), _user: Usuario = Depends(get_current_user)):
    return db.query(Setor).all()


@router.post("/setores/create")
def create_setor(
    payload: SetorCreate,
    db: Session = Depends(get_db),
    _user: Usuario = Depends(require_roles(UserRole.ADMIN)),
):
    if db.query(Setor).filter(Setor.nome == payload.nome).first():
        raise HTTPException(409, "Setor já existe")
    novo = Setor(nome=payload.nome)
    db.add(novo)
    db.commit()
    db.refresh(novo)
    return novo
