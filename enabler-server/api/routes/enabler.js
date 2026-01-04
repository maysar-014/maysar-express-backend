const express = require('express');
const router = express.Router();

// ===== DASHBOARD API =====
router.get('/dashboard', async (req, res) => {
  res.json({
    success: true,
    data: {
      stats: {
        totalEarnings: 2450750,
        monthlyEarnings: 850250,
        tasksCompleted: 127,
        activeTasks: 8,
        deliveriesCompleted: 89,
        salesAssisted: 45,
        rank: 'Gold',
        rankProgress: 75,
        trustScore: 4.8,
        completionRate: 94.5
      },
      recentTasks: [
        { id: 1, type: 'Delivery Coordination', order: 'ORD-2024-5678', status: 'completed', earnings: 25000, time: '2 hours ago' },
        { id: 2, type: 'Sales Consultation', seller: 'TechStore TZ', status: 'in-progress', earnings: 15000, time: '30 mins ago' },
        { id: 3, type: 'Delivery Confirmation', order: 'ORD-2024-5679', status: 'pending', earnings: 10000, time: '1 hour ago' },
        { id: 4, type: 'Sales Support', seller: 'Fashion Hub TZ', status: 'completed', earnings: 20000, time: '3 hours ago' }
      ],
      upcomingTasks: [
        { id: 5, type: 'Delivery Pickup', priority: 'high', deadline: '2 hours', earnings: 30000 },
        { id: 6, type: 'Sales Meeting', priority: 'medium', deadline: '4 hours', earnings: 20000 },
        { id: 7, type: 'Logistics Coordination', priority: 'low', deadline: '1 day', earnings: 15000 }
      ]
    }
  });
});

// ===== PROFILE API =====
router.get('/profile', async (req, res) => {
  res.json({
    success: true,
    data: {
      enabler: {
        id: 'enabler-001',
        name: 'Sarah Johnson',
        email: 'sarah@enabler.maysar.com',
        phone: '+255712345678',
        tier: 'gold',
        region: 'East Africa',
        status: 'active',
        joinDate: '2023-06-15T00:00:00Z',
        avatar: null,
        address: 'Dar es Salaam, Tanzania',
        languages: ['English', 'Swahili'],
        specializations: ['Sales Support', 'Logistics Coordination', 'Customer Service']
      },
      tierInfo: {
        name: 'Gold',
        color: 'text-yellow-600',
        commission: 10,
        benefits: [
          'Higher commission rates',
          'Priority task assignment',
          'Advanced analytics access',
          'Training program access'
        ],
        requirements: {
          tasksCompleted: 100,
          trustScore: 4.5,
          completionRate: 90
        }
      }
    }
  });
});

