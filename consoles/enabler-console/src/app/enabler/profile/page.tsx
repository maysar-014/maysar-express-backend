'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '@/lib/api';

export default function EnablerProfilePage() {
  const [isEditing, setIsEditing] = useState(false);

  const { data: profileData, isLoading, error } = useQuery({
    queryKey: ['enabler-profile'],
    queryFn: () => enablerApi.getProfile()
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading profile data</p>
      </div>
    );
  }

  const enabler = profileData?.data?.enabler || {};
  const tierInfo = profileData?.data?.tierInfo || {};

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enabler Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          Manage your enabler profile and tier information
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-base font-semibold text-gray-900 dark:text-white">Personal Information</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
              <button className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                Update Tier
              </button>
            </div>
          </div>
        </div>

        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Full Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={enabler.name || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{enabler.name || 'N/A'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Email Address
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={enabler.email || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{enabler.email || 'N/A'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Phone Number
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={enabler.phone || ''}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{enabler.phone || 'N/A'}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Region
              </label>
              <p className="text-gray-900 dark:text-white">{enabler.region || 'N/A'}</p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
              Address
            </label>
            {isEditing ? (
              <textarea
                value={enabler.address || ''}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{enabler.address || 'N/A'}</p>
            )}
          </div>

          {/* Tier Information */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Tier Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                  Current Tier
                </label>
                <div className="flex items-center space-x-3">
                  <span className={`px-4 py-2 rounded-md font-medium ${tierInfo.color || 'text-gray-600'} bg-opacity-10 border border-current`}>
                    {tierInfo.name || enabler.tier || 'N/A'}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {tierInfo.commission || 0}% commission rate
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                  Status
                </label>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  enabler.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                  enabler.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300' :
                  'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                }`}>
                  {enabler.status || 'Unknown'}
                </span>
              </div>
            </div>
          </div>

          {/* Languages */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
              Languages
            </label>
            <div className="flex flex-wrap gap-2">
              {(enabler.languages || []).map((language: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full text-sm"
                >
                  {language}
                </span>
              ))}
            </div>
          </div>

          {/* Specializations */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
              Specializations
            </label>
            <div className="flex flex-wrap gap-2">
              {(enabler.specializations || []).map((specialty: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-300 rounded-full text-sm"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>

          {/* Tier Benefits */}
          {tierInfo.benefits && (
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
                Tier Benefits
              </label>
              <ul className="space-y-2">
                {tierInfo.benefits.map((benefit: string, index: number) => (
                  <li key={index} className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span className="text-gray-900 dark:text-white">{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
