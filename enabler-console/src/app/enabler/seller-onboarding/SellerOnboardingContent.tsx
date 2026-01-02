'use client';

import { useState } from 'react';
import { 
  UserPlusIcon,
  DocumentCheckIcon,
  PhoneIcon,
  BuildingStorefrontIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  EyeIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

export default function SellerOnboardingContent() {
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [verificationStep, setVerificationStep] = useState('documents');

  const pendingSellers = [
    {
      id: 'SEL-001',
      businessName: 'TechStore Kenya',
      ownerName: 'John Kamau',
      email: 'john@techstore.ke',
      phone: '+254712345678',
      location: 'Nairobi, Kenya',
      businessType: 'Electronics Retail',
      submittedAt: '2024-12-29 10:30',
      priority: 'high',
      estimatedEarnings: 30.00,
      documents: {
        businessLicense: { status: 'submitted', url: '/docs/business-license.pdf' },
        nationalId: { status: 'submitted', url: '/docs/national-id.pdf' },
        taxCertificate: { status: 'submitted', url: '/docs/tax-cert.pdf' },
        bankStatement: { status: 'submitted', url: '/docs/bank-statement.pdf' }
      },
      verificationChecks: {
        documentAuthenticity: 'pending',
        businessRegistration: 'pending',
        phoneVerification: 'pending',
        addressVerification: 'pending'
      },
      riskScore: 'low',
      notes: []
    }
  ];

  const completedSellers = [
    {
      id: 'SEL-003',
      businessName: 'Organic Farms Ltd',
      ownerName: 'Peter Mwangi',
      completedAt: '2024-12-28 16:45',
      earnings: 30.00,
      status: 'approved',
      verificationTime: '2 hours 15 minutes'
    }
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'submitted':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'missing':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      case 'pending':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seller Onboarding</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Verify and onboard new sellers to the Maysar platform
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded-full text-blue-800 dark:text-blue-300 text-sm font-medium">
            {pendingSellers.length} Pending Reviews
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Reviews</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{pendingSellers.length}</p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Pending Seller Verifications</h3>
        <div className="space-y-4">
          {pendingSellers.map((seller) => (
            <div key={seller.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {seller.businessName}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">{seller.ownerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">KES {seller.estimatedEarnings}</p>
                  <button className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Start Verification
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}