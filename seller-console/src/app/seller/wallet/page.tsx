'use client';

import { getSeller } from '@/lib/permissions';

export default function WalletPage() {
  const seller = getSeller();

  const walletData = {
    availableBalance: 450000,
    pendingBalance: 125000,
    totalEarnings: 2450000,
    monthlyEarnings: 850000,
    lastPayout: 320000,
    nextPayoutDate: '2025-01-05',
    platformFee: 3.5,
    paymentFee: 1.2
  };

  const transactions = [
    { id: 'TXN-001', type: 'sale', description: 'Order ORD-2024-5678', amount: 125000, fee: 4375, net: 120625, date: '2024-12-30 10:30', status: 'completed' },
    { id: 'TXN-002', type: 'payout', description: 'Bank Transfer - CRDB Bank', amount: -320000, fee: 0, net: -320000, date: '2024-12-29 14:20', status: 'completed' },
    { id: 'TXN-003', type: 'sale', description: 'Order ORD-2024-5679', amount: 89000, fee: 3115, net: 85885, date: '2024-12-29 09:15', status: 'pending' },
    { id: 'TXN-004', type: 'refund', description: 'Refund for ORD-2024-5680', amount: -78000, fee: 0, net: -78000, date: '2024-12-28 16:45', status: 'completed' },
    { id: 'TXN-005', type: 'sale', description: 'Order ORD-2024-5681', amount: 156000, fee: 5460, net: 150540, date: '2024-12-28 11:30', status: 'completed' }
  ];

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'sale': return '↗';
      case 'payout': return '↙';
      case 'refund': return '↩';
      default: return '•';
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'sale': return 'text-green-600';
      case 'payout': return 'text-blue-600';
      case 'refund': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Wallet & Earnings</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your earnings, manage payouts, and view transaction history
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Download Statement
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Request Payout
          </button>
        </div>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Available Balance</p>
          <p className="text-2xl font-bold text-green-600">TZS {walletData.availableBalance.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Ready for payout</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Pending Balance</p>
          <p className="text-2xl font-bold text-yellow-600">TZS {walletData.pendingBalance.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Processing orders</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Monthly Earnings</p>
          <p className="text-2xl font-bold text-blue-600">TZS {walletData.monthlyEarnings.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">This month</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Total Earnings</p>
          <p className="text-2xl font-bold text-purple-600">TZS {walletData.totalEarnings.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">All time</p>
        </div>
      </div>

      {/* Payout Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payout Schedule</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Next Payout Date</span>
              <span className="font-semibold text-gray-900">{walletData.nextPayoutDate}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Last Payout Amount</span>
              <span className="font-semibold text-green-600">TZS {walletData.lastPayout.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payout Method</span>
              <span className="font-semibold text-gray-900">CRDB Bank ****1234</span>
            </div>
            <div className="pt-4 border-t">
              <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Update Payout Method
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Fee Structure</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Platform Fee</span>
              <span className="font-semibold text-gray-900">{walletData.platformFee}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Payment Processing</span>
              <span className="font-semibold text-gray-900">{walletData.paymentFee}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Fee Rate</span>
              <span className="font-semibold text-red-600">{walletData.platformFee + walletData.paymentFee}%</span>
            </div>
            <div className="pt-4 border-t">
              <p className="text-sm text-gray-500">
                Fees are automatically deducted from each sale. Higher seller tiers get reduced fee rates.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Transaction History</h3>
            <div className="flex space-x-2">
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Transactions</option>
                <option>Sales</option>
                <option>Payouts</option>
                <option>Refunds</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Last 3 months</option>
                <option>Custom range</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Transaction</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Net Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <span className={`text-lg ${getTransactionColor(transaction.type)}`}>
                        {getTransactionIcon(transaction.type)}
                      </span>
                      <div>
                        <p className="font-medium text-gray-900 capitalize">{transaction.type}</p>
                        <p className="text-sm text-gray-500">{transaction.id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{transaction.description}</td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${transaction.amount > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount > 0 ? '+' : ''}TZS {Math.abs(transaction.amount).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {transaction.fee > 0 ? `TZS ${transaction.fee.toLocaleString()}` : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${transaction.net > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.net > 0 ? '+' : ''}TZS {Math.abs(transaction.net).toLocaleString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{transaction.date}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      transaction.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {transaction.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Earnings Summary */}
      <div className="bg-gradient-to-r from-green-50 to-blue-50 p-6 rounded-lg border border-green-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="font-semibold text-green-900">Monthly Performance</h4>
            <p className="text-green-700 text-sm mt-1">
              You've earned TZS {walletData.monthlyEarnings.toLocaleString()} this month. 
              Keep up the great work to reach the next seller tier!
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-green-600">+15.3%</p>
            <p className="text-sm text-green-700">vs last month</p>
          </div>
        </div>
      </div>
    </div>
  );
}