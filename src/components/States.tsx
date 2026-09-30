import type { ReactNode } from "react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="state" role="status" aria-live="polite">
      {label}
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="card state">
      <h3>{title}</h3>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="card state" role="alert">
      <h3>Could not load</h3>
      <p>{message}</p>
      {onRetry ? (
        <p style={{ marginTop: 16 }}>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onRetry}>
            Try again
          </button>
        </p>
      ) : null}
    </div>
  );
}

export function CardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid--cards" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="card gcard">
          <div className="gcard__media skeleton" />
          <div className="gcard__body">
            <div className="skeleton" style={{ height: 18, width: "70%" }} />
            <div className="skeleton" style={{ height: 12, width: "40%" }} />
          </div>
        </div>
      ))}
    </div>
  );
}
