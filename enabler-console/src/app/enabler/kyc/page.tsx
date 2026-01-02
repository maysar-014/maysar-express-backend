'use client';

import { useState } from 'react';

export default function EnablerKYCPage() {
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
      businessType: 'Logistics & Sales Support',
      businessAddress: '',
      businessPhone: '',
      businessEmail: '',
      serviceAreas: '',
      operatingHours: ''
    },
    documents: {
      nationalIdFront: null,
      nationalIdBack: null,
      businessLicense: null,
      taxCertificate: null,
      bankStatement: null
    },
    bankDetails: {
      bankName: '',
      accountNumber: '',
      accountName: '',
      branchCode: ''
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
    console.log('Submitting KYC:', formData);
    alert('KYC submission successful! You will be notified once reviewed.');
  };

  const renderPersonalInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
          <textarea
            value={formData.personalInfo.address}
            onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your full address"
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
            placeholder="Your enabler business name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Business Type</label>
          <select
            value={formData.businessInfo.businessType}
            onChange={(e) => handleInputChange('businessInfo', 'businessType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="Logistics & Sales Support">Logistics & Sales Support</option>
            <option value="Sales Support Only">Sales Support Only</option>
          </select>
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Areas</label>
          <input
            type="text"
            value={formData.businessInfo.serviceAreas}
            onChange={(e) => handleInputChange('businessInfo', 'serviceAreas', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Kinondoni, Ilala, Temeke"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Operating Hours</label>
          <input
            type="text"
            value={formData.businessInfo.operatingHours}
            onChange={(e) => handleInputChange('businessInfo', 'operatingHours', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="08:00 - 18:00"
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
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Document Upload</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'nationalIdFront', label: 'National ID (Front)', required: true },
          { key: 'nationalIdBack', label: 'National ID (Back)', required: true },
          { key: 'businessLicense', label: 'Business License', required: false },
          { key: 'taxCertificate', label: 'Tax Certificate', required: false },
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
            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 5MB)</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBankDetails = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bank Details</h3>
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
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number</label>
          <input
            type="text"
            value={formData.bankDetails.accountNumber}
            onChange={(e) => handleInputChange('bankDetails', 'accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter account number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Name</label>
          <input
            type="text"
            value={formData.bankDetails.accountName}
            onChange={(e) => handleInputChange('bankDetails', 'accountName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Account holder name"
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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KYC Verification</h1>
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
        {['Personal Info', 'Business Info', 'Documents', 'Bank Details'].map((step, index) => (
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
            Submit KYC
          </button>
        )}
      </div>
    </div>
  );
}