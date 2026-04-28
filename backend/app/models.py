import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    Column,
    Date,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    EDITOR = "EDITOR"
    VIEWER = "VIEWER"


class LogActionType(str, enum.Enum):
    MOVE = "MOVE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    CREATE = "CREATE"


class Setor(Base):
    __tablename__ = "setores"
    id = Column(Integer, primary_key=True)
    nome = Column(String(100), unique=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class Usuario(Base):
    __tablename__ = "usuarios"
    id = Column(Integer, primary_key=True)
    nome = Column(String(120), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    senha_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(255), nullable=True)
    role = Column(Enum(UserRole), default=UserRole.VIEWER, nullable=False)
    setor_id = Column(Integer, ForeignKey("setores.id"), nullable=True)
    ativo = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    setor = relationship("Setor")


class Quadro(Base):
    __tablename__ = "quadros"
    id = Column(Integer, primary_key=True)
    nome = Column(String(120), nullable=False)
    setor_id = Column(Integer, ForeignKey("setores.id"), nullable=False)
    created_by = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    setor = relationship("Setor")
    colunas = relationship("Coluna", back_populates="quadro", cascade="all, delete-orphan")


class Coluna(Base):
    __tablename__ = "colunas"
    id = Column(Integer, primary_key=True)
    nome = Column(String(100), nullable=False)
    ordem = Column(Integer, nullable=False)
    is_done = Column(Boolean, default=False, nullable=False)
    exige_anexo_para_entrada = Column(Boolean, default=False, nullable=False)
    quadro_id = Column(Integer, ForeignKey("quadros.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)

    quadro = relationship("Quadro", back_populates="colunas")
    tarefas = relationship("Tarefa", back_populates="coluna")


class Tarefa(Base):
    __tablename__ = "tarefas"
    id = Column(Integer, primary_key=True)
    titulo = Column(String(200), nullable=False)
    descricao = Column(Text, nullable=True)
    prazo = Column(Date, nullable=False)
    status_prazo = Column(String(20), nullable=False, default="GREEN")
    ordem_coluna = Column(Integer, default=0, nullable=False)
    data_conclusao = Column(DateTime, nullable=True)
    quadro_id = Column(Integer, ForeignKey("quadros.id"), nullable=False)
    coluna_id = Column(Integer, ForeignKey("colunas.id"), nullable=False)
    responsavel_id = Column(Integer, ForeignKey("usuarios.id"), nullable=True)
    created_by = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now, nullable=False)

    coluna = relationship("Coluna", back_populates="tarefas")
    responsavel = relationship("Usuario", foreign_keys=[responsavel_id])


class Subtarefa(Base):
    __tablename__ = "subtarefas"
    id = Column(Integer, primary_key=True)
    titulo = Column(String(200), nullable=False)
    concluida = Column(Boolean, default=False, nullable=False)
    tarefa_id = Column(Integer, ForeignKey("tarefas.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class Anexo(Base):
    __tablename__ = "anexos"
    id = Column(Integer, primary_key=True)
    nome_arquivo = Column(String(255), nullable=False)
    caminho_arquivo = Column(String(500), nullable=False)
    tarefa_id = Column(Integer, ForeignKey("tarefas.id"), nullable=False)
    uploaded_by = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class Comentario(Base):
    __tablename__ = "comentarios"
    id = Column(Integer, primary_key=True)
    conteudo = Column(Text, nullable=False)
    tarefa_id = Column(Integer, ForeignKey("tarefas.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class LogAtividade(Base):
    __tablename__ = "logs_atividade"
    id = Column(Integer, primary_key=True)
    tarefa_id = Column(Integer, ForeignKey("tarefas.id"), nullable=False)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    tipo_acao = Column(Enum(LogActionType), nullable=False)
    detalhe = Column(Text, nullable=False)
    coluna_origem_id = Column(Integer, ForeignKey("colunas.id"), nullable=True)
    coluna_destino_id = Column(Integer, ForeignKey("colunas.id"), nullable=True)
    created_at = Column(DateTime, default=utc_now, nullable=False)


class Notificacao(Base):
    __tablename__ = "notificacoes"
    id = Column(Integer, primary_key=True)
    usuario_id = Column(Integer, ForeignKey("usuarios.id"), nullable=False)
    mensagem = Column(String(255), nullable=False)
    lida = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utc_now, nullable=False)
