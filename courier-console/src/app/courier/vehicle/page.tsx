'use client';

import { useState, useEffect } from 'react';
import { courierApi } from '@/lib/api';

export default function VehicleManagementPage() {
  const [changeRequest, setChangeRequest] = useState('');
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [vehicleData, setVehicleData] = useState(null);
  const [maintenanceData, setMaintenanceData] = useState(null);
  const [eligibilityData, setEligibilityData] = useState(null);
  const [historyData, setHistoryData] = useState(null);

  useEffect(() => {
    const fetchVehicleData = async () => {
      const [overviewData, maintenanceData, eligibilityData, historyData] = await Promise.all([
        courierApi.getVehicleOverview(),
        courierApi.getVehicleMaintenance(),
        courierApi.getVehicleEligibility(),
        courierApi.getVehicleHistory()
      ]);
      setVehicleData(overviewData.data);
      setMaintenanceData(maintenanceData.data);
      setEligibilityData(eligibilityData.data);
      setHistoryData(historyData.data);
    };
    fetchVehicleData();
  }, []);

  const handleRequestSubmit = async () => {
    if (changeRequest.trim()) {
      setRequestSubmitted(true);
      setTimeout(() => {
        setRequestSubmitted(false);
        setChangeRequest('');
      }, 3000);
    }
  };

  const isActiveDelivery = false;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Vehicle Management</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Vehicle data integrity with approval-based changes
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Read + request only
        </div>
      </div>

      {/* Vehicle Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Registered Vehicle</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Vehicle Type</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{vehicleData?.registeredVehicle ?? 'Loading...'}</p>
            <span className="inline-flex px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full mt-2">
              {vehicleData?.verificationStatus ?? 'Loading...'}
            </span>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Max Weight</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{vehicleData?.maxAllowedWeight ?? 'Loading...'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">Algorithm-enforced</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Registration</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{vehicleData?.registrationNumber ?? 'Loading...'}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">Verified</p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Insurance</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{vehicleData?.insuranceExpiry ?? 'Loading...'}</p>
            <p className={`text-xs mt-1 uppercase tracking-wider ${
              vehicleData?.insuranceExpiry && new Date(vehicleData.insuranceExpiry) > new Date(Date.now() + 30*24*60*60*1000)
                ? 'text-green-600'
                : 'text-yellow-600'
            }`}>
              {vehicleData?.insuranceExpiry && new Date(vehicleData.insuranceExpiry) > new Date(Date.now() + 30*24*60*60*1000)
                ? 'Valid'
                : 'Expires soon'
              }
            </p>
          </div>
        </div>
      </div>

      {/* Maintenance & Compliance */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Maintenance Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Last Inspection</span>
              <span className="text-xs font-medium text-gray-900 dark:text-white">{maintenanceData?.lastInspection ?? 'Loading...'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Next Inspection</span>
              <span className="text-xs font-medium text-gray-900 dark:text-white">{maintenanceData?.nextInspection ?? 'Loading...'}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Overall Status</span>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full">
                {maintenanceData?.overallStatus ?? 'Loading...'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Assignment Eligibility</h3>
          <div className="space-y-3">
            {Array.isArray(eligibilityData) ? eligibilityData.map((item, index) => (
              <div key={index} className={`flex items-center justify-between p-3 rounded-md ${
                item.eligible
                  ? 'bg-green-50 dark:bg-green-900/10'
                  : 'bg-yellow-50 dark:bg-yellow-900/10'
              }`}>
                <span className={`text-xs uppercase tracking-wider ${
                  item.eligible
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {item.type}
                </span>
                <span className={`text-xs font-medium ${
                  item.eligible
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-yellow-800 dark:text-yellow-200'
                }`}>
                  {item.eligible ? 'Eligible' : 'Not Eligible'}
                </span>
              </div>
            )) : null}
          </div>
        </div>
      </div>

      {/* Change Request */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Request Vehicle Changes</h3>
        <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
          Submit change requests for approval. No instant edits allowed.
        </p>

        {isActiveDelivery && (
          <div className="mb-3 p-3 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800 rounded-md">
            <p className="text-xs text-yellow-800 dark:text-yellow-200 uppercase tracking-wider">
              Capacity changes disabled during active delivery
            </p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              Change Request Details
            </label>
            <textarea
              value={changeRequest}
              onChange={(e) => setChangeRequest(e.target.value)}
              disabled={isActiveDelivery}
              placeholder="Describe the vehicle change you need (e.g., upgrade to larger motorcycle, change registration, etc.)"
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              rows={4}
            />
          </div>

          <button
            onClick={handleRequestSubmit}
            disabled={!changeRequest.trim() || isActiveDelivery || requestSubmitted}
            className={`px-3 py-2 text-xs font-medium rounded-md ${
              requestSubmitted
                ? 'bg-green-600 text-white'
                : 'bg-orange-600 text-white hover:bg-orange-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {requestSubmitted ? 'Request Submitted' : 'Submit Change Request'}
          </button>
        </div>
      </div>

      {/* Vehicle History */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Vehicle History</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Maintenance and compliance records</p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Array.isArray(historyData) ? historyData.map((record, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center space-x-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">{record.event}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{record.details}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{record.date}</p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full mt-1 ${
                    record.status === 'Passed' || record.status === 'Completed'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  }`}>
                    {record.status}
                  </span>
                </div>
              </div>
            )) : null}
          </div>
        </div>
      </div>

      {/* Algorithm Enforcement */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Data Integrity Controls</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">No Instant Edits</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Approval required</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Capacity Enforcement</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Algorithm-controlled</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Eligibility Checking</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Assignment matching</p>
          </div>
        </div>
      </div>
    </div>
  );
}