// ===== EARNINGS API =====
router.get('/earnings', async (req, res) => {
  res.json({
    success: true,
    data: {
      wallet: {
        availableBalance: 2450.75,
        pendingEarnings: 185.50,
        totalEarnings: 12750.25,
        thisMonthEarnings: 850.25,
        lastPayoutDate: '2024-12-15',
        nextPayoutDate: '2025-01-15',
        commissionRate: 15,
        rank: 'Gold',
        rankBonus: 5
      },
      transactions: [
        {
          id: 'TXN-001',
          type: 'earning',
          description: 'Seller Verification - TechStore KE',
          amount: 30.00,
          status: 'completed',
          date: '2024-12-29',
          taskId: 'TSK-001',
          commission: 15
        },
        {
          id: 'TXN-002',
          type: 'earning',
          description: 'Buyer Payment Assistance',
          amount: 20.00,
          status: 'completed',
          date: '2024-12-29',
          taskId: 'TSK-002',
          commission: 15
        },
        {
          id: 'TXN-003',
          type: 'payout',
          description: 'Monthly Payout to M-Pesa',
          amount: -1200.00,
          status: 'completed',
          date: '2024-12-15',
          payoutMethod: 'M-Pesa',
          reference: 'MP-2024-12-001'
        },
        {
          id: 'TXN-004',
          type: 'earning',
          description: 'Trust Report Investigation',
          amount: 40.00,
          status: 'pending',
          date: '2024-12-28',
          taskId: 'TSK-004',
          commission: 15
        },
        {
          id: 'TXN-005',
          type: 'bonus',
          description: 'Gold Rank Performance Bonus',
          amount: 50.00,
          status: 'completed',
          date: '2024-12-25',
          bonusType: 'rank'
        }
      ],
      payoutMethods: [
        { id: 'mpesa', name: 'M-Pesa', number: '254712345678', primary: true },
        { id: 'bank', name: 'KCB Bank', account: '****5678', primary: false },
        { id: 'paypal', name: 'PayPal', email: 'sarah@example.com', primary: false }
      ]
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
          id: 'TSK-001',
          title: 'Seller Verification Support',
          type: 'seller_support',
          priority: 'high',
          status: 'in_progress',
          deadline: '2024-12-30T18:00:00Z',
          earnings: 45000,
          description: 'Help new seller complete KYC verification process',
          seller: {
            name: 'TechStore Tanzania',
            email: 'info@techstore.tz',
            phone: '+255712345678'
          },
          progress: 60,
          estimatedTime: '2 hours',
          location: 'Dar es Salaam'
        },
        {
          id: 'TSK-002',
          title: 'Delivery Coordination',
          type: 'logistics',
          priority: 'medium',
          status: 'pending',
          deadline: '2024-12-31T12:00:00Z',
          earnings: 25000,
          description: 'Coordinate delivery for bulk order',
          order: {
            id: 'ORD-2024-5678',
            customer: 'John Doe',
            items: 5,
            value: 450000
          },
          progress: 0,
          estimatedTime: '3 hours',
          location: 'Arusha'
        }
      ],
      completedTasks: [
        {
          id: 'TSK-003',
          title: 'Customer Payment Assistance',
          type: 'buyer_support',
          status: 'completed',
          completedDate: '2024-12-29T14:30:00Z',
          earnings: 20000,
          rating: 5,
          feedback: 'Excellent support, very helpful',
          timeSpent: '1.5 hours'
        }
      ],
      availableTasks: [
        {
          id: 'TSK-004',
          title: 'Sales Training Session',
          type: 'training',
          priority: 'low',
          earnings: 35000,
          description: 'Conduct product training for new sellers',
          requirements: ['Gold tier or above', 'Sales experience'],
          estimatedTime: '4 hours',
          location: 'Mwanza'
        }
      ]
    }
  });
});

// ===== SELLER ONBOARDING API =====
router.get('/seller-onboarding', async (req, res) => {
  res.json({
    success: true,
    data: {
      pendingApplications: [
        {
          id: 'APP-001',
          businessName: 'Fashion Boutique TZ',
          ownerName: 'Mary Mwalimu',
          email: 'mary@fashionboutique.tz',
          phone: '+255712345679',
          businessType: 'Fashion & Clothing',
          location: 'Dar es Salaam',
          submittedDate: '2024-12-28T10:00:00Z',
          status: 'pending_review',
          documents: {
            businessLicense: 'uploaded',
            taxCertificate: 'uploaded',
            bankStatement: 'pending',
            ownerID: 'uploaded'
          },
          progress: 75,
          assignedTo: 'enabler-001',
          priority: 'high'
        },
        {
          id: 'APP-002',
          businessName: 'Electronics Hub',
          ownerName: 'James Kikwete',
          email: 'james@electronichub.tz',
          phone: '+255712345680',
          businessType: 'Electronics',
          location: 'Mwanza',
          submittedDate: '2024-12-27T15:30:00Z',
          status: 'documents_required',
          documents: {
            businessLicense: 'uploaded',
            taxCertificate: 'pending',
            bankStatement: 'pending',
            ownerID: 'uploaded'
          },
          progress: 40,
          assignedTo: 'enabler-001',
          priority: 'medium'
        }
      ],
      recentlyApproved: [
        {
          id: 'APP-003',
          businessName: 'Spice Market TZ',
          ownerName: 'Fatuma Hassan',
          approvedDate: '2024-12-26T12:00:00Z',
          earnings: 50000,
          status: 'active'
        }
      ],
      stats: {
        totalApplications: 45,
        pendingReview: 8,
        approved: 32,
        rejected: 5,
        thisMonthEarnings: 450000
      }
    }
  });
});

