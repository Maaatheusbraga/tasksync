import { useEffect, useState } from "react";

export default function NewTaskModal({ open, onClose, onCreate, columns, users, defaultColumnId }) {
  const [form, setForm] = useState({
    titulo: "",
    descricao: "",
    prazo: "",
    coluna_id: "",
    responsavel_id: ""
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setForm({
        titulo: "",
        descricao: "",
        prazo: new Date().toISOString().slice(0, 10),
        coluna_id: defaultColumnId || columns[0]?.id || "",
        responsavel_id: ""
      });
    }
  }, [open, defaultColumnId, columns, users]);

  if (!open) return null;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.titulo || !form.prazo || !form.coluna_id) return;
    setSaving(true);
    try {
      await onCreate({
        titulo: form.titulo,
        descricao: form.descricao || null,
        prazo: form.prazo,
        coluna_id: Number(form.coluna_id),
        responsavel_id: form.responsavel_id ? Number(form.responsavel_id) : null
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <h3>Nova tarefa</h3>
          <div style={{ color: "#c8d3e6", fontSize: 13 }}>Defina responsável e prazo. A trilha de auditoria começa aqui.</div>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Título</label>
            <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} required />
          </div>
          <div className="field">
            <label>Descrição</label>
            <textarea rows={3} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
          </div>
          <div className="row">
            <div className="field">
              <label>Prazo</label>
              <input type="date" value={form.prazo} onChange={(e) => setForm({ ...form, prazo: e.target.value })} required />
            </div>
            <div className="field">
              <label>Coluna inicial</label>
              <select value={form.coluna_id} onChange={(e) => setForm({ ...form, coluna_id: e.target.value })}>
                {columns.map((c) => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label>Responsável (opcional)</label>
            <select value={form.responsavel_id} onChange={(e) => setForm({ ...form, responsavel_id: e.target.value })}>
              <option value="">Sem responsável por enquanto</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>{u.nome} — {u.role}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Criando..." : "Criar tarefa"}
          </button>
        </div>
      </form>
    </div>
  );
}
