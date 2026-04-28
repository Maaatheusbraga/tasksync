import { useMemo, useRef, useState } from "react";
import { downloadAttachment } from "../services/api";

function initials(name = "U") {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function formatSize(bytes) {
  if (!bytes) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), sizes.length - 1);
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`;
}

function fileIcon(name = "") {
  const ext = name.split(".").pop()?.toLowerCase();
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp"].includes(ext)) return "🖼";
  if (["pdf"].includes(ext)) return "📕";
  if (["doc", "docx"].includes(ext)) return "📘";
  if (["xls", "xlsx", "csv"].includes(ext)) return "📗";
  if (["zip", "rar", "7z"].includes(ext)) return "🗜";
  return "📄";
}

function relativeTime(d) {
  const date = new Date(d);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h atrás`;
  if (diff < 604800) return `${Math.floor(diff / 86400)} d atrás`;
  return date.toLocaleString("pt-BR");
}

function logSentence(log, users, columns) {
  const user = users.find((u) => u.id === log.usuario_id);
  const author = user?.nome || "Sistema";
  const colOrigem = columns.find((c) => c.id === log.coluna_origem_id)?.nome;
  const colDestino = columns.find((c) => c.id === log.coluna_destino_id)?.nome;
  const detalhe = log.detalhe || "";
  let texto;

  switch (log.tipo_acao) {
    case "MOVE":
      texto = colOrigem && colDestino
        ? `moveu a tarefa de ${colOrigem} → ${colDestino}`
        : `${detalhe.toLowerCase()}`;
      break;
    case "CREATE":
      texto = "criou a tarefa";
      break;
    case "UPDATE":
      texto = detalhe ? detalhe.charAt(0).toLowerCase() + detalhe.slice(1) : "atualizou a tarefa";
      break;
    case "DELETE":
      texto = "removeu";
      break;
    default:
      texto = detalhe || "atualizou algo";
  }
  return { author, texto };
}

export default function TaskActivity({
  comments,
  attachments,
  timeline,
  users,
  columns,
  currentUser,
  onAddComment,
  onDeleteComment,
  onUploadAttachment,
  onDeleteAttachment
}) {
  const [texto, setTexto] = useState("");
  const [sending, setSending] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const items = useMemo(() => {
    const arr = [
      ...timeline.map((l) => ({ kind: "log", id: `l-${l.id}`, created_at: l.created_at, data: l })),
      ...comments.map((c) => ({ kind: "comment", id: `c-${c.id}`, created_at: c.created_at, data: c })),
      ...attachments.map((a) => ({ kind: "attachment", id: `a-${a.id}`, created_at: a.created_at, data: a }))
    ];
    arr.sort((x, y) => new Date(y.created_at) - new Date(x.created_at));
    return arr;
  }, [comments, attachments, timeline]);

  const submit = async () => {
    const v = texto.trim();
    if (!v) return;
    setSending(true);
    try {
      await onAddComment(v);
      setTexto("");
    } finally {
      setSending(false);
    }
  };

  const upload = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      await onUploadAttachment(file);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) await upload(file);
  };

  return (
    <section className="dwr-section">
      <div className="dwr-section-head">
        <span className="dwr-label">Atividade</span>
        {items.length > 0 && <span className="dwr-count">{items.length} eventos</span>}
      </div>

      {/* Composer */}
      <div
        className={`composer ${dragOver ? "drag-over" : ""}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
      >
        <div className="composer-row">
          <div className="avatar avatar-sm">{initials(currentUser?.nome)}</div>
          <textarea
            rows={2}
            placeholder="Comente, registre uma decisão ou solte um arquivo aqui..."
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
            }}
          />
        </div>
        <div className="composer-actions">
          <button
            className="composer-attach"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            title="Anexar arquivo"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            {uploading ? "Enviando..." : "Anexar"}
          </button>
          <input
            ref={fileRef}
            type="file"
            style={{ display: "none" }}
            onChange={(e) => upload(e.target.files?.[0])}
          />
          <span className="muted composer-hint">Ctrl + Enter envia</span>
          <button
            className="btn-primary"
            onClick={submit}
            disabled={!texto.trim() || sending}
          >
            {sending ? "Enviando..." : "Comentar"}
          </button>
        </div>
        {dragOver && <div className="drop-hint">Solte para anexar</div>}
      </div>

      {/* Feed */}
      <ul className="activity-feed">
        {items.length === 0 && (
          <li className="muted" style={{ fontSize: 13, padding: 8 }}>
            Nenhuma atividade registrada ainda.
          </li>
        )}

        {items.map((it) => {
          if (it.kind === "comment") {
            const c = it.data;
            const canDelete = currentUser?.role === "ADMIN" || currentUser?.id === c.usuario.id;
            return (
              <li key={it.id} className="act-item act-comment">
                <div className="avatar avatar-sm">{initials(c.usuario.nome)}</div>
                <div className="act-body">
                  <div className="act-meta">
                    <strong>{c.usuario.nome}</strong>
                    <span className="muted">comentou · {relativeTime(c.created_at)}</span>
                    {canDelete && (
                      <button
                        className="icon-btn icon-danger act-del"
                        title="Excluir comentário"
                        onClick={() => onDeleteComment(c.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                  <div className="act-bubble">{c.conteudo}</div>
                </div>
              </li>
            );
          }

          if (it.kind === "attachment") {
            const a = it.data;
            const canDelete = currentUser?.role === "ADMIN" || currentUser?.id === a.uploaded_by.id;
            return (
              <li key={it.id} className="act-item act-attachment">
                <div className="avatar avatar-sm">{initials(a.uploaded_by.nome)}</div>
                <div className="act-body">
                  <div className="act-meta">
                    <strong>{a.uploaded_by.nome}</strong>
                    <span className="muted">anexou um arquivo · {relativeTime(a.created_at)}</span>
                  </div>
                  <div className="att-card">
                    <span className="att-icon">{fileIcon(a.nome_arquivo)}</span>
                    <div className="att-info">
                      <div className="att-name">{a.nome_arquivo}</div>
                      <div className="muted att-sub">{formatSize(a.tamanho)}</div>
                    </div>
                    <button
                      className="icon-btn"
                      title="Baixar"
                      onClick={() => downloadAttachment(a.id, a.nome_arquivo)}
                    >
                      ↓
                    </button>
                    {canDelete && (
                      <button
                        className="icon-btn icon-danger"
                        title="Excluir anexo"
                        onClick={() => onDeleteAttachment(a.id)}
                      >
                        ×
                      </button>
                    )}
                  </div>
                </div>
              </li>
            );
          }

          // log
          const log = it.data;
          const { author, texto } = logSentence(log, users, columns);
          return (
            <li key={it.id} className="act-item act-log">
              <div className="act-dot" />
              <div className="act-body">
                <span className="act-log-text">
                  <strong>{author}</strong> {texto}
                </span>
                <span className="muted act-log-time">{relativeTime(log.created_at)}</span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