// ===== BUYER ASSISTANCE API =====
router.get('/buyer-assistance', async (req, res) => {
  res.json({
    success: true,
    data: {
      activeRequests: [
        {
          id: 'REQ-001',
          customer: {
            name: 'Alice Mwangi',
            email: 'alice@example.com',
            phone: '+254712345678'
          },
          type: 'payment_help',
          priority: 'high',
          status: 'in_progress',
          description: 'Customer needs help with M-Pesa payment for order',
          order: {
            id: 'ORD-2024-5679',
            amount: 125000,
            seller: 'TechStore TZ'
          },
          createdDate: '2024-12-29T09:00:00Z',
          estimatedEarnings: 15000
        },
        {
          id: 'REQ-002',
          customer: {
            name: 'David Kimani',
            email: 'david@example.com',
            phone: '+254712345679'
          },
          type: 'product_inquiry',
          priority: 'medium',
          status: 'pending',
          description: 'Customer wants product recommendations for electronics',
          category: 'Electronics',
          budget: 200000,
          createdDate: '2024-12-29T11:30:00Z',
          estimatedEarnings: 20000
        }
      ],
      completedRequests: [
        {
          id: 'REQ-003',
          customer: {
            name: 'Grace Wanjiku',
            email: 'grace@example.com'
          },
          type: 'order_tracking',
          completedDate: '2024-12-28T16:00:00Z',
          earnings: 10000,
          rating: 5,
          feedback: 'Very helpful with tracking my order'
        }
      ],
      stats: {
        totalRequests: 156,
        completed: 142,
        active: 14,
        averageRating: 4.8,
        totalEarnings: 890000
      }
    }
  });
});

// ===== PERFORMANCE API =====
router.get('/performance', async (req, res) => {
  res.json({
    success: true,
    data: {
      overview: {
        currentRank: 'Gold',
        trustScore: 4.8,
        completionRate: 94.5,
        responseTime: '12 minutes',
        customerSatisfaction: 4.9,
        totalTasks: 127,
        monthlyGrowth: 15.2
      },
      rankings: {
        regional: {
          position: 3,
          total: 45,
          region: 'East Africa'
        },
        national: {
          position: 12,
          total: 234,
          country: 'Tanzania'
        },
        global: {
          position: 89,
          total: 1567
        }
      },
      metrics: [
        {
          name: 'Task Completion Rate',
          value: 94.5,
          target: 90,
          trend: 'up',
          change: 2.3
        },
        {
          name: 'Customer Rating',
          value: 4.8,
          target: 4.5,
          trend: 'up',
          change: 0.2
        },
        {
          name: 'Response Time',
          value: 12,
          target: 15,
          trend: 'down',
          change: -3,
          unit: 'minutes'
        },
        {
          name: 'Monthly Earnings',
          value: 850250,
          target: 800000,
          trend: 'up',
          change: 6.3,
          unit: 'TZS'
        }
      ],
      achievements: [
        {
          id: 'ACH-001',
          title: 'Gold Enabler',
          description: 'Reached Gold tier status',
          earnedDate: '2024-11-15T00:00:00Z',
          icon: '🏆',
          category: 'rank'
        },
        {
          id: 'ACH-002',
          title: 'Customer Champion',
          description: 'Maintained 4.8+ rating for 3 months',
          earnedDate: '2024-12-01T00:00:00Z',
          icon: '⭐',
          category: 'service'
        }
      ]
    }
  });
});

