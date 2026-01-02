'use client';

import { useState } from 'react';

interface PricingContract {
  id: string;
  retailer: string;
  contractType: 'volume' | 'seasonal' | 'exclusive' | 'standard';
  startDate: string;
  endDate: string;
  status: 'active' | 'pending' | 'expired' | 'draft';
  products: {
    name: string;
    sku: string;
    basePrice: number;
    contractPrice: number;
    discount: number;
    minQuantity: number;
  }[];
  totalValue: number;
  terms: string;
}

const mockContracts: PricingContract[] = [
  {
    id: 'PC-2024-001',
    retailer: 'Shoppers Plaza Dar es Salaam',
    contractType: 'volume',
    startDate: '2024-01-01',
    endDate: '2024-12-31',
    status: 'active',
    products: [
      {
        name: 'Coca Cola 500ml',
        sku: 'CC-500-001',
        basePrice: 1200,
        contractPrice: 1080,
        discount: 10,
        minQuantity: 100
      },
      {
        name: 'Azam Cooking Oil 1L',
        sku: 'AZ-OIL-1L',
        basePrice: 3500,
        contractPrice: 3150,
        discount: 10,
        minQuantity: 50
      }
    ],
    totalValue: 15600000,
    terms: 'Volume discount for orders above minimum quantity. Payment terms: 30 days.'
  },
  {
    id: 'PC-2024-002',
    retailer: 'Quality Mart Mwanza',
    contractType: 'seasonal',
    startDate: '2024-03-01',
    endDate: '2024-05-31',
    status: 'pending',
    products: [
      {
        name: 'Pembe Flour 2kg',
        sku: 'PF-2KG-001',
        basePrice: 2800,
        contractPrice: 2520,
        discount: 10,
        minQuantity: 200
      }
    ],
    totalValue: 5040000,
    terms: 'Ramadan season special pricing. Bulk orders required.'
  }
];

export default function PricingPage() {
  const [selectedContract, setSelectedContract] = useState<PricingContract | null>(null);
  const [isCreatingContract, setIsCreatingContract] = useState(false);
  const [activeTab, setActiveTab] = useState<'contracts' | 'pricing' | 'calculator'>('contracts');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getContractTypeColor = (type: string) => {
    switch (type) {
      case 'volume': return 'bg-blue-100 text-blue-800';
      case 'seasonal': return 'bg-purple-100 text-purple-800';
      case 'exclusive': return 'bg-orange-100 text-orange-800';
      case 'standard': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Contract Pricing</h1>
        <button 
          onClick={() => setIsCreatingContract(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Create New Contract
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Contracts</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">{mockContracts.filter(c => c.status === 'active').length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Approval</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{mockContracts.filter(c => c.status === 'pending').length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Contract Value</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">TZS {mockContracts.reduce((sum, c) => sum + c.totalValue, 0).toLocaleString()}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Discount</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">8.5%</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'contracts', label: 'Active Contracts' },
            { key: 'pricing', label: 'Pricing Rules' },
            { key: 'calculator', label: 'Price Calculator' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Contracts Tab */}
      {activeTab === 'contracts' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Pricing Contracts</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Contract ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Retailer</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Products</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Value</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {mockContracts.map((contract) => (
                  <tr key={contract.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{contract.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{contract.retailer}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getContractTypeColor(contract.contractType)}`}>
                        {contract.contractType.charAt(0).toUpperCase() + contract.contractType.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                      {contract.startDate} - {contract.endDate}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{contract.products.length} items</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">TZS {contract.totalValue.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(contract.status)}`}>
                        {contract.status.charAt(0).toUpperCase() + contract.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => setSelectedContract(contract)}
                        className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                      >
                        View
                      </button>
                      <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                        Edit
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pricing Rules Tab */}
      {activeTab === 'pricing' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Volume Discounts</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">100-499 units</span>
                  <span className="text-sm font-semibold text-green-600">5% discount</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">500-999 units</span>
                  <span className="text-sm font-semibold text-green-600">10% discount</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">1000+ units</span>
                  <span className="text-sm font-semibold text-green-600">15% discount</span>
                </div>
              </div>
              <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Edit Volume Rules
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Seasonal Pricing</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">Ramadan Season</span>
                  <span className="text-sm font-semibold text-purple-600">Special rates</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">Holiday Season</span>
                  <span className="text-sm font-semibold text-purple-600">Premium rates</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <span className="text-sm text-gray-900 dark:text-white">Off Season</span>
                  <span className="text-sm font-semibold text-purple-600">Standard rates</span>
                </div>
              </div>
              <button className="w-full mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                Edit Seasonal Rules
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Price Calculator Tab */}
      {activeTab === 'calculator' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Price Calculator</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="">Select Product</option>
                  <option value="cc-500">Coca Cola 500ml</option>
                  <option value="az-oil">Azam Cooking Oil 1L</option>
                  <option value="pf-flour">Pembe Flour 2kg</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Quantity</label>
                <input
                  type="number"
                  placeholder="Enter quantity"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contract Type</label>
                <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  <option value="standard">Standard</option>
                  <option value="volume">Volume</option>
                  <option value="seasonal">Seasonal</option>
                  <option value="exclusive">Exclusive</option>
                </select>
              </div>
              <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Calculate Price
              </button>
            </div>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Price Breakdown</h4>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Base Price:</span>
                  <span className="text-sm text-gray-900 dark:text-white">TZS 1,200</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Quantity:</span>
                  <span className="text-sm text-gray-900 dark:text-white">100 units</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Subtotal:</span>
                  <span className="text-sm text-gray-900 dark:text-white">TZS 120,000</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Volume Discount (5%):</span>
                  <span className="text-sm text-green-600">-TZS 6,000</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-600 pt-3">
                  <div className="flex justify-between">
                    <span className="text-md font-semibold text-gray-900 dark:text-white">Total Price:</span>
                    <span className="text-md font-semibold text-gray-900 dark:text-white">TZS 114,000</span>
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Price per unit:</span>
                    <span className="text-sm text-gray-900 dark:text-white">TZS 1,140</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contract Details Modal */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Contract Details - {selectedContract.id}</h3>
              <button
                onClick={() => setSelectedContract(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Retailer</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedContract.retailer}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Contract Type</label>
                  <p className="text-sm text-gray-900 dark:text-white capitalize">{selectedContract.contractType}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Duration</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedContract.startDate} to {selectedContract.endDate}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Total Value</label>
                  <p className="text-sm text-gray-900 dark:text-white">TZS {selectedContract.totalValue.toLocaleString()}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Terms & Conditions</label>
                <p className="text-sm text-gray-900 dark:text-white bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">{selectedContract.terms}</p>
              </div>
            </div>
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Products</h4>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Base Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Contract Price</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Discount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Min Qty</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {selectedContract.products.map((product, index) => (
                      <tr key={index}>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{product.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">TZS {product.basePrice.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">TZS {product.contractPrice.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-green-600">{product.discount}%</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{product.minQuantity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Edit Contract
              </button>
              <button className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                Renew Contract
              </button>
              <button className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                Download PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}