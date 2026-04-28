from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, EmailStr

from app.models import LogActionType, UserRole


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class LoginRequest(BaseModel):
    email: EmailStr
    senha: str


class UsuarioOut(BaseModel):
    id: int
    nome: str
    email: EmailStr
    avatar_url: Optional[str] = None
    role: UserRole

    class Config:
        from_attributes = True


class TarefaCreate(BaseModel):
    titulo: str
    descricao: Optional[str] = None
    prazo: date
    quadro_id: int
    coluna_id: int
    responsavel_id: Optional[int] = None


class TarefaUpdate(BaseModel):
    titulo: Optional[str] = None
    descricao: Optional[str] = None
    prazo: Optional[date] = None
    responsavel_id: Optional[int] = None


class MoveTaskRequest(BaseModel):
    coluna_id: int
    ordem_coluna: int = 0


class LogAtividadeOut(BaseModel):
    id: int
    tipo_acao: LogActionType
    detalhe: str
    usuario_id: int
    coluna_origem_id: Optional[int] = None
    coluna_destino_id: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class TarefaOut(BaseModel):
    id: int
    titulo: str
    descricao: Optional[str] = None
    prazo: date
    status_prazo: str
    ordem_coluna: int
    data_conclusao: Optional[datetime] = None
    coluna_id: int
    quadro_id: int
    responsavel: Optional[UsuarioOut] = None

    class Config:
        from_attributes = True


class BoardDataOut(BaseModel):
    tarefas: List[TarefaOut]
    logs: List[LogAtividadeOut]


class MetricsOut(BaseModel):
    tempo_medio_por_coluna: list
    lead_time_medio_horas: float
    gargalo_coluna: Optional[str] = None
    concluidas_por_usuario: list
    atrasadas_por_usuario: list
