'use client';

import { useState } from 'react';

export default function EnablerProfilePage() {
  const [profile, setProfile] = useState({
    shopName: 'Sarah\'s Electronics Hub',
    shopDescription: 'Premium electronics and gadgets with expert support',
    businessType: 'Electronics & Technology',
    location: 'Downtown Business District',
    contactPhone: '+1 (555) 123-4567',
    contactEmail: 'sarah.shop@maysar.com',
    operatingHours: '9:00 AM - 8:00 PM',
    specialties: ['Smartphones', 'Laptops', 'Gaming Equipment'],
    certifications: ['Electronics Specialist', 'Customer Service Excellence']
  });

  const [isEditing, setIsEditing] = useState(false);

  const handleSave = () => {
    setIsEditing(false);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shop Profile</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Manage your shop identification details for product listings
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Shop Information</h2>
            <div className="flex space-x-3">
              <button
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {isEditing ? 'Save Changes' : 'Edit Profile'}
              </button>
              <button className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700">
                Create New Shop
              </button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Shop Name
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.shopName}
                  onChange={(e) => setProfile({...profile, shopName: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{profile.shopName}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Business Type
              </label>
              {isEditing ? (
                <input
                  type="text"
                  value={profile.businessType}
                  onChange={(e) => setProfile({...profile, businessType: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{profile.businessType}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact Phone
              </label>
              {isEditing ? (
                <input
                  type="tel"
                  value={profile.contactPhone}
                  onChange={(e) => setProfile({...profile, contactPhone: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{profile.contactPhone}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Contact Email
              </label>
              {isEditing ? (
                <input
                  type="email"
                  value={profile.contactEmail}
                  onChange={(e) => setProfile({...profile, contactEmail: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              ) : (
                <p className="text-gray-900 dark:text-white">{profile.contactEmail}</p>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Shop Description
            </label>
            {isEditing ? (
              <textarea
                value={profile.shopDescription}
                onChange={(e) => setProfile({...profile, shopDescription: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            ) : (
              <p className="text-gray-900 dark:text-white">{profile.shopDescription}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Specialties
            </label>
            <div className="flex flex-wrap gap-2">
              {profile.specialties.map((specialty, index) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full text-sm"
                >
                  {specialty}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}