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
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Full Name</label>
          <input
            type="text"
            value={formData.personalInfo.fullName}
            onChange={(e) => handleInputChange('personalInfo', 'fullName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">National ID</label>
          <input
            type="text"
            value={formData.personalInfo.nationalId}
            onChange={(e) => handleInputChange('personalInfo', 'nationalId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Enter national ID number"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Date of Birth</label>
          <input
            type="date"
            value={formData.personalInfo.dateOfBirth}
            onChange={(e) => handleInputChange('personalInfo', 'dateOfBirth', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Phone Number</label>
          <input
            type="tel"
            value={formData.personalInfo.phoneNumber}
            onChange={(e) => handleInputChange('personalInfo', 'phoneNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="+255 712 345 678"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Email Address</label>
          <input
            type="email"
            value={formData.personalInfo.email}
            onChange={(e) => handleInputChange('personalInfo', 'email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="your.email@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Region</label>
          <select
            value={formData.personalInfo.region}
            onChange={(e) => handleInputChange('personalInfo', 'region', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Address</label>
          <textarea
            value={formData.personalInfo.address}
            onChange={(e) => handleInputChange('personalInfo', 'address', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Enter your full address"
          />
        </div>
      </div>
    </div>
  );

  const renderBusinessInfo = () => (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Business Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Name</label>
          <input
            type="text"
            value={formData.businessInfo.businessName}
            onChange={(e) => handleInputChange('businessInfo', 'businessName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Your enabler business name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Type</label>
          <select
            value={formData.businessInfo.businessType}
            onChange={(e) => handleInputChange('businessInfo', 'businessType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            <option value="Logistics & Sales Support">Logistics & Sales Support</option>
            <option value="Sales Support Only">Sales Support Only</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Phone</label>
          <input
            type="tel"
            value={formData.businessInfo.businessPhone}
            onChange={(e) => handleInputChange('businessInfo', 'businessPhone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="+255 712 345 678"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Email</label>
          <input
            type="email"
            value={formData.businessInfo.businessEmail}
            onChange={(e) => handleInputChange('businessInfo', 'businessEmail', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="business@example.com"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Service Areas</label>
          <input
            type="text"
            value={formData.businessInfo.serviceAreas}
            onChange={(e) => handleInputChange('businessInfo', 'serviceAreas', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Kinondoni, Ilala, Temeke"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Operating Hours</label>
          <input
            type="text"
            value={formData.businessInfo.operatingHours}
            onChange={(e) => handleInputChange('businessInfo', 'operatingHours', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="08:00 - 18:00"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Business Address</label>
          <textarea
            value={formData.businessInfo.businessAddress}
            onChange={(e) => handleInputChange('businessInfo', 'businessAddress', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Enter business address"
          />
        </div>
      </div>
    </div>
  );

  const renderDocuments = () => (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Document Upload</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[
          { key: 'nationalIdFront', label: 'National ID (Front)', required: true },
          { key: 'nationalIdBack', label: 'National ID (Back)', required: true },
          { key: 'businessLicense', label: 'Business License', required: false },
          { key: 'taxCertificate', label: 'Tax Certificate', required: false },
          { key: 'bankStatement', label: 'Bank Statement (3 months)', required: true }
        ].map((doc) => (
          <div key={doc.key}>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">
              {doc.label} {doc.required && <span className="text-red-500">*</span>}
            </label>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => handleFileUpload(doc.key, e.target.files?.[0] || null)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 5MB)</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderBankDetails = () => (
    <div className="space-y-4">
      <h3 className="text-base font-semibold text-gray-900 dark:text-white">Bank Details</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Bank Name</label>
          <select
            value={formData.bankDetails.bankName}
            onChange={(e) => handleInputChange('bankDetails', 'bankName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
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
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Account Number</label>
          <input
            type="text"
            value={formData.bankDetails.accountNumber}
            onChange={(e) => handleInputChange('bankDetails', 'accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Enter account number"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Account Name</label>
          <input
            type="text"
            value={formData.bankDetails.accountName}
            onChange={(e) => handleInputChange('bankDetails', 'accountName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Account holder name"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2 uppercase tracking-wider">Branch Code (Optional)</label>
          <input
            type="text"
            value={formData.bankDetails.branchCode}
            onChange={(e) => handleInputChange('bankDetails', 'branchCode', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
            placeholder="Branch code"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">KYC Verification</h1>
        <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Step {currentStep} of 4</div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-md h-2">
        <div
          className="bg-blue-600 h-2 rounded-md transition-all duration-300"
          style={{ width: `${(currentStep / 4) * 100}%` }}
        ></div>
      </div>

      {/* Step Navigation */}
      <div className="flex justify-between text-xs uppercase tracking-wider">
        {['Personal Info', 'Business Info', 'Documents', 'Bank Details'].map((step, index) => (
          <div key={step} className={`${currentStep > index + 1 ? 'text-green-600' : currentStep === index + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            {step}
          </div>
        ))}
      </div>

      {/* Form Content */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
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
          className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 disabled:bg-gray-400 text-sm"
        >
          Previous
        </button>
        {currentStep < 4 ? (
          <button
            onClick={() => setCurrentStep(Math.min(4, currentStep + 1))}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
          >
            Submit KYC
          </button>
        )}
      </div>
    </div>
  );
}
