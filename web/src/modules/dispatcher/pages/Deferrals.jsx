import React, { useState } from 'react';
import { 
  Search, 
  ChevronDown, 
  Clock, 
  History, 
  FileText,
  X,
  AlertCircle,
  RefreshCcw
} from 'lucide-react';

const mockDeferredOrders = [
  {
    id: 'ORD-001',
    outlet: 'OUT004',
    brand: 'Fresh',
    brandColor: 'text-green-500',
    weight: '300kg',
    volume: '3 m³',
    window: '06:00 - 08:00',
    conflict: 'No feasible vehicle',
    status: 'Pending',
    selected: true
  },
  {
    id: 'ORD-002',
    outlet: 'OUT004',
    brand: 'Fresh',
    brandColor: 'text-green-500',
    weight: '200kg',
    volume: '2 m³',
    window: '06:00 - 08:00',
    conflict: 'Van Only Outlet',
    status: 'Deferred',
    selected: false
  },
  {
    id: 'ORD-003',
    outlet: 'OUT004',
    brand: 'Style',
    brandColor: 'text-purple-500',
    weight: '500kg',
    volume: '3 m³',
    window: '08:00 - 10:00',
    conflict: 'No feasible vehicle',
    status: 'Deferred',
    selected: false
  },
  {
    id: 'ORD-004',
    outlet: 'OUT004',
    brand: 'Fresh',
    brandColor: 'text-green-500',
    weight: '300kg',
    volume: '3 m³',
    window: '06:00 - 08:00',
    conflict: 'Fuel quota limit',
    status: 'Pending',
    selected: false
  },
  {
    id: 'ORD-005',
    outlet: 'OUT004',
    brand: 'Tech',
    brandColor: 'text-blue-500',
    weight: '600kg',
    volume: '4 m³',
    window: '10:00 - 12:00',
    conflict: 'No feasible vehicle',
    status: 'Deferred',
    selected: false
  },
  {
    id: 'ORD-006',
    outlet: 'OUT004',
    brand: 'Fresh',
    brandColor: 'text-green-500',
    weight: '250kg',
    volume: '2 m³',
    window: '06:00 - 08:00',
    conflict: 'No feasible vehicle',
    status: 'Pending',
    selected: false
  }
];

