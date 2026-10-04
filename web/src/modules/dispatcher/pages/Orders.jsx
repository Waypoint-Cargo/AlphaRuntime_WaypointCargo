import React, { useState, useMemo } from 'react';
import { 
  Calendar, 
  Search, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Package,
  Leaf,
  ShoppingBag,
  Laptop,
  Snowflake,
  RefreshCw,
  Clock,
  ArrowUpDown
} from 'lucide-react';
import { useGetOrdersQuery } from "@/modules/store_manager/Orders/ordersApi.js";

const DISPATCH_STATUS_FILTER = "PLANNED,LOADED,PARTIALLY_LOADED,IN_TRANSIT,DELIVERED,PARTIALLY_DELIVERED,RECEIVED,RECEIVED_WITH_ISSUES";

const STATUS_CONFIG = {
  PLANNED: { label: "Planned", badge: "bg-blue-50 text-blue-700 border border-blue-200", dot: "bg-blue-500" },
  LOADED: { label: "Loaded", badge: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  PARTIALLY_LOADED: { label: "Partially Loaded", badge: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  IN_TRANSIT: { label: "In Transit", badge: "bg-amber-50 text-amber-700 border border-amber-200", dot: "bg-amber-500" },
  DELIVERED: { label: "Delivered", badge: "bg-green-50 text-green-700 border border-green-200", dot: "bg-green-500" },
  PARTIALLY_DELIVERED: { label: "Partially Delivered", badge: "bg-orange-50 text-orange-700 border border-orange-200", dot: "bg-orange-500" },
  RECEIVED: { label: "Received", badge: "bg-green-50 text-green-700 border border-green-200", dot: "bg-green-500" },
  RECEIVED_WITH_ISSUES: { label: "Received w/ Issues", badge: "bg-orange-50 text-orange-700 border border-orange-200", dot: "bg-orange-500" },
};

const BRAND_CONFIG = {
  FRESH: { initial: "F", name: "Fresh", color: "text-[#053D31]", bg: "bg-[#053D31] text-white", pillActive: "bg-green-50 text-green-800 border-green-200", pillIcon: "text-green-600" },
  STYLE: { initial: "S", name: "Style", color: "text-blue-600", bg: "bg-blue-700 text-white", pillActive: "bg-blue-50 text-blue-800 border-blue-200", pillIcon: "text-blue-600" },
  TECH: { initial: "T", name: "Tech", color: "text-purple-600", bg: "bg-purple-700 text-white", pillActive: "bg-purple-50 text-purple-800 border-purple-200", pillIcon: "text-purple-600" },
};

const PAGE_SIZE = 10;

export default function Orders() {
  const [activeBrand, setActiveBrand] = useState('ALL'); // 'ALL' | 'FRESH' | 'STYLE' | 'TECH'
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PLANNED' | 'OUT_FOR_DELIVERY' | 'DELIVERED'
  const [sortOption, setSortOption] = useState('newest'); // 'newest' | 'oldest' | 'outlet_asc' | 'weight_desc' | 'weight_asc'
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [isBrandDropdownOpen, setIsBrandDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);

  // Fetch all dispatch operational orders
  const { data: ordersResponse, isLoading, refetch } = useGetOrdersQuery(
    { status: DISPATCH_STATUS_FILTER, pageSize: 100 },
    { refetchOnMountOrArgChange: true }
  );

  const allOrders = useMemo(() => ordersResponse?.items ?? [], [ordersResponse]);

  // Compute summary metric card numbers
  const summaryCounts = useMemo(() => {
    return {
      all: allOrders.length,
      fresh: allOrders.filter(o => o.brand === 'FRESH').length,
      style: allOrders.filter(o => o.brand === 'STYLE').length,
      tech: allOrders.filter(o => o.brand === 'TECH').length,
    };
  }, [allOrders]);

  // Filter and sort orders
  const filteredOrders = useMemo(() => {
    let list = allOrders.filter(order => {
      // Brand filter
      if (activeBrand !== 'ALL' && order.brand !== activeBrand) return false;

      // Status filter
      if (statusFilter === 'PLANNED') {
        if (order.rawStatus !== 'PLANNED') return false;
      } else if (statusFilter === 'OUT_FOR_DELIVERY') {
        if (!['LOADED', 'PARTIALLY_LOADED', 'IN_TRANSIT'].includes(order.rawStatus)) return false;
      } else if (statusFilter === 'DELIVERED') {
        if (!['DELIVERED', 'PARTIALLY_DELIVERED', 'RECEIVED', 'RECEIVED_WITH_ISSUES'].includes(order.rawStatus)) return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchesRef = order.id?.toLowerCase().includes(q);
        const matchesOutlet = order.outlet?.toLowerCase().includes(q);
        const matchesCity = order.city?.toLowerCase().includes(q);
        const matchesDriver = order.driver?.name?.toLowerCase().includes(q);
        if (!matchesRef && !matchesOutlet && !matchesCity && !matchesDriver) return false;
      }

      return true;
    });

    // Sorting
    if (sortOption === 'newest') {
      list = [...list].sort((a, b) => new Date(b.deliveryDate || b.created) - new Date(a.deliveryDate || a.created));
    } else if (sortOption === 'oldest') {
      list = [...list].sort((a, b) => new Date(a.deliveryDate || a.created) - new Date(b.deliveryDate || b.created));
    } else if (sortOption === 'outlet_asc') {
      list = [...list].sort((a, b) => (a.outlet || '').localeCompare(b.outlet || ''));
    } else if (sortOption === 'weight_desc') {
      list = [...list].sort((a, b) => b.weight - a.weight);
    } else if (sortOption === 'weight_asc') {
      list = [...list].sort((a, b) => a.weight - b.weight);
    }

    return list;
  }, [allOrders, activeBrand, statusFilter, sortOption, searchQuery]);

  // Pagination calculation
  const totalCount = filteredOrders.length;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentOrders = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page]);

  // Today's date formatted
  const formattedToday = useMemo(() => {
    return new Date().toLocaleDateString('en-GB', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <button 
              onClick={() => refetch()} 
              title="Refresh orders"
              className="p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:text-gray-900 hover:bg-gray-50 transition-colors"
            >
              <RefreshCw size={16} className={isLoading ? "animate-spin text-[#053D31]" : ""} />
            </button>
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Tracking planned, out for delivery, and completed orders across all three brands.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-sm">
          <Calendar size={18} className="text-gray-400" />
          <div>
            <p className="text-[10px] text-gray-500 font-medium leading-none mb-0.5">Today</p>
            <p className="text-sm font-bold text-gray-900 leading-none">{formattedToday}</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
          onClick={() => { setActiveBrand('ALL'); setPage(1); }}
          className={`bg-white rounded-xl border p-5 shadow-sm cursor-pointer transition-all hover:border-gray-400 ${
            activeBrand === 'ALL' ? 'border-[#053D31] ring-1 ring-[#053D31]' : 'border-gray-200'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">All Orders</h3>
            <div className="text-gray-400"><Package size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summaryCounts.all}</div>
        </div>
        
        <div 
          onClick={() => { setActiveBrand('FRESH'); setPage(1); }}
          className={`bg-white rounded-xl border p-5 shadow-sm cursor-pointer transition-all hover:border-gray-400 ${
            activeBrand === 'FRESH' ? 'border-green-600 ring-1 ring-green-600' : 'border-gray-200'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Fresh</h3>
            <div className="text-[#053D31]"><Leaf size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summaryCounts.fresh}</div>
        </div>

        <div 
          onClick={() => { setActiveBrand('STYLE'); setPage(1); }}
          className={`bg-white rounded-xl border p-5 shadow-sm cursor-pointer transition-all hover:border-gray-400 ${
            activeBrand === 'STYLE' ? 'border-blue-600 ring-1 ring-blue-600' : 'border-gray-200'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Style</h3>
            <div className="text-blue-600"><ShoppingBag size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summaryCounts.style}</div>
        </div>

        <div 
          onClick={() => { setActiveBrand('TECH'); setPage(1); }}
          className={`bg-white rounded-xl border p-5 shadow-sm cursor-pointer transition-all hover:border-gray-400 ${
            activeBrand === 'TECH' ? 'border-purple-600 ring-1 ring-purple-600' : 'border-gray-200'
          }`}
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Tech</h3>
            <div className="text-purple-600"><Laptop size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{summaryCounts.tech}</div>
        </div>
      </div>

      {/* Brand Filter Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <button 
          onClick={() => { setActiveBrand('ALL'); setPage(1); }}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer ${
            activeBrand === 'ALL' 
              ? 'bg-[#053D31] text-white shadow-sm' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All brands
        </button>
        <button 
          onClick={() => { setActiveBrand('FRESH'); setPage(1); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
            activeBrand === 'FRESH' 
              ? 'bg-green-50 text-green-800 border-green-300 font-semibold' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Leaf size={16} className={activeBrand === 'FRESH' ? 'text-green-600' : 'text-gray-400'} />
          Fresh
        </button>
        <button 
          onClick={() => { setActiveBrand('STYLE'); setPage(1); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
            activeBrand === 'STYLE' 
              ? 'bg-blue-50 text-blue-800 border-blue-300 font-semibold' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ShoppingBag size={16} className={activeBrand === 'STYLE' ? 'text-blue-600' : 'text-gray-400'} />
          Style
        </button>
        <button 
          onClick={() => { setActiveBrand('TECH'); setPage(1); }}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors border cursor-pointer ${
            activeBrand === 'TECH' 
              ? 'bg-purple-50 text-purple-800 border-purple-300 font-semibold' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Laptop size={16} className={activeBrand === 'TECH' ? 'text-purple-600' : 'text-gray-400'} />
          Tech
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search input */}
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            placeholder="Search orders, outlets, locations or drivers..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#053D31] focus:border-transparent transition-all shadow-sm"
          />
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Status Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setIsStatusDropdownOpen(!isStatusDropdownOpen); setIsBrandDropdownOpen(false); setIsSortDropdownOpen(false); }}
              className="flex items-center justify-between w-44 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <span className="truncate">
                {statusFilter === 'ALL' ? 'All Status' :
                 statusFilter === 'PLANNED' ? 'Planned' :
                 statusFilter === 'OUT_FOR_DELIVERY' ? 'Out for Delivery' : 'Delivered'}
              </span>
              <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
            </button>

            {isStatusDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 text-sm">
                <button 
                  onClick={() => { setStatusFilter('ALL'); setIsStatusDropdownOpen(false); setPage(1); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${statusFilter === 'ALL' ? 'text-[#053D31] bg-green-50' : 'text-gray-700'}`}
                >
                  All Status
                </button>
                <button 
                  onClick={() => { setStatusFilter('PLANNED'); setIsStatusDropdownOpen(false); setPage(1); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${statusFilter === 'PLANNED' ? 'text-blue-700 bg-blue-50' : 'text-gray-700'}`}
                >
                  Planned
                </button>
                <button 
                  onClick={() => { setStatusFilter('OUT_FOR_DELIVERY'); setIsStatusDropdownOpen(false); setPage(1); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${statusFilter === 'OUT_FOR_DELIVERY' ? 'text-amber-700 bg-amber-50' : 'text-gray-700'}`}
                >
                  Out for Delivery
                </button>
                <button 
                  onClick={() => { setStatusFilter('DELIVERED'); setIsStatusDropdownOpen(false); setPage(1); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${statusFilter === 'DELIVERED' ? 'text-green-700 bg-green-50' : 'text-gray-700'}`}
                >
                  Delivered
                </button>
              </div>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="relative">
            <button 
              onClick={() => { setIsSortDropdownOpen(!isSortDropdownOpen); setIsStatusDropdownOpen(false); setIsBrandDropdownOpen(false); }}
              className="flex items-center justify-between w-44 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 transition-colors"
            >
              <span className="flex items-center gap-1.5 truncate">
                <ArrowUpDown size={14} className="text-gray-400" />
                {sortOption === 'newest' ? 'Newest Date' :
                 sortOption === 'oldest' ? 'Oldest Date' :
                 sortOption === 'outlet_asc' ? 'Outlet (A-Z)' :
                 sortOption === 'weight_desc' ? 'Heaviest Load' : 'Lightest Load'}
              </span>
              <ChevronDown size={16} className="text-gray-400 flex-shrink-0" />
            </button>

            {isSortDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1 text-sm">
                <button 
                  onClick={() => { setSortOption('newest'); setIsSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${sortOption === 'newest' ? 'text-[#053D31] bg-green-50' : 'text-gray-700'}`}
                >
                  Delivery Date (Newest)
                </button>
                <button 
                  onClick={() => { setSortOption('oldest'); setIsSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${sortOption === 'oldest' ? 'text-[#053D31] bg-green-50' : 'text-gray-700'}`}
                >
                  Delivery Date (Oldest)
                </button>
                <button 
                  onClick={() => { setSortOption('outlet_asc'); setIsSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${sortOption === 'outlet_asc' ? 'text-[#053D31] bg-green-50' : 'text-gray-700'}`}
                >
                  Outlet Name (A - Z)
                </button>
                <button 
                  onClick={() => { setSortOption('weight_desc'); setIsSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${sortOption === 'weight_desc' ? 'text-[#053D31] bg-green-50' : 'text-gray-700'}`}
                >
                  Load (Heaviest First)
                </button>
                <button 
                  onClick={() => { setSortOption('weight_asc'); setIsSortDropdownOpen(false); }}
                  className={`w-full text-left px-4 py-2 hover:bg-gray-50 font-medium ${sortOption === 'weight_asc' ? 'text-[#053D31] bg-green-50' : 'text-gray-700'}`}
                >
                  Load (Lightest First)
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Order</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Outlet</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Load</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider">Window</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <RefreshCw size={24} className="animate-spin mx-auto mb-2 text-[#053D31]" />
                    Loading orders...
                  </td>
                </tr>
              )}

              {!isLoading && currentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <Package size={32} className="mx-auto mb-2 text-gray-300" />
                    <p className="font-semibold text-gray-700">No orders found</p>
                    <p className="text-xs text-gray-500 mt-1">No orders match your current brand, status, or search filters.</p>
                  </td>
                </tr>
              )}

              {!isLoading && currentOrders.map((order) => {
                const brandConf = BRAND_CONFIG[order.brand] || BRAND_CONFIG.FRESH;
                const statusConf = STATUS_CONFIG[order.rawStatus] || { 
                  label: order.rawStatus || "Unknown", 
                  badge: "bg-gray-100 text-gray-700 border-gray-200", 
                  dot: "bg-gray-400" 
                };

                return (
                  <tr key={order.uid || order.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">{order.id}</span>
                      {order.tripCode && (
                        <p className="text-[10px] text-gray-400 font-medium">{order.tripCode}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg ${brandConf.bg} flex items-center justify-center font-bold text-sm shadow-xs`}>
                          {brandConf.initial}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{order.outlet}</p>
                          <p className="text-xs text-gray-500">{order.city || 'Colombo'}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                          {order.tempClass && order.tempClass !== 'AMBIENT' && <Snowflake size={11} className="text-blue-600" />}
                          {order.tempClass ? order.tempClass.charAt(0) + order.tempClass.slice(1).toLowerCase() : 'Ambient'}
                        </span>
                        {order.isFragile && (
                          <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold">
                            Fragile
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm font-bold text-gray-900">{order.weight} kg</span>
                      <span className="text-sm text-gray-500"> • {order.volume} m³</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-700">
                        {order.window !== '—' ? order.window : (order.date || 'Standard')}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConf.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${statusConf.dot}`}></span>
                        {statusConf.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">
              {totalCount === 0 ? 0 : (page - 1) * PAGE_SIZE + 1} - {Math.min(page * PAGE_SIZE, totalCount)}
            </span> of <span className="font-medium text-gray-900">{totalCount}</span> orders
          </p>
          
          {pageCount > 1 && (
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={18} />
              </button>
              
              {Array.from({ length: pageCount }, (_, i) => i + 1).map(p => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-8 h-8 rounded text-sm font-medium flex items-center justify-center transition-colors cursor-pointer ${
                    page === p 
                      ? 'bg-[#053D31] text-white shadow-xs' 
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              ))}

              <button 
                onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                disabled={page === pageCount}
                className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          )}
        </div>
      </div>

    </div>
  );
}

