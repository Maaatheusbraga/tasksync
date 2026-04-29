import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://192.168.2.189:8000";

const api = axios.create({
  baseURL: API_BASE_URL
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err?.response?.status === 401) {
      localStorage.removeItem("token");
      if (location.pathname !== "/login") location.reload();
    }
    return Promise.reject(err);
  }
);

export const login = (email, senha) =>
  api.post("/auth/login", { email, senha }).then((r) => r.data);

export const bootstrap = () => api.post("/setup/bootstrap").then((r) => r.data);

export const getMe = () => api.get("/users/me").then((r) => r.data);
export const listUsers = () => api.get("/users").then((r) => r.data);
export const createUser = (payload) => api.post("/users", payload).then((r) => r.data);
export const listSetores = () => api.get("/users/setores/list").then((r) => r.data);
export const createSetor = (payload) => api.post("/users/setores/create", payload).then((r) => r.data);
export const listBoards = () => api.get("/boards").then((r) => r.data);
export const createBoard = (payload) => api.post("/boards", payload).then((r) => r.data);
export const updateBoard = (boardId, payload) =>
  api.patch(`/boards/${boardId}`, payload).then((r) => r.data);
export const fetchBoard = (boardId, params) =>
  api.get(`/boards/${boardId}`, { params }).then((r) => r.data);

export const createColumn = (payload) =>
  api.post("/columns", payload).then((r) => r.data);
export const updateColumn = (columnId, payload) =>
  api.patch(`/columns/${columnId}`, payload).then((r) => r.data);
export const deleteColumn = (columnId) =>
  api.delete(`/columns/${columnId}`).then((r) => r.data);

export const createTask = (payload) =>
  api.post("/tasks", payload).then((r) => r.data);
export const moveTask = (taskId, payload) =>
  api.post(`/tasks/${taskId}/move`, payload).then((r) => r.data);
export const updateTask = (taskId, payload) =>
  api.patch(`/tasks/${taskId}`, payload).then((r) => r.data);
export const completeTask = (taskId) =>
  api.post(`/tasks/${taskId}/complete`).then((r) => r.data);
export const uncompleteTask = (taskId) =>
  api.post(`/tasks/${taskId}/uncomplete`).then((r) => r.data);
export const deleteTask = (taskId) =>
  api.delete(`/tasks/${taskId}`).then((r) => r.data);

export const listSubtasks = (taskId) =>
  api.get(`/tasks/${taskId}/subtasks`).then((r) => r.data);
export const createSubtask = (taskId, titulo) =>
  api.post(`/tasks/${taskId}/subtasks`, { titulo }).then((r) => r.data);
export const updateSubtask = (subtaskId, payload) =>
  api.patch(`/tasks/subtasks/${subtaskId}`, payload).then((r) => r.data);
export const deleteSubtask = (subtaskId) =>
  api.delete(`/tasks/subtasks/${subtaskId}`).then((r) => r.data);

export const listComments = (taskId) =>
  api.get(`/tasks/${taskId}/comments`).then((r) => r.data);
export const createComment = (taskId, conteudo) =>
  api.post(`/tasks/${taskId}/comments`, { conteudo }).then((r) => r.data);
export const deleteComment = (commentId) =>
  api.delete(`/tasks/comments/${commentId}`).then((r) => r.data);

export const listAttachments = (taskId) =>
  api.get(`/tasks/${taskId}/attachments`).then((r) => r.data);
export const uploadAttachment = (taskId, file) => {
  const fd = new FormData();
  fd.append("file", file);
  return api
    .post(`/tasks/${taskId}/attachments`, fd, {
      headers: { "Content-Type": "multipart/form-data" }
    })
    .then((r) => r.data);
};
export const deleteAttachment = (attachmentId) =>
  api.delete(`/tasks/attachments/${attachmentId}`).then((r) => r.data);
export const downloadAttachment = async (attachmentId, filename) => {
  const res = await api.get(`/tasks/attachments/${attachmentId}/download`, {
    responseType: "blob"
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `anexo-${attachmentId}`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};
export const fetchTimeline = (taskId) =>
  api.get(`/tasks/${taskId}/timeline`).then((r) => r.data);
export const fetchMetrics = (boardId) =>
  api.get(`/metrics/boards/${boardId}`).then((r) => r.data);

export default api;
