import { useState } from "react";

export default function CancelOrderModal({ order, isOpen, onClose, onConfirm, busy }) {
  const [reason, setReason] = useState("");

  if (!isOpen || !order) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onConfirm(order, reason.trim() || undefined);
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }} role="dialog" aria-modal="true" aria-labelledby="cancel-title">
        <header className="modal-head">
          <div>
            <h2 id="cancel-title">Cancel Order</h2>
            <p>This action will mark the order as cancelled and release reserved resources.</p>
          </div>
          <button className="x-btn" onClick={onClose} disabled={busy} aria-label="Close">✕</button>
        </header>

        <form onSubmit={handleSubmit}>
          <div className="modal-scroll" style={{ padding: "0 24px 20px" }}>
            <div className="strip" style={{ marginBottom: 16 }}>
              <b>{order.id}</b>
              <span>{order.outlet}</span>
              <span>{order.items} items</span>
              <span>{order.weight} kg</span>
            </div>

            <label style={{ display: "block", marginBottom: 8, fontSize: 13, fontWeight: 600 }}>
              Cancellation Reason <span style={{ color: "var(--stone)", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value.slice(0, 300))}
              placeholder="e.g. Customer requested cancellation, duplicate order..."
              rows={3}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 6,
                border: "1px solid var(--porcelain)",
                font: "inherit",
                fontSize: 13,
                resize: "vertical",
                boxSizing: "border-box",
              }}
              disabled={busy}
            />
            <small style={{ color: "var(--stone)", display: "block", marginTop: 4 }}>
              {300 - reason.length} characters remaining
            </small>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, padding: "16px 24px", borderTop: "1px solid var(--porcelain)" }}>
            <button type="button" className="btn" onClick={onClose} disabled={busy}>
              Keep Order
            </button>
            <button type="submit" className="btn danger-solid" disabled={busy}>
              {busy ? "Cancelling..." : "Confirm Cancellation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
