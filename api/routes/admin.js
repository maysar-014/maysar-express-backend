const express = require('express');

const router = express.Router();

// Add logging middleware for debugging
router.use((req, res, next) => {
  console.log(`[ADMIN API] ${new Date().toISOString()} ${req.method} ${req.path}`, req.query);
  next();
});

// ===== DASHBOARD APIs =====
router.get('/dashboard', async (req, res) => {
  res.json({ 
    success: true, 
    data: {
      totalUsers: {
        count: 15420,
        growth: 12.5,
        trend: 'up'
      },
      activeUsers: {
        count: 12340,
        growth: 8.2,
        trend: 'up'
      },
      totalRevenue: {
        amount: 2450000,
        currency: 'TSh',
        formatted: 'TSh 2,450,000.00',
        growth: 15.3,
        trend: 'up'
      },
      monthlyRevenue: {
        amount: 245000,
        currency: 'TSh',
        formatted: 'TSh 245,000.00',
        growth: 22.1,
        trend: 'up'
      },
      totalOrders: {
        count: 89340,
        growth: 18.7,
        trend: 'up'
      },
      pendingOrders: {
        count: 234,
        growth: -5.2,
        trend: 'down'
      },
      systemHealth: {
        status: 'Healthy',
        uptime: 99.9,
        responseTime: 120,
        activeServices: { active: 12, total: 12 }
      },
      recentActivity: [
        {
          id: 'activity-1',
          type: 'user_registered',
          description: 'New seller registered: Tech Store',
          timestamp: '2024-01-15T14:30:00Z',
          user: 'seller-123'
        },
        {
          id: 'activity-2',
          type: 'order_completed',
          description: 'Order #ORD-789 completed successfully',
          timestamp: '2024-01-15T14:25:00Z',
          amount: 'TSh 45,600'
        }
      ],
      topPerformingProducts: {
        reportUrl: '/admin/reports/top-products',
        summary: 'Electronics leading with 34% of total sales'
      },
      systemAlerts: {
        critical: 0,
        warnings: 0,
        info: 3
      },
      performanceOverview: {
        apiUptime: {
          value: 99.9,
          unit: '%',
          status: 'excellent'
        },
        avgResponseTime: {
          value: 120,
          unit: 'ms',
          status: 'good'
        },
        cacheEfficiency: {
          value: 94.2,
          unit: '%',
          status: 'excellent'
        }
      }
    }
  });
});

// ===== ADMIN USERS APIs =====
router.get('/admin-users', async (req, res) => {
  res.json({ 
    success: true, 
    data: {
      stats: {
        totalAdmins: 12,
        activeAdmins: 10,
        mfaEnabled: 8,
        superAdmins: 3
      },
      admins: [
        {
          id: 'admin-1',
          name: 'John Smith',
          email: 'john.smith@maysar.com',
          role: 'Super Admin',
          status: 'Active',
          mfa: true,
          ipWhitelist: ['192.168.1.100', '10.0.0.50'],
          lastLogin: '2024-01-15T10:30:00Z',
          createdAt: '2023-06-01T08:15:00Z'
        },
        {
          id: 'admin-2',
          name: 'Sarah Johnson',
          email: 'sarah.johnson@maysar.com',
          role: 'Admin',
          status: 'Active',
          mfa: true,
          ipWhitelist: ['192.168.1.101'],
          lastLogin: '2024-01-15T09:45:00Z',
          createdAt: '2023-07-15T14:20:00Z'
        }
      ],
      roles: {
        'Super Admin': { permissions: ['all'] },
        'Admin': { permissions: ['users', 'finance', 'kyc', 'compliance'] },
        'Moderator': { permissions: ['users', 'kyc'] }
      }
    }
  });
});

// ===== PLATFORM USERS APIs =====
router.get('/platform-users', async (req, res) => {
  const { tab = 'users' } = req.query;
  
  const baseData = {
    stats: {
      totalUsers: 15420,
      activeUsers: 12340,
      suspended: 1080,
      activeSessions: 2847,
      securityEvents: 23
    },
    filters: {
      status: ['Active', 'Inactive', 'Suspended', 'Pending'],
      kycLevel: ['Level 0', 'Level 1', 'Level 2', 'Level 3'],
      riskScore: ['Low', 'Medium', 'High', 'Critical'],
      verification: ['Verified', 'Pending', 'Rejected', 'Not Started']
    }
  };

  if (tab === 'users') {
    res.json({
      success: true,
      data: {
        ...baseData,
        users: [
          {
            id: 'user-1',
            name: 'John Customer',
            email: 'john@customer.com',
            phone: '+255123456789',
            status: 'Active',
            kycLevel: 'Level 2',
            riskScore: 'Low',
            verification: 'Verified',
            joinedAt: '2023-12-01T00:00:00Z',
            lastActive: '2024-01-15T09:15:00Z',
            location: 'Dar es Salaam, Tanzania',
            totalOrders: 45,
            totalSpent: 125000
          }
        ]
      }
    });
  } else if (tab === 'sessions') {
    res.json({
      success: true,
      data: {
        ...baseData,
        sessions: [
          {
            id: 'session-1',
            userId: 'user-1',
            userName: 'John Customer',
            device: 'Chrome on Windows',
            location: 'Dar es Salaam, Tanzania',
            ipAddress: '41.93.64.15',
            startTime: '2024-01-15T08:30:00Z',
            lastActivity: '2024-01-15T14:45:00Z',
            status: 'Active'
          }
        ]
      }
    });
  } else if (tab === 'security') {
    res.json({
      success: true,
      data: {
        ...baseData,
        securityEvents: [
          {
            id: 'event-1',
            userId: 'user-1',
            userName: 'John Customer',
            eventType: 'Suspicious Login',
            severity: 'Medium',
            description: 'Login from new device',
            timestamp: '2024-01-15T10:30:00Z',
            ipAddress: '41.93.64.15',
            status: 'Resolved'
          }
        ]
      }
    });
  }
});

