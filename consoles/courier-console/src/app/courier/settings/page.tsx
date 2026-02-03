'use client';

import { useState, useEffect } from 'react';
import { courierApi } from '@/lib/api';
import { useTheme } from '@/lib/theme-context';

export default function SettingsPage() {
  const { theme, setTheme, accessibility, setAccessibility } = useTheme();
  const [settings, setSettings] = useState({
    notifications: {
      deliveryAlerts: true,
      routeUpdates: true,
      earningsUpdates: true,
      systemAlerts: true
    },
    preferences: {
      language: 'en',
      timezone: 'Africa/Dar_es_Salaam',
      currency: 'TZS',
      units: 'metric'
    },
    privacy: {
      shareLocation: true,
      sharePerformance: false,
      allowMarketing: false
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        // Mock data for now - would come from API
        setSettings({
          notifications: {
            deliveryAlerts: true,
            routeUpdates: true,
            earningsUpdates: true,
            systemAlerts: true
          },
          preferences: {
            language: 'en',
            timezone: 'Africa/Dar_es_Salaam',
            currency: 'TZS',
            units: 'metric'
          },
          privacy: {
            shareLocation: true,
            sharePerformance: false,
            allowMarketing: false
          }
        });
        setError(null);
      } catch (err) {
        console.error('Failed to fetch settings:', err);
        setError('Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSettingChange = (category: string, setting: string, value: any) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category as keyof typeof prev],
        [setting]: value
      }
    }));
  };

  const handleSaveSettings = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      // Would save to API
      await new Promise(resolve => setTimeout(resolve, 1000)); // Mock delay

      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    setSettings({
      notifications: {
        deliveryAlerts: true,
        routeUpdates: true,
        earningsUpdates: true,
        systemAlerts: true
      },
      preferences: {
        language: 'en',
        timezone: 'Africa/Dar_es_Salaam',
        currency: 'TZS',
        units: 'metric'
      },
      privacy: {
        shareLocation: true,
        sharePerformance: false,
        allowMarketing: false
      }
    });
    setTheme('dark');
    setAccessibility({
      highContrast: false,
      largeText: false,
      reduceMotion: false
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Settings</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Customize your courier console experience
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Personal preferences & configuration
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md">
          <p className="text-sm text-green-800 dark:text-green-200">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-md">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* Notifications Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Notifications</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Control when and how you receive updates</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Delivery Alerts</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Notifications for new deliveries and status updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.deliveryAlerts}
                onChange={(e) => handleSettingChange('notifications', 'deliveryAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Route Updates</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Alerts for route changes and traffic updates</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.routeUpdates}
                onChange={(e) => handleSettingChange('notifications', 'routeUpdates', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Earnings Updates</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Notifications for completed earnings and payouts</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.earningsUpdates}
                onChange={(e) => handleSettingChange('notifications', 'earningsUpdates', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">System Alerts</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Important system maintenance and update notifications</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notifications.systemAlerts}
                onChange={(e) => handleSettingChange('notifications', 'systemAlerts', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Preferences Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Preferences</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Customize your interface and regional settings</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Language
              </label>
              <select
                value={settings.preferences.language}
                onChange={(e) => handleSettingChange('preferences', 'language', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : theme === 'gold'
                    ? 'bg-yellow-50 border-yellow-300 text-gray-900'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="en">English</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Timezone
              </label>
              <select
                value={settings.preferences.timezone}
                onChange={(e) => handleSettingChange('preferences', 'timezone', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : theme === 'gold'
                    ? 'bg-yellow-50 border-yellow-300 text-gray-900'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="Africa/Dar_es_Salaam">East Africa Time (EAT)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Currency
              </label>
              <select
                value={settings.preferences.currency}
                onChange={(e) => handleSettingChange('preferences', 'currency', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : theme === 'gold'
                    ? 'bg-yellow-50 border-yellow-300 text-gray-900'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="TZS">Tanzanian Shilling (TZS)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Units
              </label>
              <select
                value={settings.preferences.units}
                onChange={(e) => handleSettingChange('preferences', 'units', e.target.value)}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-orange-500 focus:border-orange-500 text-sm ${
                  theme === 'dark' 
                    ? 'bg-gray-700 border-gray-600 text-white' 
                    : theme === 'gold'
                    ? 'bg-yellow-50 border-yellow-300 text-gray-900'
                    : 'bg-white border-gray-300 text-gray-900'
                }`}
              >
                <option value="metric">Metric (km, kg)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Privacy Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Privacy</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Control data sharing and privacy preferences</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Share Location Data</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Required for route optimization and delivery tracking</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.shareLocation}
                onChange={(e) => handleSettingChange('privacy', 'shareLocation', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Share Performance Data</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Anonymous performance metrics for system improvement</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.sharePerformance}
                onChange={(e) => handleSettingChange('privacy', 'sharePerformance', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Marketing Communications</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Receive updates about new features and promotions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.privacy.allowMarketing}
                onChange={(e) => handleSettingChange('privacy', 'allowMarketing', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Theme Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Appearance</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Choose your preferred theme and visual style</p>
        </div>
        <div className="p-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Theme</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <button
                onClick={() => setTheme('light')}
                className={`p-3 rounded-md border-2 transition-all ${
                  theme === 'light'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="text-left">
                    <p className={`text-sm font-medium ${
                      theme === 'light' ? 'text-orange-900 dark:text-orange-100' : 'text-gray-900 dark:text-white'
                    }`}>
                      Light
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Clean and bright</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-md border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="text-left">
                    <p className={`text-sm font-medium ${
                      theme === 'dark' ? 'text-orange-900 dark:text-orange-100' : 'text-gray-900 dark:text-white'
                    }`}>
                      Dark
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Easy on the eyes</p>
                  </div>
                </div>
              </button>

              <button
                onClick={() => setTheme('gold')}
                className={`p-3 rounded-md border-2 transition-all ${
                  theme === 'gold'
                    ? 'border-orange-500 bg-orange-50 dark:bg-orange-900/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <div className="text-left">
                    <p className={`text-sm font-medium ${
                      theme === 'gold' ? 'text-orange-900 dark:text-orange-100' : 'text-gray-900 dark:text-white'
                    }`}>
                      Gold
                    </p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">Premium feel</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Accessibility Settings */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Accessibility</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Customize the interface for better usability</p>
        </div>
        <div className="p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">High Contrast Mode</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Increase contrast for better visibility</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accessibility.highContrast}
                onChange={(e) => setAccessibility({ highContrast: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Large Text</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Increase font size for better readability</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accessibility.largeText}
                onChange={(e) => setAccessibility({ largeText: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900 dark:text-white">Reduce Motion</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">Minimize animations and transitions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={accessibility.reduceMotion}
                onChange={(e) => setAccessibility({ reduceMotion: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-orange-300 dark:peer-focus:ring-orange-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-orange-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4">
        <button
          onClick={handleResetSettings}
          className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600"
        >
          Reset to Defaults
        </button>
        <button
          onClick={handleSaveSettings}
          disabled={saving}
          className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Algorithm Notice */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">System Configuration</h3>
        <p className="text-gray-600 dark:text-gray-400 text-xs">
          Settings are applied immediately where possible. Some changes may require a page refresh or next login to take full effect. All preferences are stored securely and used to optimize your courier experience.
        </p>
      </div>
    </div>
  );
}
