export default function Sidebar({
  me,
  boards,
  boardId,
  onSelectBoard,
  onLogout,
  view,
  onChangeView,
  isAdmin,
  onCreateBoard,
  onCreateUser
}) {
  const initials = (me?.nome || "U").split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();

  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">TS</div>
        <div>
          TaskSync
          <div style={{ fontSize: 10, color: "#91a0bf", letterSpacing: 1 }}>CORPORATE KANBAN</div>
        </div>
      </div>

      <div className="nav-section">Trabalho</div>
      <div className={`nav-item ${view === "board" ? "active" : ""}`} onClick={() => onChangeView("board")}>
        <span className="nav-icon">▦</span> Quadro
      </div>
      <div className={`nav-item ${view === "metrics" ? "active" : ""}`} onClick={() => onChangeView("metrics")}>
        <span className="nav-icon">◆</span> Métricas
      </div>

      <div className="nav-section">Quadros</div>
      {boards.map((b) => (
        <div
          key={b.id}
          className={`nav-item ${b.id === boardId ? "active" : ""}`}
          onClick={() => onSelectBoard(b.id)}
        >
          <span className="nav-icon">▣</span> {b.nome}
        </div>
      ))}
      {isAdmin && (
        <>
          <button className="btn-secondary" style={{ width: "100%", marginTop: 8 }} onClick={onCreateBoard}>
            + Novo quadro
          </button>
          <button className="btn-secondary" style={{ width: "100%", marginTop: 6 }} onClick={onCreateUser}>
            + Novo usuário
          </button>
        </>
      )}

      <div className="sidebar-footer">
        <div className="user-chip">
          <div className="avatar" style={{ width: 32, height: 32, fontSize: 12 }}>{initials}</div>
          <div style={{ flex: 1, overflow: "hidden" }}>
            <div className="name">{me?.nome || "Usuário"}</div>
            <div className="role">{me?.role || ""}</div>
          </div>
          <button className="btn-ghost" title="Sair" onClick={onLogout}>⏻</button>
        </div>
      </div>
    </aside>
  );
}
