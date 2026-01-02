'use client';

import { useState } from 'react';

interface QualityMetric {
  id: string;
  category: string;
  metric: string;
  currentValue: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  lastUpdated: string;
}

interface PerformanceKPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  status: 'excellent' | 'good' | 'warning' | 'critical';
  description: string;
}

const mockQualityMetrics: QualityMetric[] = [
  {
    id: '1',
    category: 'Product Quality',
    metric: 'Defect Rate',
    currentValue: 0.8,
    target: 1.0,
    unit: '%',
    trend: 'down',
    lastUpdated: '2024-01-15'
  },
  {
    id: '2',
    category: 'Delivery Performance',
    metric: 'On-Time Delivery',
    currentValue: 96.5,
    target: 95.0,
    unit: '%',
    trend: 'up',
    lastUpdated: '2024-01-15'
  },
  {
    id: '3',
    category: 'Customer Satisfaction',
    metric: 'Customer Rating',
    currentValue: 4.7,
    target: 4.5,
    unit: '/5',
    trend: 'stable',
    lastUpdated: '2024-01-14'
  },
  {
    id: '4',
    category: 'Order Accuracy',
    metric: 'Order Fulfillment Accuracy',
    currentValue: 98.2,
    target: 98.0,
    unit: '%',
    trend: 'up',
    lastUpdated: '2024-01-15'
  }
];

const mockPerformanceKPIs: PerformanceKPI[] = [
  {
    id: '1',
    name: 'Supplier Reliability Score',
    value: 94.5,
    target: 90.0,
    unit: '%',
    status: 'excellent',
    description: 'Overall reliability based on delivery, quality, and service'
  },
  {
    id: '2',
    name: 'Lead Time Performance',
    value: 2.1,
    target: 2.5,
    unit: 'days',
    status: 'excellent',
    description: 'Average time from order to delivery'
  },
  {
    id: '3',
    name: 'Inventory Turnover',
    value: 8.2,
    target: 8.0,
    unit: 'times/year',
    status: 'good',
    description: 'How efficiently inventory is managed'
  },
  {
    id: '4',
    name: 'Return Rate',
    value: 2.1,
    target: 2.0,
    unit: '%',
    status: 'warning',
    description: 'Percentage of products returned by customers'
  }
];