// ===== SELLERS MANAGEMENT APIs =====
router.get('/sellers', async (req, res) => {
  const { tab = 'overview' } = req.query;
  
  const baseData = {
    tierDistribution: {
      starter: { count: 2340, revenue: 450000, avgRating: 4.2 },
      growth: { count: 1850, revenue: 1250000, avgRating: 4.4 },
      premium: { count: 890, revenue: 2100000, avgRating: 4.6 },
      elite: { count: 320, revenue: 3200000, avgRating: 4.8 },
      partner: { count: 45, revenue: 5800000, avgRating: 4.9 }
    }
  };

  if (tab === 'overview') {
    res.json({
      success: true,
      data: {
        ...baseData,
        sellers: [
          {
            id: 'seller-1',
            businessName: 'Tech Electronics Store',
            ownerName: 'John Smith',
            email: 'john@techstore.com',
            phone: '+255123456789',
            businessType: 'Electronics',
            tier: 'Premium',
            status: 'Active',
            kycStatus: 'Verified',
            joinedAt: '2023-12-01T00:00:00Z',
            location: 'Dar es Salaam, Tanzania',
            metrics: {
              totalOrders: 1250,
              monthlyOrders: 89,
              revenue: 125000,
              monthlyRevenue: 12500,
              rating: 4.7,
              products: 89,
              activeProducts: 76,
              fulfillmentRate: 94.2,
              responseTime: 2.3,
              disputes: 3,
              returns: 12
            }
          }
        ]
      }
    });
  } else {
    res.json({
      success: true,
      data: {
        ...baseData,
        message: `${tab} tab data`
      }
    });
  }
});

// ===== ENABLERS MANAGEMENT APIs =====
router.get('/enablers', async (req, res) => {
  res.json({ 
    success: true, 
    data: {
      stats: {
        totalEnablers: 1250,
        activeEnablers: 1089,
        avgPerformance: 87.3,
        performanceGrowth: 5.2,
        totalEarnings: 2450000,
        earningsGrowth: 12.8,
        topTier: {
          directors: 45,
          masters: 89
        }
      },
      tierDistribution: {
        trainee: { count: 234 },
        associate: { count: 189 },
        specialist: { count: 156 },
        senior: { count: 123 },
        expert: { count: 98 },
        master: { count: 89 },
        director: { count: 45 }
      },
      enablers: [
        {
          id: 'enabler-1',
          name: 'Sarah Johnson',
          email: 'sarah@enabler.com',
          phone: '+255123456789',
          tier: 'Master',
          performance: 94.5,
          orders: 145,
          rating: 4.8,
          earnings: 125000,
          status: 'Active',
          territory: 'Dar es Salaam',
          joinedAt: '2023-08-15T00:00:00Z',
          lastActive: '2024-01-15T14:30:00Z'
        }
      ]
    }
  });
});

