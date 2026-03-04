import React from 'react';

/**
 * Top-level error boundary. Catches render errors anywhere in the tree
 * and shows a friendly recovery UI instead of a blank white screen.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
    this.handleReset = this.handleReset.bind(this);
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught an error:', error, info);
  }

  handleReset() {
    localStorage.clear();
    window.location.reload();
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '3rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2>Something went wrong</h2>
          <p style={{ color: '#555', margin: '1rem 0 2rem' }}>
            An unexpected error occurred in the calculator. Your data may be corrupt.
            Click below to reset everything and start fresh.
          </p>
          <button
            onClick={this.handleReset}
            style={{
              background: '#c62828', color: '#fff', border: 'none',
              padding: '0.75rem 1.5rem', borderRadius: '4px',
              fontSize: '1rem', cursor: 'pointer',
            }}
          >
            Reset Data &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
