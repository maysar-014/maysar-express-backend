import express from 'express';

const router = express.Router();

// ===== TASK MANAGEMENT APIs =====
router.get('/tasks', async (req, res) => {
  res.json({ success: true, data: [], stats: { available: 0, assigned: 0, completed: 0 } });
});

router.get('/tasks/available', async (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/tasks/:id/accept', async (req, res) => {
  res.json({ success: true, data: { taskId: req.params.id, status: 'accepted' } });
});

router.put('/tasks/:id/complete', async (req, res) => {
  res.json({ success: true, data: { taskId: req.params.id, completedAt: new Date() } });
});

router.get('/tasks/:id/details', async (req, res) => {
  res.json({ success: true, data: { taskId: req.params.id, details: {} } });
});

router.post('/tasks/:id/evidence', async (req, res) => {
  res.json({ success: true, data: { taskId: req.params.id, evidenceUploaded: true } });
});

// ===== SELLER ONBOARDING APIs =====
router.post('/sellers/onboard', async (req, res) => {
  res.json({ success: true, data: { onboardingId: 'onboard-123', sellerId: req.body.sellerId } });
});

router.get('/sellers/onboarding', async (req, res) => {
  res.json({ success: true, data: [] });
});

router.put('/sellers/onboarding/:id/status', async (req, res) => {
  res.json({ success: true, data: { onboardingId: req.params.id, status: req.body.status } });
});

router.post('/sellers/:id/documents/verify', async (req, res) => {
  res.json({ success: true, data: { sellerId: req.params.id, verified: true } });
});

router.get('/sellers/:id/progress', async (req, res) => {
  res.json({ success: true, data: { sellerId: req.params.id, progress: 0 } });
});

// ===== TRAINING DELIVERY APIs =====
router.get('/training/sessions', async (req, res) => {
  res.json({ success: true, data: [] });
});

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
            'Learn customer acquisition techniques'
          ]
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
            'Learn advanced closing strategies'
          ]
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
            'Implement effective follow-up systems'
          ]
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
            'Track shipments and manage delays'
          ]
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
            'Manage inventory levels effectively'
          ]
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
            'Reduce delivery costs and time'
          ]
        }
      ]
    }
  });
});

router.post('/training/deliver', async (req, res) => {
  res.json({ success: true, data: { sessionId: 'session-123', scheduled: true } });
});

router.put('/training/sessions/:id/complete', async (req, res) => {
  res.json({ success: true, data: { sessionId: req.params.id, completed: true } });
});

router.get('/training/materials', async (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/training/assessment', async (req, res) => {
  res.json({ success: true, data: { assessmentId: 'assess-123', score: req.body.score } });
});

// ===== SKILL DEVELOPMENT APIs =====
router.get('/skills/assessment', async (req, res) => {
  res.json({ success: true, data: { currentSkills: [], gaps: [] } });
});

router.post('/skills/assess', async (req, res) => {
  res.json({ success: true, data: { assessmentId: 'skill-123', results: {} } });
});

router.get('/skills/development-plan', async (req, res) => {
  res.json({ success: true, data: { plan: {}, timeline: {} } });
});

router.post('/skills/enroll', async (req, res) => {
  res.json({ success: true, data: { enrollmentId: 'enroll-123', program: req.body.program } });
});

// ===== PERFORMANCE TRACKING APIs =====
router.get('/performance', async (req, res) => {
  res.json({ success: true, data: { 
    overallScore: 0, 
    tasksCompleted: 0,
    qualityScore: 0,
    earnings: 0 
  }});
});

router.get('/performance/metrics', async (req, res) => {
  res.json({ success: true, data: { daily: {}, weekly: {}, monthly: {} } });
});

router.get('/performance/goals', async (req, res) => {
  res.json({ success: true, data: { goals: [], progress: {} } });
});

router.post('/performance/goals', async (req, res) => {
  res.json({ success: true, data: { goalId: 'goal-123', target: req.body.target } });
});

// ===== EARNINGS & COMMISSION APIs =====
router.get('/earnings', async (req, res) => {
  res.json({ success: true, data: { 
    total: 0, 
    pending: 0, 
    paid: 0,
    thisMonth: 0 
  }});
});

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

router.get('/earnings/breakdown', async (req, res) => {
  res.json({ success: true, data: { 
    taskCommissions: 0, 
    bonuses: 0, 
    training: 0 
  }});
});

router.get('/earnings/history', async (req, res) => {
  res.json({ success: true, data: [] });
});

router.post('/earnings/payout', async (req, res) => {
  res.json({ success: true, data: { payoutId: 'payout-123', amount: req.body.amount } });
});

// ===== SUPPORT SERVICES APIs =====
router.post('/support/logistics', async (req, res) => {
  res.json({ success: true, data: { supportId: 'support-123', type: 'logistics' } });
});

router.post('/support/sales', async (req, res) => {
  res.json({ success: true, data: { supportId: 'support-123', type: 'sales' } });
});

router.get('/support/requests', async (req, res) => {
  res.json({ success: true, data: [] });
});

router.put('/support/:id/resolve', async (req, res) => {
  res.json({ success: true, data: { supportId: req.params.id, resolved: true } });
});

