import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useState } from "react";
import ConfirmModal from "./ConfirmModal";
import TaskCard from "./TaskCard";

export default function Column({
  column,
  tasks,
  onOpenTask,
  isAdmin,
  isActiveTarget,
  isOriginColumn,
  onRename,
  onDelete,
  onAddTask
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(column.nome);
  const [askDelete, setAskDelete] = useState(false);

  const { setNodeRef } = useDroppable({
    id: `col-${column.id}`,
    data: { columnId: column.id }
  });

  const commitRename = () => {
    setEditing(false);
    if (name.trim() && name !== column.nome) {
      onRename(column.id, name.trim());
    } else {
      setName(column.nome);
    }
  };

  const handleDelete = () => {
    setAskDelete(true);
  };

  const confirmDelete = () => {
    setAskDelete(false);
    onDelete(column.id);
  };

  return (
    <>
      <section
        ref={setNodeRef}
        className={`column ${isActiveTarget ? "is-active-target" : ""} ${isOriginColumn ? "is-origin" : ""}`}
      >
        <div className="column-header">
        <div className="title">
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setName(column.nome);
                  setEditing(false);
                }
              }}
            />
          ) : (
            <span
              className="col-title-text"
              onClick={() => isAdmin && setEditing(true)}
              title={isAdmin ? "Clique para renomear" : ""}
            >
              {column.nome}
            </span>
          )}
        </div>
        <span className="col-count">{tasks.length}</span>
        {isAdmin && (
          <>
            <button
              className="icon-btn"
              title="Adicionar tarefa"
              onClick={() => onAddTask(column.id)}
            >
              +
            </button>
            <button
              className="icon-btn icon-danger"
              title="Excluir coluna"
              onClick={handleDelete}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
              </svg>
            </button>
          </>
        )}
        </div>

        <SortableContext
          items={tasks.map((task) => `task-${task.id}`)}
          strategy={verticalListSortingStrategy}
        >
          <div className="column-content">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} onOpen={onOpenTask} />
            ))}
            {tasks.length === 0 && (
              <div className="muted column-empty">Sem tarefas</div>
            )}
          </div>
        </SortableContext>
      </section>

      <ConfirmModal
        open={askDelete}
        title="Excluir coluna"
        message={`Deseja excluir a coluna "${column.nome}"? A exclusão só funciona se ela estiver vazia.`}
        confirmLabel="Excluir coluna"
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => setAskDelete(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
