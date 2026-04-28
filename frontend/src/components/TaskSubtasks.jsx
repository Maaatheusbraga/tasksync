import { useState } from "react";

export default function TaskSubtasks({
  subtasks,
  onAdd,
  onToggle,
  onRename,
  onDelete
}) {
  const [adding, setAdding] = useState(false);
  const [novo, setNovo] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState("");

  const total = subtasks.length;
  const done = subtasks.filter((s) => s.concluida).length;
  const pct = total ? Math.round((done / total) * 100) : 0;

  const commitNew = () => {
    const v = novo.trim();
    if (!v) {
      setAdding(false);
      setNovo("");
      return;
    }
    onAdd(v);
    setNovo("");
    setAdding(false);
  };

  const cancelNew = () => {
    setAdding(false);
    setNovo("");
  };

  return (
    <section className="dwr-section">
      <div className="dwr-section-head">
        <div>
          <span className="dwr-label">Subtarefas</span>
          {total > 0 && (
            <span className="dwr-count">
              {done} de {total} · {pct}%
            </span>
          )}
        </div>
        <button
          className="icon-btn"
          title="Adicionar subtarefa"
          onClick={() => setAdding(true)}
        >
          +
        </button>
      </div>

      {total > 0 && (
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${pct}%` }} />
        </div>
      )}

      <ul className="subtask-list">
        {subtasks.map((s) => (
          <li key={s.id} className={`subtask-item ${s.concluida ? "done" : ""}`}>
            <input
              type="checkbox"
              checked={s.concluida}
              onChange={(e) => onToggle(s.id, e.target.checked)}
            />
            {editingId === s.id ? (
              <input
                autoFocus
                className="subtask-edit"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onBlur={() => {
                  if (editValue.trim() && editValue !== s.titulo) onRename(s.id, editValue.trim());
                  setEditingId(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") e.target.blur();
                  if (e.key === "Escape") setEditingId(null);
                }}
              />
            ) : (
              <span
                className="subtask-title"
                onClick={() => {
                  setEditingId(s.id);
                  setEditValue(s.titulo);
                }}
                title="Clique para editar"
              >
                {s.titulo}
              </span>
            )}
            <button
              className="icon-btn icon-danger"
              title="Remover subtarefa"
              onClick={() => onDelete(s.id)}
            >
              ×
            </button>
          </li>
        ))}
        {adding && (
          <li className="subtask-item subtask-new">
            <input
              autoFocus
              placeholder="Nome da subtarefa..."
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onBlur={commitNew}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitNew();
                if (e.key === "Escape") cancelNew();
              }}
            />
          </li>
        )}
      </ul>
    </section>
  );
}
