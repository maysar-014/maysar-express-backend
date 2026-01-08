'use client';

import { useState, useEffect } from 'react';
import { courierApi } from '@/lib/api';

export default function TrainingModulesPage() {
  const [selectedModule, setSelectedModule] = useState(null);
  const [trainingModules, setTrainingModules] = useState([]);
  const [trainingProgress, setTrainingProgress] = useState({ overallProgress: 0, completedModules: [] });
  const [learningPaths, setLearningPaths] = useState([]);
  const [achievements, setAchievements] = useState({ learning: [], performance: [] });
  const [achievementsLoading, setAchievementsLoading] = useState(true);

  useEffect(() => {

    const fetchTrainingData = async () => {
      const [modulesData, progressData, pathsData, achievementsData] = await Promise.all([
        courierApi.getTrainingModules(),
        courierApi.getTrainingProgress(),
        courierApi.getTrainingPaths(),
        courierApi.getTrainingAchievements()
      ]);
      setTrainingModules(modulesData.data || []);
      setTrainingProgress(progressData.data || { overallProgress: 0, completedModules: [] });
      setLearningPaths(pathsData.data || []);
      setAchievements(achievementsData.data || { learning: [], performance: [] });
    };
    fetchTrainingData();
  }, []);

  const handleStartModule = async (moduleId) => {
    setSelectedModule(moduleId);
  };

  const handleCompleteModule = async (moduleId) => {
    const progressData = await courierApi.getTrainingProgress();
    setTrainingProgress(progressData.data || { overallProgress: 0, completedModules: [] });
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'Beginner': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'Intermediate': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getAchievementIcon = (icon) => {
    switch (icon) {
      case '✓': return '✓';
      case '★': return '★';
      case 'TREND': return '📈';
      case 'TARGET': return '🎯';
      case 'AWARD': return '🏆';
      default: return icon;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Training Modules</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Enhance your skills and knowledge to become a top-performing courier
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Continuous learning & development
        </div>
      </div>

      {/* Progress Overview */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
            Training Progress
          </h2>
          <span className="text-sm font-medium text-gray-900 dark:text-white">
            {(trainingModules?.length ?? 0)} of {(trainingModules?.length ?? 0)} completed
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className="bg-orange-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${trainingProgress.overallProgress}%` }}
          ></div>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          {trainingProgress.overallProgress}% complete • Keep learning to unlock performance bonuses
        </p>
      </div>

      {/* Training Modules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.isArray(trainingModules) ? trainingModules.map((module) => (
          <div
            key={module.id}
            className={`bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4 ${
              trainingProgress?.completedModules?.includes(module.id) ? 'ring-2 ring-green-500' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
                  {module.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                  {module.description}
                </p>
                <div className="flex items-center space-x-2 mb-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">{module.duration}</span>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getDifficultyColor(module.difficulty)}`}>
                    {module.difficulty}
                  </span>
                </div>
                <span className="text-xs font-medium text-orange-600 uppercase tracking-wider">
                  {module.category}
                </span>
              </div>
              {trainingProgress?.completedModules?.includes(module.id) && (
                <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </div>

            {/* Progress Bar */}
            {module.progress > 0 && (
              <div className="mb-3">
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs text-gray-600 dark:text-gray-400">Progress</span>
                  <span className="text-xs font-medium text-gray-900 dark:text-white">{module.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                  <div
                    className="bg-orange-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${module.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            {/* Topics */}
            <div className="mb-4">
              <h4 className="text-xs font-medium text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
                Topics Covered
              </h4>
              <div className="space-y-1">
                {Array.isArray(module.topics) ? module.topics.slice(0, 3).map((topic, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-orange-500 rounded-full"></div>
                    <span className="text-xs text-gray-600 dark:text-gray-400">{topic}</span>
                  </div>
                )) : null}
                {Array.isArray(module.topics) && module.topics.length > 3 && (
                  <span className="text-xs text-gray-500 dark:text-gray-500">
                    +{module.topics.length - 3} more topics
                  </span>
                )}
              </div>
            </div>

            {/* Action Button */}
            <button
              onClick={() => handleStartModule(module.id)}
              className={`w-full px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                trainingProgress?.completedModules?.includes(module.id)
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-orange-600 text-white hover:bg-orange-700'
              }`}
            >
              {trainingProgress?.completedModules?.includes(module.id) ? 'Review Module' : 'Start Module'}
            </button>
          </div>
        )) : null}
      </div>

      {/*
      // Learning Paths - Commented out for future implementation In shaa Allah
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Recommended Learning Paths</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Structured training journeys for different career stages</p>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-2">
                New Courier Path
              </h3>
              <p className="text-xs text-blue-800 dark:text-blue-200 mb-3">
                Perfect for couriers just starting their journey
              </p>
              <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 mb-3">
                <li>• Getting Started</li>
                <li>• Basic Deliveries</li>
                <li>• Customer Service</li>
              </ul>
              <button className="w-full px-3 py-2 bg-blue-600 text-white text-xs font-medium rounded-md hover:bg-blue-700">
                Start Path
              </button>
            </div>

            <div className="p-4 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md">
              <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 uppercase tracking-wider mb-2">
                Experienced Courier
              </h3>
              <p className="text-xs text-green-800 dark:text-green-200 mb-3">
                Advanced training for seasoned professionals
              </p>
              <ul className="text-xs text-green-700 dark:text-green-300 space-y-1 mb-3">
                <li>• Advanced Issue Handling</li>
                <li>• Route Optimization</li>
                <li>• Performance Mastery</li>
              </ul>
              <button className="w-full px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700">
                Start Path
              </button>
            </div>

            <div className="p-4 bg-purple-50 dark:bg-purple-900/10 border border-purple-200 dark:border-purple-800 rounded-md">
              <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100 uppercase tracking-wider mb-2">
                Leadership Track
              </h3>
              <p className="text-xs text-purple-800 dark:text-purple-200 mb-3">
                For couriers aspiring to lead teams
              </p>
              <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1 mb-3">
                <li>• Team Management</li>
                <li>• Quality Assurance</li>
                <li>• System Administration</li>
              </ul>
              <button className="w-full px-3 py-2 bg-purple-600 text-white text-xs font-medium rounded-md hover:bg-purple-700">
                Start Path
              </button>
            </div>
          </div>
        </div>
      </div>
      */}

      {/* Achievement Badges */}
      <div className="space-y-6">
        {/* Learning Achievements */}
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-3 flex items-center">
            <span className="mr-2">[LEARN]</span>
            Learning Achievements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {achievements?.learning?.map((achievement) => (
              <div
                key={achievement.id}
                className={`text-center p-3 rounded-md border transition-all ${
                  achievement.unlocked
                    ? 'bg-blue-100 dark:bg-blue-900/20 border-blue-300 dark:border-blue-600 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="text-3xl mb-2">{achievement.icon}</div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
                  {achievement.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{achievement.description}</p>
                <div className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider ${
                  achievement.unlocked
                    ? 'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
                }`}>
                  {achievement.unlocked ? 'Unlocked' : 'Locked'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Performance Achievements */}
        <div className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md p-4">
          <h3 className="text-sm font-semibold text-green-900 dark:text-green-100 uppercase tracking-wider mb-3 flex items-center">
            <span className="mr-2">[PERF]</span>
            Performance Achievements
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {achievements?.performance?.map((achievement) => (
              <div
                key={achievement.id}
                className={`text-center p-3 rounded-md border transition-all ${
                  achievement.unlocked
                    ? 'bg-green-100 dark:bg-green-900/20 border-green-300 dark:border-green-600 shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-700 border-gray-200 dark:border-gray-600'
                }`}
              >
                <div className="text-4xl mb-2">{achievement.icon}</div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-1">
                  {achievement.title}
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">{achievement.description}</p>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Requirement: {achievement.requirement}
                </div>
                <div className={`text-xs px-2 py-1 rounded-full uppercase tracking-wider mt-2 ${
                  achievement.unlocked
                    ? 'bg-green-200 text-green-800 dark:bg-green-800 dark:text-green-200'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-400'
                }`}>
                  {achievement.unlocked ? 'Earned' : 'Not Yet Earned'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Performance Impact */}
      <div className="bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-800 rounded-md p-4">
        <div className="flex items-start">
          <div>
            <h3 className="text-sm font-semibold text-orange-900 dark:text-orange-100 uppercase tracking-wider mb-2">
              Training = Better Earnings
            </h3>
            <p className="text-xs text-orange-800 dark:text-orange-200">
              Completing training modules can unlock performance bonuses and higher-priority assignments. Trained couriers typically earn 15-25% more than untrained couriers.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
