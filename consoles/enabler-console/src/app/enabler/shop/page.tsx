'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '../../../lib/api';

export default function EnablerShop() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [promotionModal, setPromotionModal] = useState<{isOpen: boolean, product: any}>({isOpen: false, product: null});
  const [copiedText, setCopiedText] = useState('');

  const handlePromoteProduct = (product: any) => {
    setPromotionModal({isOpen: true, product});
  };

  const generatePromotionalContent = (product: any) => {
    const referralCode = 'ENB001'; // Mock enabler code
    const trackingUrl = `https://maysar.com/product/${product.id}?ref=${referralCode}`;
    
    return {
      whatsapp: `${product.name}\n\nPrice: TZS ${product.price.toLocaleString()}\nSeller: ${product.sellerName}\n\nOrder now: ${trackingUrl}\n\n#MaysarDeals #${product.category}`,
      
      social: `Available now: ${product.name} for TZS ${product.price.toLocaleString()}\n\nTrusted seller: ${product.sellerName}\nCompetitive pricing guaranteed\nFast delivery available\n\nPurchase here: ${trackingUrl}\n\n#MaysarMarketplace #${product.category} #QualityProducts`,
      
      sms: `${product.name} available for TZS ${product.price.toLocaleString()} from ${product.sellerName}. Order: ${trackingUrl}`,
      
      trackingUrl,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(trackingUrl)}`
    };
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(type);
      setTimeout(() => setCopiedText(''), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  const shareViaWhatsApp = (text: string) => {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const shareViaSMS = (text: string) => {
    const url = `sms:?body=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const downloadQRCode = async (qrCodeUrl: string, productName: string) => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${productName.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_qr.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download QR code:', error);
    }
  };

  const { data: shopData, isLoading, error } = useQuery({
    queryKey: ['enabler-shop'],
    queryFn: () => {
      console.log('[SHOP] Calling getShop API');
      return enablerApi.getShop();
    },
    staleTime: 30 * 1000
  });

  const products = shopData?.data?.products || [];
  console.log('[SHOP] Raw products from API:', products);
  
  const stats = shopData?.data?.stats || {
    totalProducts: 0,
    activeProducts: 0,
    expiringSoon: 0,
    totalViews: 0
  };
  console.log('[SHOP] Stats from API:', stats);

  const getDaysRemaining = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const today = new Date();
    const diffTime = expiry.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getExpiryStatus = (daysRemaining: number) => {
    if (daysRemaining <= 0) return { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', text: 'Expired' };
    if (daysRemaining <= 7) return { color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300', text: `${daysRemaining} days left` };
    if (daysRemaining <= 30) return { color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300', text: `${daysRemaining} days left` };
    return { color: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300', text: `${daysRemaining} days left` };
  };

  const filteredProducts = (selectedCategory === 'all' 
    ? products 
    : products.filter((product: any) => product.category === selectedCategory))
    .filter((product: any) => getDaysRemaining(product.expiryDate) > 0);
    
  console.log('[SHOP] Filtered products:', filteredProducts);
  console.log('[SHOP] Selected category:', selectedCategory);

  const categories = ['all', ...new Set(products.map((p: any) => p.category))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">My Shop</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Manage your marketplace products and track their support expiry dates
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded text-blue-800 dark:text-blue-300 text-xs font-medium">
            {stats.activeProducts} Active
          </span>
          <span className="bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1 rounded text-yellow-800 dark:text-yellow-300 text-xs font-medium">
            {stats.expiringSoon} Expiring
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Products</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Active Products</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.activeProducts}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Expiring Soon</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.expiringSoon}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Views</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.totalViews}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Category Filter */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                selectedCategory === category
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              {category === 'all' ? 'All Categories' : category}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Your Products</h3>

        {filteredProducts.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-gray-500 dark:text-gray-400 text-sm">No products found in your shop.</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Products will appear here when you accept sales assignments.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredProducts.map((product: any) => {
              const daysRemaining = getDaysRemaining(product.expiryDate);
              const expiryStatus = getExpiryStatus(daysRemaining);

              return (
                <div key={product.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-3 hover:shadow-sm transition-shadow">
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{product.name}</h4>
                      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${expiryStatus.color}`}>
                        {daysRemaining}d
                      </span>
                    </div>

                    <div className="text-base font-bold text-gray-900 dark:text-white">
                      TZS {(product.price / 1000).toFixed(0)}K
                    </div>

                    <div className="text-xs font-medium text-green-600">
                      {product.commission}% • TZS {Math.round(product.price * (parseFloat(product.commission) / 100) / 1000)}K
                    </div>

                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {product.sellerName}
                    </div>

                    <button
                      onClick={() => handlePromoteProduct(product)}
                      className="w-full px-2 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Promote
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Promotion Modal */}
      {promotionModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-md max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Promote Product</h2>
                <button
                  onClick={() => setPromotionModal({isOpen: false, product: null})}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              {promotionModal.product && (() => {
                const content = generatePromotionalContent(promotionModal.product);
                return (
                  <div className="space-y-4">
                    {/* Product Info */}
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                      <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{promotionModal.product.name}</h3>
                      <p className="text-xs text-gray-600 dark:text-gray-400">TZS {promotionModal.product.price.toLocaleString()} • {promotionModal.product.commission}% commission</p>
                      <p className="text-xs text-green-600">Earn TZS {Math.round(promotionModal.product.price * (parseFloat(promotionModal.product.commission) / 100)).toLocaleString()} per sale</p>
                    </div>

                    {/* Quick Actions */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        onClick={() => shareViaWhatsApp(content.whatsapp)}
                        className="flex items-center justify-center space-x-2 bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700 transition-colors text-sm"
                      >
                        <span>Share on WhatsApp</span>
                      </button>
                      <button
                        onClick={() => shareViaSMS(content.sms)}
                        className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700 transition-colors text-sm"
                      >
                        <span>Send SMS</span>
                      </button>
                    </div>

                    {/* Promotional Content */}
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">WhatsApp Message</label>
                          <button
                            onClick={() => copyToClipboard(content.whatsapp, 'whatsapp')}
                            className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            {copiedText === 'whatsapp' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <textarea
                          value={content.whatsapp}
                          readOnly
                          className="w-full h-20 p-2 border rounded-md text-xs bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Social Media Post</label>
                          <button
                            onClick={() => copyToClipboard(content.social, 'social')}
                            className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            {copiedText === 'social' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <textarea
                          value={content.social}
                          readOnly
                          className="w-full h-20 p-2 border rounded-md text-xs bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">Tracking URL</label>
                          <button
                            onClick={() => copyToClipboard(content.trackingUrl, 'url')}
                            className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            {copiedText === 'url' ? 'Copied!' : 'Copy'}
                          </button>
                        </div>
                        <input
                          value={content.trackingUrl}
                          readOnly
                          className="w-full p-2 border rounded-md text-xs bg-gray-50 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                        />
                      </div>

                      {/* QR Code */}
                      <div className="text-center">
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-medium text-gray-700 dark:text-gray-300">QR Code for Offline Promotion</label>
                          <button
                            onClick={() => downloadQRCode(content.qrCode, promotionModal.product.name)}
                            className="text-xs bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                          >
                            Download
                          </button>
                        </div>
                        <img
                          src={content.qrCode}
                          alt="QR Code"
                          className="mx-auto border rounded-md"
                        />
                        <p className="text-xs text-gray-500 mt-1">Customers can scan this to visit your tracked link</p>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
