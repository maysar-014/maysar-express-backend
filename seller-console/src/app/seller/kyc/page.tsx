'use client';

import { useState } from 'react';

export default function SellerKYCPage() {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    personalInfo: {
      fullName: '',
      nationalId: '',
      dateOfBirth: '',
      phoneNumber: '',
      email: '',
      address: '',
      city: '',
      region: ''
    },
    businessInfo: {
      businessName: '',
      businessType: '',
      businessRegistration: '',
      tinNumber: '',
      businessAddress: '',
      businessPhone: '',
      businessEmail: '',
      website: '',
      yearEstablished: '',
      numberOfEmployees: ''
    },
    documents: {
      nationalIdFront: null,
      nationalIdBack: null,
      businessLicense: null,
      tinCertificate: null,
      bankStatement: null,
      businessPermit: null
    },
    bankDetails: {
      bankName: '',
      accountNumber: '',
      accountName: '',
      branchCode: '',
      swiftCode: ''
    }
  });

  const handleInputChange = (section: string, field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev[section as keyof typeof prev],
        [field]: value
      }
    }));
  };

  const handleFileUpload = (field: string, file: File | null) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file
      }
    }));
  };

  const handleSubmit = () => {
    console.log('Submitting Seller KYC:', formData);
    alert('KYC submission successful! Your business will be reviewed within 2-3 business days.');
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Owner Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
          <input
            type="text"
            value={formData.personalInfo.fullName}
            onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">National ID</label>
          <input
            type="text"
            value={formData.personalInfo.nationalId}
            onChange={(e) => handleInputChange('personalInfo', 'nationalId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter national ID number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Date of Birth</label>
          <input
            type="date"
            value={formData.personalInfo.dateOfBirth}
            onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.personalInfo.phoneNumber}
            onChange={(e) => handleInputChange('personalInfo', 'phoneNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+255 712 345 678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
          <input
            type="email"
            value={formData.personalInfo.email}
            onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="your.email@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Region</label>
          <select
            value={formData.personalInfo.region}
            onChange={(e) => handleInputChange('personalInfo', 'region', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Region</option>
            <option value="Dar es Salaam">Dar es Salaam</option>
            <option value="Arusha">Arusha</option>
            <option value="Mwanza">Mwanza</option>
            <option value="Dodoma">Dodoma</option>
            <option value="Mbeya">Mbeya</option>
          </select>
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Personal Address</label>
          <textarea
            value={formData.personalInfo.address}
            onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your personal address"
          />
        </div>
      </div>
    </div>
  );

  const renderBusinessInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Name</label>
          <input
            type="text"
            value={formData.businessInfo.businessName}
            onChange={(e) => handleInputChange('businessInfo', 'businessName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Your business name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Type</label>
          <select
            value={formData.businessInfo.businessType}
            onChange={(e) => handleInputChange('businessInfo', 'businessType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Business Type</option>
            <option value="Electronics">Electronics</option>
            <option value="Fashion & Clothing">Fashion & Clothing</option>
            <option value="Home & Garden">Home & Garden</option>
            <option value="Health & Beauty">Health & Beauty</option>
            <option value="Sports & Outdoors">Sports & Outdoors</option>
            <option value="Books & Media">Books & Media</option>
            <option value="Food & Beverages">Food & Beverages</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Registration Number</label>
          <input
            type="text"
            value={formData.businessInfo.businessRegistration}
            onChange={(e) => handleInputChange('businessInfo', 'businessRegistration', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="BRELA registration number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TIN Number</label>
          <input
            type="text"
            value={formData.businessInfo.tinNumber}
            onChange={(e) => handleInputChange('businessInfo', 'tinNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Tax Identification Number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Phone</label>
          <input
            type="tel"
            value={formData.businessInfo.businessPhone}
            onChange={(e) => handleInputChange('businessInfo', 'businessPhone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+255 712 345 678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Email</label>
          <input
            type="email"
            value={formData.businessInfo.businessEmail}
            onChange={(e) => handleInputChange('businessInfo', 'businessEmail', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="business@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website (Optional)</label>
          <input
            type="url"
            value={formData.businessInfo.website}
            onChange={(e) => handleInputChange('businessInfo', 'website', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="https://www.yourbusiness.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Year Established</label>
          <input
            type="number"
            value={formData.businessInfo.yearEstablished}
            onChange={(e) => handleInputChange('businessInfo', 'yearEstablished', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="2020"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Address</label>
          <textarea
            value={formData.businessInfo.businessAddress}
            onChange={(e) => handleInputChange('businessInfo', 'businessAddress', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter business address"
          />
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Required Documents</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'nationalIdFront', label: 'National ID (Front)', required: true },
          { key: 'nationalIdBack', label: 'National ID (Back)', required: true },
          { key: 'businessLicense', label: 'Business License (BRELA)', required: true },
          { key: 'tinCertificate', label: 'TIN Certificate', required: true },
          { key: 'businessPermit', label: 'Business Permit', required: false },
          { key: 'bankStatement', label: 'Bank Statement (3 months)', required: true }
        ].map((doc) => (
          <div key={doc.key}>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {doc.label} {doc.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileUpload(doc.key, e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 10MB)</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBankDetails = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Business Bank Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bank Name</label>
          <select
            value={formData.bankDetails.bankName}
            onChange={(e) => handleInputChange('bankDetails', 'bankName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Bank</option>
            <option value="NMB Bank">NMB Bank</option>
            <option value="CRDB Bank">CRDB Bank</option>
            <option value="NBC Bank">NBC Bank</option>
            <option value="Stanbic Bank">Stanbic Bank</option>
            <option value="Azania Bank">Azania Bank</option>
            <option value="Exim Bank">Exim Bank</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number</label>
          <input
            type="text"
            value={formData.bankDetails.accountNumber}
            onChange={(e) => handleInputChange('bankDetails', 'accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Business account number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Name</label>
          <input
            type="text"
            value={formData.bankDetails.accountName}
            onChange={(e) => handleInputChange('bankDetails', 'accountName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Business account name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Branch Code (Optional)</label>
          <input
            type="text"
            value={formData.bankDetails.branchCode}
            onChange={(e) => handleInputChange('bankDetails', 'branchCode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Branch code"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Business KYC Verification</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">Step {currentStep} of 4</div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        ></div>
      </div>

      {/* Step Navigation */}
      <div className="flex justify-between text-sm">
        {['Owner Info', 'Business Info', 'Documents', 'Bank Details'].map((step, index) => (
          <div key={step} className={`${currentStep > index + 1 ? 'text-green-600' : currentStep === index + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            {step}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {currentStep === 1 && renderPersonalInfo()}
        {currentStep === 2 && renderBusinessInfo()}
        {currentStep === 3 && renderDocuments()}
        {currentStep === 4 && renderBankDetails()}
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400"
        >
          Previous
        </button>
        {currentStep < 4 ? (
          <button
            onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Submit Business KYC
          </button>
        )}
      </div>
    </div>
  );
}