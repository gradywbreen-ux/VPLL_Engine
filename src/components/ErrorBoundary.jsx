import { Component } from "react";

/* ============================================================
   ERROR BOUNDARY

   If any component throws during render, React 18 offers no hook
   equivalent for catching it — this has to be a class component
   (getDerivedStateFromError/componentDidCatch are class-only APIs).
   Wraps <App/> in main.jsx, outside everything else, specifically so it
   still renders correctly even if the crash happened before the app's
   own <style>{STYLES}</style> tag (src/styles/styles.js) ever mounted —
   every color/font below is inlined rather than relying on the
   .vpll-root CSS variables or the Google Fonts import, since neither is
   guaranteed to be present at this point.

   Before this, any render-time exception anywhere in the tree took the
   whole app to a blank white screen with no recovery path — not even
   the "the presses jammed" graceful-failure banner Press Box already
   uses for its own (much narrower) failure cases. This is that same
   idea, scaled up to the whole app.
   ============================================================ */
const COLORS = {
  paper: "#E4DFCE", ink: "#16241C", inkSoft: "#3A4A3E",
  forest: "#1F4430", maple: "#C6871F", barn: "#8E3B2E", white: "#FAF8F1", line: "rgba(22,36,28,0.16)",
};

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error("VPLL Engine crashed:", error, info.componentStack); // this IS the crash log — nowhere else for it to go
  }

  handleReload = () => {
    window.location.reload();
  };

  handleClearAndReload = () => {
    for (const key of [
      "vpll-league-data-state", "vpll-meta-state", "vpll-year1-state",
      "vpll-season-state", "vpll-game-history", "vpll-pressbox-archive",
    ]) {
      try { localStorage.removeItem(key); } catch { /* best-effort — reload happens regardless */ }
    }
    window.location.reload();
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{
        minHeight: "100vh", background: COLORS.paper, color: COLORS.ink,
        fontFamily: "Georgia, 'Times New Roman', serif",
        display: "flex", alignItems: "center", justifyContent: "center", padding: 24,
      }}>
        <div style={{
          maxWidth: 520, width: "100%", background: COLORS.white, border: `1px solid ${COLORS.line}`,
          borderTop: `4px solid ${COLORS.barn}`, borderRadius: 3, padding: "28px 30px",
        }}>
          <div style={{
            fontFamily: "'Courier New', monospace", fontSize: 11, letterSpacing: "0.16em",
            textTransform: "uppercase", color: COLORS.barn, marginBottom: 8,
          }}>
            Scoreboard Malfunction
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: "0 0 10px 0", lineHeight: 1.25 }}>
            Something in the press box gave out.
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.6, color: COLORS.inkSoft, margin: "0 0 20px 0" }}>
            The engine hit an error it couldn't recover from on its own. A reload usually brings
            the broadcast back — if it keeps happening, your saved league data may be the cause,
            and clearing it will start fresh from Year 1.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
            <button
              onClick={this.handleReload}
              style={{
                background: COLORS.forest, color: COLORS.white, border: "none", borderRadius: 2,
                padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              Reload
            </button>
            <button
              onClick={this.handleClearAndReload}
              style={{
                background: "transparent", color: COLORS.barn, border: `1px solid ${COLORS.barn}`,
                borderRadius: 2, padding: "9px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer",
              }}
            >
              Clear saved data &amp; reload
            </button>
          </div>
          <details style={{ fontFamily: "'Courier New', monospace", fontSize: 11.5, color: COLORS.inkSoft }}>
            <summary style={{ cursor: "pointer", color: COLORS.maple }}>Technical details</summary>
            <pre style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", marginTop: 8 }}>
              {String(this.state.error?.stack || this.state.error?.message || this.state.error)}
            </pre>
          </details>
        </div>
      </div>
    );
  }
}
