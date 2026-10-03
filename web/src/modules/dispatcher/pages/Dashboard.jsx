import React from 'react';
import { 
  ClipboardList, 
  Truck, 
  Navigation, 
  AlertTriangle, 
  Clock, 
  Calendar, 
  Box, 
  CheckCircle2, 
  ChevronRight,
  RefreshCcw,
  MapPin,
  Snowflake,
  AlertCircle
} from 'lucide-react';

// MOCK DATA for easy backend connection later
const mockDashboardData = {
  userName: "Alpha Runtime",
  metrics: {
    ordersToday: 35,
    vehiclesAvailable: 14,
    activeDeliveries: 9,
    atRisk: 3,
    deferred: 2
  },
  operations: {
    orders: 35,
    planned: 33,
    loaded: 24,
    inTransit: 9,
    delivered: 18
  },
  attentionRequired: [
    {
      id: 1,
      type: 'warning',
      title: 'Delivery window risk',
      description: 'Fresh Nugegoda may miss the 8.00A.M. delivery window.',
      action: 'Review'
    },
    {
      id: 2,
      type: 'warning',
      title: 'Loading shortfall',
      description: 'Route R-005 has 48 of 50 planned items available.',
      action: 'Replan'
    },
    {
      id: 3,
      type: 'warning',
      title: 'Vehicle constraint',
      description: 'ORD-118 requires a refrigerated vehicle.',
      action: 'Replan'
    },
    {
      id: 4,
      type: 'info',
      title: 'ORD-106',
      description: 'ORD-106 moved to the next available run.',
      action: 'View'
    }
  ],
  healthSummary: {
    onTrack: 28,
    atRisk: 3,
    critical: 1,
    windowRisks: 3,
    refrigeration: 5,
    loadingIssues: 2,
    deferredOrders: 2,
    deliveryDelays: 1
  }
};

