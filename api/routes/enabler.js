const express = require('express');

const router = express.Router();

// ===== DASHBOARD APIs =====
router.get('/dashboard', async (req, res) => {
  res.json({ 
    success: true, 
    data: {
      stats: {
        totalEarnings: 125000,
        tasksCompleted: 45,
        completionRate: 94.5,
        deliveriesCompleted: 23,
        activeTasks: 3,
        rankProgress: 75
      },
      recentTasks: [
        {
          id: 'task-1',
          title: 'Seller Onboarding - Tech Store',
          type: 'onboarding',
          status: 'completed',
          completedAt: '2024-01-15T10:00:00Z',
          earnings: 5000
        }
      ],
      upcomingTasks: [
        {
          id: 'task-2',
          title: 'Training Delivery - Sales Basics',
          type: 'training',
          scheduledFor: '2024-01-16T14:00:00Z',
          location: 'Dar es Salaam'
        }
      ]
    }
  });
});

// ===== TRAINING COURSES APIs =====
router.get('/training/courses', async (req, res) => {
  res.json({ 
    success: true, 
    data: {
      stats: {
        coursesCompleted: 3,
        totalCourses: 6,
        certificationsEarned: 2,
        hoursSpent: 8.5,
        currentStreak: 5,
        skillLevel: 'Intermediate'
      },
      courses: [
        {
          id: 1,
          title: 'Sales Support Fundamentals',
          category: 'sales-support',
          duration: '45 min',
          progress: 100,
          status: 'completed',
          description: 'Master the fundamentals of supporting sellers with product promotion, customer acquisition strategies, and sales consultation techniques.',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0',
          objectives: [
            'Understand product positioning strategies',
            'Learn customer acquisition techniques',
            'Master sales consultation methods',
            'Develop effective communication skills'
          ],
          completionPercentage: 100
        },
        {
          id: 2,
          title: 'Advanced Sales Techniques',
          category: 'sales-support',
          duration: '60 min',
          progress: 65,
          status: 'in-progress',
          description: 'Advanced strategies for closing deals, handling objections, and maximizing seller revenue through proven sales methodologies.',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0',
          objectives: [
            'Master objection handling techniques',
            'Learn advanced closing strategies',
            'Understand revenue optimization',
            'Develop negotiation skills'
          ],
          completionPercentage: 65
        },
        {
          id: 3,
          title: 'Customer Relationship Management',
          category: 'sales-support',
          duration: '50 min',
          progress: 0,
          status: 'not-started',
          description: 'Build lasting customer relationships through effective communication, follow-up strategies, and customer satisfaction techniques.',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0',
          objectives: [
            'Build strong customer relationships',
            'Implement effective follow-up systems',
            'Handle customer complaints professionally',
            'Increase customer lifetime value'
          ],
          completionPercentage: 0
        },
        {
          id: 4,
          title: 'Logistics Coordination Essentials',
          category: 'logistics',
          duration: '40 min',
          progress: 100,
          status: 'completed',
          description: 'Essential skills for coordinating deliveries, managing logistics operations, and ensuring customer satisfaction through efficient delivery processes.',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0',
          objectives: [
            'Coordinate delivery schedules effectively',
            'Track shipments and manage delays',
            'Communicate with customers about deliveries',
            'Handle delivery issues professionally'
          ],
          completionPercentage: 100
        },
        {
          id: 5,
          title: 'Supply Chain Management',
          category: 'logistics',
          duration: '55 min',
          progress: 30,
          status: 'in-progress',
          description: 'Advanced supply chain concepts including inventory management, supplier relationships, and optimization strategies for efficient operations.',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0',
          objectives: [
            'Understand supply chain fundamentals',
            'Manage inventory levels effectively',
            'Build strong supplier relationships',
            'Optimize logistics operations'
          ],
          completionPercentage: 30
        },
        {
          id: 6,
          title: 'Last-Mile Delivery Optimization',
          category: 'logistics',
          duration: '35 min',
          progress: 0,
          status: 'not-started',
          description: 'Optimize last-mile delivery processes, reduce costs, and improve customer satisfaction through strategic route planning and delivery management.',
          videoUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ?enablejsapi=1&controls=0&disablekb=1&fs=0&modestbranding=1&rel=0',
          objectives: [
            'Plan efficient delivery routes',
            'Reduce delivery costs and time',
            'Improve customer delivery experience',
            'Handle delivery exceptions effectively'
          ],
          completionPercentage: 0
        }
      ]
    }
  });
});