// ===== TRAINING API =====
router.get('/training', async (req, res) => {
  res.json({
    success: true,
    data: {
      availableCourses: [
        {
          id: 'COURSE-001',
          title: 'Advanced Sales Techniques',
          description: 'Master advanced sales strategies and customer psychology',
          duration: '4 hours',
          level: 'Advanced',
          category: 'Sales',
          instructor: 'Dr. John Mwangi',
          rating: 4.7,
          enrolled: 234,
          price: 0,
          status: 'available',
          modules: [
            'Understanding Customer Psychology',
            'Objection Handling',
            'Closing Techniques',
            'Follow-up Strategies'
          ]
        },
        {
          id: 'COURSE-002',
          title: 'Digital Payment Systems',
          description: 'Learn about mobile money and digital payment platforms',
          duration: '2 hours',
          level: 'Intermediate',
          category: 'Technology',
          instructor: 'Sarah Kimani',
          rating: 4.9,
          enrolled: 456,
          price: 0,
          status: 'available',
          modules: [
            'M-Pesa Integration',
            'Bank Transfer Systems',
            'Payment Security',
            'Troubleshooting'
          ]
        }
      ],
      enrolledCourses: [
        {
          id: 'COURSE-003',
          title: 'Customer Service Excellence',
          progress: 75,
          completedModules: 3,
          totalModules: 4,
          lastAccessed: '2024-12-28T14:00:00Z',
          certificateEligible: false
        }
      ],
      completedCourses: [
        {
          id: 'COURSE-004',
          title: 'Basic Logistics Management',
          completedDate: '2024-12-20T00:00:00Z',
          certificateId: 'CERT-001',
          score: 92,
          duration: '3 hours'
        }
      ],
      certificates: [
        {
          id: 'CERT-001',
          courseTitle: 'Basic Logistics Management',
          issuedDate: '2024-12-20T00:00:00Z',
          score: 92,
          validUntil: '2025-12-20T00:00:00Z',
          downloadUrl: '/certificates/CERT-001.pdf'
        }
      ]
    }
  });
});

// ===== LOGISTICS API =====
router.get('/logistics', async (req, res) => {
  res.json({
    success: true,
    data: {
      activeDeliveries: [
        {
          id: 'DEL-001',
          orderId: 'ORD-2024-5678',
          customer: {
            name: 'John Doe',
            phone: '+255712345678',
            address: 'Mikocheni, Dar es Salaam'
          },
          seller: {
            name: 'TechStore TZ',
            location: 'Kariakoo, Dar es Salaam'
          },
          status: 'in_transit',
          priority: 'high',
          estimatedDelivery: '2024-12-30T15:00:00Z',
          earnings: 25000,
          distance: '12 km',
          items: [
            { name: 'Samsung Galaxy A54', quantity: 1, value: 450000 }
          ]
        },
        {
          id: 'DEL-002',
          orderId: 'ORD-2024-5679',
          customer: {
            name: 'Mary Johnson',
            phone: '+255712345679',
            address: 'Sinza, Dar es Salaam'
          },
          seller: {
            name: 'Fashion Hub TZ',
            location: 'Mwenge, Dar es Salaam'
          },
          status: 'pickup_pending',
          priority: 'medium',
          estimatedDelivery: '2024-12-31T10:00:00Z',
          earnings: 20000,
          distance: '8 km',
          items: [
            { name: 'Designer Dress', quantity: 2, value: 180000 }
          ]
        }
      ],
      completedDeliveries: [
        {
          id: 'DEL-003',
          orderId: 'ORD-2024-5677',
          completedDate: '2024-12-28T16:30:00Z',
          earnings: 30000,
          rating: 5,
          feedback: 'Fast and professional delivery',
          distance: '15 km',
          deliveryTime: '45 minutes'
        }
      ],
      stats: {
        totalDeliveries: 89,
        completedToday: 5,
        averageRating: 4.9,
        totalEarnings: 1250000,
        averageDeliveryTime: '38 minutes',
        onTimeDeliveryRate: 96.5
      },
      routes: [
        {
          id: 'ROUTE-001',
          name: 'Dar es Salaam Central',
          deliveries: 3,
          estimatedTime: '4 hours',
          totalEarnings: 75000,
          status: 'active'
        }
      ]
    }
  });
});