// ===== SUPPLIERS MANAGEMENT APIs =====
router.get('/suppliers', async (req, res) => {
  res.json({ 
    success: true, 
    data: {
      stats: {
        totalSuppliers: 890,
        activeSuppliers: 756,
        avgReliability: 92.4,
        reliabilityGrowth: 3.8,
        supplyVolume: 15600000,
        volumeGrowth: 18.5,
        topTier: {
          alliance: 23,
          enterprise: 67
        }
      },
      tierDistribution: {
        vendor: { count: 234 },
        provider: { count: 189 },
        distributor: { count: 156 },
        wholesaler: { count: 123 },
        enterprise: { count: 67 },
        alliance: { count: 23 }
      },
      suppliers: [
        {
          id: 'supplier-1',
          name: 'Global Manufacturing Co',
          email: 'mike@globalmanuf.com',
          tier: 'Enterprise',
          categories: ['Manufacturing', 'Electronics'],
          productsSupplied: 156,
          totalVolume: 2450000,
          avgDeliveryTime: 3,
          qualityRating: 4.8,
          commissionEarned: 450000,
          status: 'active',
          joinedAt: '2023-06-15T00:00:00Z',
          lastDelivery: '2024-01-15T10:30:00Z',
          reliabilityScore: 96.8,
          regions: ['Dar es Salaam', 'Arusha']
        },
        {
          id: 'supplier-2',
          name: 'East Africa Textiles Ltd',
          email: 'contact@eatextiles.com',
          tier: 'Wholesaler',
          categories: ['Fashion', 'Textiles'],
          productsSupplied: 89,
          totalVolume: 1200000,
          avgDeliveryTime: 5,
          qualityRating: 4.3,
          commissionEarned: 180000,
          status: 'active',
          joinedAt: '2023-08-20T00:00:00Z',
          lastDelivery: '2024-01-14T16:45:00Z',
          reliabilityScore: 88.5,
          regions: ['Dar es Salaam']
        },
        {
          id: 'supplier-3',
          name: 'Fresh Foods Distribution',
          email: 'orders@freshfoods.co.tz',
          tier: 'Provider',
          categories: ['Food & Beverages'],
          productsSupplied: 234,
          totalVolume: 890000,
          avgDeliveryTime: 1,
          qualityRating: 4.6,
          commissionEarned: 95000,
          status: 'active',
          joinedAt: '2023-11-10T00:00:00Z',
          lastDelivery: '2024-01-15T08:20:00Z',
          reliabilityScore: 94.2,
          regions: ['Dar es Salaam', 'Dodoma', 'Mwanza']
        }
      ]
    }
  });
});

// ===== FINANCE MANAGEMENT APIs =====
router.get('/finance', async (req, res) => {
  const baseData = {
    stats: {
      totalRevenue: {
        amount: 2450000,
        formatted: 'TSh 2,450,000.00',
        growth: 12.5
      },
      platformCommissions: {
        amount: 245000,
        formatted: 'TSh 245,000.00',
        growth: 8.2
      },
      activeGateways: {
        count: 4,
        avgSuccess: 97.8
      },
      pendingChargebacks: {
        count: 12,
        totalExposure: 89000,
        formattedExposure: 'TSh 89,000.00'
      }
    },
    revenueTrend: [
      { date: '2024-01-01', totalRevenue: 78000, commissions: 7800, platformFees: 3900, refunds: 1200, chargebacks: 500, netRevenue: 72800 },
      { date: '2024-01-02', totalRevenue: 82000, commissions: 8200, platformFees: 4100, refunds: 1100, chargebacks: 300, netRevenue: 76500 },
      { date: '2024-01-03', totalRevenue: 75000, commissions: 7500, platformFees: 3750, refunds: 900, chargebacks: 200, netRevenue: 70150 },
      { date: '2024-01-04', totalRevenue: 89000, commissions: 8900, platformFees: 4450, refunds: 1300, chargebacks: 400, netRevenue: 82850 },
      { date: '2024-01-05', totalRevenue: 94000, commissions: 9400, platformFees: 4700, refunds: 1000, chargebacks: 600, netRevenue: 87700 },
      { date: '2024-01-06', totalRevenue: 87000, commissions: 8700, platformFees: 4350, refunds: 1150, chargebacks: 350, netRevenue: 81150 },
      { date: '2024-01-07', totalRevenue: 91000, commissions: 9100, platformFees: 4550, refunds: 1250, chargebacks: 450, netRevenue: 84750 }
    ],
    gateways: [
      {
        id: 'gw-1',
        name: 'Stripe Tanzania',
        provider: 'stripe',
        status: 'active',
        transactionFee: 2.9,
        monthlyFee: 0,
        successRate: 98.5,
        avgProcessingTime: 1.2,
        totalVolume: 1250000,
        totalTransactions: 15420,
        lastHealthCheck: '2024-01-15T14:30:00Z',
        configuration: {}
      },
      {
        id: 'gw-2',
        name: 'PayPal Business',
        provider: 'paypal',
        status: 'active',
        transactionFee: 3.4,
        monthlyFee: 30,
        successRate: 96.8,
        avgProcessingTime: 2.1,
        totalVolume: 890000,
        totalTransactions: 8950,
        lastHealthCheck: '2024-01-15T14:25:00Z',
        configuration: {}
      },
      {
        id: 'gw-3',
        name: 'M-Pesa Gateway',
        provider: 'square',
        status: 'active',
        transactionFee: 1.5,
        monthlyFee: 0,
        successRate: 99.2,
        avgProcessingTime: 0.8,
        totalVolume: 2100000,
        totalTransactions: 28450,
        lastHealthCheck: '2024-01-15T14:35:00Z',
        configuration: {}
      },
      {
        id: 'gw-4',
        name: 'Adyen East Africa',
        provider: 'adyen',
        status: 'maintenance',
        transactionFee: 2.2,
        monthlyFee: 50,
        successRate: 97.1,
        avgProcessingTime: 1.5,
        totalVolume: 650000,
        totalTransactions: 5230,
        lastHealthCheck: '2024-01-15T12:00:00Z',
        configuration: {}
      }
    ],
    chargebacks: [
      {
        id: 'cb-1',
        transactionId: 'txn-12345',
        orderId: 'ORD-789',
        customerId: 'cust-456',
        sellerId: 'seller-123',
        amount: 45000,
        reason: 'Product not received',
        status: 'pending',
        createdAt: '2024-01-10T10:30:00Z',
        dueDate: '2024-01-25T23:59:59Z',
        evidence: [],
        responseSubmitted: false
      },
      {
        id: 'cb-2',
        transactionId: 'txn-67890',
        orderId: 'ORD-456',
        customerId: 'cust-789',
        sellerId: 'seller-456',
        amount: 23000,
        reason: 'Unauthorized transaction',
        status: 'disputed',
        createdAt: '2024-01-08T15:20:00Z',
        dueDate: '2024-01-23T23:59:59Z',
        evidence: ['receipt.pdf', 'shipping_proof.jpg'],
        responseSubmitted: true
      },
      {
        id: 'cb-3',
        transactionId: 'txn-11111',
        orderId: 'ORD-123',
        customerId: 'cust-111',
        sellerId: 'seller-789',
        amount: 21000,
        reason: 'Product defective',
        status: 'won',
        createdAt: '2024-01-05T09:15:00Z',
        dueDate: '2024-01-20T23:59:59Z',
        evidence: ['quality_report.pdf', 'customer_communication.txt'],
        responseSubmitted: true
      }
    ],
    commissions: [
      {
        id: 'comm-1',
        name: 'Seller Premium Electronics',
        role: 'seller',
        tier: 'Premium',
        category: 'Electronics',
        commissionRate: 5.5,
        minimumAmount: 1000,
        maximumAmount: null,
        effectiveFrom: '2024-01-01T00:00:00Z',
        effectiveTo: null,
        isActive: true
      },
      {
        id: 'comm-2',
        name: 'Enabler Master General',
        role: 'enabler',
        tier: 'Master',
        category: 'General',
        commissionRate: 3.2,
        minimumAmount: 500,
        maximumAmount: null,
        effectiveFrom: '2024-01-01T00:00:00Z',
        effectiveTo: null,
        isActive: true
      },
      {
        id: 'comm-3',
        name: 'Supplier Enterprise Fashion',
        role: 'supplier',
        tier: 'Enterprise',
        category: 'Fashion',
        commissionRate: 4.8,
        minimumAmount: 2000,
        maximumAmount: null,
        effectiveFrom: '2024-01-01T00:00:00Z',
        effectiveTo: null,
        isActive: true
      },
      {
        id: 'comm-4',
        name: 'Seller Growth Home & Garden',
        role: 'seller',
        tier: 'Growth',
        category: 'Home & Garden',
        commissionRate: 6.2,
        minimumAmount: 750,
        maximumAmount: null,
        effectiveFrom: '2024-01-01T00:00:00Z',
        effectiveTo: null,
        isActive: true
      },
      {
        id: 'comm-5',
        name: 'Enabler Director Premium',
        role: 'enabler',
        tier: 'Director',
        category: 'Premium Services',
        commissionRate: 2.8,
        minimumAmount: 1500,
        maximumAmount: null,
        effectiveFrom: '2024-01-01T00:00:00Z',
        effectiveTo: null,
        isActive: false
      }
    ]
  };

  res.json({
    success: true,
    data: baseData
  });
});

