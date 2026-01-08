'use client';

import { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme-context';

export default function SettingsPage() {
  const { theme, setTheme, accessibility, setAccessibility } = useTheme();
  const [settings, setSettings] = useState({
    preferences: {
      language: 'en',
      timezone: 'Africa/Dar_es_Salaam',
      currency: 'TZS',
      units: 'metric'
    }
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setLoading(false);
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
      await new Promise(resolve => setTimeout(resolve, 1000));
      setSuccess('Settings saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleResetSettings = () => {
    setSettings({
      preferences: {
        language: 'en',
        timezone: 'Africa/Dar_es_Salaam',
        currency: 'TZS',
        units: 'metric'
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
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto"></div>
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
            Customize your admin console experience
          </p>
        </div>
      </div>

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
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="text-left">
                  <p className={`text-sm font-medium ${
                    theme === 'light' ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-white'
                  }`}>
                    Light
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Clean and bright</p>
                </div>
              </button>

              <button
                onClick={() => setTheme('dark')}
                className={`p-3 rounded-md border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="text-left">
                  <p className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-white'
                  }`}>
                    Dark
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Easy on the eyes</p>
                </div>
              </button>

              <button
                onClick={() => setTheme('gold')}
                className={`p-3 rounded-md border-2 transition-all ${
                  theme === 'gold'
                    ? 'border-red-500 bg-red-50 dark:bg-red-900/10'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
              >
                <div className="text-left">
                  <p className={`text-sm font-medium ${
                    theme === 'gold' ? 'text-red-900 dark:text-red-100' : 'text-gray-900 dark:text-white'
                  }`}>
                    Gold
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">Premium feel</p>
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
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
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-red-300 dark:peer-focus:ring-red-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-red-600"></div>
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
          className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}