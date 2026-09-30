import React, { ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    const errorStr = error.toString();
    if (errorStr.includes('dynamically imported module') || errorStr.includes('Failed to fetch') || errorStr.includes('chunk')) {
      const hasRetried = sessionStorage.getItem('chunk_load_retry');
      if (!hasRetried) {
        return { hasError: false, error: null, errorInfo: null };
      }
    }
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    const errorStr = error.toString();
    if (errorStr.includes('dynamically imported module') || errorStr.includes('Failed to fetch') || errorStr.includes('chunk')) {
      const hasRetried = sessionStorage.getItem('chunk_load_retry');
      if (!hasRetried) {
        sessionStorage.setItem('chunk_load_retry', 'true');
        console.warn('Chunk load error detected. Recovering automatically via hard reload...');
        window.location.reload();
        return;
      }
    }

    // @ts-ignore
    this.setState({
      error,
      errorInfo
    });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', color: '#721c24', background: '#f8d7da', minHeight: '100vh' }}>
          <h2>Application Error</h2>
          <p>{this.state.error && this.state.error.toString()}</p>
          <pre style={{ fontSize: '11px', whiteSpace: 'pre-wrap' }}>
            {this.state.errorInfo?.componentStack}
          </pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '10px', padding: '8px', cursor: 'pointer', marginRight: '10px' }}>Reload</button>
          <button onClick={() => {
            sessionStorage.removeItem('appState_screen');
            window.location.reload();
          }} style={{ marginTop: '10px', padding: '8px', cursor: 'pointer' }}>Reset App State & Reload</button>
        </div>
      );
    }

    // @ts-ignore
    return this.props.children;
  }
}

