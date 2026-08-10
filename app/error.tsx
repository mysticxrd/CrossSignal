"use client";

export default function AppError({ reset }: { reset: () => void }) {
  return (
    <main className="error-shell">
      <div className="error-card">
        <span className="eyebrow">RECORDER INTERRUPTION</span>
        <h1>CrossSignal couldn’t load this workspace.</h1>
        <p>No source data was changed. Retry the authenticated request, or return after the workspace service recovers.</p>
        <button className="button button-primary" onClick={reset}>Retry workspace</button>
      </div>
    </main>
  );
}