// ===== TRUST REPORTS API =====
router.get('/trust-reports', async (req, res) => {
  res.json({
    success: true,
    data: {
      activeReports: [
        {
          id: 'RPT-001',
          type: 'seller_dispute',
          priority: 'high',
          status: 'investigating',
          reportedBy: {
            name: 'Alice Mwangi',
            type: 'customer',
            orderId: 'ORD-2024-5680'
          },
          reportedSeller: {
            name: 'QuickStore TZ',
            id: 'SELLER-123'
          },
          description: 'Product not as described, seller not responding',
          createdDate: '2024-12-29T08:00:00Z',
          deadline: '2024-12-31T18:00:00Z',
          earnings: 40000,
          evidence: [
            { type: 'image', name: 'product_received.jpg' },
            { type: 'chat', name: 'conversation_log.txt' }
          ]
        },
        {
          id: 'RPT-002',
          type: 'payment_issue',
          priority: 'medium',
          status: 'pending_review',
          reportedBy: {
            name: 'David Kimani',
            type: 'customer',
            orderId: 'ORD-2024-5681'
          },
          description: 'Payment deducted but order not confirmed',
          createdDate: '2024-12-28T14:30:00Z',
          deadline: '2025-01-02T18:00:00Z',
          earnings: 25000,
          paymentAmount: 125000
        }
      ],
      resolvedReports: [
        {
          id: 'RPT-003',
          type: 'delivery_delay',
          resolvedDate: '2024-12-27T16:00:00Z',
          resolution: 'Refund processed, seller warned',
          earnings: 35000,
          rating: 5,
          feedback: 'Fair and quick resolution'
        }
      ],
      stats: {
        totalReports: 45,
        resolved: 38,
        active: 7,
        averageResolutionTime: '2.5 days',
        successRate: 94.2,
        totalEarnings: 890000
      }
    }
  });
});

// ===== SALES SUPPORT API =====
router.get('/sales-support', async (req, res) => {
  res.json({
    success: true,
    data: {
      activeSessions: [
        {
          id: 'SESS-001',
          seller: {
            name: 'TechStore TZ',
            id: 'SELLER-001',
            tier: 'Premium'
          },
          type: 'product_consultation',
          status: 'in_progress',
          startTime: '2024-12-29T10:00:00Z',
          estimatedDuration: '2 hours',
          earnings: 45000,
          topics: ['Product Photography', 'Pricing Strategy', 'Customer Communication'],
          progress: 60
        },
        {
          id: 'SESS-002',
          seller: {
            name: 'Fashion Hub TZ',
            id: 'SELLER-002',
            tier: 'Standard'
          },
          type: 'marketing_strategy',
          status: 'scheduled',
          scheduledTime: '2024-12-30T14:00:00Z',
          estimatedDuration: '1.5 hours',
          earnings: 35000,
          topics: ['Social Media Marketing', 'Customer Retention']
        }
      ],
      completedSessions: [
        {
          id: 'SESS-003',
          seller: {
            name: 'Spice Market TZ',
            id: 'SELLER-003'
          },
          type: 'inventory_management',
          completedDate: '2024-12-28T15:30:00Z',
          duration: '1 hour',
          earnings: 25000,
          rating: 5,
          feedback: 'Very helpful session, improved my inventory tracking'
        }
      ],
      stats: {
        totalSessions: 78,
        completed: 71,
        active: 7,
        averageRating: 4.7,
        totalEarnings: 1450000,
        averageSessionDuration: '1.8 hours'
      },
      expertise: [
        { area: 'Product Photography', level: 'Expert', sessions: 25 },
        { area: 'Pricing Strategy', level: 'Advanced', sessions: 18 },
        { area: 'Customer Service', level: 'Expert', sessions: 32 },
        { area: 'Marketing', level: 'Intermediate', sessions: 12 }
      ]
    }
  });
});

