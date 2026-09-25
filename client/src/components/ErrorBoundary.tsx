import { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("ErrorBoundary caught an unhandled error:", error, errorInfo);
    }
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#07070D",
            color: "#EDE8D8",
            fontFamily: "Outfit, sans-serif",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#0F0F1A",
              border: "1px solid rgba(255, 45, 120, 0.3)",
              borderRadius: 16,
              padding: "40px 32px",
              maxWidth: 480,
              textAlign: "center",
              boxShadow: "0 8px 32px rgba(0,0,0,0.8)",
            }}
          >
            <div style={{ fontSize: 48, color: "#FF2D78", marginBottom: 16 }}>⚠</div>
            <h2
              style={{
                fontFamily: "Cinzel, serif",
                fontSize: 22,
                fontWeight: 700,
                color: "#FFD166",
                margin: "0 0 12px",
              }}
            >
              Something Went Wrong
            </h2>
            <p style={{ fontSize: 14, color: "#9A94A8", lineHeight: 1.6, margin: "0 0 24px" }}>
              An unexpected application error occurred. You can safely attempt to refresh the session.
            </p>
            <button
              onClick={this.handleReset}
              style={{
                background: "linear-gradient(135deg, #C9993A, #FFD166)",
                border: "none",
                borderRadius: 8,
                padding: "12px 24px",
                color: "#07070D",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                fontFamily: "Outfit, sans-serif",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
