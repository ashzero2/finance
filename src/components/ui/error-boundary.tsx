"use client";

import { Component, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div
            style={{
              padding: 32,
              textAlign: "center",
              color: "var(--text-tertiary)",
            }}
          >
            <p style={{ fontSize: 14, marginBottom: 8 }}>
              Something went wrong
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                fontSize: 13,
                color: "var(--accent)",
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              Try again
            </button>
          </div>
        )
      );
    }
    return this.props.children;
  }
}