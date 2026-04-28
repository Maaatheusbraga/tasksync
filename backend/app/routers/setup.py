from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Coluna, Quadro, Setor, UserRole, Usuario
from app.security import hash_senha

router = APIRouter(prefix="/setup", tags=["setup"])


@router.post("/bootstrap")
def bootstrap(db: Session = Depends(get_db)):
    """Cria admin padrão, setor, quadro e colunas iniciais se não existirem.

    Idempotente: pode ser chamado várias vezes sem efeito colateral.
    """
    created = {"admin": False, "setor": False, "quadro": False, "colunas": 0}

    setor = db.query(Setor).filter(Setor.nome == "Geral").first()
    if not setor:
        setor = Setor(nome="Geral")
        db.add(setor)
        db.flush()
        created["setor"] = True

    admin = db.query(Usuario).filter(Usuario.email == "admin@tasksync.com").first()
    if not admin:
        admin = Usuario(
            nome="Administrador",
            email="admin@tasksync.com",
            senha_hash=hash_senha("admin123"),
            role=UserRole.ADMIN,
            setor_id=setor.id,
            ativo=True,
        )
        db.add(admin)
        db.flush()
        created["admin"] = True

    quadro = db.query(Quadro).first()
    if not quadro:
        quadro = Quadro(nome="Quadro Principal", setor_id=setor.id, created_by=admin.id)
        db.add(quadro)
        db.flush()
        created["quadro"] = True

        colunas_padrao = [
            ("Backlog", 0, False),
            ("Em Execução", 1, False),
            ("Validação", 2, False),
            ("Concluído", 3, True),
        ]
        for nome, ordem, is_done in colunas_padrao:
            db.add(Coluna(nome=nome, ordem=ordem, is_done=is_done, quadro_id=quadro.id))
            created["colunas"] += 1

    db.commit()
    return {
        "ok": True,
        "created": created,
        "credentials": {
            "email": "admin@tasksync.com",
            "senha": "admin123",
            "obs": "Troque a senha em produção.",
        },
        "default_board_id": quadro.id,
    }
