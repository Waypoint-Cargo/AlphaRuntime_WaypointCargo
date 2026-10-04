import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Search, 
  ChevronDown, 
  Filter, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Snowflake,
  Fuel,
  Map as MapIcon,
  Truck,
  Star,
  ChevronRight,
  Package,
  RefreshCw,
  X,
  AlertCircle,
  Calendar,
  Send,
  Check,
  Undo2,
  ArrowRight
} from 'lucide-react';
import { useGetOrdersQuery } from "@/modules/store_manager/Orders/ordersApi.js";
import {
  useGetPlansQuery,
  useGetPlanByIdQuery,
  useClosePlanMutation,
  usePublishPlanMutation,
  useGetVehicleOptionsQuery,
  useAllocateOrderMutation,
  useUnallocateOrderMutation,
} from "@/modules/dispatcher/api/plansApi.js";

const BRAND_BADGE_STYLES = {
  FRESH: "border-green-200 text-green-700 bg-white",
  STYLE: "border-blue-200 text-blue-700 bg-white",
  TECH: "border-purple-200 text-purple-700 bg-white",
};

const PLAN_STATUS_STYLES = {
  OPEN: { label: "Open — Accepting Orders", color: "bg-amber-50 text-amber-800 border-amber-200" },
  CLOSED: { label: "Closed — Ready for Allocation", color: "bg-blue-50 text-blue-800 border-blue-200" },
  PUBLISHED: { label: "Published — Dispatched", color: "bg-green-50 text-green-800 border-green-200" },
  IN_EXECUTION: { label: "In Execution", color: "bg-purple-50 text-purple-800 border-purple-200" },
  COMPLETED: { label: "Completed", color: "bg-gray-100 text-gray-800 border-gray-300" },
};

