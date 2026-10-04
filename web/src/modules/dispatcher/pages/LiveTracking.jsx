import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, ZoomControl } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix default marker icon issue in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;
import { 
  Search, 
  ChevronDown, 
  Filter, 
  MapPin, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Navigation,
  Box,
  Truck,
  RefreshCcw,
  Phone,
  Star,
  Map,
  ChevronRight,
  User
} from 'lucide-react';

const mockDrivers = [
  {
    id: '#GS-10250',
    name: 'Mateus Pacheco',
    initials: 'MP',
    status: 'In Transit',
    eta: '6:07 pm',
    stopsLeft: 5,
    parcels: 12,
    issue: null,
    progress: 58,
    selected: true
  },
  {
    id: '#GS-10291',
    name: 'João Ribeiro',
    initials: 'JR',
    status: 'Delayed',
    eta: '+28 min',
    stopsLeft: 8,
    parcels: 20,
    issue: 'Traffic delay',
    progress: 32,
    selected: false
  },
  {
    id: '#GS-10215',
    name: 'Ana Ferreira',
    initials: 'AF',
    status: 'Completed',
    eta: 'Done',
    stopsLeft: 0,
    parcels: 18,
    issue: null,
    progress: 100,
    selected: false
  },
  {
    id: '#GS-10308',
    name: 'Tomás Garcia',
    initials: 'TG',
    status: 'In Transit',
    eta: '7:45 pm',
    stopsLeft: 11,
    parcels: 24,
    issue: null,
    progress: 19,
    selected: false
  },
  {
    id: '#GS-10334',
    name: 'Lena Sousa',
    initials: 'LS',
    status: 'In Transit',
    eta: '6:52 pm',
    stopsLeft: 6,
    parcels: 15,
    issue: null,
    progress: 45,
    selected: false
  }
];

