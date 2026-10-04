import { getAvatarColor, getInitials } from "@/shared/utils/userUtils";
import { formatDateTime } from "@/shared/utils/dateUtils";
import { pagerItems, roleLabel } from "./employeeUtils";

const COLUMNS = {
  pending: ["Name", "Role", "Phone", "Registered", "Status", "Actions"],
  employees: ["Name", "Employee No.", "Role", "Outlet", "Phone", "Status", "Actions"],
};

function Person({ employee, isSelf }) {
  return (
    <div className="person" role="cell">
      <span className="avatar-sm" style={{ background: getAvatarColor(employee.fullName) }} aria-hidden="true">
        {getInitials(employee.fullName)}
      </span>
      <div className="cell">
        <strong>
          {employee.fullName}
          {isSelf && <span className="you-tag">You</span>}
        </strong>
        <small title={employee.email}>{employee.email}</small>
      </div>
    </div>
  );
}

function StatusBadge({ mode, employee }) {
  if (mode === "pending") return <span className="badge pending">Pending approval</span>;
  return employee.isActive
    ? <span className="badge active">Active</span>
    : <span className="badge inactive">Inactive</span>;
}

function Pager({ page, pageCount, onPage }) {
  return (
    <div className="pager">
      <button type="button" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">‹</button>
      {pagerItems(page, pageCount).map((item, i) => (
        item === "gap"
          ? <span key={`gap-${i}`} className="pager-gap" aria-hidden="true">…</span>
          : (
            <button
              type="button" key={item} className={item === page ? "on" : ""}
              aria-label={`Page ${item}`} aria-current={item === page ? "page" : undefined}
              onClick={() => onPage(item)}
            >
              {item}
            </button>
          )
      ))}
      <button type="button" onClick={() => onPage(page + 1)} disabled={page >= pageCount} aria-label="Next page">›</button>
    </div>
  );
}

// mode: "pending" (registrations awaiting approval) | "employees" (approved)
// state: { isLoading, errorMessage, onRetry, emptyMessage }
export default function EmployeesTable({
  mode, rows, total, page, pageCount, onPage, currentUserId, onApprove, onRemove, state,
}) {
  const noun = mode === "pending" ? "registrations" : "employees";

  return (
    <section className="card table-card">
      <div className="table-scroll" role="table" aria-label={mode === "pending" ? "Registrations awaiting approval" : "Approved employees"}>
        <div className={`erow head ${mode}`} role="row">
          {COLUMNS[mode].map((label) => (
            <span key={label} role="columnheader" className={label === "Actions" ? "right" : undefined}>{label}</span>
          ))}
        </div>

        {state.isLoading && <div className="empty" role="status">Loading {noun}…</div>}

        {!state.isLoading && state.errorMessage && (
          <div className="empty" role="alert">
            <p>{state.errorMessage}</p>
            <button type="button" className="btn sm retry-btn" onClick={state.onRetry}>Try again</button>
          </div>
        )}

        {!state.isLoading && !state.errorMessage && rows.length === 0 && (
          <div className="empty">{state.emptyMessage}</div>
        )}

        {!state.errorMessage && rows.map((employee) => {
          const isSelf = employee.id === currentUserId;
          return (
            <div key={employee.id} className={`erow body ${mode}`} role="row">
              <Person employee={employee} isSelf={isSelf} />

              {mode === "employees" && (
                <div className="cell mono" role="cell">{employee.employeeNumber ?? "—"}</div>
              )}

              <div className="cell" role="cell">{roleLabel(employee.role)}</div>

              {mode === "employees" && (
                <div className="cell" role="cell">
                  <span>{employee.outlet?.name ?? "—"}</span>
                  {employee.outlet && <small>{[employee.outlet.code, employee.outlet.district].filter(Boolean).join(" · ")}</small>}
                </div>
              )}

              <div className="cell" role="cell">{employee.phone || "—"}</div>

              {mode === "pending" && (
                <div className="cell" role="cell">{formatDateTime(employee.createdAt)}</div>
              )}

              <div className="cell" role="cell"><StatusBadge mode={mode} employee={employee} /></div>

              <div className="row-actions" role="cell">
                {mode === "pending" ? (
                  <>
                    <button type="button" className="btn primary sm" onClick={() => onApprove(employee)} aria-label={`Approve ${employee.fullName}`}>
                      Approve
                    </button>
                    <button type="button" className="btn danger sm" onClick={() => onRemove(employee)} aria-label={`Reject ${employee.fullName}`}>
                      Reject
                    </button>
                  </>
                ) : (
                  <button
                    type="button" className="btn danger sm" onClick={() => onRemove(employee)}
                    disabled={isSelf} title={isSelf ? "You can't remove your own account" : undefined}
                    aria-label={`Remove ${employee.fullName}`}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <footer className="table-foot">
        <span>Showing {rows.length} of {total} {noun}</span>
        {pageCount > 1 && <Pager page={page} pageCount={pageCount} onPage={onPage} />}
      </footer>
    </section>
  );
}
