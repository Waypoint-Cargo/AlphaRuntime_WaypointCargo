import React, { useState } from 'react';
import { 
  LayoutGrid, 
  CheckCircle2, 
  Route, 
  Wrench, 
  ChevronRight,
  Snowflake,
  Sun,
  Truck,
  Box,
  Fuel,
  Activity,
  MapPin,
  Clock
} from 'lucide-react';

const mockFleetData = {
  summary: {
    total: 20,
    available: 14,
    inRoute: 4,
    maintenance: 2
  },
  vehicles: [
    {
      id: 'V-001',
      type: 'Refrigerated Truck',
      subType: 'Refrigerated',
      weightStr: '2,000 kg',
      weightPct: 72,
      volStr: '18 m³',
      volPct: 84,
      fuelPct: 72,
      status: 'Available',
      selected: true
    },
    {
      id: 'V-002',
      type: 'Ambient Truck',
      subType: 'Standard',
      weightStr: '1,500 kg',
      weightPct: 65,
      volStr: '16 m³',
      volPct: 70,
      fuelPct: 58,
      status: 'On Route',
      selected: false
    },
    {
      id: 'V-003',
      type: 'Van',
      subType: 'Van Only Compatible',
      weightStr: '1,000 kg',
      weightPct: 32,
      volStr: '10 m³',
      volPct: 40,
      fuelPct: 84,
      status: 'Assigned',
      selected: false
    },
    {
      id: 'V-004',
      type: 'Refrigerated Truck',
      subType: 'Refrigerated',
      weightStr: '2,500 kg',
      weightPct: 84,
      volStr: '20 m³',
      volPct: 90,
      fuelPct: 66,
      status: 'Available',
      selected: false
    },
    {
      id: 'V-005',
      type: 'Ambient Truck',
      subType: 'Standard',
      weightStr: '1,500 kg',
      weightPct: 80,
      volStr: '15 m³',
      volPct: 75,
      fuelPct: 49,
      status: 'On Route',
      selected: false
    },
    {
      id: 'V-006',
      type: 'Van',
      subType: 'Van Only Compatible',
      weightStr: '1,000 kg',
      weightPct: 45,
      volStr: '9 m³',
      volPct: 50,
      fuelPct: 76,
      status: 'Available',
      selected: false
    },
    {
      id: 'V-007',
      type: 'Refrigerated Truck',
      subType: 'Refrigerated',
      weightStr: '2,000 kg',
      weightPct: 0,
      volStr: '18 m³',
      volPct: 0,
      fuelPct: 68,
      status: 'Maintenance',
      selected: false
    },
    {
      id: 'V-008',
      type: 'Ambient Truck',
      subType: 'Standard',
      weightStr: '1,500 kg',
      weightPct: 59,
      volStr: '14 m³',
      volPct: 65,
      fuelPct: 51,
      status: 'Maintenance',
      selected: false
    }
  ]
};

