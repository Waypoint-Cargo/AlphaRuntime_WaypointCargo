import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Briefcase, 
  Shield, 
  Building2, 
  MapPin, 
  Activity, 
  Clock,
  CheckCircle2,
  Lock
} from 'lucide-react';

// MOCK DATA: This simulates what you will fetch from the backend.
// When your team member finishes the backend, you can replace this with a standard fetch() or RTK Query hook.
const mockBackendData = {
  id: "USR-001",
  profileImage: null, // URL from backend
  fullName: "John Doe",
  username: "johndoe",
  email: "john@example.com",
  phone: "+94 77 123 4567",
  employeeNumber: "EMP001",
  
  roleAndAccess: {
    role: "USER",
    authProvider: "AZURE_AD",
    accountStatus: "Active",
    approvalStatus: "Approved",
    approvedAt: "01 Oct 2026"
  },
  
  organization: {
    outlet: "Colombo Main Outlet",
    outletCode: "CMB001",
    depots: [
      { name: "Colombo Depot", code: "CMB-D01" },
      { name: "Kandy Depot", code: "KDY-D01" }
    ]
  },
  
  accountActivity: {
    lastLogin: "01 Oct 2026, 10:32 AM",
    created: "15 Aug 2026",
    lastUpdated: "01 Oct 2026",
    accountLocked: "No"
  }
};

export default function UserProfile() {
  // Use state to hold the user data. This makes it easy to drop in a useEffect fetch later.
  const [userData, setUserData] = useState(mockBackendData);
  const [isLoading, setIsLoading] = useState(false);

  /* 
  // TODO: Uncomment and use this when the backend is ready
  useEffect(() => {
    const fetchUser = async () => {
      setIsLoading(true);
      try {
        const response = await fetch('/api/user/profile');
        const data = await response.json();
        setUserData(data);
      } catch (error) {
        console.error("Failed to fetch user data", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchUser();
  }, []);
  */

  if (isLoading || !userData) {
    return <div className="p-8 text-center text-gray-500 animate-pulse">Loading profile data...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
        <p className="text-gray-500 text-sm mt-1">Manage your personal information and account access.</p>
      </div>

      {/* Header Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col sm:flex-row items-center gap-6">
        <div className="w-24 h-24 rounded-full bg-[#053D31]/10 flex items-center justify-center text-[#053D31] font-bold text-3xl">
          {userData.profileImage ? (
            <img src={userData.profileImage} alt="Profile" className="w-full h-full rounded-full object-cover" />
          ) : (
            userData.fullName.split(' ').map(n => n[0]).join('')
          )}
        </div>
        <div className="text-center sm:text-left flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{userData.fullName}</h2>
          <p className="text-gray-500 font-medium">@{userData.username}</p>
          <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-green-500"></span>
            {userData.roleAndAccess.accountStatus}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <User size={18} className="text-gray-500" />
            <h3 className="font-bold text-gray-900">Personal Information</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Full Name</span>
              <span className="text-sm font-medium text-gray-900 flex-1">{userData.fullName}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Username</span>
              <span className="text-sm font-medium text-gray-900 flex-1">{userData.username}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Email</span>
              <span className="text-sm font-medium text-gray-900 flex-1 flex items-center gap-2">
                <Mail size={14} className="text-gray-400" /> {userData.email}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Phone</span>
              <span className="text-sm font-medium text-gray-900 flex-1 flex items-center gap-2">
                <Phone size={14} className="text-gray-400" /> {userData.phone}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Employee Number</span>
              <span className="text-sm font-medium text-gray-900 flex-1 flex items-center gap-2">
                <Briefcase size={14} className="text-gray-400" /> {userData.employeeNumber}
              </span>
            </div>
          </div>
        </div>

        {/* Role & Access */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <Shield size={18} className="text-gray-500" />
            <h3 className="font-bold text-gray-900">Role & Access</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Role</span>
              <span className="text-sm font-medium text-gray-900 flex-1">
                <span className="bg-[#053D31]/10 text-[#053D31] px-2 py-0.5 rounded text-xs">{userData.roleAndAccess.role}</span>
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Auth Provider</span>
              <span className="text-sm font-medium text-gray-900 flex-1">{userData.roleAndAccess.authProvider}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Approval Status</span>
              <span className="text-sm font-medium text-gray-900 flex-1 flex items-center gap-1.5">
                <CheckCircle2 size={16} className="text-green-500" />
                {userData.roleAndAccess.approvalStatus}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Approved At</span>
              <span className="text-sm font-medium text-gray-900 flex-1">{userData.roleAndAccess.approvedAt}</span>
            </div>
          </div>
        </div>

        {/* Organization */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <Building2 size={18} className="text-gray-500" />
            <h3 className="font-bold text-gray-900">Organization</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Outlet</span>
              <span className="text-sm font-medium text-gray-900 flex-1">{userData.organization.outlet}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Outlet Code</span>
              <span className="text-sm font-medium text-gray-900 flex-1 font-mono text-xs bg-gray-100 px-2 py-1 rounded">{userData.organization.outletCode}</span>
            </div>
            
            <div className="pt-3 border-t border-gray-100">
              <span className="text-sm text-gray-500 block mb-2">Depots</span>
              <div className="space-y-2">
                {userData.organization.depots.map((depot, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm bg-gray-50 p-2 rounded-lg border border-gray-100">
                    <MapPin size={16} className="text-gray-400" />
                    <span className="font-medium text-gray-900">{depot.name}</span>
                    <span className="text-gray-400">({depot.code})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Account Activity */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <Activity size={18} className="text-gray-500" />
            <h3 className="font-bold text-gray-900">Account Activity</h3>
          </div>
          <div className="p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Last Login</span>
              <span className="text-sm font-medium text-gray-900 flex-1 flex items-center gap-2">
                <Clock size={14} className="text-gray-400" />
                {userData.accountActivity.lastLogin}
              </span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Created</span>
              <span className="text-sm font-medium text-gray-900 flex-1">{userData.accountActivity.created}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Last Updated</span>
              <span className="text-sm font-medium text-gray-900 flex-1">{userData.accountActivity.lastUpdated}</span>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
              <span className="text-sm text-gray-500 w-1/3">Account Locked</span>
              <span className="text-sm font-medium text-gray-900 flex-1 flex items-center gap-1.5">
                <Lock size={14} className={userData.accountActivity.accountLocked === 'Yes' ? 'text-red-500' : 'text-gray-400'} />
                {userData.accountActivity.accountLocked}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
