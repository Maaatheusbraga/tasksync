import { useMemo, useState } from "react";
import { emitToast } from "../utils/uiFeedback";

export default function NewBoardModal({ open, onClose, onCreate, setores = [] }) {
  const [nomeQuadro, setNomeQuadro] = useState("");
  const [setorId, setSetorId] = useState("");
  const [novoSetor, setNovoSetor] = useState("");
  const [saving, setSaving] = useState(false);

  const canSubmit = useMemo(() => {
    if (!nomeQuadro.trim()) return false;
    return !!setorId || !!novoSetor.trim();
  }, [nomeQuadro, setorId, novoSetor]);

  if (!open) return null;

  const resetAndClose = () => {
    setNomeQuadro("");
    setSetorId("");
    setNovoSetor("");
    setSaving(false);
    onClose();
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      await onCreate({
        nomeQuadro: nomeQuadro.trim(),
        setorId: setorId ? Number(setorId) : null,
        novoSetor: novoSetor.trim()
      });
      resetAndClose();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Não foi possível criar o quadro";
      emitToast(msg, "error");
      setSaving(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={resetAndClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h3>Novo quadro</h3>
        <p className="muted" style={{ marginTop: 4 }}>
          Crie um quadro em um setor existente ou em um setor novo.
        </p>
        <form className="form" onSubmit={submit}>
          <div className="field">
            <label>Nome do quadro</label>
            <input
              value={nomeQuadro}
              onChange={(e) => setNomeQuadro(e.target.value)}
              placeholder="Ex.: Operações Comercial"
              required
            />
          </div>

          <div className="field">
            <label>Setor existente</label>
            <select value={setorId} onChange={(e) => setSetorId(e.target.value)}>
              <option value="">Selecione (opcional)</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Ou criar novo setor</label>
            <input
              value={novoSetor}
              onChange={(e) => setNovoSetor(e.target.value)}
              placeholder="Ex.: Jurídico"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-ghost" onClick={resetAndClose}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={!canSubmit || saving}>
              {saving ? "Criando..." : "Criar quadro"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
