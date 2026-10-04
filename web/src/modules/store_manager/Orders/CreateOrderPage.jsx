import React, { useState, useMemo, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Clock, 
  Store, 
  Tag, 
  Calendar, 
  Lock, 
  Unlock, 
  Check, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Trash2, 
  AlertCircle, 
  Info, 
  MapPin, 
  Truck, 
  Snowflake, 
  Package, 
  CheckCircle2 
} from "lucide-react";
import { ROUTES } from "@/constants/app.constants";
import TopBar from "../../../shared/components/TopBar.jsx";
import Sidebar from "../../../shared/components/Sidebar.jsx";
import { 
  useCreateOrderMutation, 
  useGetOrderOutletsQuery, 
  useGetStockCatalogQuery 
} from "./ordersApi.js";

const BRAND_CONFIG = {
  FRESH: { name: "Waypoint Fresh", badge: "border-green-200 text-green-700 bg-green-50" },
  STYLE: { name: "Waypoint Style", badge: "border-blue-200 text-blue-700 bg-blue-50" },
  TECH: { name: "Waypoint Tech", badge: "border-purple-200 text-purple-700 bg-purple-50" },
};

const UNLOADING_LABELS = {
  REAR_DOCK: "Rear dock",
  CURB: "Curbside",
  MALL_BAY: "Mall bay",
};

const colomboDate = (offsetDays = 1) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Colombo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 86_400_000));

const formatDisplayDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(`${dateStr}T00:00:00`);
  return date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
};

const toClockLabel = (minutes) => {
  if (minutes === null || minutes === undefined || Number.isNaN(minutes)) return "—";
  const safeMinutes = Number(minutes);
  const hours = Math.floor(safeMinutes / 60);
  const mins = safeMinutes % 60;
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalized = ((hours + 11) % 12) + 1;
  return `${normalized}:${String(mins).padStart(2, "0")} ${suffix}`;
};

let rowKey = 0;
const blankItem = (defaultValues = {}) => ({
  key: ++rowKey,
  itemName: defaultValues.itemName || "",
  sku: defaultValues.sku || "",
  unit: defaultValues.unit || "EA",
  unitWeightKg: defaultValues.unitWeightKg || 1.0,
  unitVolumeM3: defaultValues.unitVolumeM3 || 0.002,
  quantity: defaultValues.quantity || 10,
  weightKg: defaultValues.weightKg || 10.0,
  volumeM3: defaultValues.volumeM3 || 0.02,
  notes: defaultValues.notes || "",
});

