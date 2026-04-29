import { useState } from "react";
import { emitToast } from "../utils/uiFeedback";

export default function NewUserModal({ open, onClose, setores = [], onCreate }) {
  const [form, setForm] = useState({
    nome: "",
    email: "",
    senha: "",
    role: "EDITOR",
    setor_id: ""
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const reset = () => {
    setForm({
      nome: "",
      email: "",
      senha: "",
      role: "EDITOR",
      setor_id: ""
    });
    setSaving(false);
  };

  const close = () => {
    reset();
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!form.nome.trim() || !form.email.trim() || !form.senha) {
      emitToast("Preencha nome, e-mail e senha.", "error");
      return;
    }
    setSaving(true);
    try {
      await onCreate({
        nome: form.nome,
        email: form.email,
        senha: form.senha,
        role: form.role,
        setor_id: form.setor_id ? Number(form.setor_id) : null
      });
      emitToast("Usuário criado com sucesso.", "info");
      close();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Falha ao criar usuário";
      emitToast(msg, "error");
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={close}>
      <form className="modal" onSubmit={submit} onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Novo usuário</h3>
        </div>
        <div className="modal-body">
          <div className="field">
            <label>Nome</label>
            <input
              value={form.nome}
              onChange={(e) => setForm((s) => ({ ...s, nome: e.target.value }))}
              required
            />
          </div>
          <div className="row">
            <div className="field">
              <label>E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                required
              />
            </div>
            <div className="field">
              <label>Senha inicial</label>
              <input
                type="password"
                value={form.senha}
                onChange={(e) => setForm((s) => ({ ...s, senha: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label>Perfil</label>
              <select
                value={form.role}
                onChange={(e) => setForm((s) => ({ ...s, role: e.target.value }))}
              >
                <option value="ADMIN">ADMIN</option>
                <option value="EDITOR">EDITOR</option>
                <option value="VIEWER">VIEWER</option>
              </select>
            </div>
            <div className="field">
              <label>Setor (opcional)</label>
              <select
                value={form.setor_id}
                onChange={(e) => setForm((s) => ({ ...s, setor_id: e.target.value }))}
              >
                <option value="">Sem setor</option>
                {setores.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nome}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="modal-foot">
          <button type="button" className="btn-secondary" onClick={close}>
            Cancelar
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? "Criando..." : "Criar usuário"}
          </button>
        </div>
      </form>
    </div>
  );
}