// ===== SETTINGS API =====
router.get('/settings', async (req, res) => {
  res.json({
    success: true,
    data: {
      profile: {
        name: 'Sarah Johnson',
        email: 'sarah@enabler.maysar.com',
        phone: '+255712345678',
        address: 'Dar es Salaam, Tanzania',
        languages: ['English', 'Swahili'],
        timezone: 'Africa/Dar_es_Salaam',
        avatar: null
      },
      preferences: {
        notifications: {
          email: true,
          sms: true,
          push: true,
          taskReminders: true,
          paymentAlerts: true,
          performanceUpdates: false
        },
        availability: {
          monday: { available: true, start: '08:00', end: '18:00' },
          tuesday: { available: true, start: '08:00', end: '18:00' },
          wednesday: { available: true, start: '08:00', end: '18:00' },
          thursday: { available: true, start: '08:00', end: '18:00' },
          friday: { available: true, start: '08:00', end: '18:00' },
          saturday: { available: true, start: '09:00', end: '15:00' },
          sunday: { available: false, start: null, end: null }
        },
        workPreferences: {
          maxDailyTasks: 8,
          preferredTaskTypes: ['sales_support', 'logistics', 'training'],
          travelRadius: 25,
          autoAcceptTasks: false
        }
      },
      security: {
        twoFactorEnabled: true,
        lastPasswordChange: '2024-11-15T00:00:00Z',
        activeSessions: 2,
        loginHistory: [
          { date: '2024-12-29T08:00:00Z', location: 'Dar es Salaam, TZ', device: 'Chrome on Windows' },
          { date: '2024-12-28T07:30:00Z', location: 'Dar es Salaam, TZ', device: 'Mobile App' }
        ]
      }
    }
  });
});

// ===== KYC API =====
router.get('/kyc', async (req, res) => {
  res.json({
    success: true,
    data: {
      status: {
        level: 'Level 2',
        status: 'verified',
        verifiedDate: '2023-12-15T10:00:00Z',
        overallProgress: 85,
        nextReviewDate: '2024-12-15T00:00:00Z'
      },
      personalInfo: {
        fullName: 'Sarah Johnson',
        nationalId: '19901234567890',
        dateOfBirth: '1990-03-22',
        phoneNumber: '+255712345678',
        email: 'sarah@enabler.maysar.com',
        address: 'Mikocheni, Dar es Salaam',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        verificationStatus: 'verified'
      },
      documents: [
        {
          type: 'National ID Front',
          status: 'verified',
          uploadDate: '2023-12-10T14:30:00Z',
          verifiedDate: '2023-12-11T09:15:00Z',
          fileName: 'national_id_front.jpg',
          required: true
        },
        {
          type: 'National ID Back',
          status: 'verified',
          uploadDate: '2023-12-10T14:31:00Z',
          verifiedDate: '2023-12-11T09:15:00Z',
          fileName: 'national_id_back.jpg',
          required: true
        },
        {
          type: 'Bank Statement',
          status: 'verified',
          uploadDate: '2023-12-14T16:20:00Z',
          verifiedDate: '2023-12-15T10:00:00Z',
          fileName: 'bank_statement_3months.pdf',
          required: true
        }
      ],
      bankDetails: {
        bankName: 'CRDB Bank',
        accountNumber: '0150123456789',
        accountName: 'Sarah Johnson',
        branchCode: 'CRDB001',
        swiftCode: 'CORUTZTZ',
        verificationStatus: 'verified',
        verifiedDate: '2023-12-13T11:30:00Z'
      }
    }
  });
});

module.exports = router;