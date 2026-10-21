import { Component, StrictMode } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";
class ErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(_error: Error, _info: ErrorInfo) {
    /* Do not send medical state or error objects to third-party telemetry. */
  }
  render() {
    return this.state.failed ? (
      <main className="fatal-state">
        <h1>Let’s take a fresh look.</h1>
        <p>
          The interface encountered an unexpected error. No new report was saved
          automatically. Refresh to restart; unsaved inputs may be lost.
        </p>
        <button onClick={() => location.reload()}>Refresh HealthAssist</button>
      </main>
    ) : (
      this.props.children
    );
  }
}
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