// ===== LOGISTICS TASKS APIs =====
router.get('/logistics/tasks', async (req, res) => {
  res.json({ 
    success: true, 
    data: {
      stats: {
        activeTasks: 3,
        completedToday: 2,
        avgResolutionTime: '35m',
        successRate: '98%',
        pendingTasks: 2,
        potentialEarnings: 75000
      },
      activeTasks: [
        {
          id: 'LOG-001',
          orderId: 'ORD-2024-5678',
          customerName: 'Amina Hassan',
          customerPhone: '+255712345678',
          deliveryAddress: '123 Uhuru Street, Dar es Salaam CBD',
          coordinates: { lat: -1.2921, lng: 36.8219 },
          taskType: 'delivery-confirmation',
          priority: 'high',
          status: 'pending',
          estimatedEarnings: 25000,
          orderValue: 3500000,
          deliveryWindow: '2024-12-29 14:00 - 16:00',
          carrier: 'Sendy',
          trackingNumber: 'SND-2024-001',
          specialInstructions: 'Call customer before delivery, apartment building requires access code',
          proofRequired: ['photo', 'signature', 'gps'],
          createdAt: '2024-12-29 12:30'
        },
        {
          id: 'LOG-002',
          orderId: 'ORD-2024-5679',
          customerName: 'John Mwalimu',
          customerPhone: '+255723456789',
          deliveryAddress: '456 Nyerere Avenue, Mwanza',
          coordinates: { lat: -4.0435, lng: 39.6682 },
          taskType: 'failed-delivery',
          priority: 'high',
          status: 'pending',
          estimatedEarnings: 30000,
          orderValue: 2800000,
          deliveryWindow: '2024-12-29 10:00 - 12:00',
          carrier: 'DHL Tanzania',
          trackingNumber: 'G4S-2024-002',
          specialInstructions: 'Customer was not available, needs rescheduling',
          proofRequired: ['photo', 'customer-contact'],
          failureReason: 'Customer unavailable',
          createdAt: '2024-12-29 11:15'
        },
        {
          id: 'LOG-003',
          orderId: 'ORD-2024-5680',
          customerName: 'Grace Mbwana',
          customerPhone: '+255734567890',
          deliveryAddress: '789 Kilimanjaro Road, Arusha',
          coordinates: { lat: -0.0917, lng: 34.7680 },
          taskType: 'proof-collection',
          priority: 'medium',
          status: 'in-progress',
          estimatedEarnings: 20000,
          orderValue: 1900000,
          deliveryWindow: 'Completed',
          carrier: 'Tanzania Posts',
          trackingNumber: 'PK-2024-003',
          specialInstructions: 'Delivery completed but proof of service missing',
          proofRequired: ['photo', 'signature'],
          createdAt: '2024-12-29 09:45'
        }
      ],
      completedTasks: [
        {
          id: 'LOG-004',
          orderId: 'ORD-2024-5677',
          customerName: 'Peter Mwanga',
          completedAt: '2024-12-28 15:30',
          taskType: 'delivery-confirmation',
          earnings: 25000,
          proofSubmitted: ['photo', 'signature', 'gps'],
          customerSatisfaction: 5
        },
        {
          id: 'LOG-005',
          orderId: 'ORD-2024-5676',
          customerName: 'Mary Mwalimu',
          completedAt: '2024-12-28 13:20',
          taskType: 'proof-collection',
          earnings: 20000,
          proofSubmitted: ['photo', 'signature'],
          customerSatisfaction: 4
        }
      ]
    }
  });
});

// Start logistics task
router.post('/logistics/tasks/:taskId/start', async (req, res) => {
  const { taskId } = req.params;
  
  console.log(`Starting task ${taskId}`);
  
  res.json({
    success: true,
    message: `Task ${taskId} started successfully`,
    data: {
      taskId,
      status: 'in-progress',
      startedAt: new Date().toISOString()
    }
  });
});

