import { useEffect, useState } from "react";

export default function Topbar({ quadro, view, onChangeView, onNewTask, isAdmin, onRenameBoard }) {
  const [editing, setEditing] = useState(false);
  const [nome, setNome] = useState(quadro?.nome || "");

  useEffect(() => {
    setNome(quadro?.nome || "");
  }, [quadro?.id, quadro?.nome]);

  const commitRename = async () => {
    const clean = nome.trim();
    setEditing(false);
    if (!isAdmin || !quadro?.id || !clean || clean === quadro?.nome) return;
    await onRenameBoard(quadro.id, clean);
  };

  return (
    <header className="topbar">
      <div className="topbar-row">
        <h2>
          {editing ? (
            <input
              className="board-name-input"
              autoFocus
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitRename();
                if (e.key === "Escape") {
                  setNome(quadro?.nome || "");
                  setEditing(false);
                }
              }}
            />
          ) : (
            <span
              className={isAdmin ? "board-name-clickable" : ""}
              onClick={() => isAdmin && setEditing(true)}
              title={isAdmin ? "Clique para renomear quadro" : undefined}
            >
              {quadro?.nome || "Quadro"}
            </span>
          )}{" "}
          <span className="accent">·</span>{" "}
          <span className="muted" style={{ fontSize: 14, fontWeight: 500 }}>
            workspace corporativo
          </span>
        </h2>
        <div className="topbar-spacer" />
        {isAdmin && (
          <button className="btn-secondary" onClick={onNewTask}>+ Nova tarefa</button>
        )}
      </div>
      <div className="tabs">
        <div className={`tab ${view === "board" ? "active" : ""}`} onClick={() => onChangeView("board")}>Quadro</div>
        <div className={`tab ${view === "metrics" ? "active" : ""}`} onClick={() => onChangeView("metrics")}>Métricas</div>
      </div>
    </header>
  );
}
