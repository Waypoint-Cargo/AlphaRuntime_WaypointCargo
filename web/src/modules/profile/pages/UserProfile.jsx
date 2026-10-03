import React, { useState } from 'react';
import { 
  Truck, 
  Store, 
  MapPin, 
  Clock, 
  FileText, 
  Activity, 
  Droplets, 
  Map, 
  ChevronRight,
  Bell,
  AlertTriangle,
  FileCheck,
  Lock,
  Edit3
} from 'lucide-react';

export default function UserProfile() {
  const [activeTab, setActiveTab] = useState('dispatcher');

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
        <p className="text-gray-500 text-sm mt-1">View and manage your account details and preferences.</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 mb-6">
        <button 
          onClick={() => setActiveTab('dispatcher')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            activeTab === 'dispatcher' 
              ? 'bg-[#053D31] text-white border-[#053D31]' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Truck size={16} />
          Dispatcher Profile
        </button>
        <button 
          onClick={() => setActiveTab('store')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            activeTab === 'store' 
              ? 'bg-[#053D31] text-white border-[#053D31]' 
              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
          }`}
        >
          <Store size={16} />
          Store Manager Profile
        </button>
      </div>

      {/* Profile Header Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-2xl">
              KP
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h2 className="text-xl font-bold text-gray-900">Kasun Perera</h2>
                <span className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-md">Dispatcher</span>
                <span className="flex items-center gap-1.5 text-xs font-medium text-green-700">
                  <span className="w-2 h-2 rounded-full bg-green-500"></span>
                  Active
                </span>
              </div>
              <div className="text-sm text-gray-500 flex flex-wrap items-center gap-3">
                <span>EMP-024</span>
                <span className="text-gray-300">|</span>
                <span>kasun.perera@waypointcargo.com</span>
                <span className="text-gray-300">|</span>
                <span>+94 77 123 4567</span>
              </div>
            </div>
          </div>
          <button className="flex items-center gap-2 bg-[#FFC107] hover:bg-[#ffcd38] text-gray-900 px-5 py-2.5 rounded-lg font-medium text-sm transition-colors whitespace-nowrap">
            <Edit3 size={16} />
            Edit Profile
          </button>
        </div>

        {/* Assigned Depot & Shift */}
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          <div className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center text-green-600">
              <MapPin size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium">Assigned Depot</p>
              <p className="text-sm font-semibold text-gray-900">Peliyagoda DC</p>
              <p className="text-xs text-gray-500">Colombo</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
          <div className="p-5 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors">
            <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
              <Clock size={20} />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 font-medium">Working Shift</p>
              <p className="text-sm font-semibold text-gray-900">Day Shift</p>
              <p className="text-xs text-gray-500">08:00 AM – 05:00 PM</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Operational Overview */}
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Operational Overview</h3>
            <p className="text-sm text-gray-500 mb-4">Your access and responsibilities in the planning and dispatch process.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-green-50/50 border border-green-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <FileText size={20} className="text-green-600 mb-3" />
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Planning Queue</h4>
                  <p className="text-xs text-gray-500 leading-snug">Create and manage delivery plans</p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-green-700">
                  <div className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px]">✓</div>
                  Enabled
                </div>
              </div>
              
              <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <Truck size={20} className="text-blue-600 mb-3" />
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Fleet Monitoring</h4>
                  <p className="text-xs text-gray-500 leading-snug">View real-time vehicle status</p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-green-700">
                  <div className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px]">✓</div>
                  Enabled
                </div>
              </div>
              
              <div className="bg-orange-50/50 border border-orange-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <Droplets size={20} className="text-orange-500 mb-3" />
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Fuel Quota</h4>
                  <p className="text-xs text-gray-500 leading-snug">Manage fuel allocations</p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-green-700">
                  <div className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px]">✓</div>
                  Enabled
                </div>
              </div>
              
              <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 flex flex-col justify-between">
                <div>
                  <Map size={20} className="text-purple-600 mb-3" />
                  <h4 className="font-semibold text-gray-900 text-sm mb-1">Route Adjustments</h4>
                  <p className="text-xs text-gray-500 leading-snug">Approve deferrals and rerouting</p>
                </div>
                <div className="mt-4 flex items-center gap-1.5 text-xs font-semibold text-green-700">
                  <div className="w-4 h-4 rounded-full bg-green-600 text-white flex items-center justify-center text-[10px]">✓</div>
                  Enabled
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Recent Activity</h3>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-500 bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="px-5 py-3 font-medium">Time</th>
                    <th className="px-5 py-3 font-medium">Action</th>
                    <th className="px-5 py-3 font-medium">Details</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">10:24 AM</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">Route Allocated</td>
                    <td className="px-5 py-3.5 text-gray-500">ORD-108 → Van 023</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Success
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right"><ChevronRight size={16} className="text-gray-400" /></td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">09:48 AM</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">Deferral Approved</td>
                    <td className="px-5 py-3.5 text-gray-500">ORD-095 (Traffic Delay)</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-yellow-50 text-yellow-700 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-yellow-500"></span>
                        Pending
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right"><ChevronRight size={16} className="text-gray-400" /></td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">08:15 AM</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">Route Updated</td>
                    <td className="px-5 py-3.5 text-gray-500">ORD-102 → Alternate Route</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Success
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right"><ChevronRight size={16} className="text-gray-400" /></td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">07:32 AM</td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">Vehicle Assigned</td>
                    <td className="px-5 py-3.5 text-gray-500">Van 015 → Ruwan Perera</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-green-50 text-green-700 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                        Success
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right"><ChevronRight size={16} className="text-gray-400" /></td>
                  </tr>
                  <tr className="hover:bg-gray-50/50">
                    <td className="px-5 py-3.5 text-gray-500 whitespace-nowrap">
                      <div>Yesterday</div>
                      <div className="text-xs">05:18 PM</div>
                    </td>
                    <td className="px-5 py-3.5 font-medium text-gray-900">Deferral Rejected</td>
                    <td className="px-5 py-3.5 text-gray-500">ORD-089 (Out of Window)</td>
                    <td className="px-5 py-3.5">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-red-50 text-red-700 text-xs font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                        Rejected
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right"><ChevronRight size={16} className="text-gray-400" /></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Sidebar - Metrics & Settings */}
        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="text-base font-bold text-gray-900">Key Metrics (Today)</h3>
              <button className="text-sm font-medium text-blue-600 hover:text-blue-700">View All</button>
            </div>
            <div className="divide-y divide-gray-50">
              <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-green-50 flex items-center justify-center text-green-600">
                    <Truck size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 leading-none">12</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 font-medium">Allocated Trips</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
              
              <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-yellow-50 flex items-center justify-center text-yellow-600">
                    <Clock size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 leading-none">3</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 font-medium">Deferral Decisions</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
              
              <div className="p-4 flex items-center justify-between hover:bg-gray-50 cursor-pointer transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-blue-50 flex items-center justify-center text-blue-600">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-900 leading-none">5</div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-500 font-medium">Active Routes</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div>
            <h3 className="text-base font-bold text-gray-900 mb-1">Notification Settings</h3>
            <p className="text-sm text-gray-500 mb-4">Choose what alerts you want to receive.</p>
            
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              <div className="p-4 flex items-start gap-4">
                <Bell size={20} className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Order cutoff reminders</p>
                  <p className="text-xs text-gray-500">Get notified about daily cutoff times</p>
                </div>
                <div className="w-11 h-6 bg-[#053D31] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="p-4 flex items-start gap-4">
                <Truck size={20} className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Delivery delay notifications</p>
                  <p className="text-xs text-gray-500">Real-time alerts for delayed routes</p>
                </div>
                <div className="w-11 h-6 bg-[#053D31] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="p-4 flex items-start gap-4">
                <AlertTriangle size={20} className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Capacity warnings</p>
                  <p className="text-xs text-gray-500">Alerts when vehicle capacity is exceeded</p>
                </div>
                <div className="w-11 h-6 bg-gray-200 rounded-full relative cursor-pointer">
                  <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full shadow"></div>
                </div>
              </div>
              
              <div className="p-4 flex items-start gap-4">
                <FileCheck size={20} className="text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">Deferral requests</p>
                  <p className="text-xs text-gray-500">Notifications for deferral approvals</p>
                </div>
                <div className="w-11 h-6 bg-[#053D31] rounded-full relative cursor-pointer">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full"></div>
                </div>
              </div>
              
              <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors group">
                <div className="flex items-center gap-3">
                  <Lock size={18} className="text-gray-500 group-hover:text-gray-700" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Account Security</p>
                    <p className="text-xs text-gray-500">Manage your password and account security settings.</p>
                  </div>
                </div>
                <ChevronRight size={18} className="text-gray-400" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