// ===== TASKS API =====
router.get('/tasks', async (req, res) => {
  res.json({
    success: true,
    data: {
      activeTasks: [
        {
          id: 'TASK-001',
          title: 'Seller Onboarding - TechStore Tanzania',
          description: 'Complete onboarding process for new seller partnership',
          status: 'pending',
          priority: 'high',
          type: 'onboarding',
          location: 'Dar es Salaam',
          estimatedTime: '2-3 hours',
          earnings: 75000,
          seller: { name: 'TechStore Tanzania' },
          deadline: '2024-01-20',
          requirements: ['ID verification', 'Business documentation', 'Product catalog setup']
        },
        {
          id: 'TASK-002',
          title: 'Customer Acquisition - Auto Parts Store',
          description: 'Help expand customer base through community outreach and B2B networking',
          status: 'in_progress',
          priority: 'high',
          type: 'sales_support',
          location: 'Mwanza',
          estimatedTime: '4-6 hours',
          earnings: 120000,
          seller: { name: 'Hassan Auto Parts' },
          deadline: '2024-01-25',
          requirements: ['Community networking', 'B2B sales experience', 'Automotive knowledge']
        },
        {
          id: 'TASK-003',
          title: 'Digital Marketing Setup - Fashion Boutique',
          description: 'Set up online store and social media marketing for traditional wear',
          status: 'pending',
          priority: 'medium',
          type: 'digital_marketing',
          location: 'Arusha',
          estimatedTime: '3-4 hours',
          earnings: 90000,
          seller: { name: 'Fatima Fashion Boutique' },
          deadline: '2024-01-22',
          requirements: ['Social media skills', 'Photography', 'Content creation']
        },
        {
          id: 'TASK-004',
          title: 'Logistics Coordination - Electronics Store',
          description: 'Coordinate delivery logistics for bulk electronics order',
          status: 'available',
          priority: 'medium',
          type: 'logistics',
          location: 'Dar es Salaam',
          estimatedTime: '1-2 hours',
          earnings: 45000,
          seller: { name: 'Amina Electronics Store' },
          deadline: '2024-01-18',
          requirements: ['Logistics experience', 'Customer coordination']
        }
      ],
      completedTasks: [
        {
          id: 'TASK-005',
          title: 'Sales Training - Book Center',
          description: 'Conducted sales training session for bookstore staff',
          status: 'completed',
          completedAt: '2024-01-10',
          earnings: 60000,
          rating: 5,
          feedback: 'Excellent training session, very knowledgeable'
        },
        {
          id: 'TASK-006',
          title: 'Market Research - Food Supplies',
          description: 'Conducted market research for expanding food supply business',
          status: 'completed',
          completedAt: '2024-01-08',
          earnings: 80000,
          rating: 4,
          feedback: 'Good research work, provided valuable insights'
        }
      ],
      stats: {
        availableTasks: 4,
        activeTasks: 2,
        completedTasks: 2,
        totalEarnings: 415000,
        averageRating: 4.5
      }
    }
  });
});

router.get('/performance', async (req, res) => {
  res.json({
    success: true,
    data: {
      overview: {
        completionRate: 94.5,
        customerSatisfaction: 4.7,
        responseTime: 18,
        monthlyGrowth: 12.5,
        currentRank: 'Gold',
        trustScore: 4.8,
        totalTasks: 127
      },
      trends: [
        { month: 'Jan', value: 85 },
        { month: 'Feb', value: 88 },
        { month: 'Mar', value: 92 },
        { month: 'Apr', value: 89 },
        { month: 'May', value: 94 },
        { month: 'Jun', value: 95 }
      ]
    }
  });
});