export default function CreateOrderPage() {
  const navigate = useNavigate();

  // Queries
  const { data: outlets = [], isLoading: isOutletsLoading } = useGetOrderOutletsQuery();
  const { data: stockCatalog = [], isLoading: isStockLoading } = useGetStockCatalogQuery();
  const [createOrder, { isLoading: isSubmittingOrder }] = useCreateOrderMutation();

  // Multi-step State (1: Order Details, 2: Items, 3: Delivery, 4: Confirm)
  const [currentStep, setCurrentStep] = useState(1);

  // Form State
  const [selectedOutletId, setSelectedOutletId] = useState("");
  const [selectedBrand, setSelectedBrand] = useState("FRESH");
  const [deliveryDate, setDeliveryDate] = useState(() => colomboDate(0));
  const [tempClass, setTempClass] = useState("AMBIENT");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [isFragile, setIsFragile] = useState(false);
  const [isHighValue, setIsHighValue] = useState(false);

  // Items State
  const [items, setItems] = useState(() => [blankItem()]);

  // UI Feedback
  const [errors, setErrors] = useState([]);
  const [toast, setToast] = useState("");
  const redirectTimer = useRef(null);

  useEffect(() => () => window.clearTimeout(redirectTimer.current), []);

  // When outlets load, select the first outlet
  useEffect(() => {
    if (outlets.length > 0 && !selectedOutletId) {
      setSelectedOutletId(outlets[0].id);
      setSelectedBrand(outlets[0].brand || "FRESH");
    }
  }, [outlets, selectedOutletId]);

  // Selected Outlet Details
  const selectedOutlet = useMemo(() => {
    return outlets.find((o) => o.id === selectedOutletId) || outlets[0] || null;
  }, [outlets, selectedOutletId]);

  // When selected outlet changes, sync brand
  const handleOutletChange = (outletId) => {
    setSelectedOutletId(outletId);
    const outlet = outlets.find((o) => o.id === outletId);
    if (outlet?.brand) {
      setSelectedBrand(outlet.brand);
      if (outlet.brand === "FRESH") setTempClass("CHILLED");
      else setTempClass("AMBIENT");
    }
  };

  // Stock catalog filtered by brand
  const filteredCatalog = useMemo(() => {
    return stockCatalog.filter((item) => {
      if (selectedBrand === "FRESH") return item.sku.startsWith("DAI-") || item.sku.startsWith("PRO-") || item.sku.startsWith("BAK-") || item.sku.startsWith("MEA-") || item.sku.startsWith("SEA-") || item.sku.startsWith("FRO-") || item.sku.startsWith("GRO-");
      if (selectedBrand === "STYLE") return item.sku.startsWith("APP-");
      if (selectedBrand === "TECH") return item.sku.startsWith("TEC-");
      return true;
    });
  }, [stockCatalog, selectedBrand]);

  // Item Table Handlers
  const handleAddItem = (preset = {}) => {
    setItems((current) => [...current, blankItem(preset)]);
  };

  const handleRemoveItem = (key) => {
    setItems((current) => (current.length > 1 ? current.filter((i) => i.key !== key) : current));
  };

  const handleItemSelect = (key, sku) => {
    const catalogItem = stockCatalog.find((s) => s.sku === sku);
    if (!catalogItem) return;

    // Estimate unit weight and volume from catalog SKU patterns
    let unitWeight = 1.0;
    let unitVolume = 0.002;
    if (sku.startsWith("TEC-TV")) { unitWeight = 9.8; unitVolume = 0.12; }
    else if (sku.startsWith("TEC-LAP")) { unitWeight = 2.2; unitVolume = 0.008; }
    else if (sku.startsWith("TEC-PHN")) { unitWeight = 0.45; unitVolume = 0.001; }
    else if (sku.startsWith("APP-SHO")) { unitWeight = 0.95; unitVolume = 0.006; }
    else if (sku.startsWith("APP-TSH")) { unitWeight = 0.25; unitVolume = 0.001; }
    else if (sku.startsWith("DAI-MILK")) { unitWeight = 1.05; unitVolume = 0.0015; }
    else if (sku.startsWith("DAI-CHE")) { unitWeight = 0.26; unitVolume = 0.0005; }
    else if (sku.startsWith("MEA-CHK")) { unitWeight = 1.2; unitVolume = 0.0025; }

    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const qty = Number(item.quantity) || 10;
        return {
          ...item,
          sku: catalogItem.sku,
          itemName: catalogItem.itemName,
          unit: catalogItem.unit || "EA",
          unitWeightKg: unitWeight,
          unitVolumeM3: unitVolume,
          weightKg: Math.round(unitWeight * qty * 100) / 100,
          volumeM3: Math.round(unitVolume * qty * 1000) / 1000,
        };
      })
    );
  };

  const handleItemChange = (key, field, value) => {
    setItems((current) =>
      current.map((item) => {
        if (item.key !== key) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity") {
          const qty = Number(value) || 0;
          updated.weightKg = Math.round((updated.unitWeightKg || 1) * qty * 100) / 100;
          updated.volumeM3 = Math.round((updated.unitVolumeM3 || 0.002) * qty * 1000) / 1000;
        }
        return updated;
      })
    );
  };

  // Order Totals
  const totals = useMemo(() => {
    return items.reduce(
      (sum, item) => ({
        units: sum.units + (Number(item.quantity) > 0 ? Number(item.quantity) : 0),
        weight: sum.weight + (Number(item.weightKg) > 0 ? Number(item.weightKg) : 0),
        volume: sum.volume + (Number(item.volumeM3) > 0 ? Number(item.volumeM3) : 0),
      }),
      { units: 0, weight: 0, volume: 0 }
    );
  }, [items]);

  // Validation
  const validateStep = (step) => {
    const problems = [];
    if (step === 1) {
      if (!selectedOutletId) problems.push("Please select a delivery outlet.");
      if (!deliveryDate) problems.push("Please choose a delivery date.");
      else if (deliveryDate < colomboDate(0)) problems.push("Delivery date cannot be in the past.");
    }
    if (step === 2) {
      if (!items.length) problems.push("Add at least one item to the order.");
      items.forEach((item, index) => {
        const line = `Item ${index + 1}`;
        if (!item.itemName.trim()) problems.push(`${line}: Item name is required.`);
        const qty = Number(item.quantity);
        if (!qty || qty <= 0) problems.push(`${line}: Enter a valid quantity.`);
      });
    }
    return problems;
  };

  // Step advancement
  const handleContinue = () => {
    const problems = validateStep(currentStep);
    setErrors(problems);
    if (problems.length) return;

    if (currentStep < 4) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleFinalSubmit(true);
    }
  };

  const handleFinalSubmit = async (submitImmediately = true) => {
    const problems = [...validateStep(1), ...validateStep(2)];
    if (problems.length) {
      setErrors(problems);
      return;
    }

    const payload = {
      outletId: selectedOutletId,
      tempClass,
      requestedDeliveryDate: deliveryDate,
      isFragile,
      isHighValue: isHighValue || selectedBrand === "TECH",
      submit: submitImmediately,
      specialInstructions: specialInstructions.trim() || undefined,
      items: items.map((item) => ({
        itemName: item.itemName.trim() || "Item",
        sku: item.sku ? item.sku.trim() : undefined,
        unit: item.unit.trim() || "EA",
        quantity: Number(item.quantity),
        weightKg: Number(item.weightKg) || 1.0,
        volumeM3: Number(item.volumeM3) || 0.005,
        notes: item.notes.trim() || undefined,
      })),
    };

    try {
      const response = await createOrder(payload).unwrap();
      const reference = response?.data?.reference ?? "Order";
      setToast(`${reference} created successfully${submitImmediately ? " and sent for dispatch planning" : " as a draft"}.`);
      redirectTimer.current = window.setTimeout(() => navigate(ROUTES.STORE_MANAGER_ORDERS), 1200);
    } catch (err) {
      const details = Array.isArray(err?.data?.details)
        ? err.data.details.map((d) => (d.field ? `${d.field}: ${d.message}` : d.message))
        : [];
      setErrors([err?.data?.message || "Failed to create order.", ...details]);
    }
  };

  const brandInfo = BRAND_CONFIG[selectedBrand] || BRAND_CONFIG.FRESH;

  return (
    <div className="app">
      <TopBar />
      <Sidebar active="create" />
      
      <main className="workspace overflow-y-auto bg-[#F8FAFC] min-h-[calc(100vh-72px)] p-6 lg:p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          
          {/* Header */}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Create New Order</h1>
            <p className="text-sm text-gray-500 mt-1">
              Fill in the order details step by step to schedule a new delivery.
            </p>
          </div>

          {/* Yellow Cutoff Alert Banner */}
          <div className="bg-[#FEF9C3] border border-[#FDE047] rounded-xl p-4 flex items-center gap-3 text-amber-900 text-xs sm:text-sm font-medium shadow-xs">
            <div className="w-7 h-7 rounded-full bg-amber-400/30 flex items-center justify-center flex-shrink-0 text-amber-900">
              <Clock size={16} />
            </div>
            <span>
              Orders for <strong>{formatDisplayDate(deliveryDate)}</strong> close today at <strong>4:00 PM</strong>. Orders placed after the cutoff move to the next delivery run.
            </span>
          </div>

          {/* Stepper Navigation */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between relative">
              
              {/* Step 1 */}
              <div 
                onClick={() => setCurrentStep(1)}
                className="flex items-center gap-2.5 z-10 cursor-pointer"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 1 
                    ? "bg-[#FFC107] text-gray-900 ring-2 ring-amber-300" 
                    : currentStep > 1 
                    ? "bg-[#053D31] text-white" 
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {currentStep > 1 ? <Check size={14} /> : "1"}
                </div>
                <span className={`text-xs font-bold ${currentStep === 1 ? "text-gray-900" : "text-gray-500"}`}>
                  Order Details
                </span>
              </div>

              <div className={`flex-1 h-0.5 mx-3 transition-colors ${currentStep > 1 ? "bg-[#053D31]" : "bg-gray-200"}`}></div>

              {/* Step 2 */}
              <div 
                onClick={() => { if (validateStep(1).length === 0) setCurrentStep(2); }}
                className="flex items-center gap-2.5 z-10 cursor-pointer"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 2 
                    ? "bg-[#FFC107] text-gray-900 ring-2 ring-amber-300" 
                    : currentStep > 2 
                    ? "bg-[#053D31] text-white" 
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {currentStep > 2 ? <Check size={14} /> : "2"}
                </div>
                <span className={`text-xs font-bold ${currentStep === 2 ? "text-gray-900" : "text-gray-500"}`}>
                  Items
                </span>
              </div>

              <div className={`flex-1 h-0.5 mx-3 transition-colors ${currentStep > 2 ? "bg-[#053D31]" : "bg-gray-200"}`}></div>

              {/* Step 3 */}
              <div 
                onClick={() => { if (validateStep(1).length === 0 && validateStep(2).length === 0) setCurrentStep(3); }}
                className="flex items-center gap-2.5 z-10 cursor-pointer"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 3 
                    ? "bg-[#FFC107] text-gray-900 ring-2 ring-amber-300" 
                    : currentStep > 3 
                    ? "bg-[#053D31] text-white" 
                    : "bg-gray-100 text-gray-500"
                }`}>
                  {currentStep > 3 ? <Check size={14} /> : "3"}
                </div>
                <span className={`text-xs font-bold ${currentStep === 3 ? "text-gray-900" : "text-gray-500"}`}>
                  Delivery
                </span>
              </div>

              <div className={`flex-1 h-0.5 mx-3 transition-colors ${currentStep > 3 ? "bg-[#053D31]" : "bg-gray-200"}`}></div>

              {/* Step 4 */}
              <div 
                onClick={() => { if (validateStep(1).length === 0 && validateStep(2).length === 0) setCurrentStep(4); }}
                className="flex items-center gap-2.5 z-10 cursor-pointer"
              >
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  currentStep === 4 
                    ? "bg-[#FFC107] text-gray-900 ring-2 ring-amber-300" 
                    : "bg-gray-100 text-gray-500"
                }`}>
                  4
                </div>
                <span className={`text-xs font-bold ${currentStep === 4 ? "text-gray-900" : "text-gray-500"}`}>
                  Confirm
                </span>
              </div>

            </div>
          </div>

          {/* Validation Errors Callout */}
          {errors.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-800 flex items-start gap-2 animate-fade-in">
              <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
              <div>
                <strong className="block font-bold mb-1">Please address the following items:</strong>
                <ul className="list-disc list-inside space-y-0.5">
                  {errors.map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Section A: Order Information */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#053D31] text-white flex items-center justify-center text-xs font-bold">
                  <Check size={14} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Order Information</h3>
                  <p className="text-xs text-gray-500">Where and when this order should be delivered</p>
                </div>
              </div>
              <span className={`px-2.5 py-0.5 rounded-full border text-[11px] font-semibold ${brandInfo.badge}`}>
                {brandInfo.name}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Outlet Field */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Outlet</label>
                <div className="relative">
                  <Store size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedOutletId}
                    onChange={(e) => handleOutletChange(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#053D31] font-medium"
                  >
                    {outlets.map((outlet) => (
                      <option key={outlet.id} value={outlet.id}>
                        {outlet.name} ({outlet.code})
                      </option>
                    ))}
                  </select>
                </div>
                {selectedOutlet && (
                  <p className="text-[11px] text-gray-500 mt-1 pl-1">
                    {selectedOutlet.depotName || "Peliyagoda Depot"} · {selectedOutlet.district}
                  </p>
                )}
              </div>

              {/* Brand Field */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Brand</label>
                <div className="relative">
                  <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <select
                    value={selectedBrand}
                    onChange={(e) => {
                      setSelectedBrand(e.target.value);
                      if (e.target.value === "FRESH") setTempClass("CHILLED");
                      else setTempClass("AMBIENT");
                    }}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#053D31] font-medium"
                  >
                    <option value="FRESH">Waypoint Fresh</option>
                    <option value="STYLE">Waypoint Style</option>
                    <option value="TECH">Waypoint Tech</option>
                  </select>
                </div>
                <p className="text-[11px] text-gray-500 mt-1 pl-1">
                  Temp Cargo: <strong>{tempClass}</strong>
                </p>
              </div>
            </div>

            {/* Delivery Date Field */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Delivery Date</label>
                <div className="relative">
                  <Calendar size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    min={colomboDate(0)}
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#053D31] font-medium"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1 pl-1">
                  Scheduled delivery on {formatDisplayDate(deliveryDate)}
                </p>
              </div>

              {/* Temperature Class Selector for Fresh */}
              {selectedBrand === "FRESH" && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Temperature Requirement</label>
                  <div className="relative">
                    <Snowflake size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <select
                      value={tempClass}
                      onChange={(e) => setTempClass(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#053D31] font-medium"
                    >
                      <option value="CHILLED">Chilled (+0°C to +4°C)</option>
                      <option value="FROZEN">Frozen (-18°C or below)</option>
                      <option value="AMBIENT">Ambient (Dry Cargo)</option>
                    </select>
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section B: Order Items */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 2 ? "bg-[#053D31] text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  B
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Order Items</h3>
                  <p className="text-xs text-gray-500">Items inherit this order's {tempClass} setting from step 1.</p>
                </div>
              </div>

              {currentStep < 2 ? (
                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <Lock size={14} /> Complete order info first
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs text-green-700 font-medium">
                  <Unlock size={14} /> Catalog unlocked
                </span>
              )}
            </div>

            {/* Items Table */}
            <div className="overflow-x-auto border border-gray-100 rounded-lg mb-4">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 text-gray-600 font-bold border-b border-gray-200">
                  <tr>
                    <th className="py-2.5 px-3">Item / Catalog SKU</th>
                    <th className="py-2.5 px-3 w-28">Quantity</th>
                    <th className="py-2.5 px-3 w-24">Weight</th>
                    <th className="py-2.5 px-3 w-24">Volume</th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-2 w-10 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, index) => (
                    <tr key={item.key} className="hover:bg-gray-50/50">
                      <td className="py-2 px-3">
                        <select
                          value={item.sku}
                          onChange={(e) => handleItemSelect(item.key, e.target.value)}
                          className="w-full py-1.5 px-2 bg-white border border-gray-200 rounded-md text-xs font-medium text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#053D31] mb-1"
                        >
                          <option value="">-- Choose from Catalog or custom --</option>
                          {filteredCatalog.map((cat) => (
                            <option key={cat.id} value={cat.sku}>
                              {cat.itemName} ({cat.sku}) · {cat.availableQty} available
                            </option>
                          ))}
                        </select>
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => handleItemChange(item.key, "itemName", e.target.value)}
                          placeholder="Item description"
                          className="w-full py-1 px-2 bg-white border border-gray-200 rounded-md text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#053D31]"
                        />
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.key, "quantity", e.target.value)}
                            className="w-16 py-1.5 px-2 bg-white border border-gray-200 rounded-md text-xs font-bold text-gray-900 text-right focus:outline-none focus:ring-1 focus:ring-[#053D31]"
                          />
                          <span className="text-[11px] text-gray-500 font-medium">{item.unit}</span>
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={item.weightKg}
                            onChange={(e) => handleItemChange(item.key, "weightKg", Number(e.target.value))}
                            className="w-16 py-1.5 px-2 bg-white border border-gray-200 rounded-md text-xs text-gray-900 text-right"
                          />
                          <span className="text-[10px] text-gray-400">kg</span>
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.001"
                            value={item.volumeM3}
                            onChange={(e) => handleItemChange(item.key, "volumeM3", Number(e.target.value))}
                            className="w-16 py-1.5 px-2 bg-white border border-gray-200 rounded-md text-xs text-gray-900 text-right"
                          />
                          <span className="text-[10px] text-gray-400">m³</span>
                        </div>
                      </td>

                      <td className="py-2 px-3">
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(e) => handleItemChange(item.key, "notes", e.target.value)}
                          placeholder="e.g. Batch Lot 1"
                          className="w-full py-1.5 px-2 bg-white border border-gray-200 rounded-md text-xs text-gray-600 focus:outline-none focus:ring-1 focus:ring-[#053D31]"
                        />
                      </td>

                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.key)}
                          disabled={items.length === 1}
                          className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-30 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Item Button & Totals */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => handleAddItem()}
                className="px-4 py-2 border border-dashed border-gray-300 rounded-lg text-xs font-semibold text-gray-700 hover:border-gray-400 hover:bg-gray-50 transition-colors flex items-center gap-1.5"
              >
                <Plus size={14} />
                Add item
              </button>

              <div className="flex items-center gap-4 text-xs text-gray-600 bg-gray-50 px-4 py-2 rounded-lg border border-gray-200">
                <span>Total Items: <strong>{items.length}</strong></span>
                <span>Units: <strong>{totals.units}</strong></span>
                <span>Weight: <strong>{Math.round(totals.weight * 100) / 100} kg</strong></span>
                <span>Volume: <strong>{Math.round(totals.volume * 1000) / 1000} m³</strong></span>
              </div>
            </div>
          </section>

          {/* Section C: Delivery Requirements */}
          <section className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs transition-all">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentStep >= 3 ? "bg-[#053D31] text-white" : "bg-gray-100 text-gray-400"
                }`}>
                  C
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-sm">Delivery Requirements</h3>
                  <p className="text-xs text-gray-500">Destination constraints configured for {selectedOutlet?.name || "selected outlet"}</p>
                </div>
              </div>

              {currentStep < 3 && (
                <span className="flex items-center gap-1 text-xs text-gray-400 font-medium">
                  <Lock size={14} /> Unlocks after items are added
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {/* Delivery Window */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Clock size={14} /> Delivery window
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {selectedOutlet ? `${toClockLabel(selectedOutlet.windowStartMin)} – ${toClockLabel(selectedOutlet.windowEndMin)}` : "08:00 AM – 12:00 PM"}
                </p>
              </div>

              {/* Outlet Access Type */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <MapPin size={14} /> Outlet access type
                </div>
                <p className="text-sm font-bold text-gray-900">
                  {selectedOutlet?.unloadingType ? UNLOADING_LABELS[selectedOutlet.unloadingType] : "Standard dock"}
                </p>
              </div>

              {/* Van-only Indicator */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Truck size={14} /> Van-only indicator
                </div>
                <p className={`text-sm font-bold ${selectedOutlet?.vanOnly ? "text-amber-700" : "text-gray-900"}`}>
                  {selectedOutlet?.vanOnly ? "Van required" : "Standard truck access"}
                </p>
              </div>

              {/* Special Instructions */}
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1">
                  <Info size={14} /> Special unloading
                </div>
                <p className="text-sm font-bold text-gray-900 truncate">
                  {specialInstructions || "Standard gate protocol"}
                </p>
              </div>
            </div>

            {/* Special Instructions Textarea & Flags */}
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Special Instructions / Unloading Notes <small className="text-gray-400">(optional)</small>
                </label>
                <textarea
                  rows={2}
                  value={specialInstructions}
                  onChange={(e) => setSpecialInstructions(e.target.value)}
                  placeholder="e.g. Call store receiving coordinator 15 mins prior to arrival at rear dock."
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-900 focus:outline-none focus:ring-1 focus:ring-[#053D31]"
                />
              </div>

              <div className="flex items-center gap-6 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isFragile}
                    onChange={(e) => setIsFragile(e.target.checked)}
                    className="rounded text-[#053D31] focus:ring-[#053D31]"
                  />
                  <span>Fragile handling required</span>
                </label>

                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isHighValue}
                    onChange={(e) => setIsHighValue(e.target.checked)}
                    className="rounded text-[#053D31] focus:ring-[#053D31]"
                  />
                  <span>High value shipment (Security escort / tamper seal)</span>
                </label>
              </div>
            </div>
          </section>

          {/* Section D: Confirmation (Step 4 Review) */}
          {currentStep === 4 && (
            <section className="bg-green-50/50 border border-green-200 rounded-xl p-5 shadow-xs animate-fade-in">
              <div className="flex items-center gap-2 text-green-800 font-bold text-sm mb-3">
                <CheckCircle2 size={18} className="text-green-600" />
                Review & Confirm Order
              </div>
              <p className="text-xs text-gray-600 mb-4">
                Please verify the order information below. Once submitted, this order will enter the dispatch planning pipeline for delivery on {formatDisplayDate(deliveryDate)}.
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs bg-white p-4 rounded-lg border border-green-100">
                <div>
                  <span className="text-gray-500 block mb-0.5">Destination:</span>
                  <strong className="text-gray-900">{selectedOutlet?.name}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Total Weight:</span>
                  <strong className="text-gray-900">{Math.round(totals.weight * 100) / 100} kg</strong>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Total Volume:</span>
                  <strong className="text-gray-900">{Math.round(totals.volume * 1000) / 1000} m³</strong>
                </div>
                <div>
                  <span className="text-gray-500 block mb-0.5">Items / Units:</span>
                  <strong className="text-gray-900">{items.length} lines ({totals.units} units)</strong>
                </div>
              </div>
            </section>
          )}

          {/* Bottom Action Bar */}
          <div className="flex items-center justify-between pt-2 pb-8">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleFinalSubmit(false)}
                disabled={isSubmittingOrder}
                className="px-5 py-2.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors shadow-xs disabled:opacity-50"
              >
                Save Draft
              </button>

              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep((prev) => Math.max(1, prev - 1))}
                  className="px-4 py-2.5 text-xs font-bold text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <ChevronLeft size={16} />
                  Back
                </button>
              )}
            </div>

            <button
              type="button"
              onClick={handleContinue}
              disabled={isSubmittingOrder}
              className="px-6 py-2.5 bg-[#FFC107] hover:bg-[#F59E0B] text-gray-900 rounded-xl text-xs font-bold transition-all shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50"
            >
              {isSubmittingOrder ? (
                "Creating Order..."
              ) : currentStep === 4 ? (
                <>Create & Submit Order <Check size={16} /></>
              ) : (
                <>Continue <ChevronRight size={16} /></>
              )}
            </button>
          </div>

        </div>
      </main>

      {/* Floating Success Toast */}
      {toast && (
        <div className="fixed bottom-8 right-8 z-50 bg-gray-900 text-white px-5 py-3 rounded-xl shadow-2xl text-xs sm:text-sm font-medium flex items-center gap-3 border border-gray-700 animate-fade-in">
          <CheckCircle2 size={18} className="text-green-400" />
          <span>{toast}</span>
        </div>
      )}
    </div>
  );
}