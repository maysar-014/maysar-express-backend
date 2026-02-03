'use client';

import { useState } from 'react';

interface Product {
  id: string;
  name: string;
  sku: string;
  category: string;
  description: string;
  unitPrice: number;
  minOrderQty: number;
  maxOrderQty: number;
  leadTime: number;
  status: 'active' | 'inactive' | 'discontinued';
  images: string[];
  specifications: { [key: string]: string };
  lastUpdated: string;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'Coca Cola 500ml',
    sku: 'CC-500-001',
    category: 'Beverages',
    description: 'Refreshing cola drink in 500ml bottle',
    unitPrice: 1200,
    minOrderQty: 24,
    maxOrderQty: 1000,
    leadTime: 2,
    status: 'active',
    images: ['/placeholder-product.jpg'],
    specifications: {
      'Volume': '500ml',
      'Package Type': 'Plastic Bottle',
      'Shelf Life': '12 months',
      'Storage': 'Room Temperature'
    },
    lastUpdated: '2024-01-15'
  },
  {
    id: '2',
    name: 'Azam Cooking Oil 1L',
    sku: 'AZ-OIL-1L',
    category: 'Cooking Essentials',
    description: 'Premium sunflower cooking oil',
    unitPrice: 3500,
    minOrderQty: 12,
    maxOrderQty: 500,
    leadTime: 3,
    status: 'active',
    images: ['/placeholder-product.jpg'],
    specifications: {
      'Volume': '1 Liter',
      'Type': 'Sunflower Oil',
      'Package': 'Plastic Bottle',
      'Shelf Life': '18 months'
    },
    lastUpdated: '2024-01-14'
  },
  {
    id: '3',
    name: 'Pembe Flour 2kg',
    sku: 'PF-2KG-001',
    category: 'Flour & Grains',
    description: 'High quality wheat flour for baking',
    unitPrice: 2800,
    minOrderQty: 10,
    maxOrderQty: 200,
    leadTime: 1,
    status: 'active',
    images: ['/placeholder-product.jpg'],
    specifications: {
      'Weight': '2kg',
      'Type': 'Wheat Flour',
      'Grade': 'Premium',
      'Package': 'Paper Bag'
    },
    lastUpdated: '2024-01-13'
  }
];

export default function CatalogPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isAddingProduct, setIsAddingProduct] = useState(false);

  const categories = ['all', ...Array.from(new Set(mockProducts.map(product => product.category)))];
  
  const filteredProducts = mockProducts.filter(product => {
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || product.status === selectedStatus;
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesStatus && matchesSearch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'discontinued': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Catalog Management</h1>
        <button 
          onClick={() => setIsAddingProduct(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Add New Product
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Products</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{mockProducts.length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Products</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">{mockProducts.filter(p => p.status === 'active').length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Categories</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">{categories.length - 1}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg. Price</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">TZS {Math.round(mockProducts.reduce((sum, p) => sum + p.unitPrice, 0) / mockProducts.length).toLocaleString()}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex flex-wrap gap-4">
          <div className="flex-1 min-w-64">
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="discontinued">Discontinued</option>
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProducts.map((product) => (
          <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="aspect-w-16 aspect-h-9 bg-gray-200 dark:bg-gray-700">
              <div className="flex items-center justify-center h-48 bg-gray-100 dark:bg-gray-700">
                <span className="text-gray-400">Product Image</span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(product.status)}`}>
                  {product.status.charAt(0).toUpperCase() + product.status.slice(1)}
                </span>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{product.sku}</p>
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 line-clamp-2">{product.description}</p>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Price:</span>
                  <span className="font-semibold text-gray-900 dark:text-white">TZS {product.unitPrice.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Min Order:</span>
                  <span className="text-gray-900 dark:text-white">{product.minOrderQty} units</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Lead Time:</span>
                  <span className="text-gray-900 dark:text-white">{product.leadTime} days</span>
                </div>
              </div>
              <div className="flex space-x-2 mt-4">
                <button
                  onClick={() => setSelectedProduct(product)}
                  className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                >
                  Edit
                </button>
                <button className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">
                  Duplicate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add/Edit Product Modal */}
      {(selectedProduct || isAddingProduct) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {selectedProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                onClick={() => {
                  setSelectedProduct(null);
                  setIsAddingProduct(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Name</label>
                  <input
                    type="text"
                    defaultValue={selectedProduct?.name || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SKU</label>
                  <input
                    type="text"
                    defaultValue={selectedProduct?.sku || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Category</label>
                  <select
                    defaultValue={selectedProduct?.category || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Select Category</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Cooking Essentials">Cooking Essentials</option>
                    <option value="Flour & Grains">Flour & Grains</option>
                    <option value="Dairy Products">Dairy Products</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Unit Price (TZS)</label>
                  <input
                    type="number"
                    defaultValue={selectedProduct?.unitPrice || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Min Order Qty</label>
                    <input
                      type="number"
                      defaultValue={selectedProduct?.minOrderQty || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Max Order Qty</label>
                    <input
                      type="number"
                      defaultValue={selectedProduct?.maxOrderQty || ''}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
                  <textarea
                    rows={4}
                    defaultValue={selectedProduct?.description || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lead Time (days)</label>
                  <input
                    type="number"
                    defaultValue={selectedProduct?.leadTime || ''}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
                  <select
                    defaultValue={selectedProduct?.status || 'active'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="discontinued">Discontinued</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Images</label>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
            <div className="flex space-x-4 mt-6">
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                {selectedProduct ? 'Update Product' : 'Add Product'}
              </button>
              <button 
                onClick={() => {
                  setSelectedProduct(null);
                  setIsAddingProduct(false);
                }}
                className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}