// ===== PAYMENTS API =====
router.get('/payments', async (req, res) => {
  res.json({ 
    success: true, 
    data: {
      payments: [
        {
          id: 'PAY-001',
          taskId: 'TASK-001',
          taskTitle: 'Sales Support - TechStore Tanzania',
          amount: 125000,
          status: 'completed',
          completedDate: '2024-01-15',
          paymentDate: '2024-01-16',
          paymentMethod: 'Mobile Money'
        },
        {
          id: 'PAY-002',
          taskId: 'TASK-002',
          taskTitle: 'Logistics Coordination - Fashion Hub',
          amount: 75000,
          status: 'completed',
          completedDate: '2024-01-10',
          paymentDate: '2024-01-11',
          paymentMethod: 'Bank Transfer'
        },
        {
          id: 'PAY-003',
          taskId: 'TASK-003',
          taskTitle: 'Customer Acquisition - Auto Parts Store',
          amount: 95000,
          status: 'processing',
          completedDate: '2024-01-12',
          paymentDate: null,
          paymentMethod: 'Mobile Money'
        }
      ],
      summary: {
        thisMonthEarnings: 295000,
        completedTasks: 3,
        totalEarnings: 1250000,
        pendingPayments: 95000
      }
    }
  });
});

// ===== SALES SUPPORT API =====
router.get('/sales-support', async (req, res) => {
  // This should ideally fetch from seller's enabler-requests, but for now we'll simulate based on seller data
  res.json({
    success: true,
    data: {
      activeSessions: [
        {
          id: 'REQ-001',
          seller: { name: 'Amina Electronics Store' },
          sellerName: 'Amina Electronics Store',
          type: 'sales_support',
          status: 'pending',
          priority: 'high',
          description: 'Need help boosting smartphone sales during holiday season with targeted customer outreach and product demonstrations',
          targetSales: 2500000,
          currentSales: 850000,
          deadline: '2024-01-15',
          products: ['iPhone 15', 'Samsung Galaxy S24', 'Xiaomi Redmi Note 13'],
          requirements: ['Product Knowledge', 'Customer Service', 'Sales Experience'],
          earnings: 125000,
          commission: '5%',
          createdAt: '2024-01-02',
          location: 'Dar es Salaam'
        },
        {
          id: 'REQ-002',
          seller: { name: 'Fatima Fashion Boutique' },
          sellerName: 'Fatima Fashion Boutique',
          type: 'digital_marketing',
          status: 'in_progress',
          priority: 'medium',
          description: 'Assist with online store setup and social media marketing for traditional wear collection',
          targetSales: 1800000,
          currentSales: 1200000,
          deadline: '2024-01-20',
          products: ['Kanga Dresses', 'Traditional Jewelry', 'Headwraps'],
          requirements: ['Social Media Skills', 'Photography', 'Content Creation'],
          earnings: 90000,
          commission: '5%',
          createdAt: '2023-12-28',
          location: 'Arusha'
        },
        {
          id: 'REQ-003',
          seller: { name: 'Hassan Auto Parts' },
          sellerName: 'Hassan Auto Parts',
          type: 'customer_acquisition',
          status: 'pending',
          priority: 'high',
          description: 'Expand customer base for motorcycle spare parts through community outreach and B2B networking',
          targetSales: 3200000,
          currentSales: 450000,
          deadline: '2024-01-25',
          products: ['Motorcycle Engines', 'Brake Pads', 'Tires', 'Oil Filters'],
          requirements: ['Automotive Knowledge', 'Community Networks', 'B2B Sales'],
          earnings: 160000,
          commission: '5%',
          createdAt: '2024-01-01',
          location: 'Mwanza'
        }
      ],
      completedSessions: [
        {
          id: 'REQ-004',
          sellerName: 'Mwalimu Book Center',
          assignmentType: 'bulk_sales',
          successRate: '92%',
          salesAchieved: 1500000,
          targetSales: 1500000,
          earnings: 75000,
          completedAt: '2024-01-05',
          rating: 5
        },
        {
          id: 'REQ-005',
          sellerName: 'Mama Pendo Food Supplies',
          assignmentType: 'b2b_development',
          successRate: '87%',
          salesAchieved: 2800000,
          targetSales: 2800000,
          earnings: 140000,
          completedAt: '2024-01-03',
          rating: 4
        }
      ],
      stats: {
        totalSessions: 5,
        completed: 2,
        active: 3,
        averageRating: 4.7,
        totalEarnings: 590000
      }
    }
  });
});

module.exports = router;
