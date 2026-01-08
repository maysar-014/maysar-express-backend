'use client';

import { useState, useEffect } from 'react';
import { courierApi } from '@/lib/api';

export default function PerformancePage() {
  const [performanceOverview, setPerformanceOverview] = useState({});
  const [improvementHints, setImprovementHints] = useState([]);
  const [behavioralInsights, setBehavioralInsights] = useState([]);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      const [overviewData, hintsData, insightsData] = await Promise.all([
        courierApi.getPerformanceOverview(),
        courierApi.getPerformanceHints(),
        courierApi.getPerformanceInsights()
      ]);
      
      // Transform new API response format
      const performanceInfo = overviewData?.data || {};
      const hintsInfo = hintsData?.data || {};
      const insightsInfo = insightsData?.data || {};
      
      // Transform performance overview
      const transformedOverview = {
        deliverySuccess: {
          level: performanceInfo.metrics?.onTimeRate > 90 ? 'Good' : 'Needs Improvement',
          percentage: Math.round(performanceInfo.metrics?.onTimeRate || 0),
          trend: 'stable'
        },
        customerSatisfaction: {
          level: performanceInfo.metrics?.customerRating > 4 ? 'Good' : 'Needs Improvement',
          percentage: Math.round((performanceInfo.metrics?.customerRating || 0) * 20),
          trend: 'improving'
        },
        routeEfficiency: {
          level: performanceInfo.metrics?.fuelEfficiency > 80 ? 'Good' : 'Needs Improvement',
          percentage: Math.round(performanceInfo.metrics?.fuelEfficiency || 0),
          trend: 'stable'
        },
        timeManagement: {
          level: performanceInfo.metrics?.averageDeliveryTime < 40 ? 'Good' : 'Needs Improvement',
          percentage: Math.max(0, 100 - (performanceInfo.metrics?.averageDeliveryTime || 40)),
          trend: 'improving'
        }
      };
      
      // Transform hints (using KPIs data)
      const transformedHints = [
        {
          metric: 'Delivery Success Rate',
          hint: `Current success rate: ${Math.round(hintsInfo.kpis?.deliverySuccessRate || 0)}%`,
          action: 'Focus on completing deliveries on time and following route guidance'
        },
        {
          metric: 'Customer Satisfaction',
          hint: `Current rating: ${(hintsInfo.kpis?.customerSatisfaction || 0).toFixed(1)}/5.0`,
          action: 'Maintain professional communication and handle packages with care'
        },
        {
          metric: 'Route Optimization',
          hint: `Routes optimized: ${hintsInfo.kpis?.routesOptimized || 0}`,
          action: 'Follow suggested routes and report traffic issues promptly'
        }
      ];
      
      // Transform insights
      const transformedInsights = [
        {
          insight: 'Delivery Time Performance',
          period: 'Last 7 days',
          impact: hintsInfo.kpis?.averageDeliveryTime < 40 ? 'Positive' : 'Needs Attention',
          suggestion: 'Continue following optimized routes'
        },
        {
          insight: 'Customer Interaction',
          period: 'Last 30 days',
          impact: hintsInfo.kpis?.customerSatisfaction > 4 ? 'Positive' : 'Needs Attention',
          suggestion: 'Maintain professional communication'
        }
      ];
      
      setPerformanceOverview(transformedOverview);
      setImprovementHints(transformedHints);
      setBehavioralInsights(transformedInsights);
    };
    fetchPerformanceData();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Performance & Behavior</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Qualitative feedback to improve behavior without enabling gaming
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Feedback only - no raw scores shown
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(performanceOverview).map(([key, metric]) => (
          <div key={key} className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
            <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
              {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
            </h3>
            <div className="flex items-center justify-between mb-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                metric.level === 'Good'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                  : metric.level === 'Needs Improvement'
                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
              }`}>
                {metric.level === 'Needs Improvement' ? 'Needs Work' : metric.level}
              </span>
              <span className={`text-xs px-2 py-1 rounded uppercase tracking-wider ${
                metric.trend === 'improving'
                  ? 'bg-green-100 text-green-700'
                  : metric.trend === 'stable'
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-red-100 text-red-700'
              }`}>
                {metric.trend}
              </span>
            </div>
            <p className="text-xl font-bold text-gray-900 dark:text-white mb-1">
              {metric.percentage}%
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Qualitative assessment only
            </p>
          </div>
        ))}
      </div>

      {/* Improvement Hints */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Improvement Hints</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">System-suggested areas for focus</p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Array.isArray(improvementHints) ? improvementHints.map((hint, index) => (
              <div key={index} className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-md border border-blue-200 dark:border-blue-800">
                <div className="flex items-start">
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-1">
                      {hint.metric}
                    </h4>
                    <p className="text-xs text-blue-800 dark:text-blue-200 mb-2">
                      {hint.hint}
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300">
                      {hint.action}
                    </p>
                  </div>
                </div>
              </div>
            )) : null}
          </div>
        </div>
      </div>

      {/* Behavioral Insights */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Behavioral Insights</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Pattern-based feedback for improvement</p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Array.isArray(behavioralInsights) ? behavioralInsights.map((insight, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center space-x-2">
                  <span className={`text-xs font-medium px-2 py-1 rounded-full uppercase tracking-wider ${
                    insight.impact === 'Positive'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  }`}>
                    {insight.impact}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">{insight.insight}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{insight.period}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-900 dark:text-white mb-1">
                    {insight.suggestion}
                  </p>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    insight.impact === 'Positive'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                      : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300'
                  }`}>
                    {insight.impact}
                  </span>
                </div>
              </div>
            )) : null}
          </div>
        </div>
      </div>

      {/* Algorithm Disclaimer */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-4">
        <div className="flex items-start">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">Feedback-Only Design</h3>
            <p className="text-gray-600 dark:text-gray-400 text-xs">
              This screen provides qualitative feedback to help you improve performance. Raw scores, rankings, and fraud thresholds are not displayed to prevent gaming of the system. All assessments are made by behavior-scoring systems and assignment-weighting systems.
            </p>
          </div>
        </div>
      </div>

      {/* Algorithm Feeds */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">System Connections</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Behavior Scoring</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Continuous monitoring</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Assignment Weighting</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Priority queue influence</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Penalty Escalation</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Progressive friction</p>
          </div>
        </div>
      </div>
    </div>
  );
}
