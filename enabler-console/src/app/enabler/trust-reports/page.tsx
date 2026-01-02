import PermissionGuard from '@/components/PermissionGuard';
import TrustReportsContent from './TrustReportsContent';

export default function TrustReports() {
  return (
    <PermissionGuard permission="trustReports">
      <TrustReportsContent />
    </PermissionGuard>
  );
}
  const [selectedCase, setSelectedCase] = useState(null);
  const [reportType, setReportType] = useState('all');

  const trustCases = [
    {
      id: 'TR-001',
      caseType: 'suspicious-transaction',
      priority: 'high',
      status: 'pending',
      reportedBy: 'System Alert',
      createdAt: '2024-12-29 13:15',
      estimatedEarnings: 40.00,
      subject: {
        type: 'transaction',
        id: 'TXN-2024-8901',
        amount: 15000.00,
        buyerId: 'BUY-001',
        sellerId: 'SEL-001',
        buyerName: 'John Doe',
        sellerName: 'TechStore KE'
      },
      description: 'Multiple high-value transactions from new buyer account within 24 hours',
      riskScore: 85,
      flags: ['new-account', 'high-value', 'rapid-transactions', 'unusual-pattern'],
      evidence: ['transaction-logs', 'user-behavior', 'payment-patterns'],
      investigationRequired: ['identity-verification', 'transaction-analysis', 'contact-verification']
    },
    {
      id: 'TR-002',
      caseType: 'fake-seller',
      priority: 'high',
      status: 'in-progress',
      reportedBy: 'Buyer Report',
      createdAt: '2024-12-29 11:30',
      estimatedEarnings: 35.00,
      subject: {
        type: 'seller',
        id: 'SEL-002',
        businessName: 'Fashion Hub Plus',
        ownerName: 'Mary Unknown',
        phone: '+254700000000',
        email: 'fake@example.com'
      },
      description: 'Seller using stolen product images and fake business registration',
      riskScore: 92,
      flags: ['stolen-images', 'fake-documents', 'suspicious-contact'],
      evidence: ['image-analysis', 'document-verification', 'reverse-image-search'],
      investigationRequired: ['document-authentication', 'business-verification', 'contact-validation']
    },
    {
      id: 'TR-003',
      caseType: 'payment-fraud',
      priority: 'medium',
      status: 'pending',
      reportedBy: 'Payment Gateway',
      createdAt: '2024-12-29 10:45',
      estimatedEarnings: 30.00,
      subject: {
        type: 'payment',
        id: 'PAY-2024-7890',
        amount: 8500.00,
        method: 'Credit Card',
        cardLast4: '1234',
        buyerId: 'BUY-002'
      },
      description: 'Chargeback initiated for completed order, potential card fraud',
      riskScore: 78,
      flags: ['chargeback', 'disputed-transaction', 'card-fraud'],
      evidence: ['payment-logs', 'chargeback-notice', 'delivery-confirmation'],
      investigationRequired: ['payment-verification', 'delivery-proof', 'buyer-contact']
    },
    {
      id: 'TR-004',
      caseType: 'review-manipulation',
      priority: 'medium',
      status: 'pending',
      reportedBy: 'Algorithm Detection',
      createdAt: '2024-12-29 09:20',
      estimatedEarnings: 25.00,
      subject: {
        type: 'seller',
        id: 'SEL-003',
        businessName: 'Electronics World',
        suspiciousReviews: 15,
        averageRating: 4.9
      },
      description: 'Unusual pattern of 5-star reviews from new accounts',
      riskScore: 65,
      flags: ['fake-reviews', 'rating-manipulation', 'bot-accounts'],
      evidence: ['review-analysis', 'account-patterns', 'timing-analysis'],
      investigationRequired: ['review-verification', 'account-analysis', 'pattern-investigation']
    }
  ];

  const completedCases = [
    {
      id: 'TR-005',
      caseType: 'suspicious-transaction',
      completedAt: '2024-12-28 16:45',
      resolution: 'Confirmed fraud - account suspended',
      earnings: 40.00,
      investigationTime: '3 hours 20 minutes',
      outcome: 'fraud-confirmed'
    },
    {
      id: 'TR-006',
      caseType: 'fake-seller',
      completedAt: '2024-12-28 14:30',
      resolution: 'False alarm - legitimate business verified',
      earnings: 35.00,
      investigationTime: '2 hours 15 minutes',
      outcome: 'false-positive'
    }
  ];

  const getCaseIcon = (caseType: string) => {
    switch (caseType) {
      case 'suspicious-transaction':
        return <CurrencyDollarIcon className="h-6 w-6 text-red-600" />;
      case 'fake-seller':
        return <BuildingStorefrontIcon className="h-6 w-6 text-orange-600" />;
      case 'payment-fraud':
        return <CurrencyDollarIcon className="h-6 w-6 text-red-600" />;
      case 'review-manipulation':
        return <DocumentTextIcon className="h-6 w-6 text-yellow-600" />;
      default:
        return <ShieldCheckIcon className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
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

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-300';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-300';
    return 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-300';
  };

  const filteredCases = trustCases.filter(case_ => {
    if (reportType === 'all') return true;
    return case_.caseType === reportType;
  });

  const handleStartInvestigation = (caseId: string) => {
    console.log(`Starting investigation for case ${caseId}`);
    // In production, this would update the status and assign the enabler
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trust & Fraud Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Investigate suspicious activities and protect the platform integrity
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded-full text-red-800 dark:text-red-300 text-sm font-medium">
            {trustCases.filter(c => c.status === 'pending').length} Pending Cases
          </span>
          <span className="bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded-full text-green-800 dark:text-green-300 text-sm font-medium">
            KES {trustCases.reduce((sum, case_) => sum + case_.estimatedEarnings, 0)} Potential Earnings
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Cases</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {trustCases.filter(c => c.status !== 'completed').length}
              </p>
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Risk Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">78</p>
            </div>
            <ExclamationTriangleIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Resolution Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">94%</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Investigation Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">2h 45m</p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>
      </div>

      {/* Case Type Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setReportType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Cases
          </button>
          <button
            onClick={() => setReportType('suspicious-transaction')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'suspicious-transaction'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Suspicious Transactions
          </button>
          <button
            onClick={() => setReportType('fake-seller')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'fake-seller'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Fake Sellers
          </button>
          <button
            onClick={() => setReportType('payment-fraud')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'payment-fraud'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Payment Fraud
          </button>
          <button
            onClick={() => setReportType('review-manipulation')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              reportType === 'review-manipulation'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Review Manipulation
          </button>
        </div>
      </div>

      {/* Active Trust Cases */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Active Trust & Safety Cases</h3>
        <div className="space-y-4">
          {filteredCases.map((case_) => (
            <div key={case_.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    {getCaseIcon(case_.caseType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {case_.id}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(case_.priority)}`}>
                        {case_.priority} priority
                      </span>
                      <div className="flex items-center">
                        {getStatusIcon(case_.status)}
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskScoreColor(case_.riskScore)}`}>
                        Risk: {case_.riskScore}%
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{case_.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Case Type:</span>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {case_.caseType.replace('-', ' ')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Reported By:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{case_.reportedBy}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Subject:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          {case_.subject.type === 'seller' ? case_.subject.businessName : 
                           case_.subject.type === 'transaction' ? `KES ${case_.subject.amount?.toLocaleString()}` :
                           case_.subject.type === 'payment' ? `${case_.subject.method} ****${case_.subject.cardLast4}` :
                           case_.subject.id}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Created:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{case_.createdAt}</p>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Risk Flags:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {case_.flags.map((flag, index) => (
                          <span key={index} className="bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 px-2 py-1 rounded text-xs">
                            🚩 {flag.replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Evidence Available:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {case_.evidence.map((evidence, index) => (
                          <span key={index} className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                            📄 {evidence.replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Investigation Required:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {case_.investigationRequired.map((task, index) => (
                          <span key={index} className="bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded text-xs">
                            🔍 {task.replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0 text-right ml-4">
                  <div className="flex items-center text-green-600 mb-2">
                    <CurrencyDollarIcon className="h-5 w-5 mr-1" />
                    <span className="text-lg font-bold">KES {case_.estimatedEarnings}</span>
                  </div>
                  
                  <div className="space-y-2">
                    {case_.status === 'pending' && (
                      <button 
                        onClick={() => handleStartInvestigation(case_.id)}
                        className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Start Investigation
                      </button>
                    )}
                    {case_.status === 'in-progress' && (
                      <button 
                        onClick={() => setSelectedCase(case_)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Continue Investigation
                      </button>
                    )}
                    
                    <div className="flex space-x-1">
                      <button className="flex-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-900/30">
                        <EyeIcon className="h-4 w-4 inline mr-1" />
                        View
                      </button>
                      <button className="flex-1 px-3 py-1 bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300 rounded text-xs hover:bg-red-200 dark:hover:bg-red-900/30">
                        <FlagIcon className="h-4 w-4 inline mr-1" />
                        Flag
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Completed Cases */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recently Completed Cases</h3>
        <div className="space-y-3">
          {completedCases.map((case_) => (
            <div key={case_.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{case_.id}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {case_.caseType.replace('-', ' ')} • {case_.resolution}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Investigation time: {case_.investigationTime}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">+KES {case_.earnings}</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span className={`px-2 py-1 rounded text-xs ${
                    case_.outcome === 'fraud-confirmed' ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300' :
                    'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                  }`}>
                    {case_.outcome.replace('-', ' ')}
                  </span>
                  <span className="ml-2">{case_.completedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
            <ExclamationTriangleIcon className="h-8 w-8 text-red-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-red-900 dark:text-red-300">Report Fraud</p>
          </button>
          <button className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <UserIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">User Lookup</p>
          </button>
          <button className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors">
            <DocumentTextIcon className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-yellow-900 dark:text-yellow-300">Case Templates</p>
          </button>
          <button className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <ShieldCheckIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900 dark:text-green-300">Security Guide</p>
          </button>
        </div>
      </div>
    </div>
  );
}