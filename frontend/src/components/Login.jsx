import { useState } from "react";
import { bootstrap } from "../services/api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("admin@tasksync.com");
  const [senha, setSenha] = useState("admin123");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await onLogin(email, senha);
    } catch (err) {
      const msg = err?.response?.data?.detail || "Falha no login";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrap = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await bootstrap();
      setEmail(res.credentials.email);
      setSenha(res.credentials.senha);
    } catch (err) {
      setError("Falha ao executar bootstrap. Verifique a conexão com o banco.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-shell">
      <aside className="login-hero">
        <div className="brand login-brand-large">
          <div className="brand-mark">TS</div>
          <div>
            TaskSync
            <br />
            <span style={{ fontSize: 13, color: "#dce7fb", letterSpacing: 1.6 }}>CORPORATE KANBAN</span>
          </div>
        </div>
      </aside>

      <section className="login-form-wrap">
        <form className="login-card" onSubmit={handleSubmit}>
          <h2>Acessar plataforma</h2>
          <p className="muted" style={{ marginBottom: 22 }}>
            Use suas credenciais corporativas.
          </p>
          {error && <div className="login-error">{error}</div>}
          <div className="field">
            <label>E-mail</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div className="field">
            <label>Senha</label>
            <input
              type="password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div className="login-actions">
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Entrando..." : "Entrar"}
            </button>
            <button
              type="button"
              className="btn-secondary"
              onClick={handleBootstrap}
              disabled={loading}
            >
              Inicializar dados padrão (primeiro acesso)
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