// ===== COMPLIANCE MANAGEMENT APIs =====
router.get('/compliance', async (req, res) => {
  const { tab = 'dashboard' } = req.query;
  
  const baseData = {
    stats: {
      pendingGdpr: 8,
      gdprCompleted: 47,
      openAmlAlerts: 5,
      highRiskAml: 2,
      complianceScore: 94.2,
      scoreGrowth: 2.1,
      reportsDue: 3,
      nextReport: 'TRA VAT (15th)'
    },
    gdprRequests: [
      {
        id: 'gdpr-001',
        type: 'Data Export',
        customer: 'John Customer',
        status: 'pending',
        requestDate: '2024-01-15T10:30:00Z',
        dueDate: '2024-02-14T10:30:00Z'
      },
      {
        id: 'gdpr-002',
        type: 'Data Deletion',
        customer: 'Sarah Wilson',
        status: 'in_progress',
        requestDate: '2024-01-12T14:20:00Z',
        dueDate: '2024-02-11T14:20:00Z'
      },
      {
        id: 'gdpr-003',
        type: 'Data Rectification',
        customer: 'Michael Brown',
        status: 'pending',
        requestDate: '2024-01-10T09:15:00Z',
        dueDate: '2024-02-09T09:15:00Z'
      },
      {
        id: 'gdpr-004',
        type: 'Data Export',
        customer: 'Emma Davis',
        status: 'completed',
        requestDate: '2024-01-08T16:45:00Z',
        dueDate: '2024-02-07T16:45:00Z',
        completedDate: '2024-01-20T11:30:00Z'
      },
      {
        id: 'gdpr-005',
        type: 'Data Portability',
        customer: 'James Miller',
        status: 'pending',
        requestDate: '2024-01-05T13:10:00Z',
        dueDate: '2024-02-04T13:10:00Z'
      },
      {
        id: 'gdpr-006',
        type: 'Access Request',
        customer: 'Lisa Anderson',
        status: 'in_progress',
        requestDate: '2024-01-03T08:25:00Z',
        dueDate: '2024-02-02T08:25:00Z'
      },
      {
        id: 'gdpr-007',
        type: 'Data Deletion',
        customer: 'Robert Taylor',
        status: 'pending',
        requestDate: '2024-01-01T12:00:00Z',
        dueDate: '2024-01-31T12:00:00Z'
      },
      {
        id: 'gdpr-008',
        type: 'Consent Withdrawal',
        customer: 'Jennifer White',
        status: 'pending',
        requestDate: '2023-12-28T17:30:00Z',
        dueDate: '2024-01-27T17:30:00Z'
      }
    ],
    amlAlerts: [
      {
        id: 'aml-001',
        type: 'Suspicious Transaction',
        entity: 'ABC Trading Ltd',
        riskLevel: 'high',
        amount: 150000,
        alertDate: '2024-01-14T15:20:00Z',
        description: 'Large cash transaction exceeding threshold'
      },
      {
        id: 'aml-002',
        type: 'Unusual Pattern',
        entity: 'Global Imports Co',
        riskLevel: 'medium',
        amount: 75000,
        alertDate: '2024-01-12T11:45:00Z',
        description: 'Multiple transactions just below reporting threshold'
      },
      {
        id: 'aml-003',
        type: 'PEP Match',
        entity: 'Premium Services Ltd',
        riskLevel: 'high',
        amount: 200000,
        alertDate: '2024-01-10T09:30:00Z',
        description: 'Transaction involving politically exposed person'
      },
      {
        id: 'aml-004',
        type: 'Geographic Risk',
        entity: 'International Trade Corp',
        riskLevel: 'medium',
        amount: 95000,
        alertDate: '2024-01-08T14:15:00Z',
        description: 'Transaction from high-risk jurisdiction'
      },
      {
        id: 'aml-005',
        type: 'Velocity Alert',
        entity: 'Fast Track Logistics',
        riskLevel: 'low',
        amount: 45000,
        alertDate: '2024-01-06T16:20:00Z',
        description: 'Rapid succession of transactions'
      }
    ],
    reports: [
      {
        id: 'report-001',
        name: 'TCRA Quarterly Report',
        type: 'regulatory',
        status: 'pending',
        dueDate: '2024-02-15T23:59:59Z',
        description: 'Tanzania Communications Regulatory Authority quarterly compliance report'
      },
      {
        id: 'report-002',
        name: 'TRA VAT Return',
        type: 'tax',
        status: 'due_soon',
        dueDate: '2024-01-15T23:59:59Z',
        description: 'Monthly VAT return filing with Tanzania Revenue Authority'
      },
      {
        id: 'report-003',
        name: 'AML Suspicious Activity Report',
        type: 'aml',
        status: 'in_progress',
        dueDate: '2024-01-20T23:59:59Z',
        description: 'Monthly suspicious activity reporting to Financial Intelligence Unit'
      },
      {
        id: 'report-004',
        name: 'GDPR Compliance Assessment',
        type: 'privacy',
        status: 'completed',
        dueDate: '2024-01-10T23:59:59Z',
        completedDate: '2024-01-08T14:30:00Z',
        description: 'Quarterly GDPR compliance self-assessment report'
      },
      {
        id: 'report-005',
        name: 'Consumer Protection Report',
        type: 'regulatory',
        status: 'pending',
        dueDate: '2024-02-28T23:59:59Z',
        description: 'Fair Competition Commission consumer protection compliance report'
      }
    ],
    recentActivity: [
      {
        id: 'activity-001',
        type: 'gdpr_request',
        description: 'New GDPR data export request from John Customer',
        timestamp: '2024-01-15T10:30:00Z',
        priority: 'medium'
      },
      {
        id: 'activity-002',
        type: 'aml_alert',
        description: 'High-risk AML alert triggered for ABC Trading Ltd',
        timestamp: '2024-01-14T15:20:00Z',
        priority: 'high'
      },
      {
        id: 'activity-003',
        type: 'report_due',
        description: 'TRA VAT return due in 2 days',
        timestamp: '2024-01-13T09:00:00Z',
        priority: 'high'
      },
      {
        id: 'activity-004',
        type: 'gdpr_completed',
        description: 'GDPR data export completed for Emma Davis',
        timestamp: '2024-01-12T11:30:00Z',
        priority: 'low'
      },
      {
        id: 'activity-005',
        type: 'compliance_score',
        description: 'Compliance score improved to 94.2% (+2.1%)',
        timestamp: '2024-01-11T08:15:00Z',
        priority: 'medium'
      }
    ],
    tanzanianRegulators: {
      tcra: { name: 'TCRA (Telecom)', score: 96 },
      tra: { name: 'TRA (Tax)', score: 92 },
      bot: { name: 'BOT (Banking)', score: 98 },
      fiu: { name: 'FIU (Financial)', score: 90 },
      brela: { name: 'BRELA (Business)', score: 94 },
      tcaa: { name: 'TCAA (Competition)', score: 88 }
    }
  };

  res.json({ success: true, data: baseData });
});

