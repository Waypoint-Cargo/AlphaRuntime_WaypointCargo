import React from 'react';
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
  Map,
  Truck,
  Star,
  ChevronRight
} from 'lucide-react';

export default function PlanAndAllocate() {
  return (
    <div className="h-[calc(100vh-72px)] flex flex-col lg:flex-row gap-6 -m-6 p-6 overflow-hidden bg-[#F8FAFC]">
      
      {/* Left Column - Orders to Plan */}
      <div className="w-full lg:w-80 flex flex-col h-full bg-white rounded-xl border border-gray-200 shadow-sm flex-shrink-0">
        <div className="p-4 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-gray-900">Orders to Plan</h2>
            <span className="w-6 h-6 rounded-full bg-[#053D31] text-white flex items-center justify-center text-xs font-bold">38</span>
          </div>
          
          <div className="flex bg-gray-50 p-1 rounded-lg mb-4">
            <button className="flex-1 py-1.5 px-2 bg-white rounded-md shadow-sm border border-gray-200 text-xs font-semibold text-gray-900 text-center flex flex-col items-center">
              <span className="text-gray-500 font-medium">Unplanned</span>
              <span className="text-red-500 text-lg">24</span>
            </button>
            <button className="flex-1 py-1.5 px-2 text-xs font-semibold text-gray-600 text-center flex flex-col items-center hover:bg-gray-100 rounded-md transition-colors">
              <span className="font-medium">Partial</span>
              <span className="text-orange-500 text-lg">8</span>
            </button>
            <button className="flex-1 py-1.5 px-2 text-xs font-semibold text-gray-600 text-center flex flex-col items-center hover:bg-gray-100 rounded-md transition-colors">
              <span className="font-medium">Planned</span>
              <span className="text-green-600 text-lg">6</span>
            </button>
          </div>

          <div className="relative mb-3">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search outlets..." 
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#053D31]"
            />
          </div>

          <div className="flex gap-2">
            <button className="flex-1 flex items-center justify-between px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50">
              <span className="flex items-center gap-1.5"><Filter size={14} className="text-green-600" /> Priority</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            <button className="flex-1 flex items-center justify-between px-3 py-1.5 border border-gray-200 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-50">
              <span className="flex items-center gap-1.5"><Filter size={14} className="text-gray-400" /> Brand</span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {/* Active Order Card */}
          <div className="p-3 border-2 border-[#FFC107] rounded-lg bg-yellow-50/30 cursor-pointer relative">
            <div className="absolute top-3 right-3 flex gap-1">
              <span className="px-2 py-0.5 rounded-full border border-green-200 bg-white text-green-700 text-[10px] font-semibold">Fresh</span>
            </div>
            <p className="text-[10px] text-gray-500 font-medium mb-1">ORD-1042</p>
            <h3 className="font-bold text-gray-900 text-sm mb-1">Maharagama Fresh</h3>
            <p className="text-xs text-gray-500 mb-2">520 kg · before 07:45</p>
            <p className="text-[10px] text-gray-400">sibling order</p>
          </div>

          {/* Other Order Cards */}
          {[
            { id: 'ORD-1055', name: 'Nugegoda Metro', details: '310 kg · before 08:00', badges: ['Fresh'] },
            { id: 'ORD-1061', name: 'Kiribathgoda Plus', details: '780 kg · before 09:30', badges: ['Fresh', 'Tech'] },
            { id: 'ORD-1078', name: 'Colombo 7 Hub', details: '220 kg · before 10:00', badges: ['Fresh', 'Style'] },
            { id: 'ORD-1083', name: 'Borella Central', details: '415 kg · before 08:30\nchilled goods', badges: ['Fresh'] },
            { id: 'ORD-1091', name: 'Rajagiriya Depot', details: '640 kg · before 11:00', badges: ['Fresh'] },
          ].map(order => (
            <div key={order.id} className="p-3 border border-gray-200 rounded-lg bg-white hover:border-gray-300 cursor-pointer transition-colors relative">
              <div className="absolute top-3 right-3 flex gap-1">
                {order.badges.map(b => (
                  <span key={b} className={`px-2 py-0.5 rounded-full border bg-white text-[10px] font-semibold ${
                    b === 'Fresh' ? 'border-green-200 text-green-700' : 
                    b === 'Style' ? 'border-blue-200 text-blue-700' : 'border-purple-200 text-purple-700'
                  }`}>{b}</span>
                ))}
              </div>
              <p className="text-[10px] text-gray-500 font-medium mb-1">{order.id}</p>
              <h3 className="font-bold text-gray-900 text-sm mb-1">{order.name}</h3>
              <p className="text-xs text-gray-500 whitespace-pre-line">{order.details}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Middle Column - Order Details & Trip Builder */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <div className="flex-1 overflow-y-auto pr-2 pb-4">
          
          {/* Order Header */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-2xl font-bold text-gray-900">Maharagama Fresh</h1>
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold border border-blue-100">
                  <Snowflake size={12} /> Chilled
                </span>
              </div>
              <p className="text-xs text-gray-500">ORD-1042 · Maharagama · Refrigerated Truck · Standard</p>
            </div>
            <div className="flex gap-2">
              <button className="px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Defer order</button>
              <button className="px-4 py-2 bg-orange-400 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition-colors shadow-sm">Allocate with warnings</button>
            </div>
          </div>

          {/* Order Specs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div>
              <p className="text-xs text-gray-500 mb-1">Weight</p>
              <p className="text-lg font-bold text-gray-900">520 kg</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Volume</p>
              <p className="text-lg font-bold text-gray-900">1.8 m³</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Deadline</p>
              <p className="text-lg font-bold text-orange-600">07:45</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Outlet code</p>
              <p className="text-lg font-bold text-gray-900">6655</p>
            </div>
          </div>

          {/* Constraint Checks */}
          <h3 className="text-sm font-bold text-gray-900 mb-3">Constraint Checks</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2"><Snowflake size={14} /> Temperature</div>
              <p className="font-bold text-gray-900 text-sm mb-3">Refrigerated</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100"><CheckCircle2 size={12} /> Vehicle access</span>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2"><CheckCircle2 size={14} /> Weight fit</div>
              <p className="font-bold text-gray-900 text-sm mb-3">520 / 4,500 kg</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100"><CheckCircle2 size={12} /> Weight fits</span>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2"><CheckCircle2 size={14} /> Volume fit</div>
              <p className="font-bold text-gray-900 text-sm mb-3">1.8 / 18 m³</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100"><CheckCircle2 size={12} /> Volume fits</span>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2"><Clock size={14} /> Delivery window</div>
              <p className="font-bold text-gray-900 text-sm mb-3">Before 07:45</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100"><CheckCircle2 size={12} /> Window met</span>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2"><Fuel size={14} /> Fuel quota</div>
              <p className="font-bold text-gray-900 text-sm mb-3">68 / 200 L</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100"><CheckCircle2 size={12} /> Quota ok</span>
            </div>
            <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-2 text-xs font-medium text-gray-500 mb-2"><Map size={14} /> Route coverage</div>
              <p className="font-bold text-gray-900 text-sm mb-3">Zone A - Southern</p>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-green-50 text-green-700 text-xs font-medium border border-green-100"><CheckCircle2 size={12} /> Route compatible</span>
            </div>
          </div>

          {/* Trip Builder */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-gray-900">Trip Builder</h3>
            <div className="flex bg-gray-200 rounded p-0.5">
              <button className="px-3 py-1 bg-[#053D31] text-white text-xs font-bold rounded shadow-sm">Trip 1</button>
              <button className="px-3 py-1 text-gray-600 text-xs font-medium hover:text-gray-900">Trip 2</button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#FFC107]"></div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Truck size={18} className="text-gray-700" />
                  <h4 className="font-bold text-gray-900">WP CAB-4412</h4>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded border border-[#FFC107] text-[#FFC107] text-[10px] font-bold bg-yellow-50"><Star size={10} fill="currentColor" /> Recommended</span>
                </div>
              </div>
              <p className="text-xs text-gray-500">Refrigerated · Route 1 of 2</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Weight</span>
                  <span className="font-bold text-gray-900">520 / 4,500 kg</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[15%]"></div>
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Volume</span>
                  <span className="font-bold text-gray-900">1.8 / 18 m³</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-green-500 w-[10%]"></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-gray-500 font-medium">Fuel quota</span>
                  <span className="font-bold text-gray-900">68 L / 200 L · 68 km · Est. 1h 04m · stops</span>
                </div>
                <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-orange-400 w-[35%]"></div>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <p className="text-xs font-medium text-gray-500 mb-2">Drop Sequence (3 stops)</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="px-2.5 py-1.5 rounded bg-green-50 border border-green-200 text-green-800 text-xs font-medium">Maharagama Fresh · ORD-1042</span>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="px-2.5 py-1.5 rounded bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium">Nugegoda Metro · ORD-1055</span>
                <ChevronRight size={14} className="text-gray-400" />
                <span className="px-2.5 py-1.5 rounded bg-gray-50 border border-gray-200 text-gray-700 text-xs font-medium">Borella Central · ORD-1083</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Truck size={14} /> Assign to: WP CAB-4412 - Trip 1
              </div>
              <button className="px-5 py-2 bg-[#053D31] hover:bg-[#042e25] text-white rounded-lg text-sm font-semibold transition-colors">
                Allocate to Trip 1
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Available Vehicles */}
      <div className="w-full lg:w-72 flex flex-col h-full overflow-hidden">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            Available Vehicles <span className="w-5 h-5 rounded-full bg-[#053D31] text-white flex items-center justify-center text-[10px] font-bold">7</span>
          </h2>
        </div>
        <div className="flex items-center gap-2 mb-4 text-xs">
          <span className="text-gray-500">Sort by:</span>
          <button className="px-2 py-1 bg-yellow-50 text-yellow-800 border border-[#FFC107] font-semibold rounded">Recommended</button>
          <button className="px-2 py-1 bg-white text-gray-600 border border-gray-200 hover:bg-gray-50 rounded transition-colors">Capacity</button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {/* Vehicle 1 - Recommended */}
          <div className="bg-white border-2 border-[#FFC107] rounded-xl p-4 shadow-sm">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm"><Truck size={14} /> WP CAB-4412</h4>
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#FFC107] text-[#FFC107] text-[9px] font-bold bg-yellow-50"><Star size={8} fill="currentColor" /> Recommended</span>
            </div>
            <p className="text-[10px] text-gray-500 mb-3">Refrigerated · Route 1 of 2 today</p>
            <div className="flex gap-1.5 flex-wrap mb-4">
              <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 text-[10px] font-medium flex items-center gap-1"><CheckCircle2 size={10} /> Weight fits</span>
              <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 text-[10px] font-medium flex items-center gap-1"><CheckCircle2 size={10} /> Volume fits</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-medium flex items-center gap-1"><Snowflake size={10} /> Chilled</span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-500">Weight</span><span className="font-bold text-gray-900">520 / 4,500 kg</span></div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-[15%]"></div></div>
              </div>
              <div>
                <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-500">Volume</span><span className="font-bold text-gray-900">1.8 / 18 m³</span></div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-500 w-[10%]"></div></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500">Fuel: 68 L remaining</p>
              <button className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-semibold shadow-sm hover:bg-gray-50">Select</button>
            </div>
          </div>

          {/* Vehicle 2 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-gray-300 transition-colors">
            <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm mb-1"><Truck size={14} /> WP DRY-2208</h4>
            <p className="text-[10px] text-gray-500 mb-3">Dry goods · Route 1 of 1 today</p>
            <div className="flex gap-1.5 flex-wrap mb-4">
              <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 text-[10px] font-medium flex items-center gap-1"><CheckCircle2 size={10} /> Weight fits</span>
              <span className="px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-100 text-[10px] font-medium flex items-center gap-1"><AlertTriangle size={10} /> No cold storage</span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-500">Weight</span><span className="font-bold text-gray-900">1,800 / 5,000 kg</span></div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-400 w-[40%]"></div></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500">Fuel: 112 L remaining</p>
              <button className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-semibold shadow-sm hover:bg-gray-50">Select</button>
            </div>
          </div>

          {/* Vehicle 3 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:border-gray-300 transition-colors">
            <h4 className="font-bold text-gray-900 flex items-center gap-1.5 text-sm mb-1"><Truck size={14} /> WP VAN-0091</h4>
            <p className="text-[10px] text-gray-500 mb-3">Refrigerated Van · Route 2 of 3 today</p>
            <div className="flex gap-1.5 flex-wrap mb-4">
              <span className="px-1.5 py-0.5 rounded bg-green-50 text-green-700 border border-green-100 text-[10px] font-medium flex items-center gap-1"><CheckCircle2 size={10} /> Volume fits</span>
              <span className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[10px] font-medium flex items-center gap-1"><Snowflake size={10} /> Chilled</span>
              <span className="px-1.5 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-100 text-[10px] font-medium flex items-center gap-1"><AlertTriangle size={10} /> Near weight limit</span>
            </div>
            
            <div className="space-y-2 mb-4">
              <div>
                <div className="flex justify-between text-[10px] mb-1"><span className="text-gray-500">Weight</span><span className="font-bold text-gray-900">880 / 1,000 kg</span></div>
                <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 w-[88%]"></div></div>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-gray-500">Fuel: 34 L remaining</p>
              <button className="px-4 py-1.5 bg-white border border-gray-300 text-gray-700 rounded-md text-xs font-semibold shadow-sm hover:bg-gray-50">Select</button>
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
