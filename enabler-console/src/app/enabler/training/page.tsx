'use client';

import { useState } from 'react';

export default function TrainingCenter() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState(null);

  const trainingStats = {
    coursesCompleted: 12,
    totalCourses: 18,
    certificationsEarned: 4,
    hoursSpent: 24,
    currentStreak: 7,
    skillLevel: 'Advanced'
  };

  const courses = [
    {
      id: 1,
      title: 'Seller Onboarding Mastery',
      category: 'seller-onboarding',
      level: 'Beginner',
      duration: '2 hours',
      modules: 8,
      progress: 100,
      status: 'completed',
      rating: 4.8,
      description: 'Learn the complete process of onboarding new sellers to the Maysar platform',
      skills: ['KYC Verification', 'Document Review', 'Business Validation'],
      certification: true,
      instructor: 'Sarah Johnson',
      lastAccessed: '2024-12-28'
    },
    {
      id: 2,
      title: 'Advanced Buyer Assistance',
      category: 'buyer-assistance',
      level: 'Advanced',
      duration: '3 hours',
      modules: 12,
      progress: 75,
      status: 'in-progress',
      rating: 4.9,
      description: 'Master advanced techniques for helping buyers with complex issues',
      skills: ['Payment Troubleshooting', 'Order Management', 'Dispute Resolution'],
      certification: true,
      instructor: 'Michael Chen',
      lastAccessed: '2024-12-29'
    },
    {
      id: 3,
      title: 'Fraud Detection & Prevention',
      category: 'trust-safety',
      level: 'Intermediate',
      duration: '2.5 hours',
      modules: 10,
      progress: 0,
      status: 'not-started',
      rating: 4.7,
      description: 'Identify and report fraudulent activities to protect the platform',
      skills: ['Pattern Recognition', 'Risk Assessment', 'Report Writing'],
      certification: true,
      instructor: 'Dr. Amanda Wilson',
      lastAccessed: null
    },
    {
      id: 4,
      title: 'Logistics Coordination Basics',
      category: 'logistics',
      level: 'Beginner',
      duration: '1.5 hours',
      modules: 6,
      progress: 100,
      status: 'completed',
      rating: 4.6,
      description: 'Coordinate deliveries and manage logistics operations effectively',
      skills: ['Delivery Tracking', 'Proof Collection', 'Customer Communication'],
      certification: false,
      instructor: 'James Rodriguez',
      lastAccessed: '2024-12-25'
    },
    {
      id: 5,
      title: 'Communication Excellence',
      category: 'soft-skills',
      level: 'Intermediate',
      duration: '2 hours',
      modules: 8,
      progress: 60,
      status: 'in-progress',
      rating: 4.8,
      description: 'Develop professional communication skills for enabler success',
      skills: ['Active Listening', 'Conflict Resolution', 'Professional Writing'],
      certification: false,
      instructor: 'Lisa Thompson',
      lastAccessed: '2024-12-27'
    },
    {
      id: 6,
      title: 'Platform Policies & Compliance',
      category: 'compliance',
      level: 'Beginner',
      duration: '1 hour',
      modules: 4,
      progress: 100,
      status: 'completed',
      rating: 4.5,
      description: 'Understand Maysar platform policies and compliance requirements',
      skills: ['Policy Knowledge', 'Compliance Procedures', 'Ethical Guidelines'],
      certification: true,
      instructor: 'Robert Kim',
      lastAccessed: '2024-12-20'
    }
  ];

  const certifications = [
    {
      id: 1,
      name: 'Certified Sales Support Specialist',
      earned: '2024-12-15',
      validUntil: '2025-12-15',
      credentialId: 'CSSS-2024-001',
      skills: ['Product Promotion', 'Customer Acquisition', 'Sales Consultation']
    },
    {
      id: 2,
      name: 'Platform Compliance Expert',
      earned: '2024-12-10',
      validUntil: '2025-12-10',
      credentialId: 'PCE-2024-002',
      skills: ['Policy Knowledge', 'Compliance Procedures', 'Risk Management']
    },
    {
      id: 3,
      name: 'Logistics Coordination Professional',
      earned: '2024-11-28',
      validUntil: '2025-11-28',
      credentialId: 'LCP-2024-003',
      skills: ['Delivery Management', 'Customer Service', 'Problem Solving']
    }
  ];

  const upcomingWebinars = [
    {
      id: 1,
      title: 'New Platform Features for Enablers',
      date: '2025-01-05',
      time: '14:00 EAT',
      duration: '1 hour',
      presenter: 'Product Team',
      registered: true
    },
    {
      id: 2,
      title: 'Advanced Fraud Detection Techniques',
      date: '2025-01-12',
      time: '15:00 EAT',
      duration: '1.5 hours',
      presenter: 'Security Team',
      registered: false
    },
    {
      id: 3,
      title: 'Maximizing Your Enabler Earnings',
      date: '2025-01-19',
      time: '16:00 EAT',
      duration: '45 minutes',
      presenter: 'Success Team',
      registered: false
    }
  ];

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'Beginner':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'Intermediate':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'Advanced':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const filteredCourses = courses.filter(course => {
    if (selectedCategory === 'all') return true;
    return course.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Training Center</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Enhance your skills and earn certifications to advance your enabler career
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded-full">
            <span className="text-blue-800 dark:text-blue-300 text-sm font-medium">
              {trainingStats.skillLevel} Level
            </span>
          </div>
          <div className="bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded-full">
            <span className="text-green-800 dark:text-green-300 text-sm font-medium">
              {trainingStats.currentStreak} Day Streak
            </span>
          </div>
        </div>
      </div>

      {/* Training Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Courses Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {trainingStats.coursesCompleted}/{trainingStats.totalCourses}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mt-3">
            <div 
              className="bg-blue-500 h-2 rounded-full"
              style={{ width: `${(trainingStats.coursesCompleted / trainingStats.totalCourses) * 100}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Certifications</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{trainingStats.certificationsEarned}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Professional credentials earned
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Learning Hours</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{trainingStats.hoursSpent}h</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Total time invested
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Skill Level</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{trainingStats.skillLevel}</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Current proficiency level
          </p>
        </div>
      </div>

      {/* Course Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Courses
          </button>
          <button
            onClick={() => setSelectedCategory('logistics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'logistics'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Logistics
          </button>
          <button
            onClick={() => setSelectedCategory('soft-skills')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedCategory === 'soft-skills'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Sales Support
          </button>
        </div>
      </div>

      {/* Course List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCourses.map((course) => (
          <div key={course.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">by {course.instructor}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500">{course.status}</span>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{course.description}</p>

            <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(course.level)}`}>
                {course.level}
              </span>
              <span>Duration: {course.duration}</span>
              <span>Modules: {course.modules}</span>
              <div className="flex items-center">
                <span>Rating: {course.rating}</span>
              </div>
            </div>

            {course.progress > 0 && (
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                  <span>Progress</span>
                  <span>{course.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${course.progress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Skills you'll learn:</p>
              <div className="flex flex-wrap gap-2">
                {course.skills.map((skill, index) => (
                  <span key={index} className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-xs text-gray-700 dark:text-gray-300">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              {course.status === 'not-started' && (
                <button className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                  Start Course
                </button>
              )}
              {course.status === 'in-progress' && (
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Continue Learning
                </button>
              )}
              {course.status === 'completed' && (
                <button className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors">
                  Review Course
                </button>
              )}
              <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                Preview
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Certifications */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Your Certifications</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certifications.map((cert) => (
            <div key={cert.id} className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 p-4 rounded-lg border border-yellow-200 dark:border-yellow-700">
              <div className="flex items-center space-x-3 mb-3">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white text-sm">{cert.name}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">ID: {cert.credentialId}</p>
                </div>
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                <p>Earned: {cert.earned}</p>
                <p>Valid until: {cert.validUntil}</p>
              </div>
              <div className="mt-3">
                <div className="flex flex-wrap gap-1">
                  {cert.skills.map((skill, index) => (
                    <span key={index} className="bg-yellow-200 dark:bg-yellow-800/30 text-yellow-800 dark:text-yellow-300 px-2 py-1 rounded text-xs">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Upcoming Webinars */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Upcoming Webinars</h3>
        <div className="space-y-4">
          {upcomingWebinars.map((webinar) => (
            <div key={webinar.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <div>
                  <h4 className="font-semibold text-gray-900 dark:text-white">{webinar.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {webinar.date} at {webinar.time} • {webinar.duration} • by {webinar.presenter}
                  </p>
                </div>
              </div>
              <div>
                {webinar.registered ? (
                  <span className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-3 py-1 rounded-full text-sm font-medium">
                    Registered
                  </span>
                ) : (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
                    Register
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}