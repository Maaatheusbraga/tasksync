from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import UserRole, Usuario
from app.security import decode_token

auth_scheme = HTTPBearer(auto_error=True)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(auth_scheme),
    db: Session = Depends(get_db),
) -> Usuario:
    payload = decode_token(credentials.credentials)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Token inválido")

    user = db.query(Usuario).filter(Usuario.id == int(payload["sub"]), Usuario.ativo == True).first()  # noqa: E712
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuário não encontrado")
    return user


def require_roles(*roles: UserRole):
    def _checker(user: Usuario = Depends(get_current_user)):
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="Permissão insuficiente")
        return user

    return _checker
