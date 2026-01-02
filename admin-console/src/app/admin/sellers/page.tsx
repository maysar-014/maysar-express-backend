"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, formatCurrency, capitalize } from '@/lib/utils';

interface Seller {
  id: string;
  businessName: string;
  contactEmail: string;
  contactName: string;
  phone: string;
  businessType: 'individual' | 'corporation' | 'partnership' | 'llc';
  status: 'pending' | 'under_review' | 'approved' | 'suspended' | 'rejected' | 'deactivated';
  kycStatus: 'not_started' | 'in_progress' | 'pending_review' | 'approved' | 'rejected';
  riskScore: number;
  complianceScore: number;
  performanceScore: number;
  badges: string[];
  registeredAt: string;
  approvedAt?: string;
  lastActiveAt?: string;
  totalProducts: number;
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  totalReviews: number;
  suspensionReason?: string;
  documents: {
    businessLicense: { status: string; uploadedAt?: string; };
    taxId: { status: string; uploadedAt?: string; };
    bankStatement: { status: string; uploadedAt?: string; };
    identity: { status: string; uploadedAt?: string; };
  };
}

interface KYCDocument {
  id: string;
  sellerId: string;
  type: string;
  fileName: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  rejectionReason?: string;
}

export default function SellerOversightPage() {
  const [activeTab, setActiveTab] = useState<'applications' | 'kyc' | 'performance' | 'compliance'>('applications');
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  const [showKYCModal, setShowKYCModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<KYCDocument | null>(null);

  // Fetch sellers
  const { data: sellersData, isLoading: sellersLoading, refetch: refetchSellers } = useQuery({
    queryKey: ['sellers'],
    queryFn: () => apiService.sellers.getSellers(),
    staleTime: 30 * 1000,
  });

  // Fetch KYC documents
  const { data: kycData, isLoading: kycLoading, refetch: refetchKYC } = useQuery({
    queryKey: ['kyc-documents'],
    queryFn: () => apiService.sellers.getKYCDocuments(),
    staleTime: 30 * 1000,
  });

  const sellers = sellersData?.data || [];
  const kycDocuments = kycData?.data || [];

  // Mutations
  const approveSellerMutation = useMutation({
    mutationFn: (sellerId: string) => apiService.sellers.approveSeller(sellerId),
    onSuccess: () => {
      toast.success('Seller approved successfully');
      refetchSellers();
    },
    onError: () => {
      toast.error('Failed to approve seller');
    },
  });

  const rejectSellerMutation = useMutation({
    mutationFn: ({ sellerId, reason }: { sellerId: string; reason: string }) =>
      apiService.sellers.rejectSeller(sellerId, reason),
    onSuccess: () => {
      toast.success('Seller rejected');
      refetchSellers();
    },
    onError: () => {
      toast.error('Failed to reject seller');
    },
  });

  const suspendSellerMutation = useMutation({
    mutationFn: ({ sellerId, reason }: { sellerId: string; reason: string }) =>
      apiService.sellers.suspendSeller(sellerId, reason),
    onSuccess: () => {
      toast.success('Seller suspended');
      refetchSellers();
    },
    onError: () => {
      toast.error('Failed to suspend seller');
    },
  });

  const approveDocumentMutation = useMutation({
    mutationFn: (documentId: string) => apiService.sellers.approveDocument(documentId),
    onSuccess: () => {
      toast.success('Document approved');
      refetchKYC();
      setSelectedDocument(null);
    },
    onError: () => {
      toast.error('Failed to approve document');
    },
  });

  const rejectDocumentMutation = useMutation({
    mutationFn: ({ documentId, reason }: { documentId: string; reason: string }) =>
      apiService.sellers.rejectDocument(documentId, reason),
    onSuccess: () => {
      toast.success('Document rejected');
      refetchKYC();
      setSelectedDocument(null);
    },
    onError: () => {
      toast.error('Failed to reject document');
    },
  });

  // Application columns (for new/pending sellers)
  const applicationColumns: Column<Seller>[] = [
    {
      key: 'businessName',
      header: 'Business',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.contactName}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{row.contactEmail}</div>
        </div>
      ),
    },
    {
      key: 'businessType',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          value === 'under_review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'kycStatus',
      header: 'KYC Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'pending_review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          value === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'registeredAt',
      header: 'Registered',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedSeller(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Review
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => approveSellerMutation.mutate(row.id)}
                className="text-green-600 hover:text-green-900 text-sm font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Rejection reason:');
                  if (reason) rejectSellerMutation.mutate({ sellerId: row.id, reason });
                }}
                className="text-red-600 hover:text-red-900 text-sm font-medium"
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // Seller columns (for approved/active sellers)
  const sellerColumns: Column<Seller>[] = [
    {
      key: 'businessName',
      header: 'Business',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.contactName}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{row.contactEmail}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          value === 'under_review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'kycStatus',
      header: 'KYC Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'pending_review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          value === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <span className={`font-medium ${
            value >= 80 ? 'text-red-600' :
            value >= 60 ? 'text-orange-600' :
            value >= 40 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {value}
          </span>
          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                value >= 80 ? 'bg-red-500' :
                value >= 60 ? 'bg-orange-500' :
                value >= 40 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${value}%` }}
            ></div>
          </div>
        </div>
      ),
    },
    {
      key: 'performanceScore',
      header: 'Performance',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}/100</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ⭐ {row.averageRating.toFixed(1)} ({row.totalReviews})
          </div>
        </div>
      ),
    },
    {
      key: 'totalRevenue',
      header: 'Revenue',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(value)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.totalSales} sales
          </div>
        </div>
      ),
    },
    {
      key: 'badges',
      header: 'Tier',
      render: (_, row) => {
        const tierColors = {
          'Starter': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          'Growth': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          'Premium': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          'Elite': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
          'Partner': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        };
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tierColors[row.tier as keyof typeof tierColors] || 'bg-gray-100 text-gray-800'}`}>
            {row.tier || 'Starter'}
          </span>
        );
      },
    },
    {
      key: 'registeredAt',
      header: 'Registered',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedSeller(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Review
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => approveSellerMutation.mutate(row.id)}
                className="text-green-600 hover:text-green-900 text-sm font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Rejection reason:');
                  if (reason) rejectSellerMutation.mutate({ sellerId: row.id, reason });
                }}
                className="text-red-600 hover:text-red-900 text-sm font-medium"
              >
                Reject
              </button>
            </>
          )}
          {row.status === 'approved' && (
            <button
              onClick={() => {
                const reason = prompt('Suspension reason:');
                if (reason) suspendSellerMutation.mutate({ sellerId: row.id, reason });
              }}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Suspend
            </button>
          )}
        </div>
      ),
    },
  ];

  // KYC document columns
  const kycColumns: Column<KYCDocument>[] = [
    {
      key: 'uploadedAt',
      header: 'Uploaded',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'sellerId',
      header: 'Seller',
      render: (value) => {
        const seller = sellers.find((s: Seller) => s.id === value);
        return seller ? (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{seller.businessName}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{seller.contactEmail}</div>
          </div>
        ) : (
          <span className="text-gray-500">Unknown Seller</span>
        );
      },
    },
    {
      key: 'type',
      header: 'Document Type',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {value.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'fileName',
      header: 'File Name',
      render: (value) => (
        <span className="text-sm text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedDocument(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Review
          </button>
          {row.status === 'pending' && (
            <>
              <button
                onClick={() => approveDocumentMutation.mutate(row.id)}
                className="text-green-600 hover:text-green-900 text-sm font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Rejection reason:');
                  if (reason) rejectDocumentMutation.mutate({ documentId: row.id, reason });
                }}
                className="text-red-600 hover:text-red-900 text-sm font-medium"
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  const pendingSellers = sellers.filter((seller: Seller) => seller.status === 'pending');
  const pendingKYC = kycDocuments.filter((doc: KYCDocument) => doc.status === 'pending');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Seller Oversight
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Comprehensive seller onboarding, verification, and performance management
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchSellers();
              refetchKYC();
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Seller Tier Distribution</h3>
        <div className="grid grid-cols-5 gap-4">
          {['Starter', 'Growth', 'Premium', 'Elite', 'Partner'].map(tier => {
            const tierSellers = sellers.filter((s: Seller) => s.tier === tier);
            const tierColors = {
              'Starter': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
              'Growth': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
              'Premium': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
              'Elite': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
              'Partner': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            };
            const totalRevenue = tierSellers.reduce((sum: number, s: Seller) => sum + s.totalRevenue, 0);
            return (
              <div key={tier} className="text-center">
                <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${tierColors[tier as keyof typeof tierColors]}`}>
                  {tier}
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {tierSellers.length}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  {formatCurrency(totalRevenue)}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {tierSellers.length > 0 ? (totalRevenue / tierSellers.length).toFixed(0) : '0'} avg
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('applications')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'applications'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Applications ({pendingSellers.length})
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'kyc'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            KYC Documents ({pendingKYC.length})
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'performance'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Performance Analytics
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'compliance'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Compliance Monitoring
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'applications' && (
        <DataTable
          data={sellers.filter((s: Seller) => ['pending', 'under_review'].includes(s.status))}
          columns={applicationColumns}
          searchable={true}
          searchPlaceholder="Search applications by business name or email..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={sellersLoading}
          emptyMessage="No pending applications found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'kyc' && (
        <DataTable
          data={kycDocuments}
          columns={kycColumns}
          searchable={true}
          searchPlaceholder="Search KYC documents..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={kycLoading}
          emptyMessage="No KYC documents found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'performance' && (
        <DataTable
          data={sellers.filter((s: Seller) => s.status === 'approved')}
          columns={sellerColumns}
          searchable={true}
          searchPlaceholder="Search sellers by business name or email..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={sellersLoading}
          emptyMessage="No active sellers found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'compliance' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Compliance Monitoring
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Compliance monitoring and risk assessment tools coming soon...
          </p>
        </div>
      )}
    </div>
  );
}