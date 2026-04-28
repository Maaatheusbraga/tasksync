# TaskSync - Kanban Corporativo

Aplicação interna para execução com accountability e rastreabilidade total.

## Stack

- Frontend: React + Zustand + dnd-kit
- Backend: FastAPI + SQLAlchemy
- Banco: SQL Server
- Upload: filesystem local

## Estrutura

- `backend/app`: API e regras de negócio
- `backend/sql/schema.sql`: script SQL relacional
- `frontend/src`: interface Kanban + dashboard

## Regras de negócio implementadas

- Responsável único obrigatório por tarefa.
- Status de prazo automático (`GREEN`, `YELLOW`, `RED`).
- Tarefas atrasadas priorizadas no topo da coluna.
- Bloqueio para mover para coluna final:
  - subtarefas em aberto
  - anexo obrigatório não enviado (por coluna)
- Auditoria completa:
  - movimentação de coluna
  - troca de responsável
  - alteração de prazo
- Notificações internas:
  - tarefa atribuída
  - comentário adicionado
  - alerta D-1
- Métricas operacionais:
  - tempo médio por coluna
  - lead time
  - gargalo
  - ranking de concluídas/atrasadas por usuário

## Executar backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Swagger: `http://localhost:8000/docs`

## Executar frontend

```bash
cd frontend
npm install
npm run dev
```

App: `http://localhost:5173`

## SQL Server

1. Ajuste a string de conexão em `backend/app/config.py` ou via `.env`.
2. Rode `backend/sql/schema.sql` no SQL Server.
