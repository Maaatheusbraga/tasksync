from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Usuario
from app.schemas import LoginRequest, Token
from app.security import criar_token, verify_senha

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == payload.email, Usuario.ativo == True).first()  # noqa: E712
    if not user or not verify_senha(payload.senha, user.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = criar_token({"sub": str(user.id), "role": user.role.value})
    return Token(access_token=token)