export default function LiveTracking() {
  const [activeTab, setActiveTab] = useState('Drivers');

  return (
    <div className="max-w-7xl mx-auto space-y-4 md:space-y-6 flex flex-col min-h-0 lg:h-[calc(100vh-100px)]">
      
      {/* Header */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Live Tracking</h1>
        <p className="text-gray-500 text-xs md:text-sm mt-1">Monitor active driver locations and delivery status in real time</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 flex-shrink-0">
        
        <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-green-300 transition-colors">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
              <Truck size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-500 mb-0.5">Active Deliveries</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-none">24</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400 hidden sm:block" size={20} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-blue-300 transition-colors">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 flex-shrink-0">
              <Navigation size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-500 mb-0.5">In Transit</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-none">15</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400 hidden sm:block" size={20} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-orange-300 transition-colors">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-orange-50 flex items-center justify-center text-orange-500 flex-shrink-0">
              <AlertTriangle size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-500 mb-0.5">Delayed</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-none">3</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400 hidden sm:block" size={20} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 shadow-sm flex items-center justify-between cursor-pointer hover:border-green-400 transition-colors">
          <div className="flex items-center gap-3 md:gap-4">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-lg bg-green-50 flex items-center justify-center text-green-600 flex-shrink-0">
              <CheckCircle2 size={20} className="md:w-6 md:h-6" />
            </div>
            <div>
              <p className="text-[10px] md:text-xs font-medium text-gray-500 mb-0.5">Delivered Today</p>
              <p className="text-xl md:text-2xl font-bold text-gray-900 leading-none">86</p>
            </div>
          </div>
          <ChevronRight className="text-gray-400 hidden sm:block" size={20} />
        </div>

      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-2 md:gap-3 w-full md:w-auto">
          <div className="relative w-full md:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search address..." 
              className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-[#053D31]"
            />
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button className="flex-1 sm:flex-none flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 md:w-32">
              All Status <ChevronDown size={16} className="text-gray-400 ml-2" />
            </button>
            <button className="flex-1 sm:flex-none flex items-center justify-between px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 md:w-36">
              All Couriers <ChevronDown size={16} className="text-gray-400 ml-2" />
            </button>
            <button className="flex items-center justify-center px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
              <Filter size={16} className="text-gray-400 md:mr-1.5" /> <span className="hidden md:inline">Filters</span>
            </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4 text-xs font-medium w-full md:w-auto justify-end">
          <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-full border border-green-100">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            Live
          </div>
          <span className="text-gray-400">Updated 12 sec ago</span>
        </div>
      </div>

      {/* Main Content Area - Responsive Flex */}
      <div className="flex-1 flex flex-col lg:flex-row gap-4 md:gap-6 min-h-0 overflow-hidden pb-4 md:pb-0">
        
        {/* Left Column - Active Drivers List */}
        <div className="w-full lg:w-[300px] bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col lg:h-full flex-shrink-0">
          <div className="p-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-900 flex items-center gap-2">
              Active Drivers <span className="bg-[#FFC107] text-[#053D31] px-1.5 py-0.5 rounded text-[10px] font-bold">34</span>
            </h3>
            <button className="text-xs font-medium text-gray-500 flex items-center gap-1 hover:text-gray-800">
              ETA sort <ChevronDown size={14} />
            </button>
          </div>
          
          <div className="overflow-y-auto max-h-[300px] lg:max-h-full lg:flex-1">
            <div className="divide-y divide-gray-100">
              {mockDrivers.map((driver) => (
                <div key={driver.id} className={`p-4 cursor-pointer transition-colors ${driver.selected ? 'bg-blue-50/50 relative' : 'hover:bg-gray-50'}`}>
                  {driver.selected && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                  
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        driver.status === 'Delayed' ? 'bg-orange-100 text-orange-700' :
                        driver.status === 'Completed' ? 'bg-green-100 text-green-700' :
                        'bg-blue-100 text-blue-700'
                      }`}>
                        {driver.initials}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-bold text-gray-900 text-sm">{driver.id}</span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            driver.status === 'Delayed' ? 'bg-orange-50 text-orange-600' :
                            driver.status === 'Completed' ? 'bg-green-50 text-green-600' :
                            'bg-blue-50 text-blue-600'
                          }`}>{driver.status}</span>
                        </div>
                        <p className="text-xs text-gray-500">{driver.name}</p>
                      </div>
                    </div>
                    <span className={`text-sm font-bold ${driver.status === 'Delayed' ? 'text-orange-500' : driver.status === 'Completed' ? 'text-green-500' : 'text-blue-600'}`}>{driver.eta}</span>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] font-medium mb-3 flex-wrap">
                    <span className="flex items-center gap-1 text-gray-500"><MapPin size={12} /> {driver.stopsLeft} stops left</span>
                    <span className="flex items-center gap-1 text-gray-500"><Box size={12} /> {driver.parcels} parcels</span>
                    {driver.issue ? (
                      <span className="flex items-center gap-1 text-orange-500"><AlertTriangle size={12} /> {driver.issue}</span>
                    ) : driver.status !== 'Completed' ? (
                      <span className="flex items-center gap-1 text-green-600"><CheckCircle2 size={12} /> On time</span>
                    ) : null}
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] mb-1">
                      <span className="text-gray-400 font-medium">Progress</span>
                      <span className="font-bold text-gray-700">{driver.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full ${
                        driver.status === 'Delayed' ? 'bg-orange-400' : 'bg-[#2e7d5b]'
                      }`} style={{ width: `${driver.progress}%` }}></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column - Map and Details */}
        <div className="flex-1 flex flex-col lg:h-full bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden min-h-[500px]">
          
          {/* Interactive Map Area */}
          <div className="flex-1 relative overflow-hidden flex flex-col min-h-[300px]">
            <MapContainer 
              center={[7.8731, 80.7718]} 
              zoom={8} 
              style={{ height: '100%', width: '100%', zIndex: 0 }}
              zoomControl={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <ZoomControl position="topright" />
              
              {/* Mock active deliveries in Sri Lanka */}
              <Marker position={[6.9271, 79.8612]}>
                <Popup>
                  <div className="text-center">
                    <p className="font-bold text-[#053D31]">Van 023</p>
                    <p className="text-xs">Kasun Perera</p>
                  </div>
                </Popup>
              </Marker>
              
              <Marker position={[7.2906, 80.6337]}>
                <Popup>Kandy Delivery</Popup>
              </Marker>
              
              <Marker position={[6.0535, 80.2210]}>
                <Popup>Galle Delivery</Popup>
              </Marker>
            </MapContainer>

            {/* Toggle switch (Overlay) */}
            <div className="absolute top-4 left-4 flex bg-white rounded-lg shadow-sm border border-gray-200 p-1 z-[1000]">
              <button 
                onClick={() => setActiveTab('Drivers')}
                className={`px-3 py-1.5 md:px-4 rounded-md text-xs font-bold transition-colors ${activeTab === 'Drivers' ? 'bg-[#053D31] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Drivers
              </button>
              <button 
                onClick={() => setActiveTab('Orders')}
                className={`px-3 py-1.5 md:px-4 rounded-md text-xs font-bold transition-colors ${activeTab === 'Orders' ? 'bg-[#053D31] text-white' : 'text-gray-600 hover:bg-gray-100'}`}
              >
                Orders
              </button>
            </div>

            <button className="absolute bottom-4 right-4 px-3 py-2 md:px-4 md:py-2 bg-white rounded-lg shadow border border-gray-200 text-xs md:text-sm font-bold text-gray-700 flex items-center gap-2 hover:bg-gray-50 z-[1000]">
              <Map size={16} /> Recenter
            </button>
          </div>

          {/* Bottom Details Panel - Responsive Grid/Flex */}
          <div className="border-t border-gray-200 bg-white flex flex-col xl:flex-row flex-shrink-0 w-full">
            
            {/* 1. Order Info */}
            <div className="w-full xl:w-44 p-3 xl:p-4 border-b xl:border-b-0 xl:border-r border-gray-100 flex-shrink-0">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Order Details</p>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h3 className="text-base md:text-xl font-bold text-gray-900 whitespace-nowrap">#GS-10250</h3>
                <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded whitespace-nowrap">In Transit</span>
              </div>
              <p className="text-[10px] text-gray-500 mb-2 md:mb-4">Colombo <span className="mx-1">→</span> Hikkaduwa</p>
              
              <div className="flex items-center gap-2 text-gray-900 mb-1">
                <Clock size={16} className="text-gray-400" />
                <span className="font-bold text-xs md:text-sm">ETA 18 min</span>
              </div>
              <p className="text-[10px] text-gray-400 flex items-center gap-1 md:ml-6">
                <RefreshCcw size={10} /> 12 sec ago
              </p>
            </div>

            {/* 2. Timeline */}
            <div className="flex-1 p-3 xl:p-4 flex flex-col justify-center border-b xl:border-b-0 xl:border-r border-gray-100 min-w-[320px] xl:min-w-[350px]">
               <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-3 md:mb-2">Delivery Progress</p>
               <div className="relative w-full flex items-center justify-between px-2 sm:px-4 pt-2 pb-1">
                  <div className="absolute left-[10%] right-[10%] h-1 bg-gray-200 top-5 md:top-1/2 md:-translate-y-1/2 z-0 rounded-full">
                    <div className="h-full bg-green-500 w-[50%] rounded-full"></div>
                  </div>
                  
                  <div className="flex justify-between w-full relative z-10 gap-2">
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-green-500 text-white flex items-center justify-center border-2 border-white mb-1.5 md:mb-2"><CheckCircle2 size={10} className="md:w-3 md:h-3" /></div>
                      <p className="text-[9px] md:text-[10px] font-semibold text-gray-900 text-center leading-tight hidden sm:block whitespace-nowrap px-1">Order<br/>Confirmed</p>
                    </div>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-green-500 text-white flex items-center justify-center border-2 border-white mb-1.5 md:mb-2"><Box size={10} className="md:w-3 md:h-3" /></div>
                      <p className="text-[9px] md:text-[10px] font-semibold text-gray-900 text-center leading-tight hidden sm:block whitespace-nowrap px-1">Picked UP</p>
                    </div>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-blue-500 text-white flex items-center justify-center border-2 border-white shadow-sm mb-1.5 md:mb-2"><Truck size={10} className="md:w-3 md:h-3" /></div>
                      <p className="text-[9px] md:text-[10px] font-semibold text-gray-900 text-center leading-tight whitespace-nowrap px-1">In Transit</p>
                      <p className="text-[8px] md:text-[9px] text-gray-400 mt-0.5 whitespace-nowrap px-1">12:18 PM</p>
                    </div>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white border-2 border-gray-200 text-gray-300 flex items-center justify-center mb-1.5 md:mb-2"><MapPin size={10} className="md:w-3 md:h-3" /></div>
                      <p className="text-[9px] md:text-[10px] font-medium text-gray-400 text-center leading-tight hidden sm:block whitespace-nowrap px-1">Out for<br/>Delivery</p>
                    </div>
                    <div className="flex flex-col items-center flex-1 min-w-0">
                      <div className="w-5 h-5 md:w-6 md:h-6 rounded-full bg-white border-2 border-gray-200 text-gray-300 flex items-center justify-center mb-1.5 md:mb-2"><CheckCircle2 size={10} className="md:w-3 md:h-3" /></div>
                      <p className="text-[9px] md:text-[10px] font-medium text-gray-400 text-center leading-tight hidden sm:block whitespace-nowrap px-1">Delivered</p>
                    </div>
                  </div>
               </div>
            </div>

            {/* 3. Driver Info */}
            <div className="w-full xl:w-56 p-3 xl:p-4 border-b xl:border-b-0 xl:border-r border-gray-100 flex flex-col justify-between flex-shrink-0">
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Driver</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm flex-shrink-0">KP</div>
                  <div className="min-w-0">
                    <h4 className="font-bold text-gray-900 text-sm leading-tight truncate">Kasun Perera</h4>
                    <p className="text-[10px] text-gray-500 truncate">Van 023 · Toyota Hiace</p>
                    <p className="text-[10px] font-semibold text-green-600 flex items-center gap-1 mt-0.5"><Phone size={10} /> +94 77 123 4567</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 mt-3">
                <button className="flex-1 bg-[#053D31] text-white py-1.5 px-2 rounded text-xs font-semibold hover:bg-[#042e25] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
                  <User size={12} /> Details
                </button>
                <p className="text-[10px] font-semibold text-gray-500 flex items-center gap-1 whitespace-nowrap"><Star size={12} className="text-yellow-400" fill="currentColor" /> 4.9 <span className="text-gray-300">|</span> 3.2 km</p>
              </div>
            </div>

            {/* 4. Actions */}
            <div className="w-full xl:w-32 p-3 xl:p-4 flex flex-row xl:flex-col gap-2 flex-shrink-0 bg-gray-50/50 xl:bg-white justify-center">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0 xl:mb-1 hidden xl:block">Actions</p>
              <button className="flex-1 w-full py-2 px-2 bg-white xl:bg-gray-50 border border-gray-200 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-100 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
                <RefreshCcw size={12} /> Reassign
              </button>
              <button className="flex-1 w-full py-2 px-2 bg-white xl:bg-red-50 border border-red-200 text-red-600 rounded-md text-xs font-semibold hover:bg-red-100 transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap">
                <AlertTriangle size={12} /> Report Issue
              </button>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}