import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import { useState } from "react";
import Column from "./Column";
import TaskCardPreview from "./TaskCardPreview";

export default function Board({
  columns,
  tasks,
  isAdmin,
  onMoveTask,
  onOpenTask,
  onCreateColumn,
  onRenameColumn,
  onDeleteColumn,
  onAddTask
}) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const [creating, setCreating] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [activeTask, setActiveTask] = useState(null);
  const [overColumnId, setOverColumnId] = useState(null);

  const resolveColumnId = (overId) => {
    const id = String(overId);
    if (id.startsWith("col-")) return Number(id.replace("col-", ""));
    if (id.startsWith("task-")) {
      const t = tasks.find((x) => x.id === Number(id.replace("task-", "")));
      return t?.coluna_id ?? null;
    }
    return null;
  };

  const handleDragStart = (event) => {
    const t = event.active.data.current?.task;
    if (t) setActiveTask(t);
  };

  const handleDragOver = (event) => {
    if (!event.over) {
      setOverColumnId(null);
      return;
    }
    setOverColumnId(resolveColumnId(event.over.id));
  };

  const handleDragEnd = async (event) => {
    setActiveTask(null);
    setOverColumnId(null);
    const { active, over } = event;
    if (!over) return;
    const task = active.data.current?.task;
    if (!task) return;

    const activeId = String(active.id);
    const overId = String(over.id);
    const sourceColumnId = task.coluna_id;
    const sourceOrdered = tasks
      .filter((t) => t.coluna_id === sourceColumnId)
      .sort((a, b) => a.ordem_coluna - b.ordem_coluna)
      .map((t) => `task-${t.id}`);
    const oldIndex = sourceOrdered.indexOf(activeId);
    let targetColumnId = null;
    let targetOrdem = 0;

    if (overId.startsWith("col-")) {
      targetColumnId = Number(overId.replace("col-", ""));
      const inTarget = tasks
        .filter((t) => t.coluna_id === targetColumnId)
        .sort((a, b) => a.ordem_coluna - b.ordem_coluna);
      if (targetColumnId === sourceColumnId) {
        // Mesma coluna e soltou em área vazia: decide pelo sentido do arraste
        if ((event.delta?.y ?? 0) > 0) {
          targetOrdem = Math.max(0, inTarget.length - 1);
        } else if ((event.delta?.y ?? 0) < 0) {
          targetOrdem = 0;
        } else {
          return;
        }
      } else {
        targetOrdem = inTarget.length;
      }
    } else if (overId.startsWith("task-")) {
      const targetTask = tasks.find((t) => t.id === Number(overId.replace("task-", "")));
      if (!targetTask) return;
      targetColumnId = targetTask.coluna_id;
      const orderedInColumn = tasks
        .filter((t) => t.coluna_id === targetColumnId)
        .sort((a, b) => a.ordem_coluna - b.ordem_coluna)
        .map((t) => `task-${t.id}`);
      const overIndex = orderedInColumn.indexOf(overId);

      if (sourceColumnId === targetColumnId && oldIndex >= 0 && overIndex >= 0) {
        // Quando overId==activeId, usa direção do arraste para mover 1 posição.
        if (overId === activeId) {
          if ((event.delta?.y ?? 0) > 0) targetOrdem = Math.min(orderedInColumn.length - 1, oldIndex + 1);
          else if ((event.delta?.y ?? 0) < 0) targetOrdem = Math.max(0, oldIndex - 1);
          else targetOrdem = oldIndex;
        } else {
          targetOrdem = overIndex;
        }
      } else {
        // Inserção vinda de outra coluna: posiciona na altura do card alvo.
        targetOrdem = overIndex < 0 ? orderedInColumn.length : overIndex;
      }
    }

    if (targetColumnId == null) return;
    if (sourceColumnId === targetColumnId) {
      if (oldIndex < 0) return;
      if (targetOrdem === oldIndex) return;
    }

    await onMoveTask(task.id, targetColumnId, targetOrdem);
  };

  const commitCreate = () => {
    const name = newColName.trim();
    if (!name) {
      setCreating(false);
      setNewColName("");
      return;
    }
    onCreateColumn(name);
    setNewColName("");
    setCreating(false);
  };

  const cancelCreate = () => {
    setCreating(false);
    setNewColName("");
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        setActiveTask(null);
        setOverColumnId(null);
      }}
    >
      <div className={`board-grid ${activeTask ? "is-dragging" : ""}`}>
        {isAdmin && (
          <div className="add-column-slot">
            {creating ? (
              <div className="add-column-input">
                <input
                  autoFocus
                  placeholder="Nome da coluna"
                  value={newColName}
                  onChange={(e) => setNewColName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitCreate();
                    if (e.key === "Escape") cancelCreate();
                  }}
                  onBlur={commitCreate}
                />
              </div>
            ) : (
              <button
                className="add-column-btn"
                title="Adicionar coluna"
                onClick={() => setCreating(true)}
              >
                +
              </button>
            )}
          </div>
        )}
        {columns.map((column) => (
          <Column
            key={column.id}
            column={column}
            tasks={tasks
              .filter((task) => task.coluna_id === column.id)
              .sort((a, b) => a.ordem_coluna - b.ordem_coluna)}
            isAdmin={isAdmin}
            isActiveTarget={overColumnId === column.id && !!activeTask}
            isOriginColumn={activeTask?.coluna_id === column.id}
            onOpenTask={onOpenTask}
            onRename={onRenameColumn}
            onDelete={onDeleteColumn}
            onAddTask={onAddTask}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1.22)" }}>
        {activeTask ? <TaskCardPreview task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
}
