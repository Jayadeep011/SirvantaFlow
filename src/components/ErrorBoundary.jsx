// src/components/ErrorBoundary.jsx
// Catches a crash inside a page and shows what went wrong instead of a blank screen.
// A route-level boundary resets itself when you navigate to another page.

import React from 'react';
import { CARD, MUTED, BTN_GOLD, BTN_OUTLINE } from '../ui';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, copied: false };
    this.reset = this.reset.bind(this);
    this.copy = this.copy.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error, copied: false };
  }

  componentDidCatch(error, info) {
    console.error('Sirvanta render error:', error, info && info.componentStack);
    this.info = info && info.componentStack ? info.componentStack : '';
  }

  componentDidUpdate(prev) {
    if (this.state.error && prev.resetKey !== this.props.resetKey) this.reset();
  }

  reset() {
    this.setState({ error: null, copied: false });
  }

  details() {
    const e = this.state.error;
    return `${e && e.name ? e.name : 'Error'}: ${e && e.message ? e.message : String(e)}\n${e && e.stack ? e.stack : ''}\n${this.info || ''}`.trim();
  }

  async copy() {
    try {
      await navigator.clipboard.writeText(this.details());
      this.setState({ copied: true });
    } catch {
      this.setState({ copied: false });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;
    const message = this.state.error && this.state.error.message ? this.state.error.message : 'Unknown error';
    return (
      <div role="alert" className={`${CARD} mx-auto my-10 max-w-2xl p-6`}>
        <p className="label-caps">Something went wrong</p>
        <h2 className="mt-1 text-xl font-semibold">This page hit an error</h2>
        <p className={`mt-2 text-sm ${MUTED}`}>Your data is safe: it is stored in your browser and was not changed. You can try again, reload, or open another page from the menu.</p>
        <p className="num mt-4 break-words rounded-lg bg-rose-500/10 p-3 text-sm text-rose-700 dark:text-rose-300">{message}</p>
        <details className="mt-3 text-xs">
          <summary className="cursor-pointer font-semibold">Technical details</summary>
          <pre className="num mt-2 max-h-56 overflow-auto whitespace-pre-wrap rounded-lg bg-black/5 p-3 dark:bg-white/5">{this.details()}</pre>
        </details>
        <div className="mt-5 flex flex-wrap gap-3">
          <button onClick={this.reset} className={BTN_GOLD}>Try again</button>
          <button onClick={() => window.location.reload()} className={BTN_OUTLINE}>Reload</button>
          <button onClick={this.copy} className={BTN_OUTLINE}>{this.state.copied ? 'Copied' : 'Copy error details'}</button>
          <a href="/" className={`${BTN_OUTLINE}`}>Home</a>
        </div>
      </div>
    );
  }
}
