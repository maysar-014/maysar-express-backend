'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';

interface KYCData {
  kycStatus: {
    level: string;
    status: string;
    verifiedDate: string;
    overallProgress: number;
  };
  personalInfo: {
    fullName: string;
    nationalId: string;
    dateOfBirth: string;
    phoneNumber: string;
    email: string;
    address: string;
    city: string;
    region: string;
    verificationStatus: string;
  };
  businessInfo: {
    businessName: string;
    businessType: string;
    businessRegistration: string;
    tinNumber: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
    website: string;
    yearEstablished: string;
    numberOfEmployees: string;
    verificationStatus: string;
  };
  documents: Array<{
    type: string;
    status: string;
    uploadDate?: string;
    verifiedDate?: string;
    fileName?: string;
    required: boolean;
    rejectionReason?: string;
  }>;
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    branchCode: string;
    swiftCode: string;
    verificationStatus: string;
    verifiedDate?: string;
  };
  requirements: {
    currentLevel: string;
    nextLevel: string;
    requiredDocuments: string[];
    benefits: {
      current: string[];
      nextLevel: string[];
    };
    transactionLimits: {
      daily: number;
      monthly: number;
      perTransaction: number;
    };
  };
  riskAssessment: {
    overallRisk: string;
    riskScore: number;
    lastAssessment: string;
  };
}

