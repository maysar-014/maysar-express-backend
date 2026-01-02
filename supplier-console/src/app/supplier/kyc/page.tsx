'use client';

import { useState } from 'react';

export default function SupplierKYCPage() {
  const [supplierType, setSupplierType] = useState<'corporate' | 'courier' | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    companyInfo: {
      companyName: '',
      registrationNumber: '',
      tinNumber: '',
      vatNumber: '',
      incorporationDate: '',
      companyType: '',
      industry: '',
      companyPhone: '',
      companyEmail: '',
      website: '',
      numberOfEmployees: '',
      annualRevenue: ''
    },
    addressInfo: {
      headOfficeAddress: '',
      city: '',
      region: '',
      postalCode: '',
      country: 'Tanzania',
      warehouseAddress: '',
      warehouseCity: '',
      warehouseRegion: ''
    },
    contactInfo: {
      ceoName: '',
      ceoPhone: '',
      ceoEmail: '',
      contactPersonName: '',
      contactPersonTitle: '',
      contactPersonPhone: '',
      contactPersonEmail: ''
    },
    courierInfo: {
      fullName: '',
      nationalId: '',
      dateOfBirth: '',
      phoneNumber: '',
      email: '',
      address: '',
      region: '',
      vehicleType: '',
      vehicleRegistration: '',
      drivingLicense: '',
      emergencyContact: '',
      serviceAreas: '',
      workingHours: ''
    },
    documents: {
      certificateOfIncorporation: null,
      businessLicense: null,
      tinCertificate: null,
      vatCertificate: null,
      auditedFinancials: null,
      bankStatement: null,
      companyProfile: null,
      insuranceCertificate: null,
      nationalIdFront: null,
      nationalIdBack: null,
      drivingLicenseFront: null,
      vehicleRegistration: null,
      criminalRecord: null
    },
    bankDetails: {
      bankName: '',
      accountNumber: '',
      accountName: '',
      branchCode: '',
      swiftCode: '',
      iban: ''
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
    const message = supplierType === 'corporate' 
      ? 'Enterprise KYC submission successful! Our compliance team will review within 5-7 business days.'
      : 'Courier KYC submission successful! You will be contacted within 2-3 business days for verification.';
    alert(message);
  };

  const renderTypeSelection = () => (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Select Supplier Type</h2>
        <p className="text-gray-600 dark:text-gray-400 mb-8">Choose the type that best describes your business</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setSupplierType('corporate')}
          className="p-8 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Corporate Supplier</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Registered companies, manufacturers, wholesalers, and large-scale suppliers</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Business registration required</li>
            <li>• Tax certificates needed</li>
            <li>• Corporate banking</li>
            <li>• Bulk supply capabilities</li>
          </ul>
        </button>
        
        <button
          onClick={() => setSupplierType('courier')}
          className="p-8 border-2 border-gray-200 dark:border-gray-700 rounded-lg hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors text-left"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Courier & Small Vendor</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Individual couriers, small vendors, and delivery service providers</p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Personal identification</li>
            <li>• Vehicle documentation</li>
            <li>• Driving license required</li>
            <li>• Flexible service areas</li>
          </ul>
        </button>
      </div>
    </div>
  );

  const renderCourierPersonalInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Personal Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Full Name</label>
          <input
            type="text"
            value={formData.courierInfo.fullName}
            onChange={(e) => handleInputChange('courierInfo', 'fullName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">National ID</label>
          <input
            type="text"
            value={formData.courierInfo.nationalId}
            onChange={(e) => handleInputChange('courierInfo', 'nationalId', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter national ID number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Phone Number</label>
          <input
            type="tel"
            value={formData.courierInfo.phoneNumber}
            onChange={(e) => handleInputChange('courierInfo', 'phoneNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+255 712 345 678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email Address</label>
          <input
            type="email"
            value={formData.courierInfo.email}
            onChange={(e) => handleInputChange('courierInfo', 'email', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="your.email@example.com"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Region</label>
          <select
            value={formData.courierInfo.region}
            onChange={(e) => handleInputChange('courierInfo', 'region', e.target.value)}
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
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Emergency Contact</label>
          <input
            type="tel"
            value={formData.courierInfo.emergencyContact}
            onChange={(e) => handleInputChange('courierInfo', 'emergencyContact', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+255 712 345 678"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Address</label>
          <textarea
            value={formData.courierInfo.address}
            onChange={(e) => handleInputChange('courierInfo', 'address', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your address"
          />
        </div>
      </div>
    </div>
  );

  const renderCourierVehicleInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Vehicle & Service Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vehicle Type</label>
          <select
            value={formData.courierInfo.vehicleType}
            onChange={(e) => handleInputChange('courierInfo', 'vehicleType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Vehicle Type</option>
            <option value="Motorcycle">Motorcycle</option>
            <option value="Car">Car</option>
            <option value="Van">Van</option>
            <option value="Truck">Truck</option>
            <option value="Bicycle">Bicycle</option>
            <option value="On Foot">On Foot</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Vehicle Registration</label>
          <input
            type="text"
            value={formData.courierInfo.vehicleRegistration}
            onChange={(e) => handleInputChange('courierInfo', 'vehicleRegistration', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="T123ABC (if applicable)"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Service Areas</label>
          <input
            type="text"
            value={formData.courierInfo.serviceAreas}
            onChange={(e) => handleInputChange('courierInfo', 'serviceAreas', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Kinondoni, Ilala, Temeke"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Working Hours</label>
          <input
            type="text"
            value={formData.courierInfo.workingHours}
            onChange={(e) => handleInputChange('courierInfo', 'workingHours', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="08:00 - 18:00"
          />
        </div>
      </div>
    </div>
  );

  const renderCourierDocuments = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Required Documents</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'nationalIdFront', label: 'National ID (Front)', required: true },
          { key: 'nationalIdBack', label: 'National ID (Back)', required: true },
          { key: 'drivingLicenseFront', label: 'Driving License (Front)', required: false },
          { key: 'vehicleRegistration', label: 'Vehicle Registration', required: false },
          { key: 'criminalRecord', label: 'Criminal Record Check', required: true },
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

  const renderCompanyInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Company Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Name</label>
          <input
            type="text"
            value={formData.companyInfo.companyName}
            onChange={(e) => handleInputChange('companyInfo', 'companyName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter company name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Registration Number</label>
          <input
            type="text"
            value={formData.companyInfo.registrationNumber}
            onChange={(e) => handleInputChange('companyInfo', 'registrationNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="BRELA registration number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">TIN Number</label>
          <input
            type="text"
            value={formData.companyInfo.tinNumber}
            onChange={(e) => handleInputChange('companyInfo', 'tinNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Tax Identification Number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">VAT Number</label>
          <input
            type="text"
            value={formData.companyInfo.vatNumber}
            onChange={(e) => handleInputChange('companyInfo', 'vatNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="VAT registration number"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Incorporation Date</label>
          <input
            type="date"
            value={formData.companyInfo.incorporationDate}
            onChange={(e) => handleInputChange('companyInfo', 'incorporationDate', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Type</label>
          <select
            value={formData.companyInfo.companyType}
            onChange={(e) => handleInputChange('companyInfo', 'companyType', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Company Type</option>
            <option value="Private Limited Company">Private Limited Company</option>
            <option value="Public Limited Company">Public Limited Company</option>
            <option value="Partnership">Partnership</option>
            <option value="Sole Proprietorship">Sole Proprietorship</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Industry</label>
          <select
            value={formData.companyInfo.industry}
            onChange={(e) => handleInputChange('companyInfo', 'industry', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Industry</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Technology">Technology</option>
            <option value="Textiles">Textiles</option>
            <option value="Food & Beverages">Food & Beverages</option>
            <option value="Construction Materials">Construction Materials</option>
            <option value="Automotive">Automotive</option>
            <option value="Other">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Number of Employees</label>
          <select
            value={formData.companyInfo.numberOfEmployees}
            onChange={(e) => handleInputChange('companyInfo', 'numberOfEmployees', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Range</option>
            <option value="1-10">1-10</option>
            <option value="11-50">11-50</option>
            <option value="51-200">51-200</option>
            <option value="201-500">201-500</option>
            <option value="500+">500+</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Phone</label>
          <input
            type="tel"
            value={formData.companyInfo.companyPhone}
            onChange={(e) => handleInputChange('companyInfo', 'companyPhone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+255 22 123 4567"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Company Email</label>
          <input
            type="email"
            value={formData.companyInfo.companyEmail}
            onChange={(e) => handleInputChange('companyInfo', 'companyEmail', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="info@company.co.tz"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Website</label>
          <input
            type="url"
            value={formData.companyInfo.website}
            onChange={(e) => handleInputChange('companyInfo', 'website', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="https://www.company.co.tz"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Annual Revenue (TZS)</label>
          <select
            value={formData.companyInfo.annualRevenue}
            onChange={(e) => handleInputChange('companyInfo', 'annualRevenue', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="">Select Range</option>
            <option value="Under 100M">Under 100M</option>
            <option value="100M - 500M">100M - 500M</option>
            <option value="500M - 1B">500M - 1B</option>
            <option value="1B - 5B">1B - 5B</option>
            <option value="Over 5B">Over 5B</option>
          </select>
        </div>
      </div>
    </div>
  );

  const renderBankDetails = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        {supplierType === 'courier' ? 'Personal Banking Details' : 'Corporate Banking Details'}
      </h3>
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
            <option value="Standard Chartered">Standard Chartered</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Account Number</label>
          <input
            type="text"
            value={formData.bankDetails.accountNumber}
            onChange={(e) => handleInputChange('bankDetails', 'accountNumber', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Account number"
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
        {supplierType === 'corporate' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">SWIFT Code (Optional)</label>
            <input
              type="text"
              value={formData.bankDetails.swiftCode}
              onChange={(e) => handleInputChange('bankDetails', 'swiftCode', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="SWIFT code for international transfers"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderAddressInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Address Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Head Office Address</label>
          <textarea
            value={formData.addressInfo.headOfficeAddress}
            onChange={(e) => handleInputChange('addressInfo', 'headOfficeAddress', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter head office address"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
          <input
            type="text"
            value={formData.addressInfo.city}
            onChange={(e) => handleInputChange('addressInfo', 'city', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter city"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Region</label>
          <select
            value={formData.addressInfo.region}
            onChange={(e) => handleInputChange('addressInfo', 'region', e.target.value)}
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Warehouse/Factory Address</label>
          <textarea
            value={formData.addressInfo.warehouseAddress}
            onChange={(e) => handleInputChange('addressInfo', 'warehouseAddress', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter warehouse or factory address"
          />
        </div>
      </div>
    </div>
  );

  const renderContactInfo = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Key Contact Information</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4">CEO/Managing Director</h4>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CEO Full Name</label>
          <input
            type="text"
            value={formData.contactInfo.ceoName}
            onChange={(e) => handleInputChange('contactInfo', 'ceoName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="CEO full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CEO Phone</label>
          <input
            type="tel"
            value={formData.contactInfo.ceoPhone}
            onChange={(e) => handleInputChange('contactInfo', 'ceoPhone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+255 712 345 678"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">CEO Email</label>
          <input
            type="email"
            value={formData.contactInfo.ceoEmail}
            onChange={(e) => handleInputChange('contactInfo', 'ceoEmail', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="ceo@company.co.tz"
          />
        </div>
        <div className="md:col-span-2">
          <h4 className="text-md font-medium text-gray-800 dark:text-gray-200 mb-4 mt-6">Primary Contact Person</h4>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Person Name</label>
          <input
            type="text"
            value={formData.contactInfo.contactPersonName}
            onChange={(e) => handleInputChange('contactInfo', 'contactPersonName', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Contact person full name"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Title/Position</label>
          <input
            type="text"
            value={formData.contactInfo.contactPersonTitle}
            onChange={(e) => handleInputChange('contactInfo', 'contactPersonTitle', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Sales Manager, Operations Director, etc."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Phone</label>
          <input
            type="tel"
            value={formData.contactInfo.contactPersonPhone}
            onChange={(e) => handleInputChange('contactInfo', 'contactPersonPhone', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="+255 712 345 678"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Contact Email</label>
          <input
            type="email"
            value={formData.contactInfo.contactPersonEmail}
            onChange={(e) => handleInputChange('contactInfo', 'contactPersonEmail', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="contact@company.co.tz"
          />
        </div>
      </div>
    </div>
  );

  const renderCorporateDocuments = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Required Corporate Documents</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[
          { key: 'certificateOfIncorporation', label: 'Certificate of Incorporation', required: true },
          { key: 'businessLicense', label: 'Business License', required: true },
          { key: 'tinCertificate', label: 'TIN Certificate', required: true },
          { key: 'vatCertificate', label: 'VAT Certificate', required: false },
          { key: 'auditedFinancials', label: 'Audited Financial Statements (2 years)', required: true },
          { key: 'bankStatement', label: 'Bank Statement (6 months)', required: true },
          { key: 'companyProfile', label: 'Company Profile/Brochure', required: false },
          { key: 'insuranceCertificate', label: 'Insurance Certificate', required: false }
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
            <p className="text-xs text-gray-500 mt-1">PDF, JPG, PNG (Max 20MB)</p>
          </div>
        ))}
      </div>
    </div>
  );

  if (!supplierType) {
    return (
      <div className="space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Supplier KYC Verification</h1>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          {renderTypeSelection()}
        </div>
      </div>
    );
  }

  const maxSteps = supplierType === 'courier' ? 4 : 5;
  const stepLabels = supplierType === 'courier' 
    ? ['Personal Info', 'Vehicle Info', 'Documents', 'Bank Details']
    : ['Company Info', 'Address Info', 'Contact Info', 'Documents', 'Bank Details'];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            {supplierType === 'courier' ? 'Courier' : 'Enterprise Supplier'} KYC
          </h1>
          <button
            onClick={() => { setSupplierType(null); setCurrentStep(1); }}
            className="text-sm text-blue-600 hover:text-blue-800 mt-1"
          >
            Change supplier type
          </button>
        </div>
        <div className="text-sm text-gray-600 dark:text-gray-400">Step {currentStep} of {maxSteps}</div>
      </div>

      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div 
          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / maxSteps) * 100}%` }}
        ></div>
      </div>

      <div className="flex justify-between text-sm">
        {stepLabels.map((step, index) => (
          <div key={step} className={`${currentStep > index + 1 ? 'text-green-600' : currentStep === index + 1 ? 'text-blue-600' : 'text-gray-400'}`}>
            {step}
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {supplierType === 'courier' ? (
          <>
            {currentStep === 1 && renderCourierPersonalInfo()}
            {currentStep === 2 && renderCourierVehicleInfo()}
            {currentStep === 3 && renderCourierDocuments()}
            {currentStep === 4 && renderBankDetails()}
          </>
        ) : (
          <>
            {currentStep === 1 && renderCompanyInfo()}
            {currentStep === 2 && renderAddressInfo()}
            {currentStep === 3 && renderContactInfo()}
            {currentStep === 4 && renderCorporateDocuments()}
            {currentStep === 5 && renderBankDetails()}
          </>
        )}
      </div>

      <div className="flex justify-between">
        <button
          onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
          disabled={currentStep === 1}
          className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:bg-gray-400"
        >
          Previous
        </button>
        {currentStep < maxSteps ? (
          <button
            onClick={() => setCurrentStep(Math.min(maxSteps, currentStep + 1))}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Next
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            Submit {supplierType === 'courier' ? 'Courier' : 'Enterprise'} KYC
          </button>
        )}
      </div>
    </div>
  );
}