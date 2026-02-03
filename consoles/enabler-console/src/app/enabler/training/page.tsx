'use client';

import { useState, useRef, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

interface Course {
  id: number;
  title: string;
  category: string;
  duration: string;
  progress: number;
  status: string;
  description: string;
  videoUrl: string;
  objectives: string[];
  completionPercentage: number;
}

export default function TrainingCenter() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [watchedTime, setWatchedTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const videoRef = useRef<HTMLIFrameElement>(null);

  const { data: trainingData, isLoading, error } = useQuery({
    queryKey: ['enabler-training'],
    queryFn: () => fetch('http://localhost:3001/api/enabler/training/courses').then(res => res.json()),
    staleTime: 30 * 1000,
  });

  const trainingStats = trainingData?.data?.stats || {
    coursesCompleted: 0,
    totalCourses: 0,
    certificationsEarned: 0,
    hoursSpent: 0,
    currentStreak: 0,
    skillLevel: 'Beginner'
  };

  const courses: Course[] = trainingData?.data?.courses || [];

  const filteredCourses = courses.filter(course => {
    if (selectedCategory === 'all') return true;
    return course.category === selectedCategory;
  });

  const updateProgress = (courseId: number, progress: number) => {
    // In real app, this would update the backend
    console.log(`Course ${courseId} progress: ${progress}%`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (selectedCourse) {
    return (
      <div className="space-y-4">
        {/* Course Header */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => setSelectedCourse(null)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-700"
          >
            <span>←</span>
            <span>Back to Training Center</span>
          </button>
          <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded">
            <span className="text-blue-800 dark:text-blue-300 text-xs font-medium">
              {selectedCourse.completionPercentage}% Complete
            </span>
          </div>
        </div>

        {/* Course Info */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h1 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{selectedCourse.title}</h1>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{selectedCourse.description}</p>
          <div className="flex items-center space-x-4 text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
            <span>Duration: {selectedCourse.duration}</span>
            <span>Category: {selectedCourse.category}</span>
          </div>
        </div>

        {/* Video Player */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="aspect-video mb-4">
            <iframe
              ref={videoRef}
              src={selectedCourse.videoUrl}
              className="w-full h-full rounded-md"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>

          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1 uppercase tracking-wider">
              <span>Progress</span>
              <span>{selectedCourse.completionPercentage}%</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-md h-2">
              <div
                className="bg-blue-500 h-2 rounded-md transition-all duration-300"
                style={{ width: `${selectedCourse.completionPercentage}%` }}
              />
            </div>
          </div>

          <p className="text-xs text-gray-600 dark:text-gray-400">
            Note: Video controls are disabled to ensure complete viewing for certification.
          </p>
        </div>

        {/* Learning Objectives */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Learning Objectives</h3>
          <ul className="space-y-2">
            {selectedCourse.objectives.map((objective: string, index: number) => (
              <li key={index} className="flex items-center space-x-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span className="text-gray-700 dark:text-gray-300 text-sm">{objective}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Training Center</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Master sales support and logistics skills through video courses
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded">
            <span className="text-blue-800 dark:text-blue-300 text-xs font-medium">
              {trainingStats.skillLevel} Level
            </span>
          </div>
          <div className="bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded">
            <span className="text-green-800 dark:text-green-300 text-xs font-medium">
              {trainingStats.currentStreak} Day Streak
            </span>
          </div>
        </div>
      </div>

      {/* Training Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Courses Completed</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {trainingStats.coursesCompleted}/{trainingStats.totalCourses}
              </p>
            </div>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-md h-2 mt-3">
            <div
              className="bg-blue-500 h-2 rounded-md"
              style={{ width: `${(trainingStats.coursesCompleted / trainingStats.totalCourses) * 100}%` }}
            />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Certifications</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{trainingStats.certificationsEarned}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Professional credentials earned
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Learning Hours</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{trainingStats.hoursSpent}h</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Total time invested
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Skill Level</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{trainingStats.skillLevel}</p>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Current proficiency level
          </p>
        </div>
      </div>

      {/* Course List */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {filteredCourses.map((course) => (
          <div key={course.id} className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{course.title}</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">{course.duration}</p>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  course.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                  course.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                  'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                }`}>
                  {course.status}
                </span>
              </div>
            </div>

            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">{course.description}</p>

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
                  />
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">What you'll learn:</p>
              <div className="space-y-1">
                {course.objectives.slice(0, 2).map((objective, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{objective}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => setSelectedCourse(course)}
                className={`flex-1 px-4 py-2 rounded-lg transition-colors ${
                  course.status === 'not-started' ? 'bg-blue-600 text-white hover:bg-blue-700' :
                  course.status === 'in-progress' ? 'bg-green-600 text-white hover:bg-green-700' :
                  'bg-gray-600 text-white hover:bg-gray-700'
                }`}
              >
                {course.status === 'not-started' ? 'Start Course' :
                 course.status === 'in-progress' ? 'Continue' : 'Review'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
