import { useEffect, useState } from "react";
import Board from "./components/Board";
import FiltersBar from "./components/FiltersBar";
import Login from "./components/Login";
import MetricsDashboard from "./components/MetricsDashboard";
import NewBoardModal from "./components/NewBoardModal";
import NewTaskModal from "./components/NewTaskModal";
import Sidebar from "./components/Sidebar";
import TaskDrawer from "./components/TaskDrawer";
import Topbar from "./components/Topbar";
import { useKanbanStore } from "./store/useKanbanStore";

export default function App() {
  const {
    token,
    me,
    users,
    setores,
    boards,
    boardId,
    quadro,
    columns,
    tasks,
    selectedTask,
    timeline,
    subtasks,
    comments,
    attachments,
    metrics,
    filters,
    loading,
    error,
    login,
    logout,
    bootstrapSession,
    setBoard,
    loadBoard,
    setFilter,
    selectTask,
    onMoveTask,
    onInlineUpdate,
    onCreateTask,
    onCreateBoard,
    onRenameBoard,
    onCreateColumn,
    onRenameColumn,
    onDeleteColumn,
    onCompleteTask,
    onUncompleteTask,
    onDeleteTask,
    onAddSubtask,
    onToggleSubtask,
    onRenameSubtask,
    onDeleteSubtask,
    onAddComment,
    onDeleteComment,
    onUploadAttachment,
    onDeleteAttachment
  } = useKanbanStore();

  const [view, setView] = useState("board");
  const [showNewTask, setShowNewTask] = useState(false);
  const [showNewBoard, setShowNewBoard] = useState(false);
  const [defaultColumnId, setDefaultColumnId] = useState(null);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (token) bootstrapSession();
  }, [token, bootstrapSession]);

  useEffect(() => {
    const onToast = (evt) => {
      const payload = evt?.detail;
      if (!payload?.message) return;
      setToast({ message: payload.message, type: payload.type || "info" });
      window.clearTimeout(window.__tasksyncToastTimer);
      window.__tasksyncToastTimer = window.setTimeout(() => setToast(null), 3800);
    };
    window.addEventListener("tasksync:toast", onToast);
    return () => window.removeEventListener("tasksync:toast", onToast);
  }, []);

  if (!token) {
    return <Login onLogin={login} />;
  }

  const isAdmin = me?.role === "ADMIN";
  const isEditor = me?.role === "ADMIN" || me?.role === "EDITOR";

  const openNewTask = (columnId = null) => {
    setDefaultColumnId(columnId);
    setShowNewTask(true);
  };

  return (
    <div className="app-shell">
      <Sidebar
        me={me}
        boards={boards}
        boardId={boardId}
        onSelectBoard={setBoard}
        onLogout={logout}
        view={view}
        onChangeView={setView}
        isAdmin={isAdmin}
        onCreateBoard={() => setShowNewBoard(true)}
      />

      <main className="main-area">
        <Topbar
          quadro={quadro}
          view={view}
          onChangeView={setView}
          onNewTask={() => openNewTask()}
          isAdmin={isEditor}
          onRenameBoard={onRenameBoard}
        />

        <div className="workspace">
          {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}

          {!boardId && !loading && (
            <div className="empty-state">
              <h3>Nenhum quadro disponível</h3>
              <p>Acesse o Swagger em <code>http://localhost:8000/docs</code> e execute <code>POST /setup/bootstrap</code>, ou clique no botão "Inicializar dados padrão" na tela de login.</p>
            </div>
          )}

          {boardId && (
            <>
              <FiltersBar filters={filters} onChange={setFilter} onRefresh={loadBoard} />

              {view === "board" && (
                <Board
                  columns={columns}
                  tasks={tasks}
                  isAdmin={isEditor}
                  onMoveTask={onMoveTask}
                  onOpenTask={selectTask}
                  onCreateColumn={onCreateColumn}
                  onRenameColumn={onRenameColumn}
                  onDeleteColumn={onDeleteColumn}
                  onAddTask={openNewTask}
                />
              )}

              {view === "metrics" && (
                <>
                  <MetricsDashboard metrics={metrics} tasks={tasks} columns={columns} />
                  <div className="metric-card" style={{ padding: 18, marginTop: 12 }}>
                    <div className="label">Ranking de atrasadas por usuário</div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {(metrics?.atrasadas_por_usuario || []).map((u) => (
                        <li key={u.usuario}>{u.usuario}: <strong>{u.total}</strong></li>
                      ))}
                      {(!metrics || metrics.atrasadas_por_usuario.length === 0) && (
                        <li className="muted">Sem registros.</li>
                      )}
                    </ul>
                  </div>
                  <div className="metric-card" style={{ padding: 18, marginTop: 12 }}>
                    <div className="label">Ranking de concluídas por usuário</div>
                    <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                      {(metrics?.concluidas_por_usuario || []).map((u) => (
                        <li key={u.usuario}>{u.usuario}: <strong>{u.total}</strong></li>
                      ))}
                      {(!metrics || metrics.concluidas_por_usuario.length === 0) && (
                        <li className="muted">Sem registros.</li>
                      )}
                    </ul>
                  </div>
                </>
              )}

            </>
          )}
        </div>
      </main>

      <TaskDrawer
        task={selectedTask}
        timeline={timeline}
        subtasks={subtasks}
        comments={comments}
        attachments={attachments}
        users={users}
        columns={columns}
        currentUser={me}
        onClose={() => selectTask(null)}
        onInlineUpdate={onInlineUpdate}
        onComplete={onCompleteTask}
        onUncomplete={onUncompleteTask}
        onDelete={onDeleteTask}
        onAddSubtask={onAddSubtask}
        onToggleSubtask={onToggleSubtask}
        onRenameSubtask={onRenameSubtask}
        onDeleteSubtask={onDeleteSubtask}
        onAddComment={onAddComment}
        onDeleteComment={onDeleteComment}
        onUploadAttachment={onUploadAttachment}
        onDeleteAttachment={onDeleteAttachment}
      />

      <NewTaskModal
        open={showNewTask}
        onClose={() => setShowNewTask(false)}
        onCreate={onCreateTask}
        columns={columns}
        users={users}
        defaultColumnId={defaultColumnId}
      />

      <NewBoardModal
        open={showNewBoard}
        onClose={() => setShowNewBoard(false)}
        setores={setores}
        onCreate={onCreateBoard}
      />

      {toast && (
        <div className={`app-toast ${toast.type}`}>
          <span>{toast.message}</span>
          <button className="app-toast-close" onClick={() => setToast(null)}>×</button>
        </div>
      )}
    </div>
  );
}
