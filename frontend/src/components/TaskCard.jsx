import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

const STATUS_LABEL = { GREEN: "No prazo", YELLOW: "Vence hoje", RED: "Atrasado" };
const STATUS_CLASS = { GREEN: "green", YELLOW: "yellow", RED: "red" };

function initials(name = "U") {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

export default function TaskCard({ task, onOpen }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${task.id}`,
    data: { task }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0 : 1
  };

  const status = task.status_prazo;
  const isDone = !!task.data_conclusao;
  const cardClass = `task-card status-${status.toLowerCase()} ${isDone ? "task-done" : ""}`;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cardClass}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(task)}
    >
      <div className="task-head">
        <strong>
          {isDone && <span className="check-mark" title="Concluída">✓</span>}
          {task.titulo}
        </strong>
        <div className="avatar" title={task.responsavel?.nome || "Sem responsável"}>
          {initials(task.responsavel?.nome || "SR")}
        </div>
      </div>
      {task.descricao && <p>{task.descricao}</p>}
      <div className="task-footer">
        <span className={`due-pill ${STATUS_CLASS[status]}`}>● {STATUS_LABEL[status]} · {task.prazo}</span>
        <span className="muted">#{task.id}</span>
      </div>
    </div>
  );
}
