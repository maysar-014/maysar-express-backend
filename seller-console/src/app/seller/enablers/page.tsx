'use client';

import { useState } from 'react';

export default function EnablersPage() {
  const [selectedProduct, setSelectedProduct] = useState('');
  const [minRank, setMinRank] = useState('associate');
  const [supportTypes, setSupportTypes] = useState({
    sales: true,
    logistics: false
  });
  const [commissions, setCommissions] = useState({
    sales: 5,
    logistics: 3
  });
  const [terminationConditions, setTerminationConditions] = useState({
    performanceBelow: 80,
    missedDeadlines: 3,
    customerComplaints: 2
  });

  const products = [
    { id: '1', name: 'Samsung Galaxy A54', price: 850000, category: 'Electronics', stock: 25 },
    { id: '2', name: 'Nike Air Max 270', price: 320000, category: 'Fashion', stock: 15 },
    { id: '3', name: 'MacBook Air M2', price: 2800000, category: 'Electronics', stock: 8 },
    { id: '4', name: 'Adidas Ultraboost 22', price: 280000, category: 'Fashion', stock: 20 }
  ];

  const enablerRanks = [
    { value: 'trainee', label: 'Trainee', color: 'gray' },
    { value: 'associate', label: 'Associate', color: 'blue' },
    { value: 'specialist', label: 'Specialist', color: 'green' },
    { value: 'senior', label: 'Senior', color: 'yellow' },
    { value: 'expert', label: 'Expert', color: 'orange' },
    { value: 'master', label: 'Master', color: 'red' },
    { value: 'director', label: 'Director', color: 'purple' }
  ];

  const selectedProductData = products.find(p => p.id === selectedProduct);
  const productPrice = selectedProductData?.price || 0;
  
  const salesEarnings = supportTypes.sales ? Math.round(productPrice * (commissions.sales / 100)) : 0;
  const logisticsEarnings = supportTypes.logistics ? Math.round(productPrice * (commissions.logistics / 100)) : 0;
  const totalEnablerEarnings = salesEarnings + logisticsEarnings;
  const sellerEarnings = productPrice - totalEnablerEarnings;

  const handleSupportTypeChange = (type: 'sales' | 'logistics') => {
    if (type === 'logistics' && !supportTypes.sales) {
      return; // Cannot have logistics only
    }
    setSupportTypes(prev => ({
      ...prev,
      [type]: !prev[type]
    }));
  };

  const handleCommissionChange = (type: 'sales' | 'logistics', value: number) => {
    setCommissions(prev => ({
      ...prev,
      [type]: value
    }));
  };

  const handleSubmitRequest = () => {
    if (!selectedProduct) {
      alert('Please select a product');
      return;
    }
    if (!supportTypes.sales) {
      alert('Sales support is required');
      return;
    }
    
    console.log('Enabler request submitted:', {
      product: selectedProductData,
      minRank,
      supportTypes,
      commissions,
      terminationConditions,
      earnings: { sales: salesEarnings, logistics: logisticsEarnings, seller: sellerEarnings }
    });
    
    alert('Enabler request submitted successfully!');
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Request Enabler</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Request Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Product Selection */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Product</h3>
            <div className="space-y-3">
              {products.map((product) => (
                <div key={product.id} className="flex items-center space-x-3">
                  <input
                    type="radio"
                    id={product.id}
                    name="product"
                    value={product.id}
                    checked={selectedProduct === product.id}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor={product.id} className="flex-1 cursor-pointer">
                    <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{product.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          {product.category} • Stock: {product.stock}
                        </p>
                      </div>
                      <p className="font-semibold text-gray-900 dark:text-white">
                        TZS {product.price.toLocaleString()}
                      </p>
                    </div>
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Enabler Requirements */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Enabler Requirements</h3>
            
            {/* Minimum Rank */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Minimum Rank Required
              </label>
              <select
                value={minRank}
                onChange={(e) => setMinRank(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {enablerRanks.map((rank) => (
                  <option key={rank.value} value={rank.value}>
                    {rank.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Support Types & Commissions */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
                Support Types & Commission Rates
              </label>
              
              {/* Sales Support */}
              <div className="space-y-4">
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="sales"
                      checked={supportTypes.sales}
                      onChange={() => handleSupportTypeChange('sales')}
                      className="w-4 h-4 text-blue-600"
                      disabled
                    />
                    <label htmlFor="sales" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Sales Support (Required)
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Help with customer inquiries, product recommendations, and closing sales
                  </p>
                  <div>
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      Commission: {commissions.sales}%
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="50"
                      value={commissions.sales}
                      onChange={(e) => handleCommissionChange('sales', Number(e.target.value))}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                    />
                  </div>
                </div>

                {/* Logistics Support */}
                <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <input
                      type="checkbox"
                      id="logistics"
                      checked={supportTypes.logistics}
                      onChange={() => handleSupportTypeChange('logistics')}
                      className="w-4 h-4 text-blue-600"
                    />
                    <label htmlFor="logistics" className="ml-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                      Logistics Support (Optional)
                    </label>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Handle delivery coordination, pickup, and customer delivery
                  </p>
                  {supportTypes.logistics && (
                    <div>
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                        Commission: {commissions.logistics}%
                      </label>
                      <input
                        type="range"
                        min="1"
                        max="30"
                        value={commissions.logistics}
                        onChange={(e) => handleCommissionChange('logistics', Number(e.target.value))}
                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Termination Conditions */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Termination Conditions</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Performance Below: {terminationConditions.performanceBelow}%
                </label>
                <input
                  type="range"
                  min="50"
                  max="95"
                  value={terminationConditions.performanceBelow}
                  onChange={(e) => setTerminationConditions(prev => ({ ...prev, performanceBelow: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Missed Deadlines: {terminationConditions.missedDeadlines} times
                </label>
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={terminationConditions.missedDeadlines}
                  onChange={(e) => setTerminationConditions(prev => ({ ...prev, missedDeadlines: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Customer Complaints: {terminationConditions.customerComplaints} complaints
                </label>
                <input
                  type="range"
                  min="1"
                  max="5"
                  value={terminationConditions.customerComplaints}
                  onChange={(e) => setTerminationConditions(prev => ({ ...prev, customerComplaints: Number(e.target.value) }))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Earnings Breakdown */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Earnings Breakdown</h3>
            
            {selectedProductData ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Selected Product</p>
                  <p className="font-semibold text-blue-900 dark:text-blue-300">{selectedProductData.name}</p>
                  <p className="text-sm text-blue-700 dark:text-blue-400">
                    TZS {selectedProductData.price.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-900 dark:text-green-300">Your Earnings</p>
                      <p className="text-xs text-green-700 dark:text-green-400">
                        {((sellerEarnings / productPrice) * 100).toFixed(1)}% of sale price
                      </p>
                    </div>
                    <p className="font-bold text-green-900 dark:text-green-300">
                      TZS {sellerEarnings.toLocaleString()}
                    </p>
                  </div>

                  {supportTypes.sales && (
                    <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Sales Commission</p>
                        <p className="text-xs text-orange-700 dark:text-orange-400">
                          {commissions.sales}% commission
                        </p>
                      </div>
                      <p className="font-bold text-orange-900 dark:text-orange-300">
                        TZS {salesEarnings.toLocaleString()}
                      </p>
                    </div>
                  )}

                  {supportTypes.logistics && (
                    <div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Logistics Commission</p>
                        <p className="text-xs text-purple-700 dark:text-purple-400">
                          {commissions.logistics}% commission
                        </p>
                      </div>
                      <p className="font-bold text-purple-900 dark:text-purple-300">
                        TZS {logisticsEarnings.toLocaleString()}
                      </p>
                    </div>
                  )}
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="flex justify-between items-center">
                    <p className="font-medium text-gray-900 dark:text-white">Total Sale Price</p>
                    <p className="font-bold text-gray-900 dark:text-white">
                      TZS {productPrice.toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Select a product to see earnings breakdown
              </p>
            )}
          </div>

          {/* Request Summary */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request Summary</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Min. Rank:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {enablerRanks.find(r => r.value === minRank)?.label}
                </span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Support Types:</span>
                <div className="text-right">
                  <div className="font-medium text-gray-900 dark:text-white">Sales ({commissions.sales}%)</div>
                  {supportTypes.logistics && <div className="font-medium text-gray-900 dark:text-white">Logistics ({commissions.logistics}%)</div>}
                </div>
              </div>
              
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Total Commission:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {((totalEnablerEarnings / productPrice) * 100).toFixed(1)}%
                </span>
              </div>
            </div>

            <button
              onClick={handleSubmitRequest}
              disabled={!selectedProduct}
              className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              Submit Enabler Request
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}