// ===== AUDIT LOGS APIs =====
router.get('/audit/logs', async (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: 'audit-1',
        userId: 'admin-1',
        userEmail: 'john.smith@maysar.com',
        action: 'USER_CREATED',
        resource: 'User',
        resourceId: 'user-123',
        timestamp: '2024-01-15T10:30:00Z',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { email: 'newuser@example.com', role: 'customer' },
        status: 'success'
      },
      {
        id: 'audit-2',
        userId: 'admin-2',
        userEmail: 'sarah.johnson@maysar.com',
        action: 'ORDER_UPDATED',
        resource: 'Order',
        resourceId: 'order-456',
        timestamp: '2024-01-15T09:45:00Z',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { status: 'shipped', trackingNumber: 'TRK123456' },
        status: 'success'
      },
      {
        id: 'audit-3',
        userId: 'admin-1',
        userEmail: 'john.smith@maysar.com',
        action: 'LOGIN_FAILED',
        resource: 'Auth',
        resourceId: 'session-789',
        timestamp: '2024-01-15T08:20:00Z',
        ipAddress: '41.93.64.15',
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
        details: { reason: 'invalid_password', attempts: 3 },
        status: 'failure'
      },
      {
        id: 'audit-4',
        userId: 'admin-3',
        userEmail: 'mike.admin@maysar.com',
        action: 'SELLER_VERIFIED',
        resource: 'Seller',
        resourceId: 'seller-321',
        timestamp: '2024-01-14T16:30:00Z',
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        details: { businessName: 'Tech Store Ltd', kycLevel: 'Level 2' },
        status: 'success'
      },
      {
        id: 'audit-5',
        userId: 'admin-2',
        userEmail: 'sarah.johnson@maysar.com',
        action: 'PAYMENT_PROCESSED',
        resource: 'Payment',
        resourceId: 'pay-654',
        timestamp: '2024-01-14T14:15:00Z',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { amount: 125000, currency: 'TSh', gateway: 'stripe' },
        status: 'success'
      },
      {
        id: 'audit-6',
        userId: 'admin-1',
        userEmail: 'john.smith@maysar.com',
        action: 'CONFIG_UPDATED',
        resource: 'SystemConfig',
        resourceId: 'config-max-upload',
        timestamp: '2024-01-14T11:45:00Z',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { key: 'max_upload_size', oldValue: '5MB', newValue: '10MB' },
        status: 'success'
      },
      {
        id: 'audit-7',
        userId: 'admin-4',
        userEmail: 'lisa.moderator@maysar.com',
        action: 'USER_SUSPENDED',
        resource: 'User',
        resourceId: 'user-987',
        timestamp: '2024-01-13T13:20:00Z',
        ipAddress: '192.168.1.103',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { reason: 'policy_violation', duration: '7_days' },
        status: 'success'
      },
      {
        id: 'audit-8',
        userId: 'admin-2',
        userEmail: 'sarah.johnson@maysar.com',
        action: 'BULK_EXPORT',
        resource: 'AuditLog',
        resourceId: 'export-202401',
        timestamp: '2024-01-13T10:00:00Z',
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        details: { format: 'csv', records: 5000, dateRange: '2024-01-01_to_2024-01-12' },
        status: 'warning'
      }
    ]
  });
});

