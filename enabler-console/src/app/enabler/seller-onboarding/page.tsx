import PermissionGuard from '@/components/PermissionGuard';
import SellerOnboardingContent from './SellerOnboardingContent';

export default function SellerOnboarding() {
  return (
    <PermissionGuard permission="sellerOnboarding">
      <SellerOnboardingContent />
    </PermissionGuard>
  );
}
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
    },
    {
      id: 'SEL-002',
      businessName: 'Fashion Hub',
      ownerName: 'Mary Wanjiku',
      email: 'mary@fashionhub.co.ke',
      phone: '+254723456789',
      location: 'Mombasa, Kenya',
      businessType: 'Fashion & Apparel',
      submittedAt: '2024-12-29 09:15',
      priority: 'medium',
      estimatedEarnings: 25.00,
      documents: {
        businessLicense: { status: 'submitted', url: '/docs/business-license-2.pdf' },
        nationalId: { status: 'submitted', url: '/docs/national-id-2.pdf' },
        taxCertificate: { status: 'missing', url: null },
        bankStatement: { status: 'submitted', url: '/docs/bank-statement-2.pdf' }
      },
      verificationChecks: {
        documentAuthenticity: 'pending',
        businessRegistration: 'pending',
        phoneVerification: 'pending',
        addressVerification: 'pending'
      },
      riskScore: 'medium',
      notes: ['Tax certificate required for completion']
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
    },
    {
      id: 'SEL-004',
      businessName: 'Home Decor Plus',
      ownerName: 'Grace Akinyi',
      completedAt: '2024-12-28 14:20',
      earnings: 25.00,
      status: 'approved',
      verificationTime: '1 hour 45 minutes'
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

  const handleVerificationAction = (action: string, sellerId: string) => {
    console.log(`${action} for seller ${sellerId}`);
    // In production, this would make API calls
  };

  return (
    <div className="space-y-6">
      {/* Header */}
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
          <span className="bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded-full text-green-800 dark:text-green-300 text-sm font-medium">
            KES {pendingSellers.reduce((sum, seller) => sum + seller.estimatedEarnings, 0)} Potential Earnings
          </span>
        </div>
      </div>

      {/* Quick Stats */}
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

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedSellers.length}</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Processing Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">2h 15m</p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">94%</p>
            </div>
            <UserPlusIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Pending Sellers */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Pending Seller Verifications</h3>
        <div className="space-y-4">
          {pendingSellers.map((seller) => (
            <div key={seller.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {seller.businessName}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(seller.priority)}`}>
                        {seller.priority} priority
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Owner:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{seller.ownerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Business Type:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{seller.businessType}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Location:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{seller.location}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Submitted:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{seller.submittedAt}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-2">
                        <span className="text-gray-500 dark:text-gray-400">Documents:</span>
                        {Object.entries(seller.documents).map(([doc, info]) => (
                          <div key={doc} className="flex items-center">
                            {getStatusIcon(info.status)}
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-500 dark:text-gray-400">Risk:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          seller.riskScore === 'low' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                          seller.riskScore === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300'
                        }`}>
                          {seller.riskScore}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0 text-right ml-4">
                  <div className="flex items-center text-green-600 mb-2">
                    <span className="text-lg font-bold">KES {seller.estimatedEarnings}</span>
                  </div>
                  
                  <div className="space-y-2">
                    <button 
                      onClick={() => setSelectedSeller(seller)}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      Start Verification
                    </button>
                    <button className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm">
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Completed Sellers */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recently Completed</h3>
        <div className="space-y-3">
          {completedSellers.map((seller) => (
            <div key={seller.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{seller.businessName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {seller.ownerName} • Completed in {seller.verificationTime}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">+KES {seller.earnings}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{seller.completedAt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Verification Modal */}
      {selectedSeller && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Verify {selectedSeller.businessName}
                </h3>
                <button 
                  onClick={() => setSelectedSeller(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Verification Steps */}
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setVerificationStep('documents')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    verificationStep === 'documents'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  📄 Documents
                </button>
                <button
                  onClick={() => setVerificationStep('verification')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    verificationStep === 'verification'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  ✅ Verification
                </button>
                <button
                  onClick={() => setVerificationStep('contact')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    verificationStep === 'contact'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  📞 Contact
                </button>
              </div>

              {/* Document Review */}
              {verificationStep === 'documents' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Document Review</h4>
                  {Object.entries(selectedSeller.documents).map(([docType, info]) => (
                    <div key={docType} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <DocumentCheckIcon className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {docType.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Status: {info.status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {info.url && (
                          <button className="px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-sm hover:bg-blue-200 dark:hover:bg-blue-900/30">
                            <EyeIcon className="h-4 w-4 inline mr-1" />
                            View
                          </button>
                        )}
                        <button className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded text-sm hover:bg-green-200 dark:hover:bg-green-900/30">
                          Approve
                        </button>
                        <button className="px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded text-sm hover:bg-red-200 dark:hover:bg-red-900/30">
                          Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Verification Checks */}
              {verificationStep === 'verification' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Verification Checks</h4>
                  {Object.entries(selectedSeller.verificationChecks).map(([checkType, status]) => (
                    <div key={checkType} className="flex items-center justify-between p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(status)}
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white capitalize">
                            {checkType.replace(/([A-Z])/g, ' $1').trim()}
                          </p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Status: {status}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button 
                          onClick={() => handleVerificationAction('complete', selectedSeller.id)}
                          className="px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded text-sm hover:bg-green-200 dark:hover:bg-green-900/30"
                        >
                          Complete
                        </button>
                        <button 
                          onClick={() => handleVerificationAction('flag', selectedSeller.id)}
                          className="px-3 py-1 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 rounded text-sm hover:bg-yellow-200 dark:hover:bg-yellow-900/30"
                        >
                          Flag Issue
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Contact Information */}
              {verificationStep === 'contact' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Contact & Verification</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center space-x-3 mb-3">
                        <PhoneIcon className="h-6 w-6 text-green-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Phone Verification</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSeller.phone}</p>
                        </div>
                      </div>
                      <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                        Call Now
                      </button>
                    </div>
                    
                    <div className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                      <div className="flex items-center space-x-3 mb-3">
                        <BuildingStorefrontIcon className="h-6 w-6 text-blue-600" />
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">Business Verification</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{selectedSeller.location}</p>
                        </div>
                      </div>
                      <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Verify Address
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-6">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Verification Notes
                    </label>
                    <textarea 
                      rows={4}
                      className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Add notes about the verification process..."
                    />
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setSelectedSeller(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Reject Application
                </button>
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Approve Seller
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}