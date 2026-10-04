import { useMemo, useState } from "react";
import { getApiErrorMessage } from "@/shared/utils/apiError";
import { formatDateTime } from "@/shared/utils/dateUtils";
import { useApproveEmployeeMutation, useGetOutletsQuery } from "./employeesApi";
import { roleLabel } from "./employeeUtils";
import { useEscapeKey } from "./useEscapeKey";

const matchesOutlet = (outlet, needle) =>
  [outlet.name, outlet.code, outlet.district, outlet.brand, outlet.depot?.name]
    .some((field) => field?.toLowerCase().includes(needle));

// Approving needs an outlet: the backend assigns it together with the generated employee number.
// onApproved(message)  - approved; close and show the message
// onStale(message)     - the registration was already approved/deleted elsewhere; close, refresh, show the message
export default function ApproveEmployeeModal({ employee, onClose, onApproved, onStale }) {
  const [approve, { isLoading: isApproving }] = useApproveEmployeeMutation();
  const { data: outlets = [], isLoading: loadingOutlets, isFetching: fetchingOutlets, error: outletsError, refetch: refetchOutlets } = useGetOutletsQuery();

  const [outletId, setOutletId] = useState("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  useEscapeKey(onClose, isApproving);

  const visibleOutlets = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return needle ? outlets.filter((outlet) => matchesOutlet(outlet, needle)) : outlets;
  }, [outlets, search]);

  const submit = async (event) => {
    event.preventDefault();
    if (!outletId || isApproving) return;

    setError("");
    try {
      const approved = await approve({ userId: employee.id, outletId }).unwrap();
      // fall back to the row we approved if the response carries no body
      const name = approved?.fullName ?? employee.fullName;
      const number = approved?.employeeNumber;
      onApproved(`${name} approved${number ? ` as ${number}` : ""}. They can now sign in.`);
    } catch (err) {
      const message = getApiErrorMessage(err, "Unable to approve this employee. Please try again.");
      const isOutletProblem = /outlet/i.test(err?.data?.message ?? "");

      if ((err?.status === 404 || err?.status === 409) && !isOutletProblem) {
        onStale(message);
        return;
      }

      if (isOutletProblem) {
        // the cached outlet list is out of date (outlet removed or deactivated)
        setOutletId("");
        refetchOutlets();
      }
      setError(message);
    }
  };

  const outletsMessage = outletsError
    ? getApiErrorMessage(outletsError, "Unable to load outlets.")
    : null;

  return (
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && !isApproving && onClose()}>
      <div className="modal" style={{ maxWidth: 560 }} role="dialog" aria-modal="true" aria-labelledby="approve-title">
        <header className="modal-head">
          <div>
            <h2 id="approve-title">Approve Employee</h2>
            <p>Assign an outlet to let {employee.fullName} sign in.</p>
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

            <label className="field-label" htmlFor="outlet-search">Assign outlet</label>
            <input
              id="outlet-search" className="search outlet-search" type="search" placeholder="Search by outlet, code, district or brand…"
              value={search} onChange={(e) => setSearch(e.target.value)} disabled={isApproving || loadingOutlets}
              autoFocus
            />

            <div className="outlet-list" role="radiogroup" aria-label="Outlets">
              {loadingOutlets && <div className="empty">Loading outlets…</div>}

              {!loadingOutlets && outletsMessage && (
                <div className="empty" role="alert">
                  <p>{outletsMessage}</p>
                  <button type="button" className="btn sm retry-btn" onClick={refetchOutlets} disabled={fetchingOutlets}>Try again</button>
                </div>
              )}

              {!loadingOutlets && !outletsMessage && outlets.length === 0 && (
                <div className="empty">No active outlets are available to assign.</div>
              )}

              {!loadingOutlets && !outletsMessage && outlets.length > 0 && visibleOutlets.length === 0 && (
                <div className="empty">No outlets match “{search.trim()}”.</div>
              )}

              {visibleOutlets.map((outlet) => (
                <label key={outlet.id} className={`outlet-option${outlet.id === outletId ? " selected" : ""}`}>
                  <input
                    type="radio" name="outlet" value={outlet.id}
                    checked={outlet.id === outletId} onChange={() => setOutletId(outlet.id)} disabled={isApproving}
                  />
                  <span className="cell">
                    <strong>{outlet.name}</strong>
                    <small>{[outlet.code, outlet.district, outlet.brand, outlet.depot?.name].filter(Boolean).join(" · ")}</small>
                  </span>
                </label>
              ))}
            </div>

            <p className="banner idle">
              An employee number is generated automatically and the employee is emailed their sign-in details.
            </p>

            {error && <p className="emp-alert" role="alert">{error}</p>}
          </div>

          <div className="modal-foot">
            <button type="button" className="btn" onClick={onClose} disabled={isApproving}>Cancel</button>
            <button type="submit" className="btn primary" disabled={!outletId || isApproving}>
              {isApproving ? "Approving…" : "Approve Employee"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