export default function Fleet() {
  const [activeFilter, setActiveFilter] = useState('All');

  const getStatusColor = (status) => {
    switch(status) {
      case 'Available': return 'text-green-700 bg-green-50 border-green-200';
      case 'On Route': return 'text-blue-700 bg-blue-50 border-blue-200';
      case 'Assigned': return 'text-yellow-700 bg-yellow-50 border-yellow-200';
      case 'Maintenance': return 'text-red-700 bg-red-50 border-red-200';
      default: return 'text-gray-700 bg-gray-50 border-gray-200';
    }
  };

  const getStatusDot = (status) => {
    switch(status) {
      case 'Available': return 'bg-green-500';
      case 'On Route': return 'bg-blue-500';
      case 'Assigned': return 'bg-yellow-500';
      case 'Maintenance': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Fleet</h1>
        <p className="text-gray-500 text-sm mt-1">Dispatcher view of every vehicle, its capacity and current status.</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between hover:border-gray-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center text-gray-600">
              <LayoutGrid size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{mockFleetData.summary.total}</p>
              <p className="text-sm font-bold text-gray-700 leading-none mb-0.5">Total Vehicles</p>
              <p className="text-[10px] text-gray-500">Fleet size</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400" size={20} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between hover:border-green-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-green-50 border border-green-100 flex items-center justify-center text-green-600">
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{mockFleetData.summary.available}</p>
              <p className="text-sm font-bold text-gray-700 leading-none mb-0.5">Available</p>
              <p className="text-[10px] text-gray-500">Ready for assignment</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400" size={20} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between hover:border-blue-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
              <Route size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{mockFleetData.summary.inRoute}</p>
              <p className="text-sm font-bold text-gray-700 leading-none mb-0.5">In Route</p>
              <p className="text-[10px] text-gray-500">Delivering now</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400" size={20} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm flex items-center justify-between hover:border-red-300 transition-colors cursor-pointer">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center text-red-500">
              <Wrench size={24} />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900 leading-none mb-1">{mockFleetData.summary.maintenance}</p>
              <p className="text-sm font-bold text-gray-700 leading-none mb-0.5">Maintenance</p>
              <p className="text-[10px] text-gray-500">Under service</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400" size={20} />
        </div>

      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <button 
          onClick={() => setActiveFilter('All')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-colors ${
            activeFilter === 'All' 
              ? 'bg-[#053D31] text-white' 
              : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          <LayoutGrid size={16} /> All
        </button>
        <button 
          onClick={() => setActiveFilter('Refrigerated Truck')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-colors border ${
            activeFilter === 'Refrigerated Truck' 
              ? 'bg-blue-50 text-blue-800 border-blue-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Snowflake size={16} className={activeFilter === 'Refrigerated Truck' ? 'text-blue-600' : 'text-blue-500'} />
          Refrigerated Truck
        </button>
        <button 
          onClick={() => setActiveFilter('Ambient Truck')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-colors border ${
            activeFilter === 'Ambient Truck' 
              ? 'bg-orange-50 text-orange-800 border-orange-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Sun size={16} className={activeFilter === 'Ambient Truck' ? 'text-orange-500' : 'text-orange-400'} />
          Ambient Truck
        </button>
        <button 
          onClick={() => setActiveFilter('Van')}
          className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-colors border ${
            activeFilter === 'Van' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Truck size={16} className={activeFilter === 'Van' ? 'text-green-600' : 'text-green-500'} />
          Van
        </button>
      </div>

      {/* Main Content Split */}
      <div className="flex flex-col xl:flex-row gap-6">
        
        {/* Left Side - Fleet Table */}
        <div className="flex-1 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-gray-100">
            <h3 className="font-bold text-gray-900">Fleet</h3>
            <p className="text-xs text-gray-500">20 vehicles across Peliyagoda DC and Kandy Hub</p>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Vehicle</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Weight Capacity</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Volume Capacity</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Fuel Remaining</th>
                  <th className="px-5 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right pr-8">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mockFleetData.vehicles.map((v) => (
                  <tr key={v.id} className={`transition-colors cursor-pointer ${v.selected ? 'bg-yellow-50/50' : 'hover:bg-gray-50'}`}>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 font-bold text-gray-900 text-sm">
                        <Truck size={16} className="text-gray-700" /> {v.id}
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div>
                        <div className={`flex items-center gap-1.5 text-xs font-bold mb-1 ${
                          v.type === 'Refrigerated Truck' ? 'text-blue-500' :
                          v.type === 'Ambient Truck' ? 'text-orange-400' : 'text-green-500'
                        }`}>
                          {v.type === 'Refrigerated Truck' && <Snowflake size={12} />}
                          {v.type === 'Ambient Truck' && <Sun size={12} />}
                          {v.type === 'Van' && <Truck size={12} />}
                          {v.type}
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-semibold ${
                          v.type === 'Refrigerated Truck' ? 'bg-blue-50 text-blue-600' :
                          v.type === 'Ambient Truck' ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'
                        }`}>
                          {v.subType}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-gray-900">{v.weightStr}</span>
                        <span className="text-gray-400 font-medium">{v.weightPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-green-500 h-full" style={{ width: `${v.weightPct}%` }}></div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-gray-900">{v.volStr}</span>
                        <span className="text-gray-400 font-medium">{v.volPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-blue-500 h-full" style={{ width: `${v.volPct}%` }}></div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-bold text-gray-900 flex items-center gap-1"><Fuel size={12} className="text-gray-400" /> {v.fuelPct}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div className={`h-full ${v.fuelPct > 50 ? 'bg-green-500' : v.fuelPct > 30 ? 'bg-yellow-400' : 'bg-red-500'}`} style={{ width: `${v.fuelPct}%` }}></div>
                      </div>
                    </td>
                    <td className="px-5 py-4 text-right pr-6">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${getStatusColor(v.status)}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${getStatusDot(v.status)}`}></span>
                        {v.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Side - Selected Vehicle Details */}
        <div className="w-full xl:w-80 flex-shrink-0 flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-full">
            
            <div className="p-5 border-b border-gray-100">
              <div className="flex items-center justify-between mb-1">
                <h2 className="text-xl font-bold text-gray-900">V-001</h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border border-green-200 bg-green-50 text-green-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> Available
                </span>
              </div>
              <p className="text-xs text-gray-500 mb-4">Refrigerated Truck · Peliyagoda DC</p>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold">
                <Snowflake size={12} /> Refrigerated
              </span>
            </div>

            <div className="p-5 flex-1 space-y-6">
              
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  <Box size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Capacity</p>
                  <p className="text-sm font-bold text-gray-900">2,000 kg · 18 m³ <span className="font-medium text-gray-500">(72% / 84% used)</span></p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-yellow-50 text-yellow-600 flex items-center justify-center flex-shrink-0">
                  <Fuel size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Fuel quota</p>
                  <p className="text-sm font-bold text-gray-900">72% of 180 L tank remaining</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center flex-shrink-0">
                  <Activity size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Trips today</p>
                  <p className="text-sm font-bold text-gray-900">3 completed - 1 in progress</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-purple-50 text-purple-600 flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Current assignment</p>
                  <p className="text-sm font-bold text-gray-900">Peliyagoda DC → Fresh Mart Nugegoda</p>
                </div>
              </div>

              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-400 flex items-center justify-center flex-shrink-0">
                  <Snowflake size={16} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-0.5">Temperature capability</p>
                  <p className="text-sm font-bold text-gray-900">-18°C to 4°C <span className="font-medium text-gray-500">(frozen & chilled)</span></p>
                </div>
              </div>

            </div>

            <div className="bg-gray-50 border-t border-gray-100 p-4 flex gap-3 items-center">
              <Clock size={16} className="text-gray-400 flex-shrink-0" />
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Last serviced 12 days ago - next check due in 18 days.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