export default function SellerKYCPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['kyc'],
    queryFn: async () => {
      const response = await apiService.getKYC();
      return response.data.data as KYCData;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="bg-white p-6 rounded-lg">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-4 bg-gray-100 rounded w-full"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6">
        <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading KYC Data</h2>
        <p className="text-red-600">Failed to load KYC information. Please try again later.</p>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      case 'not_uploaded': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Business KYC Verification</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your business verification status</p>
        </div>
        <div className="text-right">
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(data.kycStatus.status)}`}>
            {data.kycStatus.level} - {data.kycStatus.status}
          </div>
          <p className="text-sm text-gray-500 mt-1">{data.kycStatus.overallProgress}% Complete</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div 
          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
          style={{ width: `${data.kycStatus.overallProgress}%` }}
        ></div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'personal', label: 'Personal Info' },
              { id: 'business', label: 'Business Info' },
              { id: 'documents', label: 'Documents' },
              { id: 'banking', label: 'Banking' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                  <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Current Level</h3>
                  <p className="text-2xl font-bold text-blue-900 dark:text-blue-300">{data.requirements.currentLevel}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">Verified on {formatDate(data.kycStatus.verifiedDate)}</p>
                </div>
                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                  <h3 className="font-medium text-green-900 dark:text-green-300 mb-2">Risk Score</h3>
                  <p className="text-2xl font-bold text-green-900 dark:text-green-300">{data.riskAssessment?.riskScore || 0}/100</p>
                  <p className="text-sm text-green-700 dark:text-green-400">Risk Level: {data.riskAssessment?.overallRisk || 'Unknown'}</p>
                </div>
                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                  <h3 className="font-medium text-purple-900 dark:text-purple-300 mb-2">Monthly Limit</h3>
                  <p className="text-2xl font-bold text-purple-900 dark:text-purple-300">TZS {data.requirements?.transactionLimits?.monthly?.toLocaleString() || '0'}</p>
                  <p className="text-sm text-purple-700 dark:text-purple-400">Current tier limit</p>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Current Benefits</h3>
                  <ul className="space-y-2">
                    {(data.requirements?.benefits?.current || []).map((benefit, index) => (
                      <li key={index} className="flex items-center text-sm text-gray-600 dark:text-gray-400">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-3"></span>
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upgrade to {data.requirements?.nextLevel || 'Next Level'}</h3>
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">Required Documents:</p>
                    <ul className="space-y-1">
                      {(data.requirements?.requiredDocuments || []).map((doc, index) => (
                        <li key={index} className="text-sm text-gray-500 dark:text-gray-400">• {doc}</li>
                      ))}
                    </ul>
                  </div>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    Start Upgrade Process
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'personal' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(data.personalInfo?.verificationStatus || 'unknown')}`}>
                  {data.personalInfo?.verificationStatus || 'Unknown'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
                  <p className="text-gray-900 dark:text-white">{data.personalInfo?.fullName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">National ID</label>
                  <p className="text-gray-900 dark:text-white">{data.personalInfo?.nationalId || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date of Birth</label>
                  <p className="text-gray-900 dark:text-white">{data.personalInfo?.dateOfBirth ? formatDate(data.personalInfo.dateOfBirth) : 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
                  <p className="text-gray-900 dark:text-white">{data.personalInfo?.phoneNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                  <p className="text-gray-900 dark:text-white">{data.personalInfo?.email || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Region</label>
                  <p className="text-gray-900 dark:text-white">{data.personalInfo?.region || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
                  <p className="text-gray-900 dark:text-white">{data.personalInfo?.address || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'business' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Information</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(data.businessInfo?.verificationStatus || 'unknown')}`}>
                  {data.businessInfo?.verificationStatus || 'Unknown'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Name</label>
                  <p className="text-gray-900 dark:text-white">{data.businessInfo?.businessName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Type</label>
                  <p className="text-gray-900 dark:text-white">{data.businessInfo?.businessType || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration Number</label>
                  <p className="text-gray-900 dark:text-white">{data.businessInfo?.businessRegistration || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">TIN Number</label>
                  <p className="text-gray-900 dark:text-white">{data.businessInfo?.tinNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Phone</label>
                  <p className="text-gray-900 dark:text-white">{data.businessInfo?.businessPhone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Email</label>
                  <p className="text-gray-900 dark:text-white">{data.businessInfo?.businessEmail || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Website</label>
                  <p className="text-gray-900 dark:text-white">{data.businessInfo?.website || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Year Established</label>
                  <p className="text-gray-900 dark:text-white">{data.businessInfo?.yearEstablished || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Business Address</label>
                  <p className="text-gray-900 dark:text-white">{data.businessInfo?.businessAddress || 'Not provided'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'documents' && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Document Verification Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(data.documents || []).map((doc, index) => (
                  <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-gray-900 dark:text-white">{doc.type}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(doc.status)}`}>
                        {doc.status.replace('_', ' ')}
                      </span>
                    </div>
                    {doc.fileName && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">File: {doc.fileName}</p>
                    )}
                    {doc.uploadDate && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">Uploaded: {formatDate(doc.uploadDate)}</p>
                    )}
                    {doc.verifiedDate && (
                      <p className="text-sm text-green-600">Verified: {formatDate(doc.verifiedDate)}</p>
                    )}
                    {doc.rejectionReason && (
                      <p className="text-sm text-red-600 mt-2">Reason: {doc.rejectionReason}</p>
                    )}
                    {doc.status === 'not_uploaded' && (
                      <button className="mt-2 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                        Upload Document
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'banking' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Account Details</h3>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(data.bankDetails?.verificationStatus || 'unknown')}`}>
                  {data.bankDetails?.verificationStatus || 'Unknown'}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label>
                  <p className="text-gray-900 dark:text-white">{data.bankDetails?.bankName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label>
                  <p className="text-gray-900 dark:text-white">{data.bankDetails?.accountNumber || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name</label>
                  <p className="text-gray-900 dark:text-white">{data.bankDetails?.accountName || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch Code</label>
                  <p className="text-gray-900 dark:text-white">{data.bankDetails?.branchCode || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SWIFT Code</label>
                  <p className="text-gray-900 dark:text-white">{data.bankDetails?.swiftCode || 'Not provided'}</p>
                </div>
                {data.bankDetails?.verifiedDate && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Verified Date</label>
                    <p className="text-gray-900 dark:text-white">{formatDate(data.bankDetails.verifiedDate)}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}