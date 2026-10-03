import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { RefreshCw, Search } from "lucide-react";

import { useAppSelector } from "@/store/hooks";
import { selectUser } from "@/modules/auth/slices/authSlice";
import { ROLE_LABELS, USER_ROLES } from "@/constants/app.constants";
import { getApiErrorMessage } from "@/shared/utils/apiError";
import TopBar from "../../../shared/components/TopBar.jsx";
import Sidebar from "../../../shared/components/Sidebar.jsx";
import OrderTabs from "../Orders/OrderTabs.jsx";
import { ChevronDownIcon } from "../Orders/Icons.jsx";
import EmployeesTable from "./EmployeesTable.jsx";
import ApproveEmployeeModal from "./ApproveEmployeeModal.jsx";
import RemoveEmployeeModal from "./RemoveEmployeeModal.jsx";
import { useGetEmployeesQuery, useGetPendingEmployeesQuery } from "./employeesApi.js";
import { matchesQuery } from "./employeeUtils.js";

const PAGE_SIZE = 10;
const NEW_REGISTRATION_POLL_MS = 30_000;
const TABS = [
  { id: "pending", label: "Pending Approval" },
  { id: "employees", label: "Employees" },
];
// Roles a person can register as (ADMIN has no self-registration)
const ROLE_FILTERS = [USER_ROLES.DISPATCHER, USER_ROLES.LOADER, USER_ROLES.DRIVER, USER_ROLES.STORE_MANAGER];

function loadErrorMessage(error) {
  if (!error) return null;
  if (error.status === 403) return "You don't have permission to manage employees.";
  return getApiErrorMessage(error, "Unable to load employees. Please try again.");
}

export default function EmployeesPage() {
  const currentUser = useAppSelector(selectUser);

  const [tab, setTab] = useState("pending");
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("ALL");
  const [page, setPage] = useState(1);
  const [approveTarget, setApproveTarget] = useState(null);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef(null);

  // New registrations arrive while the page is open, so the pending list is polled.
  const pendingQuery = useGetPendingEmployeesQuery(undefined, {
    refetchOnMountOrArgChange: true,
    pollingInterval: NEW_REGISTRATION_POLL_MS,
    skipPollingIfUnfocused: true,
  });
  const employeesQuery = useGetEmployeesQuery(undefined, { refetchOnMountOrArgChange: true });
  const activeQuery = tab === "pending" ? pendingQuery : employeesQuery;

  useEffect(() => () => window.clearTimeout(toastTimer.current), []);

  const notify = useCallback((message) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(""), 4000);
  }, []);

  const counts = {
    pending: pendingQuery.data?.length ?? "–",
    employees: employeesQuery.data?.length ?? "–",
  };

  const filtered = useMemo(
    () => (activeQuery.data ?? []).filter(
      (person) => (role === "ALL" || person.role === role) && matchesQuery(person, query),
    ),
    [activeQuery.data, role, query],
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount); // the last page can vanish after a delete
  const rows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const isFiltering = query.trim() !== "" || role !== "ALL";
  const emptyMessage = isFiltering
    ? "No matches for your search."
    : tab === "pending"
      ? "No registrations are waiting for approval."
      : "No approved employees yet.";

  const changeTab = (next) => { setTab(next); setPage(1); };
  const refreshAll = () => { pendingQuery.refetch(); employeesQuery.refetch(); };

  const closeApprove = useCallback(() => setApproveTarget(null), []);
  const closeRemove = useCallback(() => setRemoveTarget(null), []);

  return (
    <div className="app">
      <TopBar />
      <Sidebar active="employees" />
      <main className="workspace">
        <div className="main-col">
          <h1>Store Employees</h1>
          <p className="subtitle">Approve new registrations and manage your store team.</p>

          <OrderTabs tabs={TABS} counts={counts} active={tab} onChange={changeTab} />

          <div className="filters">
            <div className="search-field">
              <Search className="search-icon" size={16} aria-hidden="true" />
              <input
                className="search" type="search" placeholder="Search employees…" aria-label="Search employees"
                value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }}
              />
            </div>

            <label className="select">
              <select value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} aria-label="Filter by role">
                <option value="ALL">All Roles</option>
                {ROLE_FILTERS.map((value) => <option key={value} value={value}>{ROLE_LABELS[value]}</option>)}
              </select>
              <ChevronDownIcon className="select-caret" />
            </label>

            <button type="button" className="btn refresh-btn" onClick={refreshAll} disabled={activeQuery.isFetching}>
              <RefreshCw size={14} className={activeQuery.isFetching ? "spinning" : undefined} aria-hidden="true" />
              Refresh
            </button>
          </div>

          <EmployeesTable
            mode={tab}
            rows={rows}
            total={filtered.length}
            page={currentPage}
            pageCount={pageCount}
            onPage={setPage}
            currentUserId={currentUser?.id}
            onApprove={setApproveTarget}
            onRemove={setRemoveTarget}
            state={{
              isLoading: activeQuery.isLoading,
              // keep showing the last good list if only a background refresh failed
              errorMessage: activeQuery.data ? null : loadErrorMessage(activeQuery.error),
              onRetry: activeQuery.refetch,
              emptyMessage,
            }}
          />
        </div>
      </main>

      {approveTarget && (
        <ApproveEmployeeModal
          key={approveTarget.id}
          employee={approveTarget}
          onClose={closeApprove}
          onApproved={(message) => { closeApprove(); notify(message); }}
          onStale={(message) => { closeApprove(); refreshAll(); notify(message); }}
        />
      )}

      {removeTarget && (
        <RemoveEmployeeModal
          key={removeTarget.id}
          employee={removeTarget}
          onClose={closeRemove}
          onRemoved={(message) => { closeRemove(); notify(message); }}
          onStale={(message) => { closeRemove(); refreshAll(); notify(message); }}
        />
      )}

      {toast && <div className="toast" role="status">{toast}</div>}
    </div>
  );
}
