import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default class ErrorBoundary extends Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Unhandled UI error', error, info?.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
        <AlertTriangle className="size-10 text-amber-500" />
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-muted-foreground">
          This page hit an unexpected error. Reloading usually fixes it; your data is safe.
        </p>
        <div className="flex gap-2">
          <Button type="button" onClick={() => window.location.reload()}>Reload page</Button>
          <Button type="button" variant="outline" onClick={() => { window.location.href = '/'; }}>Go home</Button>
        </div>
      </div>
    );
  }
}
