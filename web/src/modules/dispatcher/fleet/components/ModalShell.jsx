import { useEscapeKey } from "@/shared/hooks/useEscapeKey";

// The frame every Fleet dialog shares — the same `.overlay` / `.modal` look as the Orders and
// Employees dialogs. While `busy` (a request is in flight) it can't be dismissed.
export default function ModalShell({
  id, title, description, onClose, busy = false, maxWidth = 560, role = "dialog", children,
}) {
  useEscapeKey(onClose, busy);

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        className="modal" style={{ maxWidth }} role={role} aria-modal="true"
        aria-labelledby={`${id}-title`} aria-describedby={description ? `${id}-desc` : undefined}
      >
        <header className="modal-head">
          <div>
            <h2 id={`${id}-title`}>{title}</h2>
            {description && <p id={`${id}-desc`}>{description}</p>}
          </div>
          <button type="button" className="x-btn" onClick={onClose} disabled={busy} aria-label="Close">✕</button>
        </header>
        {children}
      </div>
    </div>
  );
}
