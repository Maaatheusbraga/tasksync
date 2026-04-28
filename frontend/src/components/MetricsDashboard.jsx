export default function MetricsDashboard({ metrics, tasks, columns }) {
  const total = tasks.length;
  const atrasadas = tasks.filter((t) => t.status_prazo === "RED").length;
  const hoje = tasks.filter((t) => t.status_prazo === "YELLOW").length;
  const concluidas = (() => {
    const doneIds = columns.filter((c) => c.is_done).map((c) => c.id);
    return tasks.filter((t) => doneIds.includes(t.coluna_id)).length;
  })();

  return (
    <div className="metrics-grid">
      <div className="metric-card">
        <div className="label">Total de tarefas</div>
        <div className="value">{total}</div>
        <div className="sub">{concluidas} concluídas</div>
      </div>
      <div className="metric-card">
        <div className="label">Atrasadas</div>
        <div className="value" style={{ color: "var(--red)" }}>{atrasadas}</div>
        <div className="sub">{hoje} vencem hoje</div>
      </div>
      <div className="metric-card">
        <div className="label">Lead time médio</div>
        <div className="value">{metrics?.lead_time_medio_horas?.toFixed(1) ?? "0"}h</div>
        <div className="sub">do início até a conclusão</div>
      </div>
      <div className="metric-card">
        <div className="label">Coluna gargalo</div>
        <div className="value">{metrics?.gargalo_coluna || "—"}</div>
        <div className="sub">maior acúmulo de tarefas</div>
      </div>
    </div>
  );
}
