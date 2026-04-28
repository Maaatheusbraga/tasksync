const STATUS_LABEL = { GREEN: "No prazo", YELLOW: "Vence hoje", RED: "Atrasado" };
const STATUS_CLASS = { GREEN: "green", YELLOW: "yellow", RED: "red" };

function initials(name = "U") {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function TaskCardPreview({ task }) {
  const status = task.status_prazo;
  const isDone = !!task.data_conclusao;
  return (
    <div className={`task-card status-${status.toLowerCase()} ${isDone ? "task-done" : ""} task-card-preview`}>
      <div className="task-head">
        <strong>{task.titulo}</strong>
        <div className="avatar">{initials(task.responsavel?.nome)}</div>
      </div>
      <div className="task-footer">
        <span className={`due-pill ${STATUS_CLASS[status]}`}>● {STATUS_LABEL[status]} · {task.prazo}</span>
        <span className="muted">#{task.id}</span>
      </div>
    </div>
  );
}
