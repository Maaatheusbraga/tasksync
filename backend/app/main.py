from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import Base, engine
from app.routers import (
    auth,
    boards,
    columns,
    metrics,
    notifications,
    setup,
    tasks,
    users,
)

try:
    Base.metadata.create_all(bind=engine)
    with engine.begin() as conn:
        col = conn.execute(
            text(
                """
                SELECT is_nullable
                FROM sys.columns
                WHERE object_id = OBJECT_ID('tarefas') AND name = 'responsavel_id'
                """
            )
        ).scalar()
        if col == 0:
            conn.execute(text("ALTER TABLE tarefas ALTER COLUMN responsavel_id INT NULL"))
except Exception as exc:  # noqa: BLE001
    print(
        "[startup] Aviso: nao foi possivel conectar ao banco agora.\n"
        f"[startup] Detalhe: {exc}\n"
        "[startup] Configure backend/.env (DATABASE_URL) e o servidor seguira no ar."
    )

app = FastAPI(title=settings.app_name, version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(setup.router)
app.include_router(users.router)
app.include_router(boards.router)
app.include_router(columns.router)
app.include_router(tasks.router)
app.include_router(metrics.router)
app.include_router(notifications.router)


@app.get("/health")
def health():
    return {"status": "ok"}