export default function DispatcherDashboard() {
  const data = mockDashboardData;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Good morning, {data.userName}</h1>
        <p className="text-gray-500 text-sm mt-1">Here's what's happening with today's delivery operations</p>
      </div>

      {/* Top Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Orders Today</h3>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md"><ClipboardList size={16} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{data.metrics.ordersToday}</div>
          <p className="text-xs text-gray-400">Confirmed Orders</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Vehicles Available</h3>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md"><Truck size={16} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{data.metrics.vehiclesAvailable}</div>
          <p className="text-xs text-gray-400">Ready for planning</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Active Deliveries</h3>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md"><Navigation size={16} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{data.metrics.activeDeliveries}</div>
          <p className="text-xs text-gray-400">Currently on route</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">At Risk</h3>
            <div className="p-1.5 bg-green-50 text-green-600 rounded-md"><AlertTriangle size={16} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{data.metrics.atRisk}</div>
          <p className="text-xs text-gray-400">Need attention</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Deferred</h3>
            <div className="p-1.5 bg-gray-50 text-gray-600 rounded-md"><Clock size={16} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1">{data.metrics.deferred}</div>
          <p className="text-xs text-gray-400">Orders moved to next run</p>
        </div>

      </div>

      {/* Today's Operations Pipeline */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-6">Today's Operations</h3>
        
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          
          <div className="flex-1 w-full text-center relative">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-green-50 text-green-700 flex items-center justify-center mb-2"><ClipboardList size={20} /></div>
              <p className="text-xs text-gray-500 font-medium mb-1">Orders</p>
              <p className="text-2xl font-bold text-gray-900">{data.operations.orders}</p>
            </div>
            <div className="mt-4 h-1.5 w-full bg-[#053D31] rounded-full"></div>
            <ChevronRight size={16} className="absolute top-1/3 -right-3 text-gray-400 hidden md:block" />
          </div>

          <div className="flex-1 w-full text-center relative">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center mb-2"><Calendar size={20} /></div>
              <p className="text-xs text-gray-500 font-medium mb-1">Planned</p>
              <p className="text-2xl font-bold text-gray-900">{data.operations.planned}</p>
            </div>
            <div className="mt-4 h-1.5 w-full bg-[#053D31] rounded-full"></div>
            <ChevronRight size={16} className="absolute top-1/3 -right-3 text-gray-400 hidden md:block" />
          </div>

          <div className="flex-1 w-full text-center relative">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center mb-2"><Box size={20} /></div>
              <p className="text-xs text-gray-500 font-medium mb-1">Loaded</p>
              <p className="text-2xl font-bold text-gray-900">{data.operations.loaded}</p>
            </div>
            <div className="mt-4 h-1.5 w-full bg-[#053D31] rounded-full"></div>
            <ChevronRight size={16} className="absolute top-1/3 -right-3 text-gray-400 hidden md:block" />
          </div>

          <div className="flex-1 w-full text-center relative">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center mb-2"><Truck size={20} /></div>
              <p className="text-xs text-gray-500 font-medium mb-1">In Transit</p>
              <p className="text-2xl font-bold text-gray-900">{data.operations.inTransit}</p>
            </div>
            <div className="mt-4 flex gap-1">
               <div className="h-1.5 flex-1 bg-[#FFC107] rounded-full"></div>
               <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
            </div>
            <ChevronRight size={16} className="absolute top-1/3 -right-3 text-gray-400 hidden md:block" />
          </div>

          <div className="flex-1 w-full text-center">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full border border-gray-200 text-gray-600 flex items-center justify-center mb-2"><CheckCircle2 size={20} /></div>
              <p className="text-xs text-gray-500 font-medium mb-1">Delivered</p>
              <p className="text-2xl font-bold text-gray-900">{data.operations.delivered}</p>
            </div>
            <div className="mt-4 flex gap-1">
               <div className="h-1.5 flex-[3] bg-[#053D31] rounded-full"></div>
               <div className="h-1.5 flex-1 bg-gray-100 rounded-full"></div>
            </div>
          </div>

        </div>
      </div>

      {/* Attention Required List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="p-5 border-b border-gray-100">
          <h3 className="text-base font-bold text-gray-900">Attention Required</h3>
        </div>
        <div className="divide-y divide-gray-100">
          {data.attentionRequired.map((item) => (
            <div key={item.id} className="p-4 flex items-start sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
              <div className="flex items-start gap-4">
                <div className="mt-0.5">
                  {item.type === 'warning' ? (
                    <AlertTriangle size={18} className="text-yellow-500" />
                  ) : (
                    <RefreshCcw size={18} className="text-blue-500" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-gray-900">{item.title}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                </div>
              </div>
              <button className="px-4 py-1.5 border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                {item.action}
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-base font-bold text-gray-900 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <button className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between h-28 hover:shadow-md transition-shadow group text-left">
            <div className="flex items-start gap-3">
              <ClipboardList size={20} className="text-[#053D31]" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Close Orders</h4>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Close today's order window</p>
              </div>
            </div>
            <div className="text-[#053D31] group-hover:translate-x-1 transition-transform">
              <ChevronRight size={18} />
            </div>
          </button>

          <button className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between h-28 hover:shadow-md transition-shadow group text-left">
            <div className="flex items-start gap-3">
              <Calendar size={20} className="text-[#053D31]" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Plan Deliveries</h4>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Build today's delivery plan</p>
              </div>
            </div>
            <div className="text-[#053D31] group-hover:translate-x-1 transition-transform">
              <ChevronRight size={18} />
            </div>
          </button>

          <button className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between h-28 hover:shadow-md transition-shadow group text-left">
            <div className="flex items-start gap-3">
              <MapPin size={20} className="text-[#053D31]" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">View Live Routes</h4>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Monitor active deliveries</p>
              </div>
            </div>
            <div className="text-[#053D31] group-hover:translate-x-1 transition-transform">
              <ChevronRight size={18} />
            </div>
          </button>

          <button className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col justify-between h-28 hover:shadow-md transition-shadow group text-left">
            <div className="flex items-start gap-3">
              <RefreshCcw size={20} className="text-[#053D31]" />
              <div>
                <h4 className="text-sm font-semibold text-gray-900">Review Deferrals</h4>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">See orders that could not be allocated</p>
              </div>
            </div>
            <div className="text-[#053D31] group-hover:translate-x-1 transition-transform">
              <ChevronRight size={18} />
            </div>
          </button>

        </div>
      </div>

      {/* Operational Health Summary */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
        <h3 className="text-base font-bold text-gray-900 mb-4">Operational Health Summary</h3>
        
        <div className="flex flex-wrap items-center gap-6 justify-between lg:justify-start lg:gap-10">
          
          <div className="flex items-center gap-2">
            <CheckCircle2 size={20} className="text-[#053D31]" />
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">On Track</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{data.healthSummary.onTrack}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <AlertTriangle size={20} className="text-yellow-500" />
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">At Risk</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{data.healthSummary.atRisk}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <AlertCircle size={20} className="text-red-500" />
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Critical</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{data.healthSummary.critical}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={20} className="text-yellow-500" />
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Window Risks</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{data.healthSummary.windowRisks}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Snowflake size={20} className="text-[#053D31]" />
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Refrigeration</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{data.healthSummary.refrigeration}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Box size={20} className="text-blue-500" />
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Loading Issues</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{data.healthSummary.loadingIssues}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <RefreshCcw size={20} className="text-blue-500" />
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Deferred Orders</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{data.healthSummary.deferredOrders}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Clock size={20} className="text-red-500" />
            <div>
              <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">Delivery Delays</p>
              <p className="text-lg font-bold text-gray-900 leading-none">{data.healthSummary.deliveryDelays}</p>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
