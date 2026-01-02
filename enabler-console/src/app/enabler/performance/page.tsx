'use client';

import { 
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
  CheckCircleIcon,
  UserGroupIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

export default function PerformanceMetrics() {
  const performanceData = {
    currentRank: 'Gold',
    nextRank: 'Platinum',
    rankProgress: 75,
    trustScore: 4.8,
    totalTasks: 127,
    completedTasks: 120,
    completionRate: 94.5,
    averageRating: 4.7,
    responseTime: 18, // minutes
    sellersOnboarded: 23,
    buyersAssisted: 89,
    fraudReports: 5,
    monthlyGrowth: 12.5
  };

  const monthlyStats = [
    { month: 'Jul', tasks: 15, earnings: 450, rating: 4.5 },
    { month: 'Aug', tasks: 18, earnings: 540, rating: 4.6 },
    { month: 'Sep', tasks: 22, earnings: 660, rating: 4.7 },
    { month: 'Oct', tasks: 25, earnings: 750, rating: 4.8 },
    { month: 'Nov', tasks: 28, earnings: 840, rating: 4.8 },
    { month: 'Dec', tasks: 32, earnings: 960, rating: 4.9 }
  ];

  const achievements = [
    {
      id: 1,
      title: 'Top Performer',
      description: 'Ranked in top 10% of enablers this month',
      icon: '🏆',
      earned: '2024-12-15',
      points: 100
    },
    {
      id: 2,
      title: 'Seller Champion',
      description: 'Successfully onboarded 20+ sellers',
      icon: '👥',
      earned: '2024-12-10',
      points: 75
    },
    {
      id: 3,
      title: 'Trust Guardian',
      description: 'Maintained 4.8+ trust score for 3 months',
      icon: '🛡️',
      earned: '2024-12-01',
      points: 50
    },
    {
      id: 4,
      title: 'Speed Demon',
      description: 'Average response time under 20 minutes',
      icon: '⚡',
      earned: '2024-11-25',
      points: 25
    }
  ];

  const competencyScores = [
    { skill: 'Seller Onboarding', score: 92, maxScore: 100 },
    { skill: 'Buyer Assistance', score: 88, maxScore: 100 },
    { skill: 'Logistics Support', score: 85, maxScore: 100 },
    { skill: 'Trust & Safety', score: 95, maxScore: 100 },
    { skill: 'Communication', score: 90, maxScore: 100 },
    { skill: 'Problem Solving', score: 87, maxScore: 100 }
  ];

  const rankRequirements = {
    current: {
      name: 'Gold',
      minTasks: 100,
      minRating: 4.5,
      minTrustScore: 4.5,
      benefits: ['15% base commission', '5% rank bonus', 'Priority support']
    },
    next: {
      name: 'Platinum',
      minTasks: 150,
      minRating: 4.7,
      minTrustScore: 4.7,
      benefits: ['18% base commission', '8% rank bonus', 'Premium support', 'Early access to features']
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-yellow-500';
    if (score >= 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Metrics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your performance, rankings, and skill development
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
            <span className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">
              🏆 {performanceData.currentRank} Enabler
            </span>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded-full">
            <span className="text-blue-800 dark:text-blue-300 text-sm font-medium">
              ⭐ {performanceData.trustScore} Trust Score
            </span>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {performanceData.completionRate}%
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
          <div className="flex items-center mt-2">
            <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+2.3% from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {performanceData.averageRating}/5.0
              </p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-gray-600">Based on {performanceData.completedTasks} reviews</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {performanceData.responseTime}m
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex items-center mt-2">
            <ArrowDownIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">-5m improvement</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Growth</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                +{performanceData.monthlyGrowth}%
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-purple-500" />
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-gray-600">Tasks completed growth</span>
          </div>
        </div>
      </div>

      {/* Rank Progress */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rank Progression</h3>
          <TrophyIcon className="h-6 w-6 text-yellow-500" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Rank */}
          <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 rounded-lg">
            <h4 className="font-semibold text-yellow-800 dark:text-yellow-300 mb-2">
              Current: {rankRequirements.current.name} Enabler
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Tasks Completed:</span>
                <span className="font-medium">{performanceData.completedTasks}/{rankRequirements.current.minTasks}</span>
              </div>
              <div className="flex justify-between">
                <span>Average Rating:</span>
                <span className="font-medium">{performanceData.averageRating}/{rankRequirements.current.minRating}</span>
              </div>
              <div className="flex justify-between">
                <span>Trust Score:</span>
                <span className="font-medium">{performanceData.trustScore}/{rankRequirements.current.minTrustScore}</span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-yellow-700 dark:text-yellow-400 font-medium mb-1">Benefits:</p>
              <ul className="text-xs text-yellow-600 dark:text-yellow-300 space-y-1">
                {rankRequirements.current.benefits.map((benefit, index) => (
                  <li key={index}>• {benefit}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Next Rank */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-800 dark:text-gray-300 mb-2">
              Next: {rankRequirements.next.name} Enabler
            </h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Tasks Required:</span>
                <span className="font-medium">{performanceData.completedTasks}/{rankRequirements.next.minTasks}</span>
              </div>
              <div className="flex justify-between">
                <span>Rating Required:</span>
                <span className="font-medium">{performanceData.averageRating}/{rankRequirements.next.minRating}</span>
              </div>
              <div className="flex justify-between">
                <span>Trust Score Required:</span>
                <span className="font-medium">{performanceData.trustScore}/{rankRequirements.next.minTrustScore}</span>
              </div>
            </div>
            <div className="mt-3">
              <p className="text-xs text-gray-700 dark:text-gray-400 font-medium mb-1">Additional Benefits:</p>
              <ul className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                {rankRequirements.next.benefits.map((benefit, index) => (
                  <li key={index}>• {benefit}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mt-6">
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
            <span>Progress to {rankRequirements.next.name}</span>
            <span>{performanceData.rankProgress}%</span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div 
              className="bg-gradient-to-r from-yellow-400 to-yellow-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${performanceData.rankProgress}%` }}
            ></div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Complete {rankRequirements.next.minTasks - performanceData.completedTasks} more tasks to reach {rankRequirements.next.name} rank
          </p>
        </div>
      </div>

      {/* Competency Scores */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Skill Competencies</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {competencyScores.map((competency, index) => (
            <div key={index} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {competency.skill}
                </span>
                <span className={`text-sm font-bold ${getScoreColor(competency.score)}`}>
                  {competency.score}/{competency.maxScore}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full transition-all duration-300 ${getScoreBarColor(competency.score)}`}
                  style={{ width: `${(competency.score / competency.maxScore) * 100}%` }}
                ></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Monthly Performance Chart */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Monthly Performance Trend</h3>
        <div className="grid grid-cols-6 gap-4">
          {monthlyStats.map((stat, index) => (
            <div key={index} className="text-center">
              <div className="bg-blue-100 dark:bg-blue-900/20 p-3 rounded-lg mb-2">
                <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">{stat.month}</div>
                <div className="text-lg font-bold text-blue-600">{stat.tasks}</div>
                <div className="text-xs text-gray-500">tasks</div>
              </div>
              <div className="text-xs space-y-1">
                <div className="text-green-600 font-medium">KES {stat.earnings}</div>
                <div className="text-yellow-600">★ {stat.rating}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl">{achievement.icon}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">{achievement.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Earned on {achievement.earned} • +{achievement.points} points
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <UserGroupIcon className="h-12 w-12 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceData.sellersOnboarded}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Sellers Onboarded</p>
          </div>
          <div className="text-center">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceData.buyersAssisted}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Buyers Assisted</p>
          </div>
          <div className="text-center">
            <TrophyIcon className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{performanceData.fraudReports}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Fraud Reports Filed</p>
          </div>
        </div>
      </div>
    </div>
  );
}