// ===== SYSTEM CONFIG APIs =====
router.get('/system/config', async (req, res) => {
  res.json({
    success: true,
    data: {
      configs: [
        {
          id: 'config-1',
          key: 'max_upload_size',
          value: '10MB',
          category: 'file_handling',
          description: 'Maximum file upload size',
          lastUpdated: '2024-01-10T14:20:00Z'
        },
        {
          id: 'config-2',
          key: 'session_timeout',
          value: '3600',
          category: 'security',
          description: 'User session timeout in seconds',
          lastUpdated: '2024-01-08T09:15:00Z'
        },
        {
          id: 'config-3',
          key: 'email_notifications',
          value: 'true',
          category: 'notifications',
          description: 'Enable email notifications',
          lastUpdated: '2024-01-05T16:30:00Z'
        },
        {
          id: 'config-4',
          key: 'api_rate_limit',
          value: '1000',
          category: 'performance',
          description: 'API requests per hour limit',
          lastUpdated: '2024-01-03T11:45:00Z'
        },
        {
          id: 'config-5',
          key: 'backup_retention',
          value: '30',
          category: 'security',
          description: 'Backup retention period in days',
          lastUpdated: '2024-01-01T08:00:00Z'
        }
      ],
      featureFlags: [
        {
          id: 'flag-1',
          name: 'new_dashboard',
          description: 'Enable new dashboard interface',
          enabled: true,
          rolloutPercentage: 100,
          createdAt: '2024-01-10T10:00:00Z',
          updatedAt: '2024-01-12T14:30:00Z'
        },
        {
          id: 'flag-2',
          name: 'advanced_analytics',
          description: 'Enable advanced analytics features',
          enabled: false,
          rolloutPercentage: 0,
          createdAt: '2024-01-08T15:20:00Z',
          updatedAt: '2024-01-08T15:20:00Z'
        },
        {
          id: 'flag-3',
          name: 'mobile_app_integration',
          description: 'Enable mobile app API endpoints',
          enabled: true,
          rolloutPercentage: 75,
          createdAt: '2024-01-05T12:10:00Z',
          updatedAt: '2024-01-09T09:45:00Z'
        },
        {
          id: 'flag-4',
          name: 'beta_features',
          description: 'Enable beta testing features',
          enabled: false,
          rolloutPercentage: 5,
          createdAt: '2024-01-03T14:25:00Z',
          updatedAt: '2024-01-07T11:15:00Z'
        }
      ],
      categories: ['security', 'performance', 'file_handling', 'notifications']
    }
  });
});

