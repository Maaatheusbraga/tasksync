export default function FiltersBar({ filters, onChange, onRefresh }) {
  return (
    <div className="filters">
      <input
        placeholder="Buscar por título da tarefa..."
        value={filters.q}
        onChange={(e) => onChange("q", e.target.value)}
        style={{ minWidth: 340 }}
      />
      <label className="checkbox">
        <input
          type="checkbox"
          checked={filters.onlyMe}
          onChange={(e) => onChange("onlyMe", e.target.checked)}
        />
        Minhas tarefas
      </label>
      <div style={{ flex: 1 }} />
      <button className="btn-primary" onClick={onRefresh}>Aplicar filtros</button>
    </div>
  );
}
