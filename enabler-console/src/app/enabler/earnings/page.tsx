'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '@/lib/api';
import { 
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function PaymentHistory() {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-TZ', {
      style: 'currency',
      currency: 'TZS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const { data: paymentsData, isLoading, error } = useQuery({
    queryKey: ['enabler-payments'],
    queryFn: () => enablerApi.getPayments()
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    const payments = [];
    const summary = {};

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Earnings History</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Comprehensive records of all your earnings
          </p>
        </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">This Month</h3>
            <p className="text-xl font-bold text-green-600">TZS 0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total payments received</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Completed Tasks</h3>
            <p className="text-xl font-bold text-blue-600">0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Tasks completed this month</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Total Lifetime</h3>
            <p className="text-xl font-bold text-purple-600">TZS 0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">All-time earnings</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Payment History</h3>
          <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No payment history available</p>
          </div>
        </div>
      </div>
    );
  }

  const payments = paymentsData?.data?.payments || [];
  const summary = paymentsData?.data?.summary || {};

  const generatePDF = () => {
    const enabler = { name: 'Sarah Johnson', id: 'ENB-001' };
    const currentDate = new Date().toLocaleDateString();
    
    // Create PDF content
    const pdfContent = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Payment Statement</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #2563eb; padding-bottom: 20px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .summary { display: flex; justify-content: space-between; margin: 30px 0; }
        .summary-item { text-align: center; flex: 1; }
        .summary-value { font-size: 24px; font-weight: bold; color: #059669; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        .table th { background-color: #f3f4f6; font-weight: bold; }
        .amount { color: #059669; font-weight: bold; }
        .status-completed { background: #d1fae5; color: #065f46; padding: 4px 8px; border-radius: 12px; font-size: 12px; }
        .status-processing { background: #fef3c7; color: #92400e; padding: 4px 8px; border-radius: 12px; font-size: 12px; }
        .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">MAYSAR DIGITAL COMMUNITY TRADE NETWORK</div>
        <h2>Enabler Payment Statement</h2>
        <p>Generated on ${currentDate}</p>
    </div>
    
    <div style="margin-bottom: 30px;">
        <h3>Enabler Information</h3>
        <p><strong>Name:</strong> ${enabler.name}</p>
        <p><strong>ID:</strong> ${enabler.id}</p>
        <p><strong>Period:</strong> ${selectedPeriod.replace('-', ' ').toUpperCase()}</p>
    </div>
    
    <div class="summary">
        <div class="summary-item">
            <div class="summary-value">TZS ${formatCurrency(summary.thisMonthEarnings || 0).replace('TZS', '').trim()}</div>
            <div>This Month Earnings</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">${summary.completedTasks || 0}</div>
            <div>Completed Tasks</div>
        </div>
        <div class="summary-item">
            <div class="summary-value">TZS ${formatCurrency(summary.totalEarnings || 0).replace('TZS', '').trim()}</div>
            <div>Total Lifetime</div>
        </div>
    </div>
    
    <h3>Payment Details</h3>
    <table class="table">
        <thead>
            <tr>
                <th>Date</th>
                <th>Task ID</th>
                <th>Description</th>
                <th>Status</th>
                <th>Amount</th>
            </tr>
        </thead>
        <tbody>
            ${payments.length > 0 ? payments.map(payment => `
                <tr>
                    <td>${payment.completedDate}</td>
                    <td>${payment.taskId}</td>
                    <td>${payment.taskTitle}</td>
                    <td><span class="status-${payment.status}">${payment.status.toUpperCase()}</span></td>
                    <td class="amount">TZS ${formatCurrency(payment.amount).replace('TZS', '').trim()}</td>
                </tr>
            `).join('') : `
                <tr>
                    <td colspan="5" style="text-align: center; color: #6b7280;">No payment records available</td>
                </tr>
            `}
        </tbody>
    </table>
    
    <div class="footer">
        <p>This is an automatically generated statement from Maysar Digital Community Platform.</p>
        <p>For inquiries, contact support@maysar.com</p>
    </div>
</body>
</html>
    `;
    
    // Create and download PDF
    const blob = new Blob([pdfContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `maysar-payment-statement-${currentDate.replace(/\//g, '-')}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getPaymentIcon = (status: string) => {
    if (status === 'completed') {
      return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
    }
    if (status === 'processing') {
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
    return <DocumentTextIcon className="h-5 w-5 text-gray-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">Completed</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 px-2 py-1 rounded-full text-xs font-medium">Pending</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium">Failed</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">Unknown</span>;
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Payment History</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Track your completed task payments and earnings
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={generatePDF}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm"
          >
            Download Statement
          </button>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">This Month</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                TZS {formatCurrency(summary.thisMonthEarnings || 0).replace('TZS', '').trim()}
              </p>
            </div>
            <CalendarIcon className="h-6 w-6 text-green-500" />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Total payments received
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Completed Tasks</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {summary.completedTasks || 0}
              </p>
            </div>
            <CheckCircleIcon className="h-6 w-6 text-blue-500" />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Tasks completed this month
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Lifetime</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                TZS {formatCurrency(summary.totalEarnings || 0).replace('TZS', '').trim()}
              </p>
            </div>
            <DocumentTextIcon className="h-6 w-6 text-purple-500" />
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            All-time earnings
          </p>
        </div>
      </div>

      {/* Payment Method */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Payment Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">Payment Method</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Escrow System</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Automatic payment upon task completion</p>
          </div>
          <div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">Payment Schedule</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Immediate</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Paid directly after task verification</p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Payment History</h3>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-2 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-xs"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="all-time">All Time</option>
          </select>
        </div>

        <div className="space-y-3">
          {payments.map((payment: any) => (
            <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex items-center space-x-3">
                <div className="flex-shrink-0">
                  {getPaymentIcon(payment.status)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white text-sm">{payment.taskTitle}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-xs text-gray-600 dark:text-gray-400">{payment.completedDate}</p>
                    <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                      {payment.taskId}
                    </span>
                    {getStatusBadge(payment.status)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-green-600 text-sm">
                  {formatCurrency(payment.amount)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Escrow payment
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>


    </div>
  );
}
