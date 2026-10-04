import { useState } from "react";
import { getApiErrorMessage } from "@/shared/utils/apiError";
import { formatDateTime } from "@/shared/utils/dateUtils";
import { useApproveEmployeeMutation } from "./employeesApi";
import { roleLabel } from "./employeeUtils";
import { useEscapeKey } from "@/shared/hooks/useEscapeKey";

// Approving generates the employee number and emails the employee their sign-in details.
// onApproved(message)  - approved; close and show the message
// onStale(message)     - the registration was already approved/deleted elsewhere; close, refresh, show the message
export default function ApproveEmployeeModal({ employee, onClose, onApproved, onStale }) {
  const [approve, { isLoading: isApproving }] = useApproveEmployeeMutation();
  const [error, setError] = useState("");

  useEscapeKey(onClose, isApproving);

  const submit = async (event) => {
    event.preventDefault();
    if (isApproving) return;

    setError("");
    try {
      const approved = await approve({ userId: employee.id }).unwrap();
      // fall back to the row we approved if the response carries no body
      const name = approved?.fullName ?? employee.fullName;
      const number = approved?.employeeNumber;
      onApproved(`${name} approved${number ? ` as ${number}` : ""}. They can now sign in.`);
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to approve this employee. Please try again.");

      if (err?.status === 404 || err?.status === 409) {
        onStale(message);
        return;
      }

      setError(message);
    }
  };

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !isApproving && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }} role="dialog" aria-modal="true" aria-labelledby="approve-title">
        <header className="modal-head">
          <div>
            <h2 id="approve-title">Approve Employee</h2>
            <p>Approve {employee.fullName} so they can sign in.</p>
          </div>
          <button type="button" className="x-btn" onClick={onClose} disabled={isApproving} aria-label="Close">✕</button>
        </header>

        <form onSubmit={submit}>
          <div className="modal-scroll">
            <div className="strip" style={{ marginBottom: 16 }}>
              <b>{employee.fullName}</b>
              <span>{roleLabel(employee.role)}</span>
              <span>{employee.email}</span>
              {employee.phone && <span>{employee.phone}</span>}
              <span>Registered {formatDateTime(employee.createdAt)}</span>
            </div>

            <p className="banner idle">
              An employee number is generated automatically and the employee is emailed their sign-in details.
            </p>

            {error && <p className="emp-alert" role="alert">{error}</p>}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn" onClick={onClose} disabled={isApproving}>Cancel</button>
            <button type="submit" className="btn primary" disabled={isApproving}>
              {isApproving ? "Approving…" : "Approve Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
