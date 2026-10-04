import { useState } from "react";
import { getApiErrorMessage } from "@/shared/utils/apiError";
import { useDeleteEmployeeMutation } from "./employeesApi";
import { roleLabel } from "./employeeUtils";
import { useEscapeKey } from "@/shared/hooks/useEscapeKey";

// The API has a single DELETE, used both to reject a pending registration and to remove an
// approved employee — only the wording differs.
// onRemoved(message)  - deleted; close and show the message
// onStale(message)    - already deleted elsewhere; close, refresh the lists, show the message
export default function RemoveEmployeeModal({ employee, onClose, onRemoved, onStale }) {
  const [deleteEmployee, { isLoading }] = useDeleteEmployeeMutation();
  const [error, setError] = useState("");

  const isPending = !employee.isApproved;
  useEscapeKey(onClose, isLoading);

  const confirm = async () => {
    setError("");
    try {
      await deleteEmployee({ userId: employee.id }).unwrap();
      onRemoved(isPending ? `${employee.fullName}'s registration was rejected.` : `${employee.fullName} was removed.`);
    } catch (err) {
      if (err?.status === 404) {
        onStale(getApiErrorMessage(err, "This user no longer exists."));
        return;
      }
      // 409 (has orders/trips and cannot be deleted), 400, 429, network…
      setError(getApiErrorMessage(err, "Unable to delete this user. Please try again."));
    }
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !isLoading && onClose()}>
      <div className="modal" style={{ maxWidth: 480 }} role="alertdialog" aria-modal="true" aria-labelledby="remove-title" aria-describedby="remove-desc">
        <header className="modal-head">
          <div>
            <h2 id="remove-title">{isPending ? "Reject Registration" : "Remove Employee"}</h2>
            <p id="remove-desc">
              {isPending
                ? "This permanently deletes the registration. They will not be able to sign in, but can register again."
                : "This permanently deletes the account and revokes access. This cannot be undone."}
            </p>
          </div>
          <button type="button" className="x-btn" onClick={onClose} disabled={isLoading} aria-label="Close">✕</button>
        </header>

        <div className="modal-scroll" style={{ paddingBottom: 20 }}>
          <div className="strip">
            <b>{employee.fullName}</b>
            <span>{roleLabel(employee.role)}</span>
            <span>{employee.email}</span>
            {employee.employeeNumber && <span>{employee.employeeNumber}</span>}
          </div>

          {!isPending && (
            <p className="banner idle">
              Employees with orders, trips or deliveries on record cannot be deleted.
            </p>
          )}

          {error && <p className="emp-alert" role="alert">{error}</p>}
        </div>

        <div className="modal-foot">
          <button type="button" className="btn" onClick={onClose} disabled={isLoading}>
            {isPending ? "Keep Registration" : "Keep Employee"}
          </button>
          <button type="button" className="btn danger-solid" onClick={confirm} disabled={isLoading} autoFocus>
            {isLoading ? "Deleting…" : isPending ? "Reject & Delete" : "Remove Employee"}
          </button>
        </div>
      </div>
    </div>
  );
}