export default function Deferrals() {
  const [selectedOrder, setSelectedOrder] = useState(mockDeferredOrders[0]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Deferrals</h1>
        <p className="text-gray-500 text-sm mt-1">Manage orders that cannot be allocated due to constraints or capacity limits.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Deferred Today</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">18</p>
            <p className="text-[10px] text-gray-400">Orders moved to next run</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
            <History size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Pending decision</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">1</p>
            <p className="text-[10px] text-gray-400">Requires your review</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
            <Clock size={20} />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 mb-2">Previously Deferred</p>
            <p className="text-3xl font-bold text-gray-900 mb-1">6</p>
            <p className="text-[10px] text-gray-400">Last 7 days</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
            <FileText size={20} />
          </div>
        </div>

      </div>

      {/* Main Content Split */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Side - Table & Filters */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col">
          
          {/* Filters */}
          <div className="p-5 border-b border-gray-100 flex flex-col md:flex-row gap-4 items-end">
            <div className="w-full md:flex-1">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input 
                  type="text" 
                  placeholder="Search Order, Outlet" 
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300"
                />
              </div>
            </div>
            
            <div className="w-full md:w-48">
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Brand</label>
              <div className="relative">
                <select className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-gray-300 text-gray-700">
                  <option>All</option>
                  <option>Fresh</option>
                  <option>Style</option>
                  <option>Tech</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="w-full md:w-48">
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Status</label>
              <div className="relative">
                <select className="w-full pl-3 pr-8 py-2 bg-white border border-gray-200 rounded-lg text-sm appearance-none focus:outline-none focus:border-gray-300 text-gray-700">
                  <option>All</option>
                  <option>Pending</option>
                  <option>Deferred</option>
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          </div>
          
          {/* Table */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-4 text-[11px] font-bold text-gray-900 text-center">Order</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-gray-900 text-center">Outlet</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-gray-900 text-center">Brand</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-gray-900 text-center">Weight</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-gray-900 text-center">Volume</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-gray-900 text-center">Daily Window</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-gray-900 text-center">Conflicts</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-gray-900 text-center">Status</th>
                  <th className="px-5 py-4 text-[11px] font-bold text-gray-900 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {mockDeferredOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className={`transition-colors cursor-pointer ${order.selected ? 'bg-gray-50/50' : 'hover:bg-gray-50'}`}
                    onClick={() => setSelectedOrder(order)}
                  >
                    <td className="px-5 py-4 text-xs font-bold text-gray-400 text-center">{order.id}</td>
                    <td className="px-5 py-4 text-xs font-bold text-gray-400 text-center">{order.outlet}</td>
                    <td className={`px-5 py-4 text-xs font-bold text-center ${order.brandColor}`}>{order.brand}</td>
                    <td className="px-5 py-4 text-xs font-bold text-gray-600 text-center">{order.weight}</td>
                    <td className="px-5 py-4 text-xs font-bold text-gray-600 text-center">{order.volume}</td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-500 text-center">{order.window}</td>
                    <td className="px-5 py-4 text-xs font-medium text-gray-500 text-center">{order.conflict}</td>
                    <td className="px-5 py-4 text-center">
                      <span className={`text-xs font-bold ${order.status === 'Pending' ? 'text-yellow-500' : 'text-pink-500'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-xs font-bold text-green-600 cursor-pointer hover:text-green-700">View</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="p-4 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400 font-medium">
            <span>Showing 1 - 6 of 15 Deferred Orders</span>
            <div className="flex items-center gap-1">
              <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 font-bold">&lt;</button>
              <button className="w-6 h-6 flex items-center justify-center rounded bg-[#053D31] text-white font-bold">1</button>
              <button className="w-6 h-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 font-bold">&gt;</button>
            </div>
          </div>
        </div>

        {/* Right Side - Deferral Decision Panel */}
        {selectedOrder && (
          <div className="w-full xl:w-80 flex-shrink-0">
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
              
              {/* Panel Header */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-red-500">Deferral Decision</h2>
                <button className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              {/* Order Info */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-xl font-bold text-gray-900">{selectedOrder.id}</h3>
                  <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-[10px] font-bold rounded-full">
                    {selectedOrder.status}
                  </span>
                </div>
                <p className="text-xs text-gray-500 font-bold">
                  {selectedOrder.outlet} <span className={selectedOrder.brandColor}>{selectedOrder.brand}</span>
                </p>
              </div>

              {/* Conflict Alert */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-gray-900 mb-2">Why this order cannot be allocated</h4>
                <div className="bg-red-50 rounded-lg p-3 border border-red-100 flex gap-3">
                  <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-bold text-red-700 mb-0.5">Constraint conflict</p>
                    <p className="text-xs text-red-600/80">Refrigerated capacity unavailable</p>
                  </div>
                </div>
              </div>

              {/* Reason Details */}
              <div className="mb-6">
                <h4 className="text-xs font-bold text-gray-900 mb-2">Reason Details</h4>
                <ul className="space-y-2">
                  <li className="text-xs text-gray-500 flex items-start before:content-['•'] before:mr-2 before:text-gray-300">Required refrigerated capacity</li>
                  <li className="text-xs text-gray-500 flex items-start before:content-['•'] before:mr-2 before:text-gray-300">Available refrigerated vehicles fully allocated</li>
                  <li className="text-xs text-gray-500 flex items-start before:content-['•'] before:mr-2 before:text-gray-300">Alternative vehicle cannot carry chilled goods</li>
                </ul>
              </div>

              {/* Select Reason */}
              <div className="mb-8">
                <h4 className="text-xs font-bold text-gray-900 mb-3">Select Deferral Reason</h4>
                <div className="space-y-2.5">
                  {[
                    'Capacity unavailable',
                    'Delivery Window Conflict',
                    'Vehicle restriction',
                    'Fuel limitation',
                    'Loading shortfall'
                  ].map((reason, idx) => (
                    <label key={reason} className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${idx === 0 ? 'border-[#053D31]' : 'border-gray-300 group-hover:border-gray-400'}`}>
                        {idx === 0 && <div className="w-2 h-2 rounded-full bg-[#053D31]" />}
                      </div>
                      <span className={`text-xs ${idx === 0 ? 'text-gray-900 font-medium' : 'text-gray-500'}`}>{reason}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3">
                <button className="w-full py-2.5 bg-[#FFC107] text-[#053D31] rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-[#e6ae06] transition-colors">
                  <Clock size={16} /> Defer Order
                </button>
                <button className="w-full py-2.5 bg-white border border-gray-200 text-gray-700 rounded-lg text-sm font-bold flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                  <RefreshCcw size={16} /> Replan
                </button>
              </div>

            </div>
          </div>
        )}
      </div>
    </div>
  );
}
