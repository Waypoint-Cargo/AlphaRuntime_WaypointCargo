import { useCallback, useEffect, useMemo, useState } from "react";
import TopBar from "../../../shared/components/TopBar.jsx";
import Sidebar from "../../../shared/components/Sidebar.jsx";
import OrderTabs from "./OrderTabs.jsx";
import Filters from "./Filters.jsx";
import OrdersTable from "./OrdersTable.jsx";
import OrderDetailPanel from "./OrderDetailPanel.jsx";
import ReviewOrderModal from "./ReviewOrderModal.jsx";
import CancelOrderModal from "./CancelOrderModal.jsx";
import { getNow } from "./scan.js";
import { TABS, DRIVERS } from "../../../store/orders.js";
import { useCancelOrderMutation, useConfirmOrderMutation, useDeferOrderMutation, useGetOrdersQuery, useSubmitOrderMutation } from "./ordersApi.js";

const PAGE_SIZE = 8;
const EMPTY_COUNTS = { pending: 0, confirmed: 0, planned: 0, transit: 0, delivered: 0 };

export default function OrderPage() {
	const [tab, setTab] = useState("pending");
	const [page, setPage] = useState(1);
	const [filters, setFilters] = useState({ query: "", outlet: "All Outlets", type: "All Order Types", courier: "All Couriers" });
	const [selected, setSelected] = useState(() => new Set());
	const [activeUid, setActiveUid] = useState(null);
	const [reviewUid, setReviewUid] = useState(null);
	const [cancelOrderTarget, setCancelOrderTarget] = useState(null);
	const [toast, setToast] = useState("");

	const { data: ordersResponse, error: ordersError, isLoading, isError, refetch } = useGetOrdersQuery({ page: 1, pageSize: 100 }, { refetchOnMountOrArgChange: true });
	const [confirmOrderMutation, { isLoading: isConfirming }] = useConfirmOrderMutation();
	const [deferOrderMutation, { isLoading: isDeferring }] = useDeferOrderMutation();
	const [submitOrderMutation, { isLoading: isSubmitting }] = useSubmitOrderMutation();
	const [cancelOrderMutation, { isLoading: isCancelling }] = useCancelOrderMutation();

	const orders = useMemo(() => ordersResponse?.items ?? [], [ordersResponse]);
	const counts = useMemo(() => {
		const next = { ...EMPTY_COUNTS };
		for (const order of orders) {
			next[order.status] = (next[order.status] ?? 0) + 1;
		}
		return next;
	}, [orders]);

	const notify = (message) => {
		setToast(message);
		window.clearTimeout(notify.timeoutId);
		notify.timeoutId = window.setTimeout(() => setToast(""), 2600);
	};

	const outlets = useMemo(() => [...new Set(orders.map((order) => order.outlet).filter(Boolean))], [orders]);
	const types = useMemo(() => [...new Set(orders.map((order) => order.type).filter(Boolean))], [orders]);
	const couriers = useMemo(() => {
		const names = orders
			.map((order) => (typeof order.driver === "object" ? order.driver?.name : DRIVERS[order.driver]?.name ?? order.driver))
			.filter(Boolean);
		return [...new Set([...Object.values(DRIVERS).map((driver) => driver.name), ...names])];
	}, [orders]);

	useEffect(() => {
		if (!orders.length) {
			setActiveUid(null);
			setSelected(new Set());
			return;
		}
		if (!activeUid || !orders.some((order) => order.uid === activeUid)) {
			setActiveUid(orders[0].uid);
			setSelected(new Set([orders[0].uid]));
		}
	}, [orders, activeUid]);

	const filtered = useMemo(() => {
		const query = filters.query.trim().toLowerCase();
		return orders.filter((order) => {
			const matchesTab = order.status === tab;
			const matchesQuery = !query || order.id.toLowerCase().includes(query) || order.outlet.toLowerCase().includes(query) || order.city.toLowerCase().includes(query);
			const matchesOutlet = filters.outlet === "All Outlets" || order.outlet === filters.outlet;
			const matchesType = filters.type === "All Order Types" || order.type === filters.type;
			const orderDriverName = typeof order.driver === "object" ? order.driver?.name : (DRIVERS[order.driver]?.name ?? order.driver);
			const matchesCourier = filters.courier === "All Couriers" || orderDriverName === filters.courier || (filters.courier === "Gosako Fleet" && order.driver === "gosako");
			return matchesTab && matchesQuery && matchesOutlet && matchesType && matchesCourier;
		});
	}, [orders, tab, filters]);

	const total = Math.max(counts[tab] ?? 0, filtered.length);
	const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
	const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
	const activeOrder = rows.find((order) => order.uid === activeUid) ?? rows[0] ?? null;

	const changeTab = (nextTab) => {
		setTab(nextTab);
		setPage(1);
		const firstOrder = filtered.find((order) => order.status === nextTab) ?? orders.find((order) => order.status === nextTab);
		setActiveUid(firstOrder ? firstOrder.uid : null);
	};

	const toggle = (uid) => setSelected((current) => {
		const next = new Set(current);
		next.has(uid) ? next.delete(uid) : next.add(uid);
		return next;
	});

	const openReview = (order) => setReviewUid(order.uid);
	const closeReview = useCallback(() => setReviewUid(null), []);

	const confirmOrder = async (order) => {
		try {
			const id = order.raw?.id ?? order.uid;
			// A DRAFT order must be submitted for review before it can be confirmed.
			if (order.raw?.status === "DRAFT") await submitOrderMutation({ id }).unwrap();
			await confirmOrderMutation({ id }).unwrap();
			notify(`${order.id} confirmed and sent for dispatcher planning.`);
			setReviewUid(null);
			setActiveUid(null);
			await refetch();
		} catch (error) {
			notify(error?.data?.message || "Unable to confirm this order right now.");
		}
	};

	const deferOrder = async (order) => {
		try {
			await deferOrderMutation({ id: order.raw?.id ?? order.uid, reason: "Deferred from store-manager review" }).unwrap();
			notify(`${order.id} saved as deferred.`);
			setReviewUid(null);
			await refetch();
		} catch (error) {
			notify(error?.data?.message || "Unable to defer this order right now.");
		}
	};

	const handleCancelOrder = async (order, reason) => {
		try {
			const id = order.raw?.id ?? order.uid;
			await cancelOrderMutation({ id, reason }).unwrap();
			notify(`${order.id} has been cancelled.`);
			setCancelOrderTarget(null);
			if (activeUid === order.uid) setActiveUid(null);
			await refetch();
		} catch (error) {
			notify(error?.data?.message || "Unable to cancel this order.");
		}
	};

	const reviewing = reviewUid ? orders.find((order) => order.uid === reviewUid) : null;

	return (
		<div className="app">
			<TopBar initials="AR" />
			<Sidebar active="orders" />
			<main className="workspace">
				<div className="main-col">
					<h1>Orders</h1>
					<p className="subtitle">Review and confirm orders before dispatch planning.</p>
					{isError && <div className="toast" role="status">{ordersError?.data?.message || "Unable to load orders from the API."}</div>}
					{isLoading && <div className="toast" role="status">Loading orders…</div>}
					<OrderTabs tabs={TABS} counts={counts} active={tab} onChange={changeTab} />
					<Filters filters={filters} setFilters={setFilters} outlets={outlets} couriers={couriers} types={types} />
					<OrdersTable
						rows={rows} status={tab} activeUid={activeOrder?.uid} selected={selected}
						onToggle={toggle} onRowClick={setActiveUid}
						total={total} page={page} pageCount={pageCount} onPage={setPage}
					/>
				</div>
				<OrderDetailPanel
					order={activeOrder}
					onReview={openReview}
					onCancel={(order) => setCancelOrderTarget(order)}
					onViewDetails={(order) => notify(`Opening details for ${order.id}...`)}
					onViewRoute={(order) => notify(`Opening route for ${order.id}...`)}
					onAssignDriver={(order) => notify(`Assign a driver to ${order.id}...`)}
				/>
			</main>
			{reviewing && <ReviewOrderModal key={reviewing.uid} order={reviewing} now={getNow()} busy={isConfirming || isDeferring || isSubmitting} onClose={closeReview} onConfirm={confirmOrder} onDefer={deferOrder} />}
			{cancelOrderTarget && (
				<CancelOrderModal
					order={cancelOrderTarget}
					isOpen={Boolean(cancelOrderTarget)}
					onClose={() => setCancelOrderTarget(null)}
					onConfirm={handleCancelOrder}
					busy={isCancelling}
				/>
			)}
			{toast && <div className="toast" role="status">{toast}</div>}
			{(isConfirming || isDeferring || isCancelling) && <div className="toast" role="status">Updating order…</div>}
		</div>
	);
}
