'use client';

import { useState } from 'react';
import { getEnabler } from '@/lib/permissions';

export default function SettingsPage() {
  const enabler = getEnabler();
  const [activeTab, setActiveTab] = useState('profile');
  const [isEditing, setIsEditing] = useState(false);

  const [profileData, setProfileData] = useState({
    fullName: enabler.name || 'John Doe',
    email: 'john@enabler.co.tz',
    phone: '+255 712 345 678',
    address: 'Kijitonyama, Dar es Salaam',
    nationalId: 'NID-19901234567890',
    bankAccount: 'NMB-9876543210',
    emergencyContact: '+255 713 456 789'
  });

  const [securitySettings, setSecuritySettings] = useState({
    twoFactorEnabled: true,
    emailNotifications: true,
    smsAlerts: true,
    locationTracking: true,
    sessionTimeout: 30
  });

  const [workSettings, setWorkSettings] = useState({
    availability: 'available',
    workingHours: '08:00 - 18:00',
    serviceRadius: 15,
    preferredTasks: ['sales', 'logistics'],
    languages: ['Swahili', 'English']
  });

  const [businessSettings, setBusinessSettings] = useState({
    businessName: 'QuickHelp Services TZ',
    businessType: 'Logistics & Sales Support',
    businessLicense: 'BL-2024-003',
    taxId: 'TIN-456789123',
    businessAddress: 'Sinza, Dar es Salaam',
    serviceAreas: ['Kinondoni', 'Ilala', 'Temeke'],
    businessHours: '06:00 - 22:00',
    businessDescription: 'Professional enabler services for logistics and sales support'
  });

  const tabs = [
    { id: 'profile', name: 'Personal Profile', description: 'Manage personal information and contact details' },
    { id: 'security', name: 'Security & Privacy', description: 'Password, 2FA, and security preferences' },
    { id: 'work', name: 'Work Preferences', description: 'Availability, tasks, and service settings' },
    { id: 'business', name: 'Business Setup', description: 'Enabler business information and shop details' }
  ];

  const handleSaveProfile = () => {
    console.log('Saving profile:', profileData);
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  const renderProfileTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white">Personal Profile</h3>
        <button
          onClick={() => setIsEditing(!isEditing)}
          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm"
        >
          {isEditing ? 'Cancel' : 'Edit Profile'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            value={profileData.fullName}
            onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            value={profileData.email}
            onChange={(e) => setProfileData({...profileData, email: e.target.value})}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Phone Number</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Emergency Contact</label>
          <input
            type="tel"
            value={profileData.emergencyContact}
            onChange={(e) => setProfileData({...profileData, emergencyContact: e.target.value})}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Address</label>
          <textarea
            value={profileData.address}
            onChange={(e) => setProfileData({...profileData, address: e.target.value})}
            disabled={!isEditing}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">National ID</label>
          <input
            type="text"
            value={profileData.nationalId}
            onChange={(e) => setProfileData({...profileData, nationalId: e.target.value})}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Bank Account</label>
          <input
            type="text"
            value={profileData.bankAccount}
            onChange={(e) => setProfileData({...profileData, bankAccount: e.target.value})}
            disabled={!isEditing}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-800 text-sm"
          />
        </div>
      </div>

      {isEditing && (
        <div className="flex space-x-3">
          <button
            onClick={handleSaveProfile}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm"
          >
            Save Changes
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors text-sm"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Security & Privacy</h3>

      <div className="bg-white dark:bg-gray-700 p-4 rounded-md">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4 text-sm">Password Management</h4>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Current Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">New Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Confirm New Password</label>
            <input
              type="password"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
            />
          </div>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
            Update Password
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-700 p-4 rounded-md">
        <h4 className="font-medium text-gray-900 dark:text-white mb-4 text-sm">Privacy Settings</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Location Tracking</p>
              <p className="text-xs text-gray-500">Allow location tracking for task assignments</p>
            </div>
            <input
              type="checkbox"
              checked={securitySettings.locationTracking}
              onChange={(e) => setSecuritySettings({...securitySettings, locationTracking: e.target.checked})}
              className="w-4 h-4 text-blue-600"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-white">Two-Factor Authentication</p>
              <p className="text-xs text-gray-500">Status: {securitySettings.twoFactorEnabled ? 'Enabled' : 'Disabled'}</p>
            </div>
            <button className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm">
              {securitySettings.twoFactorEnabled ? 'Manage 2FA' : 'Enable 2FA'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderWorkTab = () => (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Work Preferences</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Availability Status</label>
          <select
            value={workSettings.availability}
            onChange={(e) => setWorkSettings({...workSettings, availability: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="available">Available</option>
            <option value="busy">Busy</option>
            <option value="offline">Offline</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Working Hours</label>
          <input
            type="text"
            value={workSettings.workingHours}
            onChange={(e) => setWorkSettings({...workSettings, workingHours: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Service Radius (km)</label>
          <input
            type="number"
            value={workSettings.serviceRadius}
            onChange={(e) => setWorkSettings({...workSettings, serviceRadius: Number(e.target.value)})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Languages</label>
          <input
            type="text"
            value={workSettings.languages.join(', ')}
            onChange={(e) => setWorkSettings({...workSettings, languages: e.target.value.split(', ')})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Preferred Task Types</label>
        <div className="space-y-2">
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={workSettings.preferredTasks.includes('sales')}
              onChange={(e) => {
                if (e.target.checked) {
                  setWorkSettings({...workSettings, preferredTasks: [...workSettings.preferredTasks, 'sales']});
                } else {
                  setWorkSettings({...workSettings, preferredTasks: workSettings.preferredTasks.filter(t => t !== 'sales')});
                }
              }}
              className="w-4 h-4 text-blue-600"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">Sales Support</label>
          </div>
          <div className="flex items-center">
            <input
              type="checkbox"
              checked={workSettings.preferredTasks.includes('logistics')}
              onChange={(e) => {
                if (e.target.checked) {
                  setWorkSettings({...workSettings, preferredTasks: [...workSettings.preferredTasks, 'logistics']});
                } else {
                  setWorkSettings({...workSettings, preferredTasks: workSettings.preferredTasks.filter(t => t !== 'logistics')});
                }
              }}
              className="w-4 h-4 text-blue-600"
            />
            <label className="ml-2 text-sm text-gray-700 dark:text-gray-300">Logistics Support</label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBusinessTab = () => (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Business Setup</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Name</label>
          <input
            type="text"
            value="QuickHelp Services TZ"
            readOnly
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-200 cursor-not-allowed text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Type</label>
          <select
            value={businessSettings.businessType}
            onChange={(e) => setBusinessSettings({...businessSettings, businessType: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="Logistics & Sales Support">Logistics & Sales Support</option>
            <option value="Sales Support Only">Sales Support Only</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business License</label>
          <input
            type="text"
            value="BL-2024-003"
            readOnly
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-200 cursor-not-allowed text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Tax ID (TIN)</label>
          <input
            type="text"
            value="TIN-456789123"
            readOnly
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-600 text-gray-900 dark:text-gray-200 cursor-not-allowed text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Address</label>
          <textarea
            value={businessSettings.businessAddress}
            onChange={(e) => setBusinessSettings({...businessSettings, businessAddress: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Hours</label>
          <input
            type="text"
            value={businessSettings.businessHours}
            onChange={(e) => setBusinessSettings({...businessSettings, businessHours: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Service Areas</label>
          <input
            type="text"
            value={businessSettings.serviceAreas.join(', ')}
            onChange={(e) => setBusinessSettings({...businessSettings, serviceAreas: e.target.value.split(', ')})}
            placeholder="Kinondoni, Ilala, Temeke"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Description</label>
          <textarea
            value={businessSettings.businessDescription}
            onChange={(e) => setBusinessSettings({...businessSettings, businessDescription: e.target.value})}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
      </div>

      <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm">
        Save Business Settings
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h1>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        {activeTab === 'profile' && renderProfileTab()}
        {activeTab === 'security' && renderSecurityTab()}
        {activeTab === 'work' && renderWorkTab()}
        {activeTab === 'business' && renderBusinessTab()}
      </div>
    </div>
  );
}