export default function PlanAndAllocate() {
  const [activeTab, setActiveTab] = useState('unplanned'); // 'unplanned' | 'partial' | 'planned'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBrand, setSelectedBrand] = useState('ALL');
  const [selectedPriority, setSelectedPriority] = useState('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isBrandOpen, setIsBrandOpen] = useState(false);
  const [isPriorityOpen, setIsPriorityOpen] = useState(false);
  const [vehicleSort, setVehicleSort] = useState('recommended'); // 'recommended' | 'capacity'
  const [selectedTripNumber, setSelectedTripNumber] = useState(1);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [toast, setToast] = useState('');
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [deferUnplannedOnPublish, setDeferUnplannedOnPublish] = useState(true);

  // Default to today's date formatted as YYYY-MM-DD
  const [planningDate, setPlanningDate] = useState(() => {
    const today = new Date();
    return today.toISOString().slice(0, 10);
  });

  const toastTimer = useRef(null);
  const showToast = (message) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(''), 4500);
  };

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  // Fetch real orders from backend
  const { data: ordersResponse, isLoading: isOrdersLoading, refetch: refetchOrders } = useGetOrdersQuery(
    { status: "CONFIRMED,PARTIALLY_LOADED,PLANNED", pageSize: 100 },
    { refetchOnMountOrArgChange: true }
  );

  const allOrders = useMemo(() => ordersResponse?.items ?? [], [ordersResponse]);

  // Extract all distinct dates with confirmed or planned orders, sorted by volume
  const availableDates = useMemo(() => {
    const counts = {};
    for (const o of allOrders) {
      const d = o.deliveryDate ? o.deliveryDate.slice(0, 10) : null;
      if (!d) continue;
      counts[d] = (counts[d] || 0) + 1;
    }
    return Object.entries(counts)
      .map(([date, count]) => {
        const dObj = new Date(`${date}T00:00:00.000Z`);
        const label = Number.isNaN(dObj.getTime())
          ? date
          : dObj.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return { date, label, count };
      })
      .sort((a, b) => b.count - a.count);
  }, [allOrders]);

  // Default planningDate to the date with the highest order count (e.g. 2026-10-05) if the current date has no orders
  useEffect(() => {
    if (availableDates.length > 0 && planningDate !== 'ALL') {
      const currentDateHasOrders = availableDates.some(ad => ad.date === planningDate);
      if (!currentDateHasOrders) {
        setPlanningDate(availableDates[0].date);
      }
    }
  }, [availableDates, planningDate]);

  // Fetch dispatch plan for the selected delivery date (or skip if ALL dates)
  const { data: plans = [], isLoading: isPlansLoading, refetch: refetchPlans } = useGetPlansQuery(
    { deliveryDate: planningDate !== 'ALL' ? planningDate : undefined },
    { refetchOnMountOrArgChange: true }
  );

  const activePlan = plans.length > 0 ? plans[0] : null;

  // Fetch detailed plan trips if plan exists
  const { data: planDetails, refetch: refetchPlanDetails } = useGetPlanByIdQuery(
    activePlan?.id,
    { skip: !activePlan?.id, refetchOnMountOrArgChange: true }
  );

  // Mutations
  const [closePlan, { isLoading: isClosingPlan }] = useClosePlanMutation();
  const [publishPlan, { isLoading: isPublishingPlan }] = usePublishPlanMutation();
  const [allocateOrder, { isLoading: isAllocating }] = useAllocateOrderMutation();
  const [unallocateOrder, { isLoading: isUnallocating }] = useUnallocateOrderMutation();

  // Filter orders by planning date (or show all if ALL is selected)
  const dateOrders = useMemo(() => {
    if (planningDate === 'ALL') return allOrders;
    return allOrders.filter(order => {
      if (!order.deliveryDate) return true;
      return order.deliveryDate.slice(0, 10) === planningDate;
    });
  }, [allOrders, planningDate]);

  // Tab counts for the current planning date
  const unplannedCount = useMemo(
    () => dateOrders.filter(o => o.rawStatus === "CONFIRMED").length,
    [dateOrders]
  );
  const partialCount = useMemo(
    () => dateOrders.filter(o => o.rawStatus === "PARTIALLY_LOADED").length,
    [dateOrders]
  );
  const plannedCount = useMemo(
    () => dateOrders.filter(o => o.rawStatus === "PLANNED").length,
    [dateOrders]
  );
  const totalToPlan = unplannedCount + partialCount;

  // Filter and sort orders for the list
  const filteredOrders = useMemo(() => {
    let list = dateOrders.filter(order => {
      if (activeTab === 'unplanned' && order.rawStatus !== "CONFIRMED") return false;
      if (activeTab === 'partial' && order.rawStatus !== "PARTIALLY_LOADED") return false;
      if (activeTab === 'planned' && order.rawStatus !== "PLANNED") return false;

      if (selectedBrand !== 'ALL' && order.brand !== selectedBrand) return false;
      if (selectedPriority === 'FRAGILE' && !order.isFragile) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesRef = order.id?.toLowerCase().includes(q);
        const matchesOutlet = order.outlet?.toLowerCase().includes(q);
        const matchesCity = order.city?.toLowerCase().includes(q);
        if (!matchesRef && !matchesOutlet && !matchesCity) return false;
      }

      return true;
    });

    if (selectedPriority === 'EARLIEST') {
      list = [...list].sort((a, b) => (a.windowStartMin ?? 9999) - (b.windowStartMin ?? 9999));
    } else if (selectedPriority === 'HEAVIEST') {
      list = [...list].sort((a, b) => b.weight - a.weight);
    } else if (selectedPriority === 'LIGHTEST') {
      list = [...list].sort((a, b) => a.weight - b.weight);
    }

    return list;
  }, [dateOrders, activeTab, selectedBrand, selectedPriority, searchQuery]);

  // Synchronize selected order
  useEffect(() => {
    if (filteredOrders.length > 0) {
      const exists = filteredOrders.some(o => o.uid === selectedOrderId || o.id === selectedOrderId);
      if (!selectedOrderId || !exists) {
        setSelectedOrderId(filteredOrders[0].uid || filteredOrders[0].id);
      }
    } else {
      setSelectedOrderId(null);
    }
  }, [filteredOrders, selectedOrderId]);

  const activeOrder = useMemo(() => {
    return dateOrders.find(o => o.uid === selectedOrderId || o.id === selectedOrderId) || filteredOrders[0] || null;
  }, [dateOrders, selectedOrderId, filteredOrders]);

  // Fetch real vehicle options for the active order from the pure engine backend
  const { data: vehicleOptions = [], isLoading: isVehiclesLoading, refetch: refetchVehicles } = useGetVehicleOptionsQuery(
    { orderId: activeOrder?.uid, sort: vehicleSort },
    { skip: !activeOrder?.uid || activeOrder?.rawStatus === "PLANNED", refetchOnMountOrArgChange: true }
  );

  // Set default selected vehicle when vehicle options arrive
  useEffect(() => {
    if (vehicleOptions.length > 0) {
      const currentSelectedExists = vehicleOptions.some(v => v.vehicleId === selectedVehicleId);
      if (!selectedVehicleId || !currentSelectedExists) {
        const recommended = vehicleOptions.find(v => v.recommended) || vehicleOptions[0];
        setSelectedVehicleId(recommended?.vehicleId);
        setSelectedTripNumber(recommended?.tripNumber || 1);
      }
    } else {
      setSelectedVehicleId(null);
    }
  }, [vehicleOptions, selectedVehicleId]);

  // Find the selected vehicle option object
  const selectedVehicleOption = useMemo(() => {
    if (!vehicleOptions.length) return null;
    return vehicleOptions.find(v => v.vehicleId === selectedVehicleId && v.tripNumber === selectedTripNumber)
      || vehicleOptions.find(v => v.vehicleId === selectedVehicleId)
      || vehicleOptions[0];
  }, [vehicleOptions, selectedVehicleId, selectedTripNumber]);

  // Find existing plan trip information if activeOrder is already PLANNED
  const existingPlannedTrip = useMemo(() => {
    if (!planDetails?.trips || !activeOrder || activeOrder.rawStatus !== "PLANNED") return null;
    for (const trip of planDetails.trips) {
      for (const stop of trip.stops ?? []) {
        if (stop.allocations?.some(a => a.orderId === activeOrder.uid || a.orderId === activeOrder.id)) {
          return { trip, stop };
        }
      }
    }
    return null;
  }, [planDetails, activeOrder]);

  // Close order queue handler
  const handleClosePlan = async (customDate) => {
    const targetDate = customDate || (planningDate !== 'ALL' ? planningDate : activeOrder?.deliveryDate?.slice(0, 10));
    if (!targetDate) {
      showToast("Please select a specific delivery date or order first.");
      return;
    }
    try {
      await closePlan({ deliveryDate: targetDate, depotId: activeOrder?.depotId }).unwrap();
      showToast(`Order queue closed for ${targetDate}. Planning is now active.`);
      refetchPlans();
      refetchOrders();
    } catch (err) {
      showToast(err?.data?.message || "Failed to close order queue.");
    }
  };

  // Publish plan handler
  const handlePublishPlan = async () => {
    if (!activePlan) return;
    try {
      await publishPlan({ id: activePlan.id, deferUnplanned: deferUnplannedOnPublish }).unwrap();
      showToast(`Plan successfully published for ${planningDate}! Loading sessions and fuel quotas registered.`);
      setShowPublishModal(false);
      refetchPlans();
      refetchPlanDetails();
      refetchOrders();
    } catch (err) {
      showToast(err?.data?.message || "Failed to publish plan.");
    }
  };

  // Allocate order handler
  const handleAllocate = async (allowWarnings = false) => {
    if (!activeOrder || !selectedVehicleOption) return;
    try {
      const orderDate = activeOrder.deliveryDate ? activeOrder.deliveryDate.slice(0, 10) : planningDate;
      // Auto-close plan if not yet closed for this delivery date
      if ((!activePlan || activePlan.status === 'OPEN') && orderDate && orderDate !== 'ALL') {
        await closePlan({ deliveryDate: orderDate, depotId: activeOrder?.depotId }).unwrap();
        await refetchPlans();
      }

      await allocateOrder({
        orderId: activeOrder.uid,
        vehicleId: selectedVehicleOption.vehicleId,
        tripNumber: selectedTripNumber,
        acknowledgeWarnings: allowWarnings ? (selectedVehicleOption.warningCodes || []) : [],
      }).unwrap();
      showToast(`Order ${activeOrder.id} allocated to ${selectedVehicleOption.registrationNo} (Trip ${selectedTripNumber}).`);
      refetchOrders();
      refetchPlans();
      if (activePlan?.id) refetchPlanDetails();
    } catch (err) {
      if (err?.data?.details?.code === 'PLAN_NOT_CLOSED') {
        try {
          const orderDate = activeOrder.deliveryDate ? activeOrder.deliveryDate.slice(0, 10) : planningDate;
          if (orderDate && orderDate !== 'ALL') {
            await closePlan({ deliveryDate: orderDate, depotId: activeOrder?.depotId }).unwrap();
            await refetchPlans();
            await allocateOrder({
              orderId: activeOrder.uid,
              vehicleId: selectedVehicleOption.vehicleId,
              tripNumber: selectedTripNumber,
              acknowledgeWarnings: allowWarnings ? (selectedVehicleOption.warningCodes || []) : [],
            }).unwrap();
            showToast(`Queue closed & order ${activeOrder.id} allocated to ${selectedVehicleOption.registrationNo} (Trip ${selectedTripNumber}).`);
            refetchOrders();
            refetchPlans();
            if (activePlan?.id) refetchPlanDetails();
            return;
          }
        } catch (retryErr) {
          showToast(retryErr?.data?.message || "Failed to close queue and allocate order.");
          return;
        }
      }
      showToast(err?.data?.message || "Failed to allocate order.");
    }
  };

  // Unallocate order handler
  const handleUnallocate = async () => {
    if (!activeOrder) return;
    try {
      await unallocateOrder({ orderId: activeOrder.uid }).unwrap();
      showToast(`Order ${activeOrder.id} unallocated and moved back to queue.`);
      refetchOrders();
      refetchPlans();
      if (activePlan?.id) refetchPlanDetails();
    } catch (err) {
      showToast(err?.data?.message || "Failed to unallocate order.");
    }
  };

  const planStatusConfig = activePlan ? (PLAN_STATUS_STYLES[activePlan.status] || PLAN_STATUS_STYLES.OPEN) : null;
  const isPlanPublished = activePlan?.status === 'PUBLISHED' || activePlan?.status === 'IN_EXECUTION' || activePlan?.status === 'COMPLETED';

  return (
    <div className="h-[calc(100vh-72px)] flex flex-col -m-6 p-6 overflow-hidden bg-[#F8FAFC]">
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-20 right-8 z-50 bg-gray-900 text-white px-4 py-3 rounded-lg shadow-xl text-sm flex items-center gap-3 animate-fade-in border border-gray-700 max-w-md">
          <AlertCircle size={18} className="text-amber-400 flex-shrink-0" />
          <span className="flex-1">{toast}</span>
          <button onClick={() => setToast('')} className="text-gray-400 hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Top Plan Control Bar */}
      <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-xs mb-4 flex flex-wrap items-center justify-between gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#053D31]" />
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Planning Date:</span>
            <input 
              type="date" 
              value={planningDate === 'ALL' ? '' : planningDate}
              onChange={(e) => setPlanningDate(e.target.value)}
              className="px-2.5 py-1 text-sm font-bold text-gray-900 bg-gray-50 border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-[#053D31]"
            />
          </div>

          {/* Quick Date Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {availableDates.map(({ date, label, count }) => (
              <button
                key={date}
                type="button"
                onClick={() => setPlanningDate(date)}
                className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                  planningDate === date
                    ? 'bg-[#053D31] text-white shadow-xs'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {label} ({count})
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPlanningDate('ALL')}
              className={`px-2.5 py-1 rounded-full text-xs font-bold transition-all ${
                planningDate === 'ALL'
                  ? 'bg-[#053D31] text-white shadow-xs'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              All Dates ({allOrders.length})
            </button>
          </div>

          {planningDate === 'ALL' ? (
            <div className="px-2.5 py-1 rounded-full border border-blue-200 bg-blue-50 text-blue-800 text-xs font-bold">
              Showing All Dates
            </div>
          ) : activePlan ? (
            <div className={`px-2.5 py-1 rounded-full border text-xs font-bold flex items-center gap-1.5 ${planStatusConfig?.color}`}>
              <span className="w-2 h-2 rounded-full bg-current"></span>
              {planStatusConfig?.label}
            </div>
          ) : (
            <div className="px-2.5 py-1 rounded-full border border-gray-200 bg-gray-50 text-gray-600 text-xs font-medium">
              No Plan Created Yet
            </div>
          )}

          <div className="text-xs text-gray-500 border-l border-gray-200 pl-3 hidden md:flex items-center gap-2">
            <span><strong>{unplannedCount}</strong> Unplanned</span>
            <span>·</span>
            <span><strong>{plannedCount}</strong> Planned</span>
            <span>·</span>
            <span><strong>{planDetails?.trips?.length ?? 0}</strong> Routes</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {(!activePlan || activePlan.status === 'OPEN') && (
            <button
              onClick={handleClosePlan}
              disabled={isClosingPlan}
              className="px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
              title="Close confirmed order queue to freeze orders for route planning"
            >
              <Clock size={14} />
              {isClosingPlan ? "Closing..." : "Close Orders (Cutoff)"}
            </button>
          )}

          {activePlan && activePlan.status === 'CLOSED' && (
            <button
              onClick={() => setShowPublishModal(true)}
              disabled={isPublishingPlan || (planDetails?.trips?.length ?? 0) === 0}
              className="px-4 py-1.5 bg-[#053D31] hover:bg-[#042e25] text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
            >
              <Send size={14} />
              Publish Plan
            </button>
          )}

          {isPlanPublished && (
            <div className="flex items-center gap-1 text-xs text-green-700 font-bold bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg">
              <CheckCircle2 size={14} /> Dispatched to Depot Fleet
            </div>
          )}

          <button
            onClick={() => { refetchOrders(); refetchPlans(); if (activePlan?.id) refetchPlanDetails(); }}
            className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-800 hover:bg-gray-50 transition-colors"
            title="Refresh plan and orders"
          >
            <RefreshCw size={14} className={isOrdersLoading || isPlansLoading ? "animate-spin text-green-700" : ""} />
          </button>
        </div>
      </div>

      {/* Main 3-Column Content Layout */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden">
        
        {/* Left Column - Orders to Plan */}
        <div className="w-full lg:w-80 flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-gray-900">Orders to Plan</h2>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#053D31] text-white flex items-center justify-center text-xs font-bold">
                  {totalToPlan}
                </span>
              </div>
            </div>
            
            {/* Sub-tabs */}
            <div className="flex bg-gray-50 p-1 rounded-lg mb-4">
              <button 
                onClick={() => setActiveTab('unplanned')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold text-center flex flex-col items-center transition-all ${
                  activeTab === 'unplanned' 
                    ? 'bg-white shadow-sm border border-gray-200 text-gray-900' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-gray-500 font-medium">Unplanned</span>
                <span className="text-red-500 text-lg font-bold">{unplannedCount}</span>
              </button>
              <button 
                onClick={() => setActiveTab('partial')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold text-center flex flex-col items-center transition-all ${
                  activeTab === 'partial' 
                    ? 'bg-white shadow-sm border border-gray-200 text-gray-900' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-gray-500 font-medium">Partial</span>
                <span className="text-orange-500 text-lg font-bold">{partialCount}</span>
              </button>
              <button 
                onClick={() => setActiveTab('planned')}
                className={`flex-1 py-1.5 px-2 rounded-md text-xs font-semibold text-center flex flex-col items-center transition-all ${
                  activeTab === 'planned' 
                    ? 'bg-white shadow-sm border border-gray-200 text-gray-900' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span className="text-gray-500 font-medium">Planned</span>
                <span className="text-green-600 text-lg font-bold">{plannedCount}</span>
              </button>
            </div>

            {/* Search box */}
            <div className="relative mb-3">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search outlets, orders..." 
                className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#053D31]"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex gap-2 relative">
              <div className="flex-1 relative">
                <button 
                  onClick={() => { setIsPriorityOpen(!isPriorityOpen); setIsBrandOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Filter size={14} className={selectedPriority !== 'ALL' ? "text-green-600" : "text-gray-400"} /> 
                    {selectedPriority === 'ALL' ? 'Priority' : 
                     selectedPriority === 'EARLIEST' ? 'Earliest' :
                     selectedPriority === 'HEAVIEST' ? 'Heaviest' :
                     selectedPriority === 'LIGHTEST' ? 'Lightest' : 'Fragile'}
                  </span>
                  <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                </button>

                {isPriorityOpen && (
                  <div className="absolute top-full left-0 mt-1 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 text-xs">
                    <button 
                      onClick={() => { setSelectedPriority('ALL'); setIsPriorityOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-medium ${selectedPriority === 'ALL' ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      All Priority
                    </button>
                    <button 
                      onClick={() => { setSelectedPriority('EARLIEST'); setIsPriorityOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-medium ${selectedPriority === 'EARLIEST' ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      Earliest Deadline
                    </button>
                    <button 
                      onClick={() => { setSelectedPriority('HEAVIEST'); setIsPriorityOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-medium ${selectedPriority === 'HEAVIEST' ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      Heaviest Load First
                    </button>
                    <button 
                      onClick={() => { setSelectedPriority('LIGHTEST'); setIsPriorityOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-medium ${selectedPriority === 'LIGHTEST' ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      Lightest Load First
                    </button>
                    <button 
                      onClick={() => { setSelectedPriority('FRAGILE'); setIsPriorityOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-medium ${selectedPriority === 'FRAGILE' ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      Fragile Items Only
                    </button>
                  </div>
                )}
              </div>

              <div className="flex-1 relative">
                <button 
                  onClick={() => { setIsBrandOpen(!isBrandOpen); setIsPriorityOpen(false); }}
                  className="w-full flex items-center justify-between px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-1.5 truncate">
                    <Filter size={14} className={selectedBrand !== 'ALL' ? "text-green-600" : "text-gray-400"} /> 
                    {selectedBrand === 'ALL' ? 'Brand' : 
                     selectedBrand === 'FRESH' ? 'Fresh' :
                     selectedBrand === 'STYLE' ? 'Style' : 'Tech'}
                  </span>
                  <ChevronDown size={14} className="text-gray-400 flex-shrink-0" />
                </button>

                {isBrandOpen && (
                  <div className="absolute top-full right-0 mt-1 w-36 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 text-xs">
                    <button 
                      onClick={() => { setSelectedBrand('ALL'); setIsBrandOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-medium ${selectedBrand === 'ALL' ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      All Brands
                    </button>
                    <button 
                      onClick={() => { setSelectedBrand('FRESH'); setIsBrandOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-medium ${selectedBrand === 'FRESH' ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                    >
                      Fresh
                    </button>
                    <button 
                      onClick={() => { setSelectedBrand('STYLE'); setIsBrandOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-medium ${selectedBrand === 'STYLE' ? 'text-blue-700 bg-blue-50' : 'text-gray-700'}`}
                    >
                      Style
                    </button>
                    <button 
                      onClick={() => { setSelectedBrand('TECH'); setIsBrandOpen(false); }}
                      className={`w-full text-left px-3 py-2 hover:bg-gray-50 font-medium ${selectedBrand === 'TECH' ? 'text-purple-700 bg-purple-50' : 'text-gray-700'}`}
                    >
                      Tech
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Order Cards List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {isOrdersLoading && (
              <div className="py-12 text-center text-gray-400 text-xs">
                <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#053D31]" />
                Loading orders...
              </div>
            )}

            {!isOrdersLoading && filteredOrders.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-xs px-4">
                <Package size={28} className="mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-600 mb-1">No orders found</p>
                <p>No {activeTab} orders for {planningDate}.</p>
              </div>
            )}

            {!isOrdersLoading && filteredOrders.map(order => {
              const isSelected = activeOrder && (activeOrder.uid === order.uid || activeOrder.id === order.id);
              const brandLabel = order.brand ? order.brand.charAt(0) + order.brand.slice(1).toLowerCase() : (order.type || 'Fresh');
              const badgeClass = BRAND_BADGE_STYLES[order.brand] || "border-green-200 text-green-700 bg-white";

              return (
                <div 
                  key={order.uid || order.id} 
                  onClick={() => setSelectedOrderId(order.uid || order.id)}
                  className={`p-3 rounded-lg cursor-pointer transition-all relative ${
                    isSelected 
                      ? 'border-2 border-[#FFC107] bg-yellow-50/30 shadow-xs' 
                      : 'border border-gray-200 bg-white hover:border-gray-300 hover:shadow-xs'
                  }`}
                >
                  <div className="absolute top-3 right-3 flex items-center gap-1">
                    <span className={`px-2 py-0.5 rounded-full border text-[10px] font-semibold ${badgeClass}`}>
                      {brandLabel}
                    </span>
                    {order.isFragile && (
                      <span className="px-1.5 py-0.5 rounded bg-orange-50 border border-orange-200 text-orange-700 text-[9px] font-bold">
                        Fragile
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-gray-500 font-medium mb-1">{order.id}</p>
                  <h3 className="font-bold text-gray-900 text-sm mb-1">{order.outlet}</h3>
                  <p className="text-xs text-gray-500 mb-1.5">
                    {order.weight} kg · {order.window !== '—' ? `window ${order.window}` : 'Standard'}
                  </p>
                  
                  <div className="flex items-center gap-2 text-[10px] text-gray-400">
                    <span>{order.city}</span>
                    {order.tempClass && order.tempClass !== 'AMBIENT' && (
                      <span className="flex items-center gap-0.5 text-blue-600 font-medium">
                        <Snowflake size={10} /> {order.tempClass.toLowerCase()}
                      </span>
                    )}
                    {order.vehicleType === 'Van' && (
                      <span className="text-amber-600 font-medium">Van only</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Middle Column - Order Details & Trip Builder */}
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {activeOrder ? (
            <div className="flex-1 overflow-y-auto pr-2 pb-4">
              
              {/* Order Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
                <div>
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h1 className="text-2xl font-bold text-gray-900">{activeOrder.outlet}</h1>
                    <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                      <Snowflake size={12} /> {activeOrder.tempClass ? activeOrder.tempClass.charAt(0) + activeOrder.tempClass.slice(1).toLowerCase() : 'Ambient'}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full border text-xs font-semibold ${
                      BRAND_BADGE_STYLES[activeOrder.brand] || "border-gray-200 text-gray-700"
                    }`}>
                      {activeOrder.brand ? activeOrder.brand.charAt(0) + activeOrder.brand.slice(1).toLowerCase() : (activeOrder.type || 'Fresh')}
                    </span>
                    {activeOrder.rawStatus === "PLANNED" && (
                      <span className="px-2.5 py-0.5 rounded-full border border-green-200 bg-green-50 text-green-800 text-xs font-bold">
                        Planned
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    {activeOrder.id} · {activeOrder.city} · {activeOrder.vehicleType === 'Van' ? 'Van Required' : 'Standard Truck'} · {activeOrder.weight} kg / {activeOrder.volume} m³
                  </p>
                </div>

                <div className="flex gap-2">
                  {activeOrder.rawStatus === "PLANNED" ? (
                    <button 
                      onClick={handleUnallocate}
                      disabled={isUnallocating || isPlanPublished}
                      className="px-4 py-2 bg-white border border-red-300 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-50 transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Undo2 size={16} />
                      {isUnallocating ? "Removing..." : "Unallocate Order"}
                    </button>
                  ) : (
                    <>
                      {selectedVehicleOption?.canAllocateWithWarnings && !selectedVehicleOption?.valid && (
                        <button 
                          onClick={() => handleAllocate(true)}
                          disabled={isAllocating || isPlanPublished}
                          className="px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                        >
                          <AlertTriangle size={16} />
                          {isAllocating ? "Allocating..." : "Allocate with warnings"}
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Order Specs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Weight</p>
                  <p className="text-lg font-bold text-gray-900">{activeOrder.weight} kg</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Volume</p>
                  <p className="text-lg font-bold text-gray-900">{activeOrder.volume} m³</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Deadline / Window</p>
                  <p className="text-lg font-bold text-orange-600">{activeOrder.window !== '—' ? activeOrder.window : 'Standard'}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border border-gray-200">
                  <p className="text-xs text-gray-500 mb-1">Outlet Code</p>
                  <p className="text-lg font-bold text-gray-900">
                    {activeOrder.outletCode || activeOrder.raw?.outletCode || activeOrder.raw?.outlet?.code || 'OUT001'}
                  </p>
                </div>
              </div>

              {/* Constraint Checks - Live evaluation against selected vehicle */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-gray-900">Constraint Checks (Pure Engine Validation)</h3>
                  {selectedVehicleOption ? (
                    <span className="text-xs text-gray-500">
                      Evaluated for <strong>{selectedVehicleOption.registrationNo}</strong> (Trip {selectedTripNumber})
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400 italic">
                      Select a vehicle to evaluate constraints
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Temperature */}
                  <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                      <Snowflake size={14} /> Temperature
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-3">
                      {activeOrder.tempClass ? activeOrder.tempClass.charAt(0) + activeOrder.tempClass.slice(1).toLowerCase() : 'Ambient'}
                    </p>
                    {!selectedVehicleOption ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs font-medium border border-gray-200">
                        Awaiting vehicle
                      </span>
                    ) : selectedVehicleOption.checks?.temperatureFit?.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                        <CheckCircle2 size={12} /> Temp compatible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                        <AlertTriangle size={12} /> {selectedVehicleOption.checks?.temperatureFit?.reason || "Temp mismatch"}
                      </span>
                    )}
                  </div>
                  
                  {/* Weight Fit */}
                  <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                      <CheckCircle2 size={14} /> Weight Fit
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-3">
                      {selectedVehicleOption?.checks?.weightCapacity
                        ? `${selectedVehicleOption.checks.weightCapacity.proposedKg} / ${selectedVehicleOption.checks.weightCapacity.capacityKg} kg`
                        : `${activeOrder.weight} kg`}
                    </p>
                    {!selectedVehicleOption ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs font-medium border border-gray-200">
                        Awaiting vehicle
                      </span>
                    ) : selectedVehicleOption.checks?.weightCapacity?.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                        <CheckCircle2 size={12} /> Weight fits ({selectedVehicleOption.checks.weightCapacity.utilizationPct}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                        <AlertTriangle size={12} /> {selectedVehicleOption.checks?.weightCapacity?.reason || "Exceeds max weight"}
                      </span>
                    )}
                  </div>
                  
                  {/* Volume Fit */}
                  <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                      <CheckCircle2 size={14} /> Volume Fit
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-3">
                      {selectedVehicleOption?.checks?.volumeCapacity
                        ? `${selectedVehicleOption.checks.volumeCapacity.proposedM3} / ${selectedVehicleOption.checks.volumeCapacity.capacityM3} m³`
                        : `${activeOrder.volume} m³`}
                    </p>
                    {!selectedVehicleOption ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs font-medium border border-gray-200">
                        Awaiting vehicle
                      </span>
                    ) : selectedVehicleOption.checks?.volumeCapacity?.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                        <CheckCircle2 size={12} /> Volume fits ({selectedVehicleOption.checks.volumeCapacity.utilizationPct}%)
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                        <AlertTriangle size={12} /> {selectedVehicleOption.checks?.volumeCapacity?.reason || "Exceeds max volume"}
                      </span>
                    )}
                  </div>
                  
                  {/* Delivery Window */}
                  <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                      <Clock size={14} /> Delivery Window
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-3">{activeOrder.window !== '—' ? activeOrder.window : 'Flexible'}</p>
                    {!selectedVehicleOption ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs font-medium border border-gray-200">
                        Awaiting vehicle
                      </span>
                    ) : selectedVehicleOption.checks?.timeWindowFeasibility?.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                        <CheckCircle2 size={12} /> Window met
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                        <AlertTriangle size={12} /> {selectedVehicleOption.checks?.timeWindowFeasibility?.reason || "Window warning"}
                      </span>
                    )}
                  </div>
                  
                  {/* Fuel Quota */}
                  <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                      <Fuel size={14} /> Fuel Quota
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-3">
                      {selectedVehicleOption?.checks?.fuelQuota
                        ? `${selectedVehicleOption.checks.fuelQuota.weeklyRemainingL ?? 100} L remaining`
                        : "Weekly Quota"}
                    </p>
                    {!selectedVehicleOption ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs font-medium border border-gray-200">
                        Awaiting vehicle
                      </span>
                    ) : selectedVehicleOption.checks?.fuelQuota?.passed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                        <CheckCircle2 size={12} /> Quota ok
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100">
                        <AlertTriangle size={12} /> {selectedVehicleOption.checks?.fuelQuota?.reason || "Over fuel quota"}
                      </span>
                    )}
                  </div>
                  
                  {/* Access / Van Requirement */}
                  <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-xs">
                    <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2">
                      <MapIcon size={14} /> Vehicle Access
                    </div>
                    <p className="font-bold text-gray-900 text-sm mb-3">{activeOrder.city} - {activeOrder.vehicleType === 'Van' ? 'Van Only' : 'All Access'}</p>
                    {!selectedVehicleOption ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-gray-50 text-gray-500 text-xs font-medium border border-gray-200">
                        Awaiting vehicle
                      </span>
                    ) : (selectedVehicleOption.checks?.vehicleAccess?.passed ?? selectedVehicleOption.checks?.vanRequirement?.passed) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100">
                        <CheckCircle2 size={12} /> Access compatible
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-red-50 text-red-700 text-xs font-medium border border-red-100">
                        <AlertTriangle size={12} /> {selectedVehicleOption.checks?.vehicleAccess?.reason || "Requires Van"}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Trip Builder Card */}
              {activeOrder.rawStatus === "PLANNED" ? (
                <div className="bg-white border border-green-200 rounded-xl shadow-xs p-5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider text-green-700 mb-1 block">Allocated Trip Information</span>
                      <h4 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                        <Truck size={18} className="text-green-700" />
                        {existingPlannedTrip?.trip?.code || activeOrder.tripCode || 'Trip Assigned'}
                      </h4>
                    </div>
                    <button
                      onClick={handleUnallocate}
                      disabled={isUnallocating || isPlanPublished}
                      className="px-4 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5"
                    >
                      <Undo2 size={14} />
                      Unallocate Order
                    </button>
                  </div>
                  <p className="text-xs text-gray-600 mb-4">
                    This order has already been allocated to this vehicle trip. If you need to reassign or adjust sequence, click Unallocate above.
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl shadow-xs p-5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-[#FFC107]"></div>
                  
                  {/* Trip Number Selector */}
                  <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-2">
                      <Truck size={18} className="text-gray-700" />
                      <h4 className="font-bold text-gray-900 text-base">
                        {selectedVehicleOption?.registrationNo ?? "Select a Vehicle"}
                      </h4>
                      {selectedVehicleOption?.recommended && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#FFC107] text-amber-800 text-[10px] font-bold bg-yellow-50">
                          <Star size={10} fill="currentColor" /> Recommended (Score: {selectedVehicleOption.score})
                        </span>
                      )}
                    </div>

                    <div className="flex bg-gray-100 rounded-lg p-0.5">
                      {(() => {
                        const t1 = selectedVehicleOption?.tripChoices?.find((t) => t.tripNumber === 1);
                        const t2 = selectedVehicleOption?.tripChoices?.find((t) => t.tripNumber === 2);
                        return (
                          <>
                            <button 
                              onClick={() => setSelectedTripNumber(1)}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                selectedTripNumber === 1 ? 'bg-[#053D31] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Trip 1 {t1?.stopCount ? `(${t1.stopCount} stops)` : ''}
                            </button>
                            <button 
                              onClick={() => setSelectedTripNumber(2)}
                              className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                                selectedTripNumber === 2 ? 'bg-[#053D31] text-white shadow-xs' : 'text-gray-600 hover:text-gray-900'
                              }`}
                            >
                              Trip 2 {t2?.stopCount ? `(${t2.stopCount} stops)` : ''}
                            </button>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Utilization Progress Bars */}
                  {selectedVehicleOption ? (
                    <div className="space-y-3 mb-6">
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 font-medium">Proposed Weight</span>
                          <span className="font-bold text-gray-900">
                            {selectedVehicleOption.checks?.weightCapacity?.proposedKg ?? activeOrder.weight} / {selectedVehicleOption.capacityKg} kg ({selectedVehicleOption.checks?.weightCapacity?.utilizationPct ?? 0}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              (selectedVehicleOption.checks?.weightCapacity?.utilizationPct ?? 0) > 100 ? 'bg-red-500' :
                              (selectedVehicleOption.checks?.weightCapacity?.utilizationPct ?? 0) > 85 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, selectedVehicleOption.checks?.weightCapacity?.utilizationPct ?? 10)}%` }}
                          ></div>
                        </div>
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 font-medium">Proposed Volume</span>
                          <span className="font-bold text-gray-900">
                            {selectedVehicleOption.checks?.volumeCapacity?.proposedM3 ?? activeOrder.volume} / {selectedVehicleOption.capacityM3} m³ ({selectedVehicleOption.checks?.volumeCapacity?.utilizationPct ?? 0}%)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-300 ${
                              (selectedVehicleOption.checks?.volumeCapacity?.utilizationPct ?? 0) > 100 ? 'bg-red-500' :
                              (selectedVehicleOption.checks?.volumeCapacity?.utilizationPct ?? 0) > 85 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(100, selectedVehicleOption.checks?.volumeCapacity?.utilizationPct ?? 10)}%` }}
                          ></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-500 font-medium">Fuel Quota</span>
                          <span className="font-bold text-gray-900">
                            {selectedVehicleOption.checks?.fuelQuota?.weeklyRemainingL ?? 100} L remaining (Estimated {selectedVehicleOption.checks?.fuelQuota?.tripEstimatedL ?? 0} L for trip)
                          </span>
                        </div>
                        <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 w-[40%]"></div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 bg-gray-50 rounded-lg text-xs text-gray-500 mb-6 text-center">
                      Select an available vehicle from the right column to review trip utilization and allocate this order.
                    </div>
                  )}

                  {/* Drop Sequence */}
                  <div className="mb-6">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-gray-700">Drop Sequence Route Preview</p>
                      {selectedVehicleOption?.stopAtOutlet && (
                        <span className="text-[11px] text-green-700 font-bold bg-green-50 border border-green-200 px-2 py-0.5 rounded">
                          Consolidates with existing stop for this outlet
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="px-2.5 py-1.5 rounded bg-gray-100 border border-gray-200 text-gray-700 font-medium flex items-center gap-1.5">
                        <MapPin size={12} className="text-gray-500" /> Depot Departure
                      </span>
                      <ChevronRight size={14} className="text-gray-400" />
                      {selectedVehicleOption && selectedVehicleOption.currentLoad?.stopCount > 0 ? (
                        <>
                          <span className="px-2.5 py-1.5 rounded bg-blue-50 border border-blue-200 text-blue-800 font-medium">
                            {selectedVehicleOption.currentLoad.stopCount} Existing Stop{selectedVehicleOption.currentLoad.stopCount > 1 ? 's' : ''} on Trip {selectedTripNumber}
                          </span>
                          <ChevronRight size={14} className="text-gray-400" />
                          <span className="px-2.5 py-1.5 rounded bg-green-50 border border-green-200 text-green-800 font-bold flex items-center gap-1 shadow-xs">
                            <Check size={12} /> Stop {selectedVehicleOption.stopAtOutlet ? selectedVehicleOption.currentLoad.stopCount : selectedVehicleOption.currentLoad.stopCount + 1}: {activeOrder.outlet} ({activeOrder.id})
                          </span>
                        </>
                      ) : (
                        <span className="px-2.5 py-1.5 rounded bg-green-50 border border-green-200 text-green-800 font-bold flex items-center gap-1 shadow-xs">
                          <Check size={12} /> Stop 1: {activeOrder.outlet} ({activeOrder.id})
                        </span>
                      )}
                      <ChevronRight size={14} className="text-gray-400" />
                      <span className="px-2.5 py-1.5 rounded bg-gray-100 border border-gray-200 text-gray-700 font-medium flex items-center gap-1.5">
                        <MapPin size={12} className="text-gray-500" /> Return to Depot
                      </span>
                    </div>
                  </div>

                  {/* Warnings or Violations callout */}
                  {selectedVehicleOption && selectedVehicleOption.warnings?.length > 0 && (
                    <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-start gap-2">
                      <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Allocation Warnings:</p>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                          {selectedVehicleOption.warnings.map((w, idx) => (
                            <li key={idx}>{w}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {selectedVehicleOption && selectedVehicleOption.violations?.length > 0 && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800 flex items-start gap-2">
                      <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Hard Constraint Violations (Cannot Allocate):</p>
                        <ul className="list-disc list-inside mt-0.5 space-y-0.5">
                          {selectedVehicleOption.violations.map((v, idx) => (
                            <li key={idx}>{v}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Order Queue Notice */}
                  {(!activePlan || activePlan.status === 'OPEN') && (
                    <div className="mb-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-1.5">
                      <Clock size={14} className="text-amber-600 flex-shrink-0" />
                      <span>Order queue is open. Allocating will freeze confirmed orders for this delivery date and initiate the dispatch plan.</span>
                    </div>
                  )}

                  {/* Allocation Action Bar */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Truck size={14} /> Assign to: <strong>{selectedVehicleOption?.registrationNo ?? "—"}</strong> - Trip {selectedTripNumber}
                    </div>

                    {!selectedVehicleOption ? (
                      <button 
                        disabled
                        className="px-5 py-2 bg-gray-200 text-gray-500 rounded-lg text-sm font-semibold cursor-not-allowed"
                      >
                        Select a Vehicle to Allocate
                      </button>
                    ) : selectedVehicleOption?.valid ? (
                      <button 
                        onClick={() => handleAllocate(false)}
                        disabled={isAllocating || isPlanPublished}
                        className="px-5 py-2 bg-[#053D31] hover:bg-[#042e25] text-white rounded-lg text-sm font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <Check size={16} />
                        {isAllocating ? "Allocating..." : `Allocate to Trip ${selectedTripNumber}`}
                      </button>
                    ) : selectedVehicleOption?.canAllocateWithWarnings ? (
                      <button 
                        onClick={() => handleAllocate(true)}
                        disabled={isAllocating || isPlanPublished}
                        className="px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-semibold transition-colors shadow-xs flex items-center gap-1.5 disabled:opacity-50"
                      >
                        <AlertTriangle size={16} />
                        {isAllocating ? "Allocating..." : `Allocate with warnings (Trip ${selectedTripNumber})`}
                      </button>
                    ) : (
                      <button 
                        disabled
                        className="px-5 py-2 bg-gray-200 text-gray-400 rounded-lg text-sm font-semibold cursor-not-allowed"
                      >
                        Cannot Allocate (Violations)
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-400 bg-white rounded-xl border border-gray-200">
              <Package size={48} className="mb-3 text-gray-300" />
              <h3 className="text-lg font-bold text-gray-700 mb-1">No Order Selected</h3>
              <p className="text-sm max-w-sm">Select an order from the "Orders to Plan" list on the left to inspect its specs, constraints, and configure allocation.</p>
            </div>
          )}
        </div>

        {/* Right Column - Available Vehicles (Live Pure Engine Options) */}
        <div className="w-full lg:w-72 flex flex-col h-full overflow-hidden bg-white lg:bg-transparent rounded-xl lg:rounded-none border lg:border-none border-gray-200 p-4 lg:p-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              Available Vehicles 
              <span className="w-5 h-5 rounded-full bg-[#053D31] text-white flex items-center justify-center text-[10px] font-bold">
                {vehicleOptions.length}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 mb-3 text-xs">
            <span className="text-gray-500">Sort by:</span>
            <button 
              onClick={() => setVehicleSort('recommended')}
              className={`px-2 py-1 rounded font-semibold transition-all ${
                vehicleSort === 'recommended'
                  ? 'bg-yellow-50 text-yellow-800 border border-[#FFC107]'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Recommended
            </button>
            <button 
              onClick={() => setVehicleSort('capacity')}
              className={`px-2 py-1 rounded font-semibold transition-all ${
                vehicleSort === 'capacity'
                  ? 'bg-yellow-50 text-yellow-800 border border-[#FFC107]'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              Capacity
            </button>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1">
            {isVehiclesLoading && (
              <div className="py-12 text-center text-gray-400 text-xs">
                <RefreshCw size={20} className="animate-spin mx-auto mb-2 text-[#053D31]" />
                Evaluating fleet options...
              </div>
            )}

            {!isVehiclesLoading && vehicleOptions.length === 0 && (
              <div className="py-8 text-center text-gray-400 text-xs px-2">
                <Truck size={24} className="mx-auto mb-2 text-gray-300" />
                <p className="font-semibold text-gray-600 mb-1">No vehicles available</p>
                <p>{activeOrder ? "No compatible vehicles found for this order." : "Select an order to view vehicle recommendations."}</p>
              </div>
            )}

            {!isVehiclesLoading && vehicleOptions.map(option => {
              const isSelected = selectedVehicleOption?.vehicleId === option.vehicleId && selectedTripNumber === option.tripNumber;
              const weightUtil = option.checks?.weightCapacity?.utilizationPct ?? 0;
              const volumeUtil = option.checks?.volumeCapacity?.utilizationPct ?? 0;

              return (
                <div 
                  key={`${option.vehicleId}-${option.tripNumber}`}
                  onClick={() => {
                    setSelectedVehicleId(option.vehicleId);
                    setSelectedTripNumber(option.tripNumber);
                  }}
                  className={`bg-white rounded-xl p-4 shadow-xs transition-all cursor-pointer ${
                    isSelected 
                      ? 'border-2 border-[#FFC107] ring-1 ring-[#FFC107]' 
                      : 'border border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm">
                      <Truck size={14} /> {option.registrationNo}
                    </h4>
                    {option.recommended && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#FFC107] text-amber-800 text-[9px] font-bold bg-yellow-50">
                        <Star size={8} fill="currentColor" /> Rec
                      </span>
                    )}
                  </div>

                  <p className="text-[10px] text-gray-500 mb-2.5">
                    {option.isRefrigerated ? 'Refrigerated' : 'Dry cargo'} · {option.vehicleType} · Trip {option.tripNumber} of 2
                  </p>

                  {/* Constraint Tags */}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {option.checks?.weightCapacity?.passed ? (
                      <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 text-[9px] font-medium flex items-center gap-1">
                        <CheckCircle2 size={9} /> Weight ok
                      </span>
                    ) : (
                      <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 text-[9px] font-medium flex items-center gap-1">
                        <AlertTriangle size={9} /> Over weight
                      </span>
                    )}

                    {option.checks?.volumeCapacity?.passed && (
                      <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 text-[9px] font-medium flex items-center gap-1">
                        <CheckCircle2 size={9} /> Volume ok
                      </span>
                    )}

                    {option.isRefrigerated && (
                      <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[9px] font-medium flex items-center gap-1">
                        <Snowflake size={9} /> Chilled
                      </span>
                    )}

                    {option.warnings?.length > 0 && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-100 text-[9px] font-medium flex items-center gap-1">
                        <AlertTriangle size={9} /> Warn
                      </span>
                    )}
                  </div>
                  
                  {/* Utilization Mini Bars */}
                  <div className="space-y-1.5 mb-3">
                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-500">Weight</span>
                        <span className="font-bold text-gray-900">{option.checks?.weightCapacity?.proposedKg ?? 0} / {option.capacityKg} kg</span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${weightUtil > 100 ? 'bg-red-500' : weightUtil > 85 ? 'bg-amber-500' : 'bg-green-500'}`} 
                          style={{ width: `${Math.min(100, Math.max(5, weightUtil))}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[10px] mb-0.5">
                        <span className="text-gray-500">Volume</span>
                        <span className="font-bold text-gray-900">{option.checks?.volumeCapacity?.proposedM3 ?? 0} / {option.capacityM3} m³</span>
                      </div>
                      <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${volumeUtil > 100 ? 'bg-red-500' : volumeUtil > 85 ? 'bg-amber-500' : 'bg-green-500'}`} 
                          style={{ width: `${Math.min(100, Math.max(5, volumeUtil))}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[10px] text-gray-500">
                      Fuel: {option.checks?.fuelQuota?.weeklyRemainingL ?? '—'} L left
                    </p>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedVehicleId(option.vehicleId);
                        setSelectedTripNumber(option.tripNumber);
                      }}
                      className={`px-3 py-1 rounded text-xs font-semibold shadow-xs transition-colors ${
                        isSelected 
                          ? 'bg-[#053D31] text-white' 
                          : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {isSelected ? "Selected" : "Select"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Publish Plan Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Send className="text-[#053D31]" size={20} />
                <h3 className="text-lg font-bold text-gray-900">Publish Dispatch Plan</h3>
              </div>
              <button 
                onClick={() => setShowPublishModal(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              Publishing the plan for <strong>{planningDate}</strong> locks all assigned trips, establishes driver delivery manifests, creates warehouse loading checklists, and records planned fuel quotas.
            </p>

            {unplannedCount > 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
                <div className="flex items-start gap-2 text-amber-800 text-xs">
                  <AlertTriangle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold mb-1">
                      {unplannedCount} confirmed order(s) remain unallocated!
                    </p>
                    <p className="mb-3 text-amber-700">
                      Unplanned orders must either be allocated to a trip or deferred to the next operating day.
                    </p>
                    <label className="flex items-center gap-2 font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={deferUnplannedOnPublish} 
                        onChange={(e) => setDeferUnplannedOnPublish(e.target.checked)}
                        className="rounded text-[#053D31] focus:ring-[#053D31]"
                      />
                      <span>Automatically defer remaining {unplannedCount} order(s) to next operating day</span>
                    </label>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl mb-4 text-xs text-green-800 flex items-center gap-2">
                <CheckCircle2 size={16} className="text-green-600" />
                <span>All {plannedCount} confirmed orders are allocated to trips. Plan is complete and ready.</span>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button 
                onClick={() => setShowPublishModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handlePublishPlan}
                disabled={isPublishingPlan || (unplannedCount > 0 && !deferUnplannedOnPublish)}
                className="px-5 py-2 bg-[#053D31] hover:bg-[#042e25] text-white rounded-lg text-sm font-bold transition-colors shadow-sm disabled:opacity-50 flex items-center gap-1.5"
              >
                <Send size={14} />
                {isPublishingPlan ? "Publishing..." : "Confirm & Publish Plan"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
