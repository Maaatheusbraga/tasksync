import { create } from "zustand";
import {
  completeTask,
  createBoard,
  createColumn,
  createComment,
  createSetor,
  createSubtask,
  createTask,
  createUser,
  deleteAttachment,
  deleteColumn,
  deleteComment,
  deleteSubtask,
  deleteTask,
  fetchBoard,
  fetchMetrics,
  fetchTimeline,
  getMe,
  listAttachments,
  listBoards,
  listComments,
  listSetores,
  listSubtasks,
  listUsers,
  login as loginApi,
  moveTask,
  uncompleteTask,
  updateBoard,
  updateColumn,
  updateSubtask,
  updateTask,
  uploadAttachment
} from "../services/api";
import { emitToast } from "../utils/uiFeedback";

export const useKanbanStore = create((set, get) => ({
  token: localStorage.getItem("token") || null,
  me: null,
  users: [],
  setores: [],
  boards: [],
  boardId: Number(localStorage.getItem("boardId")) || null,
  quadro: null,
  columns: [],
  tasks: [],
  logs: [],
  selectedTask: null,
  timeline: [],
  subtasks: [],
  comments: [],
  attachments: [],
  metrics: null,
  filters: { onlyMe: false, q: "" },
  loading: false,
  error: null,

  login: async (email, senha) => {
    const data = await loginApi(email, senha);
    localStorage.setItem("token", data.access_token);
    set({ token: data.access_token });
    await get().bootstrapSession();
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("boardId");
    set({
      token: null,
      me: null,
      boards: [],
      boardId: null,
      tasks: [],
      columns: [],
      logs: [],
      metrics: null,
      selectedTask: null,
      timeline: []
    });
  },

  bootstrapSession: async () => {
    try {
      const me = await getMe();
      const [boards, users, setores] = await Promise.all([listBoards(), listUsers(), listSetores()]);
      let boardId = get().boardId;
      if (!boardId && boards.length) boardId = boards[0].id;
      if (boardId) localStorage.setItem("boardId", String(boardId));
      set({ me, users, setores, boards, boardId });
      if (boardId) await get().loadBoard();
    } catch (err) {
      console.error(err);
      set({ error: "Falha ao iniciar sessão" });
    }
  },

  setBoard: async (boardId) => {
    localStorage.setItem("boardId", String(boardId));
    set({ boardId });
    await get().loadBoard();
  },

  setFilter: (key, value) =>
    set((state) => ({ filters: { ...state.filters, [key]: value } })),

  selectTask: async (task) => {
    set({ selectedTask: task });
    if (!task) {
      set({ timeline: [], subtasks: [], comments: [], attachments: [] });
      return;
    }
    await get().reloadTaskDetails(task.id);
  },

  reloadTaskDetails: async (taskId) => {
    try {
      const [timeline, subtasks, comments, attachments] = await Promise.all([
        fetchTimeline(taskId),
        listSubtasks(taskId),
        listComments(taskId),
        listAttachments(taskId)
      ]);
      set({ timeline, subtasks, comments, attachments });
    } catch (err) {
      console.error("Falha ao carregar detalhes da tarefa", err);
    }
  },

  loadBoard: async () => {
    const { boardId, filters } = get();
    if (!boardId) return;
    set({ loading: true, error: null });
    try {
      const cleanFilters = Object.fromEntries(
        Object.entries(filters).filter(([, v]) => v !== "" && v !== false && v != null)
      );
      const data = await fetchBoard(boardId, cleanFilters);
      let metrics = null;
      try {
        metrics = await fetchMetrics(boardId);
      } catch (_e) {
        metrics = null;
      }
      set({
        quadro: data.quadro,
        columns: data.colunas,
        tasks: data.tarefas,
        logs: data.logs,
        metrics,
        loading: false
      });
    } catch (err) {
      console.error(err);
      set({ loading: false, error: "Falha ao carregar quadro" });
    }
  },

  onMoveTask: async (taskId, colunaId, ordem = 0) => {
    try {
      await moveTask(taskId, { coluna_id: colunaId, ordem_coluna: ordem });
      await get().loadBoard();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Não foi possível mover a tarefa";
      emitToast(msg, "error");
    }
  },

  onInlineUpdate: async (taskId, payload) => {
    await updateTask(taskId, payload);
    await get().loadBoard();
  },

  onCreateTask: async (payload) => {
    const { boardId } = get();
    await createTask({ ...payload, quadro_id: boardId });
    await get().loadBoard();
  },

  onCreateBoard: async ({ nomeQuadro, setorId, novoSetor }) => {
    let resolvedSetorId = setorId;
    if (!resolvedSetorId && novoSetor?.trim()) {
      const setor = await createSetor({ nome: novoSetor.trim() });
      resolvedSetorId = setor.id;
    }
    if (!resolvedSetorId) {
      throw new Error("Selecione um setor ou informe um novo setor");
    }

    const board = await createBoard({ nome: nomeQuadro.trim(), setor_id: resolvedSetorId });
    const [boards, setores] = await Promise.all([listBoards(), listSetores()]);
    localStorage.setItem("boardId", String(board.id));
    set({ boards, setores, boardId: board.id });
    await get().loadBoard();
  },

  onCreateUser: async ({ nome, email, senha, role, setor_id }) => {
    const payload = {
      nome: nome.trim(),
      email: email.trim(),
      senha,
      role,
      setor_id: setor_id || null,
      avatar_url: null
    };
    const created = await createUser(payload);
    const users = await listUsers();
    set({ users });
    return created;
  },

  onRenameBoard: async (boardId, nome) => {
    const cleanName = nome?.trim();
    if (!cleanName) return;
    await updateBoard(boardId, { nome: cleanName });
    const boards = await listBoards();
    set((state) => ({
      boards,
      quadro: state.quadro ? { ...state.quadro, nome: cleanName } : state.quadro
    }));
  },

  onCreateColumn: async (nome) => {
    const { boardId } = get();
    await createColumn({ nome, quadro_id: boardId, is_done: false });
    await get().loadBoard();
  },

  onRenameColumn: async (columnId, nome) => {
    await updateColumn(columnId, { nome });
    await get().loadBoard();
  },

  onDeleteColumn: async (columnId) => {
    try {
      await deleteColumn(columnId);
      await get().loadBoard();
    } catch (err) {
      const msg = err?.response?.data?.detail || "Não foi possível excluir a coluna";
      emitToast(msg, "error");
    }
  },

  onCompleteTask: async (taskId) => {
    try {
      await completeTask(taskId);
      const tarefa = get().tasks.find((t) => t.id === taskId);
      await get().loadBoard();
      if (get().selectedTask?.id === taskId) {
        const fresh = get().tasks.find((t) => t.id === taskId);
        if (fresh) set({ selectedTask: fresh });
        const tl = await fetchTimeline(taskId);
        set({ timeline: tl });
      }
      return tarefa;
    } catch (err) {
      const msg = err?.response?.data?.detail || "Não foi possível concluir a tarefa";
      emitToast(msg, "error");
    }
  },

  onUncompleteTask: async (taskId) => {
    await uncompleteTask(taskId);
    await get().loadBoard();
    if (get().selectedTask?.id === taskId) {
      const fresh = get().tasks.find((t) => t.id === taskId);
      if (fresh) set({ selectedTask: fresh });
      const tl = await fetchTimeline(taskId);
      set({ timeline: tl });
    }
  },

  onDeleteTask: async (taskId) => {
    await deleteTask(taskId);
    if (get().selectedTask?.id === taskId) {
      set({ selectedTask: null, timeline: [], subtasks: [], comments: [], attachments: [] });
    }
    await get().loadBoard();
  },

  onAddSubtask: async (titulo) => {
    const task = get().selectedTask;
    if (!task || !titulo.trim()) return;
    await createSubtask(task.id, titulo.trim());
    await get().reloadTaskDetails(task.id);
  },

  onToggleSubtask: async (subtaskId, concluida) => {
    await updateSubtask(subtaskId, { concluida });
    const task = get().selectedTask;
    if (task) await get().reloadTaskDetails(task.id);
  },

  onRenameSubtask: async (subtaskId, titulo) => {
    await updateSubtask(subtaskId, { titulo });
    const task = get().selectedTask;
    if (task) await get().reloadTaskDetails(task.id);
  },

  onDeleteSubtask: async (subtaskId) => {
    await deleteSubtask(subtaskId);
    const task = get().selectedTask;
    if (task) await get().reloadTaskDetails(task.id);
  },

  onAddComment: async (conteudo) => {
    const task = get().selectedTask;
    if (!task || !conteudo.trim()) return;
    await createComment(task.id, conteudo.trim());
    await get().reloadTaskDetails(task.id);
  },

  onDeleteComment: async (commentId) => {
    await deleteComment(commentId);
    const task = get().selectedTask;
    if (task) await get().reloadTaskDetails(task.id);
  },

  onUploadAttachment: async (file) => {
    const task = get().selectedTask;
    if (!task) return;
    await uploadAttachment(task.id, file);
    await get().reloadTaskDetails(task.id);
  },

  onDeleteAttachment: async (attachmentId) => {
    await deleteAttachment(attachmentId);
    const task = get().selectedTask;
    if (task) await get().reloadTaskDetails(task.id);
  }
}));