// ===== KYC & VERIFICATION APIs =====
router.get('/kyc/status', async (req, res) => {
  res.json({ success: true, data: { status: 'pending', documents: [] } });
});

router.post('/kyc/documents', async (req, res) => {
  res.json({ success: true, data: { documentId: 'doc-123', uploaded: true } });
});

router.get('/kyc/requirements', async (req, res) => {
  res.json({ success: true, data: { required: [], completed: [] } });
});

// ===== SETTINGS & PREFERENCES APIs =====
router.get('/settings/profile', async (req, res) => {
  res.json({ success: true, data: {} });
});

router.put('/settings/profile', async (req, res) => {
  res.json({ success: true, data: { updated: true } });
});

router.get('/settings/notifications', async (req, res) => {
  res.json({ success: true, data: { preferences: {} } });
});

router.put('/settings/notifications', async (req, res) => {
  res.json({ success: true, data: { updated: true } });
});

router.get('/settings/territory', async (req, res) => {
  res.json({ success: true, data: { region: null, coverage: [] } });
});

router.put('/settings/territory', async (req, res) => {
  res.json({ success: true, data: { updated: true } });
});

// ===== SALES SUPPORT APIs =====
router.get('/sales-support', async (req, res) => {
  console.log('[ENABLER API] Sales support endpoint called');
  const responseData = { 
    success: true, 
    data: {
      activeSessions: [
        {
          id: 'REQ-001',
          sellerName: 'Amina Electronics Store',
          priority: 'high',
          status: 'pending',
          description: 'Need help boosting smartphone sales during holiday season with targeted customer outreach and product demonstrations',
          type: 'sales_support',
          targetSales: 2500000,
          currentSales: 850000,
          deadline: '2024-01-15',
          products: ['iPhone 15', 'Samsung Galaxy S24', 'Xiaomi Redmi Note 13'],
          requirements: ['Product Knowledge', 'Customer Service', 'Sales Experience'],
          earnings: 125000,
          commission: '5%',
          createdAt: '2024-01-02'
        },
        {
          id: 'REQ-002',
          sellerName: 'Fatima Fashion Boutique',
          priority: 'medium',
          status: 'in-progress',
          description: 'Assist with online store setup and social media marketing for traditional wear collection',
          type: 'digital_marketing',
          targetSales: 1800000,
          currentSales: 1200000,
          deadline: '2024-01-20',
          products: ['Kanga Dresses', 'Traditional Jewelry', 'Headwraps'],
          requirements: ['Social Media Skills', 'Photography', 'Content Creation'],
          earnings: 90000,
          commission: '5%',
          createdAt: '2023-12-28'
        },
        {
          id: 'REQ-003',
          sellerName: 'Hassan Auto Parts',
          priority: 'high',
          status: 'pending',
          description: 'Expand customer base for motorcycle spare parts through community outreach and B2B networking',
          type: 'customer_acquisition',
          targetSales: 3200000,
          currentSales: 450000,
          deadline: '2024-01-25',
          products: ['Motorcycle Engines', 'Brake Pads', 'Tires', 'Oil Filters'],
          requirements: ['Automotive Knowledge', 'Community Networks', 'B2B Sales'],
          earnings: 160000,
          commission: '5%',
          createdAt: '2024-01-01'
        }
      ],
      completedSessions: [
        {
          id: 'CA001',
          sellerName: 'Juma Hardware Store',
          assignmentType: 'product-promotion',
          successRate: '95%',
          salesAchieved: 1800000,
          targetSales: 2000000,
          earnings: 90000,
          completedAt: '2023-12-28'
        }
      ],
      stats: {
        totalSessions: 4,
        completed: 1,
        active: 3,
        averageRating: 12.5,
        totalEarnings: 375000,
        averageSessionDuration: '2.5 hours'
      }
    }
  };
  console.log('[ENABLER API] Sending response:', JSON.stringify(responseData, null, 2));
  res.json(responseData);
});

// ===== LOGISTICS SUPPORT APIs =====
router.get('/logistics/tasks', async (req, res) => {
  res.json({ 
    success: true, 
    data: {
      activeTasks: [
        {
          id: 'LT001',
          orderId: 'ORD-2024-001',
          customerName: 'John Mwangi',
          priority: 'high',
          status: 'pending',
          taskType: 'delivery-coordination',
          carrier: 'DHL Express',
          orderValue: 450000,
          deliveryAddress: 'Westlands, Nairobi',
          deliveryWindow: 'Today 2-4 PM',
          specialInstructions: 'Call customer 30 minutes before delivery',
          assignedTo: null,
          commission: 15000
        }
      ],
      completedTasks: [],
      stats: {
        activeTasks: 1,
        completedToday: 0,
        avgResolutionTime: '45m',
        successRate: '95%',
        pendingTasks: 1,
        potentialEarnings: 15000
      }
    }
  });
});

router.post('/logistics/tasks/:id/start', async (req, res) => {
  res.json({ success: true, data: { taskId: req.params.id, status: 'in-progress' } });
});

// ===== DASHBOARD & OVERVIEW APIs =====
router.get('/dashboard', async (req, res) => {
  res.json({ success: true, data: {
    activeTasks: 0,
    todayEarnings: 0,
    performanceScore: 0,
    upcomingTraining: []
  }});
});

export default router;