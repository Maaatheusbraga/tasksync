import { useEffect, useState } from "react";
import ConfirmModal from "./ConfirmModal";
import TaskActivity from "./TaskActivity";
import TaskSubtasks from "./TaskSubtasks";

const STATUS_LABEL = { GREEN: "No prazo", YELLOW: "Vence hoje", RED: "Atrasada" };
const STATUS_CLASS = { GREEN: "green", YELLOW: "yellow", RED: "red" };

function initials(name = "U") {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function TaskDrawer({
  task,
  timeline,
  subtasks,
  comments,
  attachments,
  users,
  columns,
  currentUser,
  onClose,
  onInlineUpdate,
  onComplete,
  onUncomplete,
  onDelete,
  onAddSubtask,
  onToggleSubtask,
  onRenameSubtask,
  onDeleteSubtask,
  onAddComment,
  onDeleteComment,
  onUploadAttachment,
  onDeleteAttachment
}) {
  const [form, setForm] = useState({ titulo: "", descricao: "", prazo: "", responsavel_id: "" });
  const [saving, setSaving] = useState(false);
  const [askDelete, setAskDelete] = useState(false);

  useEffect(() => {
    if (task) {
      setForm({
        titulo: task.titulo,
        descricao: task.descricao || "",
        prazo: task.prazo,
        responsavel_id: task.responsavel?.id ?? ""
      });
    }
  }, [task]);

  if (!task) return null;

  const isDone = !!task.data_conclusao;
  const status = task.status_prazo;

  const save = async (payload) => {
    setSaving(true);
    try {
      await onInlineUpdate(task.id, payload);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setAskDelete(true);
  };

  const confirmDelete = () => {
    setAskDelete(false);
    onDelete(task.id);
  };

  const responsavel = users.find((u) => u.id === form.responsavel_id) || task.responsavel;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="task-drawer">
        {/* Cabeçalho slim */}
        <div className={`drawer-head ${isDone ? "drawer-head-done" : ""}`}>
          <div className="drawer-head-row">
            <span className="drawer-id">TAREFA #{task.id}</span>
            <div className="drawer-head-pills">
              {isDone ? (
                <span className="badge-done">CONCLUÍDA</span>
              ) : (
                <span className={`due-pill due-pill-light ${STATUS_CLASS[status]}`}>
                  ● {STATUS_LABEL[status]}
                </span>
              )}
            </div>
            <button className="close" onClick={onClose}>×</button>
          </div>
        </div>

        {/* Corpo */}
        <div className="drawer-body">
          {/* Título grande */}
          <input
            className="drawer-title-input"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
            onBlur={() => form.titulo !== task.titulo && save({ titulo: form.titulo })}
            placeholder="Título da tarefa"
          />

          {/* Linha de meta limpa: prazo + responsável */}
          <div className="drawer-meta-line">
            <div className="meta-pill">
              <span className="meta-key">Prazo</span>
              <input
                type="date"
                value={form.prazo}
                onChange={(e) => {
                  setForm({ ...form, prazo: e.target.value });
                  if (e.target.value && e.target.value !== task.prazo) save({ prazo: e.target.value });
                }}
              />
            </div>
            <div className="meta-pill">
              <span className="meta-key">Responsável</span>
              <div className="meta-value-with-avatar">
                <div className="avatar avatar-sm">{initials(responsavel?.nome)}</div>
                <select
                  value={form.responsavel_id}
                  onChange={(e) => {
                    const v = e.target.value ? Number(e.target.value) : "";
                    setForm({ ...form, responsavel_id: v });
                    if (v !== task.responsavel?.id) save({ responsavel_id: v || null });
                  }}
                >
                  <option value="">Sem responsável</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>{u.nome}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Ação principal: concluir / reabrir */}
          <div className="drawer-actions">
            {!isDone ? (
              <button className="btn-complete" onClick={() => onComplete(task.id)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span>Concluir tarefa</span>
              </button>
            ) : (
              <button className="btn-reopen" onClick={() => onUncomplete(task.id)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 12a9 9 0 1 0 3-6.7" />
                  <polyline points="3 4 3 10 9 10" />
                </svg>
                <span>Reabrir tarefa</span>
              </button>
            )}
            <button className="btn-ghost-danger" onClick={handleDelete} title="Excluir tarefa">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
          </div>

          {isDone && (
            <div className="info-box">
              Concluída em {new Date(task.data_conclusao).toLocaleString("pt-BR")}.
            </div>
          )}

          {/* Descrição */}
          <section className="dwr-section">
            <div className="dwr-section-head">
              <span className="dwr-label">Descrição</span>
            </div>
            <textarea
              className="dwr-textarea"
              rows={3}
              placeholder="Detalhes, contexto, links..."
              value={form.descricao}
              onChange={(e) => setForm({ ...form, descricao: e.target.value })}
              onBlur={() => form.descricao !== (task.descricao || "") && save({ descricao: form.descricao })}
            />
          </section>

          {/* Subtarefas */}
          <TaskSubtasks
            subtasks={subtasks}
            onAdd={onAddSubtask}
            onToggle={onToggleSubtask}
            onRename={onRenameSubtask}
            onDelete={onDeleteSubtask}
          />

          {/* Atividade unificada */}
          <TaskActivity
            comments={comments}
            attachments={attachments}
            timeline={timeline}
            users={users}
            columns={columns}
            currentUser={currentUser}
            onAddComment={onAddComment}
            onDeleteComment={onDeleteComment}
            onUploadAttachment={onUploadAttachment}
            onDeleteAttachment={onDeleteAttachment}
          />

          {saving && <div className="muted saving-toast">Salvando...</div>}
        </div>
      </aside>
      <ConfirmModal
        open={askDelete}
        title="Excluir tarefa"
        message={`Deseja excluir a tarefa "${task.titulo}"? Isso remove subtarefas, anexos, comentários e logs.`}
        confirmLabel="Excluir tarefa"
        cancelLabel="Cancelar"
        tone="danger"
        onCancel={() => setAskDelete(false)}
        onConfirm={confirmDelete}
      />
    </>
  );
}