// ===== COMPLIANCE SUB-ENDPOINTS =====
router.get('/compliance/gdpr', async (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        userId: 'user-123',
        userEmail: 'john.doe@example.com',
        requestType: 'access',
        status: 'pending',
        requestedAt: '2024-01-15T10:30:00Z',
        assignedTo: 'Admin User'
      },
      {
        id: '2',
        userId: 'user-456',
        userEmail: 'jane.smith@example.com',
        requestType: 'erasure',
        status: 'in_progress',
        requestedAt: '2024-01-14T14:20:00Z',
        assignedTo: 'Compliance Officer'
      }
    ]
  });
});

router.get('/compliance/aml', async (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        entityId: 'txn-789',
        entityType: 'transaction',
        alertType: 'suspicious_transaction',
        riskScore: 85,
        status: 'open',
        createdAt: '2024-01-15T09:15:00Z',
        description: 'Large transaction from high-risk country'
      },
      {
        id: '2',
        entityId: 'user-321',
        entityType: 'user',
        alertType: 'pep_match',
        riskScore: 75,
        status: 'investigating',
        createdAt: '2024-01-14T16:45:00Z',
        description: 'Potential PEP match detected'
      }
    ]
  });
});

router.get('/compliance/reports', async (req, res) => {
  res.json({
    success: true,
    data: [
      {
        id: '1',
        reportType: 'tcra_quarterly',
        period: 'Q4 2023',
        status: 'submitted',
        generatedAt: '2024-01-10T08:00:00Z',
        submittedAt: '2024-01-12T10:00:00Z',
        complianceScore: 96,
        regulatoryBody: 'TCRA',
        submissionDeadline: '2024-01-15T23:59:59Z',
        fileUrl: '/reports/tcra-q4-2023.pdf'
      },
      {
        id: '2',
        reportType: 'tra_monthly',
        period: 'December 2023',
        status: 'pending_review',
        generatedAt: '2024-01-05T12:00:00Z',
        complianceScore: 92,
        regulatoryBody: 'TRA',
        submissionDeadline: '2024-01-20T23:59:59Z'
      }
    ]
  });
});

// ===== KYC MANAGEMENT APIs =====
router.get('/kyc', async (req, res) => {
  res.json({
    success: true,
    data: {
      users: [
        {
          id: 'kyc-1',
          userId: 'user-123',
          userName: 'John Customer',
          email: 'john@customer.com',
          status: 'pending',
          riskLevel: 'low',
          submittedAt: '2024-01-10T10:30:00Z'
        }
      ],
      stats: {
        pending: 5,
        approved: 120,
        rejected: 3
      }
    }
  });
});

