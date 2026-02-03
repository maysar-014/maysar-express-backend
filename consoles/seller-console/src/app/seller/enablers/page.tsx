'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { getSeller } from '@/lib/permissions';

export default function EnablersPage() {
  const seller = getSeller();
  const queryClient = useQueryClient();

  // Form state
  const [formData, setFormData] = useState({
    requestType: 'sales_support',
    description: '',
    deadline: '',
    commission: '',
    priority: 'medium',
    location: '',
    requirements: [] as string[]
  });

  // Pagination state for products
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const productsPerPage = 5;

  // Preset requirements
  const presetRequirements = [
    'Product Knowledge',
    'Customer Service Skills',
    'Sales Experience',
    'Digital Marketing',
    'Social Media Management',
    'Photography Skills',
    'Content Creation',
    'Community Networking',
    'B2B Sales Experience',
    'Market Research'
  ];

  const { data: enablersData } = useQuery({
    queryKey: ['enablers', seller?.id],
    queryFn: () => apiService.getEnablers(),
    staleTime: 30 * 1000,
    enabled: !!seller?.id,
  });

  const { data: existingRequests } = useQuery({
    queryKey: ['enabler-requests', seller?.id],
    queryFn: () => apiService.getEnablerRequests(),
    staleTime: 30 * 1000,
    enabled: !!seller?.id,
  });

  const { data: sellerProducts } = useQuery({
    queryKey: ['seller-products', seller?.id],
    queryFn: () => apiService.getProducts(),
    staleTime: 30 * 1000,
    enabled: !!seller?.id,
  });

  const requestMutation = useMutation({
    mutationFn: (data: any) => apiService.requestEnabler(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enabler-requests'] });
      alert('Enabler request submitted successfully!');
      // Reset form
      setFormData({
        requestType: 'sales_support',
        description: '',
        deadline: '',
        commission: '',
        priority: 'medium',
        location: '',
        requirements: []
      });
    },
    onError: (error) => {
      console.error('Error submitting request:', error);
      alert('Failed to submit request. Please try again.');
    }
  });

  const products = enablersData?.data?.data?.products || [];
  const requests = existingRequests?.data?.data?.requests || [];

  const requestTypes = [
    { value: 'sales_support', label: 'Sales Support', description: 'Help with product promotion, customer consultation, and sales closing' }
  ];

  const priorities = [
    { value: 'low', label: 'Low Priority', color: 'green' },
    { value: 'medium', label: 'Medium Priority', color: 'yellow' },
    { value: 'high', label: 'High Priority', color: 'red' }
  ];

  // Calculate commission earnings based on selected product
  const selectedProductData = sellerProducts?.data?.data?.products?.find((p: any) => 
    p.name === selectedProduct
  );
  
  const productPrice = selectedProductData?.price || 0;
  
  const commissionEarnings = productPrice && formData.commission ?
    Math.round((productPrice * Number(formData.commission)) / 100) : 0;

  // Calculate minimum enabler rank based on commission earnings
  const getMinimumRank = (earnings: number) => {
    if (earnings >= 500000) return 'director';   // 500k+ TZS
    if (earnings >= 200000) return 'master';     // 200k+ TZS
    if (earnings >= 100000) return 'expert';     // 100k+ TZS
    if (earnings >= 50000) return 'senior';      // 50k+ TZS
    if (earnings >= 20000) return 'specialist';  // 20k+ TZS
    return 'associate';                          // Below 20k TZS
  };

  const minimumRank = getMinimumRank(commissionEarnings);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmitRequest = () => {
    // Validation
    if (!formData.description.trim()) {
      alert('Please provide a description');
      return;
    }

    if (!formData.deadline) {
      alert('Please select a deadline');
      return;
    }
    if (!formData.commission || isNaN(Number(formData.commission))) {
      alert('Please enter a valid commission percentage');
      return;
    }
    if (!formData.location.trim()) {
      alert('Please enter your location');
      return;
    }
    if (!selectedProduct) {
      alert('Please select a product');
      return;
    }
    if (formData.requirements.length === 0) {
      alert('Please add at least one requirement');
      return;
    }

    const requestData = {
      ...formData,
      product: selectedProduct,
      productPrice,
      commission: formData.commission + '%'
    };

    requestMutation.mutate(requestData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800 p-6">
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Request Enabler Support</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Get professional help to boost your sales and grow your business</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{requests.length}</span>
              <span className="text-sm text-gray-600 dark:text-gray-400 ml-1">Active Requests</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Request Form */}
        <div className="lg:col-span-2 space-y-6">
          {/* Request Type */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                Request Type
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Choose the type of support you need</p>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                {requestTypes.map((type) => (
                  <div key={type.value} className="group">
                    <label className="flex items-start space-x-4 cursor-pointer p-4 rounded-lg border-2 border-transparent hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-all duration-200">
                      <input
                        type="radio"
                        name="requestType"
                        value={type.value}
                        checked={formData.requestType === type.value}
                        onChange={(e) => handleInputChange('requestType', e.target.value)}
                        className="w-5 h-5 text-blue-600 mt-0.5 focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900 dark:text-white">{type.label}</h4>
                          <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs rounded-full font-medium">Recommended</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{type.description}</p>
                      </div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                Basic Information
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Provide details about your request</p>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  What do you need help with? *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Describe your specific needs, goals, and what you'd like the enabler to help you achieve..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors resize-none"
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Deadline *
                  </label>
                  <input
                    type="date"
                    value={formData.deadline}
                    onChange={(e) => handleInputChange('deadline', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Commission Rate *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.commission}
                      onChange={(e) => handleInputChange('commission', e.target.value)}
                      placeholder="5"
                      min="1"
                      max="50"
                      className="w-full px-4 py-3 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                    />
                    <span className="absolute right-3 top-3 text-gray-500 dark:text-gray-400 text-sm">%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    Priority Level
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleInputChange('priority', e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                  >
                    {priorities.map((priority) => (
                      <option key={priority.value} value={priority.value}>
                        {priority.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                  Your Location *
                </label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => handleInputChange('location', e.target.value)}
                  placeholder="e.g., Dar es Salaam, Kinondoni District"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Products Selection */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select Products *</h3>

            {sellerProducts?.data?.data?.products ? (
              <div className="space-y-4">
                {/* Products Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 dark:bg-gray-700">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Select
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Category</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stock</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Rating</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                      {sellerProducts.data.data.products
                        .filter((product: any) => product.status === 'active')
                        .slice((currentPage - 1) * productsPerPage, currentPage * productsPerPage)
                        .map((product: any) => (
                          <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-4 whitespace-nowrap">
                              <input
                                type="radio"
                                name="selectedProduct"
                                checked={selectedProduct === product.name}
                                onChange={() => setSelectedProduct(product.name)}
                                className="rounded border-gray-300"
                              />
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                              <div className="text-sm text-gray-500 dark:text-gray-400">{product.sku}</div>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                                {product.category}
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                              TZS {product.price.toLocaleString()}
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                product.stock > 10
                                  ? 'bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                  : product.stock > 0
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300'
                                  : 'bg-red-100 dark:bg-red-900/20 text-red-800 dark:text-red-300'
                              }`}>
                                {product.stock} in stock
                              </span>
                            </td>
                            <td className="px-4 py-4 whitespace-nowrap">
                              <div className="flex items-center">
                                <span className="text-sm text-gray-900 dark:text-white mr-1">{product.rating}</span>
                                <span className="text-yellow-400">★</span>
                                <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">({product.reviews})</span>
                              </div>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {Math.ceil(sellerProducts.data.data.products.filter((p: any) => p.status === 'active').length / productsPerPage) > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex-1 flex justify-between sm:hidden">
                      <button
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(Math.min(Math.ceil(sellerProducts.data.data.products.filter((p: any) => p.status === 'active').length / productsPerPage), currentPage + 1))}
                        disabled={currentPage === Math.ceil(sellerProducts.data.data.products.filter((p: any) => p.status === 'active').length / productsPerPage)}
                        className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                      >
                        Next
                      </button>
                    </div>
                    <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                      <div>
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          Showing{' '}
                          <span className="font-medium">
                            {Math.min((currentPage - 1) * productsPerPage + 1, sellerProducts.data.data.products.filter((p: any) => p.status === 'active').length)}
                          </span>
                          {' '}to{' '}
                          <span className="font-medium">
                            {Math.min(currentPage * productsPerPage, sellerProducts.data.data.products.filter((p: any) => p.status === 'active').length)}
                          </span>
                          {' '}of{' '}
                          <span className="font-medium">
                            {sellerProducts.data.data.products.filter((p: any) => p.status === 'active').length}
                          </span>
                          {' '}results
                        </p>
                      </div>
                      <div>
                        <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                          <button
                            onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            ‹
                          </button>
                          <button
                            onClick={() => setCurrentPage(Math.min(Math.ceil(sellerProducts.data.data.products.filter((p: any) => p.status === 'active').length / productsPerPage), currentPage + 1))}
                            disabled={currentPage === Math.ceil(sellerProducts.data.data.products.filter((p: any) => p.status === 'active').length / productsPerPage)}
                            className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white dark:bg-gray-800 text-sm font-medium text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                          >
                            ›
                          </button>
                        </nav>
                      </div>
                    </div>
                  </div>
                )}

                {/* Selected Product Summary */}
                {selectedProduct && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-300 mb-2">
                      Selected Product
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                        {selectedProduct}
                        <button
                          onClick={() => setSelectedProduct('')}
                          className="ml-2 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
                        >
                          ×
                        </button>
                      </span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        TZS {productPrice.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">Loading products...</p>
            )}
          </div>

          {/* Requirements Selection */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Enabler Requirements *</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Select the skills and experience required for this assignment
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {presetRequirements.map((requirement) => (
                <div key={requirement} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id={requirement}
                    checked={formData.requirements.includes(requirement)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setFormData(prev => ({
                          ...prev,
                          requirements: [...prev.requirements, requirement]
                        }));
                      } else {
                        setFormData(prev => ({
                          ...prev,
                          requirements: prev.requirements.filter(r => r !== requirement)
                        }));
                      }
                    }}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300"
                  />
                  <label htmlFor={requirement} className="text-sm text-gray-900 dark:text-white cursor-pointer">
                    {requirement}
                  </label>
                </div>
              ))}
            </div>

            {/* Selected Requirements Summary */}
            {formData.requirements.length > 0 && (
              <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <p className="text-sm font-medium text-green-900 dark:text-green-300 mb-2">
                  Selected Requirements ({formData.requirements.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {formData.requirements.map((requirement, index) => (
                    <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                      {requirement}
                      <button
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            requirements: prev.requirements.filter(r => r !== requirement)
                          }));
                        }}
                        className="ml-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6 order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
          {/* Earnings Preview */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Commission Breakdown</h3>

            {productPrice > 0 && formData.commission ? (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Selected Product</p>
                  <p className="text-xl font-bold text-blue-900 dark:text-blue-300">
                    {selectedProduct}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1">
                    TZS {productPrice.toLocaleString()}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Enabler Commission</p>
                      <p className="text-xs text-orange-700 dark:text-orange-400">
                        {formData.commission}% of product price
                      </p>
                    </div>
                    <p className="font-bold text-orange-900 dark:text-orange-300">
                      TZS {commissionEarnings.toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-200 dark:border-gray-600">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <p>• Minimum Enabler Rank: <span className="font-medium capitalize">{minimumRank}</span></p>
                    <p>• Commission per sale varies by product price</p>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Select a product and set commission to see breakdown
              </p>
            )}
          </div>

          {/* Request Summary */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request Summary</h3>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Type:</span>
                <span className="font-medium text-gray-900 dark:text-white">
                  {requestTypes.find(t => t.value === formData.requestType)?.label}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Priority:</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium bg-${priorities.find(p => p.value === formData.priority)?.color}-100 text-${priorities.find(p => p.value === formData.priority)?.color}-800 dark:bg-${priorities.find(p => p.value === formData.priority)?.color}-900/20 dark:text-${priorities.find(p => p.value === formData.priority)?.color}-300`}>
                  {priorities.find(p => p.value === formData.priority)?.label}
                </span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Product:</span>
                <span className="font-medium text-gray-900 dark:text-white">{selectedProduct || 'None selected'}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Requirements:</span>
                <span className="font-medium text-gray-900 dark:text-white">{formData.requirements.length}</span>
              </div>

              {formData.deadline && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Deadline:</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {new Date(formData.deadline).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <button
              onClick={handleSubmitRequest}
              disabled={requestMutation.isPending}
              className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {requestMutation.isPending ? 'Submitting...' : 'Submit Enabler Request'}
            </button>
          </div>

          {/* Recent Requests */}
          {requests.length > 0 && (
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Your Recent Requests</h3>
              <div className="space-y-3">
                {requests.slice(0, 3).map((request: any) => (
                  <div key={request.id} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{request.requestType.replace('_', ' ')}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {request.status} • TZS {request.estimatedEarnings.toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
