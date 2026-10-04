import React, { useState } from 'react';
import { 
  Calendar, 
  Search, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Package,
  Leaf,
  ShoppingBag,
  Laptop
} from 'lucide-react';

// MOCK DATA for Orders
const mockOrdersData = {
  summary: {
    all: 35,
    fresh: 9,
    style: 14,
    tech: 2
  },
  orders: [
    { id: 'ORD-101', outlet: 'Fresh Nugegoda', location: 'Colombo', type: 'Dry groceries', weight: '878kg', volume: '14m³', window: '05:30-07:45', status: 'Confirmed', brand: 'Fresh' },
    { id: 'ORD-102', outlet: 'Fresh Maharagama', location: 'Colombo', type: 'Dry groceries', weight: '1217kg', volume: '9m³', window: '05:30-07:45', status: 'Confirmed', brand: 'Fresh' },
    { id: 'ORD-103', outlet: 'Fresh Kadawatha', location: 'Gampaha', type: 'Dry groceries', weight: '447kg', volume: '9m³', window: '05:30-07:45', status: 'Confirmed', brand: 'Fresh' },
    { id: 'ORD-104', outlet: 'Fresh Kelaniya', location: 'Gampaha', type: 'Dry groceries', weight: '727kg', volume: '14m³', window: '05:30-07:45', status: 'Confirmed', brand: 'Fresh' },
    { id: 'ORD-105', outlet: 'Fresh Moratuwa', location: 'Moratuwa', type: 'Dry groceries', weight: '727kg', volume: '14m³', window: '05:30-07:45', status: 'Confirmed', brand: 'Fresh' },
    { id: 'ORD-106', outlet: 'Fresh Dehiwala', location: 'Colombo', type: 'Dry groceries', weight: '727kg', volume: '14m³', window: '05:30-07:45', status: 'Confirmed', brand: 'Fresh' },
    { id: 'ORD-107', outlet: 'Fresh Ja-Ela', location: 'Gampaha', type: 'Dry groceries', weight: '727kg', volume: '14m³', window: '05:30-07:45', status: 'Confirmed', brand: 'Fresh' },
    { id: 'ORD-108', outlet: 'Fresh Wattala', location: 'Gampaha', type: 'Dry groceries', weight: '727kg', volume: '14m³', window: '05:30-07:45', status: 'Confirmed', brand: 'Fresh' }
  ]
};

export default function Orders() {
  const [activeBrand, setActiveBrand] = useState('All brands');

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
          <p className="text-gray-500 text-sm mt-1">Every order in the system today, across all three brands.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-lg border border-gray-200 shadow-sm">
          <Calendar size={18} className="text-gray-400" />
          <div>
            <p className="text-[10px] text-gray-500 font-medium leading-none mb-0.5">Today</p>
            <p className="text-sm font-bold text-gray-900 leading-none">Mon, 06 Oct 2026</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">All Orders</h3>
            <div className="text-gray-400"><Package size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{mockOrdersData.summary.all}</div>
        </div>
        
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Fresh</h3>
            <div className="text-[#053D31]"><Leaf size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{mockOrdersData.summary.fresh}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Style</h3>
            <div className="text-gray-400"><ShoppingBag size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{mockOrdersData.summary.style}</div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <div className="flex justify-between items-start mb-2">
            <h3 className="text-sm font-medium text-gray-500">Tech</h3>
            <div className="text-gray-400"><Laptop size={18} /></div>
          </div>
          <div className="text-3xl font-bold text-gray-900">{mockOrdersData.summary.tech}</div>
        </div>
      </div>

      {/* Brand Filter Pills */}
      <div className="flex flex-wrap items-center gap-3">
        <button 
          onClick={() => setActiveBrand('All brands')}
          className={`px-5 py-2 rounded-full text-sm font-medium transition-colors ${
            activeBrand === 'All brands' 
              ? 'bg-[#053D31] text-white' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          All brands
        </button>
        <button 
          onClick={() => setActiveBrand('Fresh')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
            activeBrand === 'Fresh' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Leaf size={16} className={activeBrand === 'Fresh' ? 'text-green-600' : 'text-gray-400'} />
          Fresh
        </button>
        <button 
          onClick={() => setActiveBrand('Style')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
            activeBrand === 'Style' 
              ? 'bg-blue-50 text-blue-800 border-blue-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <ShoppingBag size={16} className={activeBrand === 'Style' ? 'text-blue-600' : 'text-gray-400'} />
          Style
        </button>
        <button 
          onClick={() => setActiveBrand('Tech')}
          className={`flex items-center gap-2 px-5 py-2 rounded-full text-sm font-medium transition-colors border ${
            activeBrand === 'Tech' 
              ? 'bg-purple-50 text-purple-800 border-purple-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Laptop size={16} className={activeBrand === 'Tech' ? 'text-purple-600' : 'text-gray-400'} />
          Tech
        </button>
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search orders, outlets or locations..." 
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#053D31] focus:border-transparent transition-all shadow-sm"
          />
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center justify-between w-40 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            All Brands <ChevronDown size={16} className="text-gray-400" />
          </button>
          <button className="flex items-center justify-between w-40 px-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            All Status <ChevronDown size={16} className="text-gray-400" />
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Order</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Outlet</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Type</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Load</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Window</th>
                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mockOrdersData.orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900">{order.id}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded bg-[#053D31] text-white flex items-center justify-center font-bold text-sm">
                        {order.brand.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-900">{order.outlet}</p>
                        <p className="text-xs text-gray-500">{order.location}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-medium">
                      {order.type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold text-gray-900">{order.weight}</span>
                    <span className="text-sm text-gray-500"> • {order.volume}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-medium text-gray-700">{order.window}</span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 text-green-700 text-xs font-semibold">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                      {order.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {/* Pagination Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-sm text-gray-500">
            Showing <span className="font-medium text-gray-900">1 - 8</span> of <span className="font-medium text-gray-900">35</span> orders
          </p>
          <div className="flex items-center gap-1">
            <button className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <ChevronLeft size={18} />
            </button>
            <button className="w-8 h-8 rounded bg-[#053D31] text-white text-sm font-medium flex items-center justify-center">1</button>
            <button className="w-8 h-8 rounded text-gray-600 hover:bg-gray-100 text-sm font-medium flex items-center justify-center transition-colors">2</button>
            <button className="w-8 h-8 rounded text-gray-600 hover:bg-gray-100 text-sm font-medium flex items-center justify-center transition-colors">3</button>
            <span className="px-1 text-gray-400">...</span>
            <button className="w-8 h-8 rounded text-gray-600 hover:bg-gray-100 text-sm font-medium flex items-center justify-center transition-colors">6</button>
            <button className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