// ===== SHIPPING MANAGEMENT APIs =====
router.get('/shipping', async (req, res) => {
  res.json({
    success: true,
    data: {
      shippingRates: [
        { id: 1, region: 'Arusha', weightRange: '0-2kg', rate: 7500, carrier: 'Express', deliveryDays: '2-3' },
        { id: 2, region: 'Dar es Salaam', weightRange: '0-2kg', rate: 2500, carrier: 'Standard', deliveryDays: 'Same' },
        { id: 3, region: 'Dodoma', weightRange: '0-2kg', rate: 6500, carrier: 'Standard', deliveryDays: '2-3' },
        { id: 4, region: 'Geita', weightRange: '0-2kg', rate: 8500, carrier: 'Standard', deliveryDays: '3-4' },
        { id: 5, region: 'Iringa', weightRange: '0-2kg', rate: 9000, carrier: 'Express', deliveryDays: '3-5' },
        { id: 6, region: 'Kagera', weightRange: '0-2kg', rate: 8000, carrier: 'Standard', deliveryDays: '3-4' },
        { id: 7, region: 'Katavi', weightRange: '0-2kg', rate: 11000, carrier: 'Standard', deliveryDays: '4-6' },
        { id: 8, region: 'Kigoma', weightRange: '0-2kg', rate: 10000, carrier: 'Standard', deliveryDays: '4-6' },
        { id: 9, region: 'Kilimanjaro', weightRange: '0-2kg', rate: 7500, carrier: 'Express', deliveryDays: '2-3' },
        { id: 10, region: 'Lindi', weightRange: '0-2kg', rate: 8500, carrier: 'Standard', deliveryDays: '3-4' },
        { id: 11, region: 'Manyara', weightRange: '0-2kg', rate: 7000, carrier: 'Standard', deliveryDays: '2-3' },
        { id: 12, region: 'Mara', weightRange: '0-2kg', rate: 8500, carrier: 'Standard', deliveryDays: '3-4' },
        { id: 13, region: 'Mbeya', weightRange: '0-2kg', rate: 9000, carrier: 'Express', deliveryDays: '3-5' },
        { id: 14, region: 'Morogoro', weightRange: '0-2kg', rate: 5500, carrier: 'Standard', deliveryDays: '1-2' },
        { id: 15, region: 'Mtwara', weightRange: '0-2kg', rate: 9500, carrier: 'Standard', deliveryDays: '3-5' },
        { id: 16, region: 'Mwanza', weightRange: '0-2kg', rate: 8000, carrier: 'Standard', deliveryDays: '3-4' },
        { id: 17, region: 'Njombe', weightRange: '0-2kg', rate: 9500, carrier: 'Express', deliveryDays: '3-5' },
        { id: 18, region: 'Pwani (Coast)', weightRange: '0-2kg', rate: 4500, carrier: 'Standard', deliveryDays: '1-2' },
        { id: 19, region: 'Rukwa', weightRange: '0-2kg', rate: 10500, carrier: 'Standard', deliveryDays: '4-6' },
        { id: 20, region: 'Ruvuma', weightRange: '0-2kg', rate: 10000, carrier: 'Standard', deliveryDays: '4-5' },
        { id: 21, region: 'Shinyanga', weightRange: '0-2kg', rate: 8500, carrier: 'Standard', deliveryDays: '3-4' },
        { id: 22, region: 'Simiyu', weightRange: '0-2kg', rate: 8500, carrier: 'Standard', deliveryDays: '3-4' },
        { id: 23, region: 'Singida', weightRange: '0-2kg', rate: 7500, carrier: 'Standard', deliveryDays: '2-4' },
        { id: 24, region: 'Songwe', weightRange: '0-2kg', rate: 9500, carrier: 'Express', deliveryDays: '3-5' },
        { id: 25, region: 'Tabora', weightRange: '0-2kg', rate: 9000, carrier: 'Standard', deliveryDays: '3-5' },
        { id: 26, region: 'Tanga', weightRange: '0-2kg', rate: 6000, carrier: 'Standard', deliveryDays: '2-3' },
        { id: 27, region: 'Zanzibar North', weightRange: '0-2kg', rate: 12000, carrier: 'Express', deliveryDays: '2-4' },
        { id: 28, region: 'Zanzibar South', weightRange: '0-2kg', rate: 12000, carrier: 'Express', deliveryDays: '2-4' },
        { id: 29, region: 'Zanzibar Urban/West', weightRange: '0-2kg', rate: 11500, carrier: 'Express', deliveryDays: '2-4' },
        { id: 30, region: 'Pemba North', weightRange: '0-2kg', rate: 13000, carrier: 'Express', deliveryDays: '3-5' },
        { id: 31, region: 'Pemba South', weightRange: '0-2kg', rate: 13000, carrier: 'Express', deliveryDays: '3-5' }
      ]
    }
  });
});

router.get('/shipments', async (req, res) => {
  res.json({
    success: true,
    data: {
      shipments: [
        {
          id: 1,
          orderNumber: 'ORD-2024-001',
          customer: 'John Doe',
          status: 'in_transit',
          trackingNumber: 'TRK123456',
          carrier: 'DHL',
          estimatedDelivery: '2024-01-15'
        },
        {
          id: 2,
          orderNumber: 'ORD-2024-002',
          customer: 'Jane Smith',
          status: 'delivered',
          trackingNumber: 'TRK123457',
          carrier: 'FedEx',
          estimatedDelivery: '2024-01-14'
        },
        {
          id: 3,
          orderNumber: 'ORD-2024-003',
          customer: 'Mike Johnson',
          status: 'pending',
          trackingNumber: 'TRK123458',
          carrier: 'UPS',
          estimatedDelivery: '2024-01-16'
        }
      ]
    }
  });
});

router.get('/shipping-stats', async (req, res) => {
  res.json({
    success: true,
    data: {
      activeShipments: 24,
      deliveredToday: 12,
      avgDeliveryTime: '2.3',
      shippingCost: 45000
    }
  });
});

module.exports = router;