'use client';

import { useState, useEffect } from 'react';
import { courierApi } from '@/lib/api';

export default function AccountKYCCourierPage() {
  const [documentUploads, setDocumentUploads] = useState<{[key: string]: boolean}>({});
  const [identityStatus, setIdentityStatus] = useState(null);
  const [documents, setDocuments] = useState(null);
  const [restrictions, setRestrictions] = useState(null);
  const [accountHistory, setAccountHistory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchKYCData = async () => {
      try {
        setLoading(true);
        const [statusData, documentsData, restrictionsData, historyData] = await Promise.all([
          courierApi.getAccountStatus(),
          courierApi.getAccountDocuments(),
          courierApi.getAccountRestrictions(),
          courierApi.getAccountHistory()
        ]);
        setIdentityStatus(statusData.data);
        setDocuments(documentsData.data);
        setRestrictions(restrictionsData.data);
        setAccountHistory(historyData.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch KYC data:', err);
        setError('Failed to load account data');
      } finally {
        setLoading(false);
      }
    };

    fetchKYCData();
  }, []);

  const handleDocumentUpload = async (documentId: string) => {
    try {
      await courierApi.uploadDocument(documentId, { file: 'uploaded' });
      setDocumentUploads(prev => ({ ...prev, [documentId]: true }));
      setTimeout(() => {
        setDocumentUploads(prev => ({ ...prev, [documentId]: false }));
      }, 3000);
    } catch (err) {
      console.error('Failed to upload document:', err);
    }
  };

  const canDeliver = identityStatus?.overall === 'Verified' && Array.isArray(restrictions) && !restrictions.some(r => r.severity === 'High');

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading account data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!identityStatus || !documents) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Account & KYC</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Legal and operational compliance verification
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Compliance surface
        </div>
      </div>

      {/* Identity Status Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Identity Status</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Overall Status</p>
            <p className={`text-sm font-semibold ${
              identityStatus.overall === 'Verified' ? 'text-green-600' : 'text-red-600'
            }`}>
              {identityStatus.overall}
            </p>
            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full mt-2 ${
              identityStatus.riskLevel === 'Low'
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                : identityStatus.riskLevel === 'Medium'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
            }`}>
              {identityStatus.riskLevel} Risk
            </span>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">Delivery Access</p>
            <p className={`text-sm font-semibold ${
              canDeliver ? 'text-green-600' : 'text-red-600'
            }`}>
              {canDeliver ? 'Enabled' : 'Disabled'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 uppercase tracking-wider">Compliance-gated</p>
          </div>
        </div>
      </div>

      {/* Document Verification Status */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Document Verification</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Required documents for compliance</p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Array.isArray(documents) ? documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center space-x-3">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">
                      {doc.name} {doc.required && <span className="text-red-500">*</span>}
                    </h4>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Expires: {doc.expiry} • Updated: {doc.lastUpdated}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    doc.status === 'Verified'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : doc.status === 'Pending'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                  }`}>
                    {doc.status}
                  </span>
                  {doc.status !== 'Verified' && (
                    <button
                      onClick={() => handleDocumentUpload(doc.id)}
                      disabled={documentUploads[doc.id]}
                      className={`block mt-2 px-3 py-1 text-xs font-medium rounded ${
                        documentUploads[doc.id]
                          ? 'bg-green-600 text-white'
                          : 'bg-orange-600 text-white hover:bg-orange-700'
                      } disabled:opacity-50`}
                    >
                      {documentUploads[doc.id] ? 'Uploaded' : 'Upload'}
                    </button>
                  )}
                </div>
              </div>
            )) : null}
          </div>
        </div>
      </div>

      {/* Restrictions & Notices */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Restrictions & Notices</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Compliance-related alerts and restrictions</p>
        </div>
        <div className="p-4">
          {restrictions.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">No active restrictions</p>
            </div>
          ) : (
            <div className="space-y-3">
              {Array.isArray(restrictions) ? restrictions.map((restriction, index) => (
                <div key={index} className={`p-3 rounded-md border ${
                  restriction.severity === 'High'
                    ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
                    : restriction.severity === 'Medium'
                    ? 'bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-800'
                    : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800'
                }`}>
                  <div className="flex items-start">
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider mb-1">
                        {restriction.type}
                      </h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                        {restriction.details}
                      </p>
                      {restriction.actionRequired && (
                        <button className="px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700">
                          Take Action
                        </button>
                      )}
                    </div>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      restriction.severity === 'High'
                        ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        : restriction.severity === 'Medium'
                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                        : 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300'
                    }`}>
                      {restriction.severity}
                    </span>
                  </div>
                </div>
              )) : null}
            </div>
          )}
        </div>
      </div>

      {/* Compliance History */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Compliance History</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Verification and review records</p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Array.isArray(accountHistory) ? accountHistory.map((record, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">{record.event}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{record.details}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{record.date}</p>
                  <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full">
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
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Compliance Enforcement</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Access Control</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Delivery blocked if unverified</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Risk Profiling</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Continuous monitoring</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">No Frequent Re-submissions</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Algorithm-paced updates</p>
          </div>
        </div>
      </div>
    </div>
  );
}