export default function QualityPage() {
  const [activeTab, setActiveTab] = useState<'metrics' | 'performance' | 'reports' | 'improvement'>('metrics');
  const [selectedPeriod, setSelectedPeriod] = useState('30days');

  const getTrendColor = (trend: string) => {
    switch (trend) {
      case 'up': return 'text-green-600';
      case 'down': return 'text-red-600';
      case 'stable': return 'text-gray-600';
      default: return 'text-gray-600';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return '↗';
      case 'down': return '↘';
      case 'stable': return '→';
      default: return '→';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'excellent': return 'bg-green-100 text-green-800';
      case 'good': return 'bg-blue-100 text-blue-800';
      case 'warning': return 'bg-yellow-100 text-yellow-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getMetricStatus = (current: number, target: number, isHigherBetter: boolean = true) => {
    const ratio = current / target;
    if (isHigherBetter) {
      if (ratio >= 1.05) return 'excellent';
      if (ratio >= 1.0) return 'good';
      if (ratio >= 0.95) return 'warning';
      return 'critical';
    } else {
      if (ratio <= 0.8) return 'excellent';
      if (ratio <= 0.9) return 'good';
      if (ratio <= 1.0) return 'warning';
      return 'critical';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Quality & Performance</h1>
        <div className="flex space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Generate Report
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Overall Quality Score</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">94.5%</p>
          <p className="text-sm text-green-600 mt-1">+2.1% from last period</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Satisfaction</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">4.7/5.0</p>
          <p className="text-sm text-gray-500 mt-1">Based on 156 reviews</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">On-Time Delivery</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">96.5%</p>
          <p className="text-sm text-green-600 mt-1">+1.5% improvement</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Quality Issues</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">3</p>
          <p className="text-sm text-red-600 mt-1">+1 from last period</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'metrics', label: 'Quality Metrics' },
            { key: 'performance', label: 'Performance KPIs' },
            { key: 'reports', label: 'Quality Reports' },
            { key: 'improvement', label: 'Improvement Plans' }
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

      {/* Quality Metrics Tab */}
      {activeTab === 'metrics' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {mockQualityMetrics.map((metric) => {
            const isHigherBetter = !metric.metric.toLowerCase().includes('defect') && !metric.metric.toLowerCase().includes('return');
            const status = getMetricStatus(metric.currentValue, metric.target, isHigherBetter);
            
            return (
              <div key={metric.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{metric.metric}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{metric.category}</p>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(status)}`}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current Value:</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900 dark:text-white">
                        {metric.currentValue}{metric.unit}
                      </span>
                      <span className={`text-sm ${getTrendColor(metric.trend)}`}>
                        {getTrendIcon(metric.trend)}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Target:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{metric.target}{metric.unit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        status === 'excellent' ? 'bg-green-600' :
                        status === 'good' ? 'bg-blue-600' :
                        status === 'warning' ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ 
                        width: `${Math.min((metric.currentValue / metric.target) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last updated: {metric.lastUpdated}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Performance KPIs Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mockPerformanceKPIs.map((kpi) => (
              <div key={kpi.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{kpi.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(kpi.status)}`}>
                    {kpi.status.charAt(0).toUpperCase() + kpi.status.slice(1)}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Current:</span>
                    <span className="text-2xl font-bold text-gray-900 dark:text-white">
                      {kpi.value}{kpi.unit}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Target:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{kpi.target}{kpi.unit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        kpi.status === 'excellent' ? 'bg-green-600' :
                        kpi.status === 'good' ? 'bg-blue-600' :
                        kpi.status === 'warning' ? 'bg-yellow-600' : 'bg-red-600'
                      }`}
                      style={{ 
                        width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` 
                      }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{kpi.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quality Reports Tab */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quality Trend Analysis</h3>
            <div className="space-y-4">
              {[
                { month: 'October 2023', score: 92.1, issues: 5 },
                { month: 'November 2023', score: 93.5, issues: 4 },
                { month: 'December 2023', score: 94.2, issues: 3 },
                { month: 'January 2024', score: 94.5, issues: 3 }
              ].map((data, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{data.month}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Quality Score: {data.score}%</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{data.issues} issues</p>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${data.score}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top Quality Issues</h3>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-900 dark:text-white">Packaging Damage</span>
                  <span className="text-sm text-red-600">2 cases</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-900 dark:text-white">Late Delivery</span>
                  <span className="text-sm text-yellow-600">1 case</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-900 dark:text-white">Wrong Quantity</span>
                  <span className="text-sm text-orange-600">0 cases</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Feedback</h3>
              <div className="space-y-3">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">"Excellent product quality and fast delivery"</p>
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">- Shoppers Plaza</p>
                </div>
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-800 dark:text-blue-200">"Consistent quality, reliable supplier"</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">- Quality Mart</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Improvement Plans Tab */}
      {activeTab === 'improvement' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Improvement Plans</h3>
              <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Create New Plan
              </button>
            </div>
            <div className="space-y-4">
              {[
                {
                  title: 'Reduce Packaging Damage',
                  description: 'Implement better packaging materials and handling procedures',
                  status: 'in-progress',
                  progress: 65,
                  dueDate: '2024-02-15'
                },
                {
                  title: 'Improve Delivery Time Accuracy',
                  description: 'Optimize logistics routes and partner with reliable carriers',
                  status: 'planning',
                  progress: 25,
                  dueDate: '2024-03-01'
                },
                {
                  title: 'Enhance Customer Communication',
                  description: 'Implement automated status updates and proactive notifications',
                  status: 'completed',
                  progress: 100,
                  dueDate: '2024-01-10'
                }
              ].map((plan, index) => (
                <div key={index} className="p-4 border border-gray-200 dark:border-gray-600 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white">{plan.title}</h4>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      plan.status === 'completed' ? 'bg-green-100 text-green-800' :
                      plan.status === 'in-progress' ? 'bg-blue-100 text-blue-800' :
                      'bg-yellow-100 text-yellow-800'
                    }`}>
                      {plan.status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{plan.description}</p>
                  <div className="flex justify-between items-center">
                    <div className="flex-1 mr-4">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            plan.status === 'completed' ? 'bg-green-600' :
                            plan.status === 'in-progress' ? 'bg-blue-600' : 'bg-yellow-600'
                          }`}
                          style={{ width: `${plan.progress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{plan.progress}% complete</span>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400">Due: {plan.dueDate}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}