const express = require('express');

const router = express.Router();

// Add logging middleware for debugging
router.use((req, res, next) => {
  console.log(`[SELLER API] ${new Date().toISOString()} ${req.method} ${req.path}`, req.query);
  next();
});

// ===== DASHBOARD API =====
router.get('/dashboard', async (req, res) => {
  res.json({
    success: true,
    data: {
      stats: {
        totalProducts: 156,
        activeProducts: 142,
        totalOrders: 1247,
        pendingOrders: 23,
        totalRevenue: 245000,
        monthlyRevenue: 18500,
        monthlyGrowth: '+12.4%',
        totalCustomers: 892,
        activeCustomers: 456,
        averageRating: 4.7,
        totalReviews: 234,
        conversionRate: 3.2,
        conversionGrowth: '+0.8%',
        fulfillmentRate: 98.5,
        returnsRate: 2.1,
        customerRating: 4.7
      },
      recentOrders: [
        {
          id: 'ORD-001',
          customer: 'John Doe',
          amount: 1250,
          status: 'pending',
          date: '2024-01-15T10:30:00Z'
        },
        {
          id: 'ORD-002',
          customer: 'Jane Smith',
          amount: 890,
          status: 'shipped',
          date: '2024-01-15T09:15:00Z'
        }
      ],
      topProducts: [
        {
          id: 'PROD-001',
          name: 'Wireless Headphones',
          sales: 45,
          revenue: 22500
        },
        {
          id: 'PROD-002',
          name: 'Smartphone Case',
          sales: 38,
          revenue: 7600
        }
      ],
      lowStockProducts: [
        {
          id: 'PROD-003',
          name: 'USB-C Charging Cable',
          category: 'Accessories',
          currentStock: 0,
          minStock: 15
        },
        {
          id: 'PROD-004',
          name: 'Wireless Mouse',
          category: 'Electronics',
          currentStock: 3,
          minStock: 10
        }
      ]
    }
  });
});

// ===== PRODUCTS API =====
router.get('/products', async (req, res) => {
  res.json({
    success: true,
    data: {
      products: [
        {
          id: 'PROD-001',
          name: 'Wireless Bluetooth Headphones',
          sku: 'WBH-001',
          category: 'Electronics',
          price: 500,
          stock: 25,
          status: 'active',
          rating: 4.8,
          reviews: 45,
          image: '/images/headphones.jpg',
          createdAt: '2024-01-10T08:00:00Z'
        },
        {
          id: 'PROD-002',
          name: 'Smartphone Protective Case',
          sku: 'SPC-002',
          category: 'Accessories',
          price: 200,
          stock: 150,
          status: 'active',
          rating: 4.5,
          reviews: 28,
          image: '/images/phone-case.jpg',
          createdAt: '2024-01-08T14:30:00Z'
        },
        {
          id: 'PROD-003',
          name: 'USB-C Charging Cable',
          sku: 'UCC-003',
          category: 'Accessories',
          price: 150,
          stock: 0,
          status: 'out_of_stock',
          rating: 4.2,
          reviews: 12,
          image: '/images/usb-cable.jpg',
          createdAt: '2024-01-05T11:15:00Z'
        }
      ],
      categories: ['Electronics', 'Accessories', 'Home & Garden', 'Fashion', 'Sports']
    }
  });
});

// ===== INVENTORY API =====
router.get('/inventory', async (req, res) => {
  res.json({
    success: true,
    data: {
      inventory: [
        {
          id: 'INV-001',
          productId: 'PROD-001',
          productName: 'Wireless Bluetooth Headphones',
          sku: 'WBH-001',
          currentStock: 25,
          reservedStock: 5,
          availableStock: 20,
          reorderLevel: 10,
          status: 'in_stock',
          lastUpdated: '2024-01-15T10:30:00Z'
        },
        {
          id: 'INV-002',
          productId: 'PROD-002',
          productName: 'Smartphone Protective Case',
          sku: 'SPC-002',
          currentStock: 150,
          reservedStock: 12,
          availableStock: 138,
          reorderLevel: 20,
          status: 'in_stock',
          lastUpdated: '2024-01-15T09:45:00Z'
        },
        {
          id: 'INV-003',
          productId: 'PROD-003',
          productName: 'USB-C Charging Cable',
          sku: 'UCC-003',
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0,
          reorderLevel: 15,
          status: 'out_of_stock',
          lastUpdated: '2024-01-14T16:20:00Z'
        }
      ],
      lowStockAlerts: [
        {
          productId: 'PROD-003',
          productName: 'USB-C Charging Cable',
          currentStock: 0,
          reorderLevel: 15
        }
      ],
      stockMovements: [
        {
          id: 'MOV-001',
          productName: 'Wireless Bluetooth Headphones',
          type: 'adjustment',
          quantity: 25,
          date: '2024-01-15T10:30:00Z'
        },
        {
          id: 'MOV-002',
          productName: 'USB-C Charging Cable',
          type: 'sale',
          quantity: -15,
          date: '2024-01-14T16:20:00Z'
        }
      ]
    }
  });
});

// ===== ORDERS API =====
router.get('/orders', async (req, res) => {
  res.json({
    success: true,
    data: {
      orders: [
        {
          id: 'ORD-001',
          orderNumber: 'MYS-2024-001',
          customer: {
            name: 'John Doe',
            email: 'john@example.com',
            phone: '+255123456789'
          },
          items: [
            {
              productId: 'PROD-001',
              productName: 'Wireless Bluetooth Headphones',
              quantity: 2,
              price: 500,
              total: 1000
            }
          ],
          totalAmount: 1250,
          status: 'pending',
          paymentStatus: 'paid',
          shippingAddress: 'Dar es Salaam, Tanzania',
          orderDate: '2024-01-15T10:30:00Z',
          estimatedDelivery: '2024-01-18T00:00:00Z'
        },
        {
          id: 'ORD-002',
          orderNumber: 'MYS-2024-002',
          customer: {
            name: 'Jane Smith',
            email: 'jane@example.com',
            phone: '+255987654321'
          },
          items: [
            {
              productId: 'PROD-002',
              productName: 'Smartphone Protective Case',
              quantity: 4,
              price: 200,
              total: 800
            }
          ],
          totalAmount: 890,
          status: 'confirmed',
          paymentStatus: 'paid',
          shippingAddress: 'Arusha, Tanzania',
          orderDate: '2024-01-15T09:15:00Z',
          estimatedDelivery: '2024-01-17T00:00:00Z'
        },
        {
          id: 'ORD-003',
          orderNumber: 'MYS-2024-003',
          customer: {
            name: 'Mike Johnson',
            email: 'mike@example.com',
            phone: '+255555123456'
          },
          items: [
            {
              productId: 'PROD-003',
              productName: 'USB-C Charging Cable',
              quantity: 3,
              price: 150,
              total: 450
            }
          ],
          totalAmount: 450,
          status: 'processing',
          paymentStatus: 'paid',
          shippingAddress: 'Mwanza, Tanzania',
          orderDate: '2024-01-14T16:20:00Z',
          estimatedDelivery: '2024-01-19T00:00:00Z'
        },
        {
          id: 'ORD-004',
          orderNumber: 'MYS-2024-004',
          customer: {
            name: 'Sarah Wilson',
            email: 'sarah@example.com',
            phone: '+255777654321'
          },
          items: [
            {
              productId: 'PROD-001',
              productName: 'Wireless Bluetooth Headphones',
              quantity: 1,
              price: 500,
              total: 500
            }
          ],
          totalAmount: 500,
          status: 'shipped',
          paymentStatus: 'paid',
          shippingAddress: 'Dodoma, Tanzania',
          orderDate: '2024-01-13T11:45:00Z',
          shippedDate: '2024-01-14T08:30:00Z',
          trackingNumber: 'TRK987654321'
        },
        {
          id: 'ORD-005',
          orderNumber: 'MYS-2024-005',
          customer: {
            name: 'David Brown',
            email: 'david@example.com',
            phone: '+255888999111'
          },
          items: [
            {
              productId: 'PROD-002',
              productName: 'Smartphone Protective Case',
              quantity: 2,
              price: 200,
              total: 400
            }
          ],
          totalAmount: 400,
          status: 'delivered',
          paymentStatus: 'paid',
          shippingAddress: 'Mbeya, Tanzania',
          orderDate: '2024-01-12T14:15:00Z',
          shippedDate: '2024-01-13T10:00:00Z',
          deliveredDate: '2024-01-15T16:30:00Z'
        },
        {
          id: 'ORD-006',
          orderNumber: 'MYS-2024-006',
          customer: {
            name: 'Lisa Garcia',
            email: 'lisa@example.com',
            phone: '+255666777888'
          },
          items: [
            {
              productId: 'PROD-001',
              productName: 'Wireless Bluetooth Headphones',
              quantity: 1,
              price: 500,
              total: 500
            }
          ],
          totalAmount: 500,
          status: 'cancelled',
          paymentStatus: 'refunded',
          shippingAddress: 'Kilimanjaro, Tanzania',
          orderDate: '2024-01-11T09:30:00Z',
          cancelledDate: '2024-01-12T15:45:00Z'
        },
        {
          id: 'ORD-007',
          orderNumber: 'MYS-2024-007',
          customer: {
            name: 'Ahmed Hassan',
            email: 'ahmed@example.com',
            phone: '+255111222333'
          },
          items: [
            {
              productId: 'PROD-002',
              productName: 'Smartphone Protective Case',
              quantity: 3,
              price: 200,
              total: 600
            }
          ],
          totalAmount: 600,
          status: 'processing',
          paymentStatus: 'paid',
          shippingAddress: 'Morogoro, Tanzania',
          orderDate: '2024-01-10T13:20:00Z',
          estimatedDelivery: '2024-01-16T00:00:00Z'
        },
        {
          id: 'ORD-008',
          orderNumber: 'MYS-2024-008',
          customer: {
            name: 'Maria Santos',
            email: 'maria@example.com',
            phone: '+255444555666'
          },
          items: [
            {
              productId: 'PROD-001',
              productName: 'Wireless Bluetooth Headphones',
              quantity: 1,
              price: 500,
              total: 500
            }
          ],
          totalAmount: 800,
          status: 'confirmed',
          paymentStatus: 'paid',
          shippingAddress: 'Iringa, Tanzania',
          orderDate: '2024-01-09T16:45:00Z',
          estimatedDelivery: '2024-01-15T00:00:00Z'
        },
        {
          id: 'ORD-009',
          orderNumber: 'MYS-2024-009',
          customer: {
            name: 'Robert Mwangi',
            email: 'robert@example.com',
            phone: '+255777888999'
          },
          items: [
            {
              productId: 'PROD-002',
              productName: 'Smartphone Protective Case',
              quantity: 5,
              price: 200,
              total: 1000
            }
          ],
          totalAmount: 1000,
          status: 'delivered',
          paymentStatus: 'paid',
          shippingAddress: 'Tabora, Tanzania',
          orderDate: '2024-01-08T10:15:00Z',
          shippedDate: '2024-01-09T14:30:00Z',
          deliveredDate: '2024-01-12T11:20:00Z'
        },
        {
          id: 'ORD-010',
          orderNumber: 'MYS-2024-010',
          customer: {
            name: 'Fatima Ali',
            email: 'fatima@example.com',
            phone: '+255333444555'
          },
          items: [
            {
              productId: 'PROD-001',
              productName: 'Wireless Bluetooth Headphones',
              quantity: 2,
              price: 500,
              total: 1000
            }
          ],
          totalAmount: 1000,
          status: 'shipped',
          paymentStatus: 'paid',
          shippingAddress: 'Kigoma, Tanzania',
          orderDate: '2024-01-07T12:30:00Z',
          shippedDate: '2024-01-08T09:45:00Z',
          trackingNumber: 'TRK555666777'
        }
      ]
    }
  });
});

// ===== CUSTOMERS API =====
router.get('/customers', async (req, res) => {
  res.json({
    success: true,
    data: {
      customers: [
        {
          id: 'CUST-001',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+255123456789',
          location: 'Dar es Salaam, Tanzania',
          totalOrders: 12,
          totalSpent: 15600,
          averageOrderValue: 1300,
          lastOrderDate: '2024-01-15T10:30:00Z',
          status: 'active',
          joinedDate: '2023-08-15T00:00:00Z',
          customerType: 'premium',
          notes: 'Frequent buyer, prefers express shipping'
        },
        {
          id: 'CUST-002',
          name: 'Jane Smith',
          email: 'jane@example.com',
          phone: '+255987654321',
          location: 'Arusha, Tanzania',
          totalOrders: 8,
          totalSpent: 9200,
          averageOrderValue: 1150,
          lastOrderDate: '2024-01-15T09:15:00Z',
          status: 'active',
          joinedDate: '2023-10-22T00:00:00Z',
          customerType: 'regular',
          notes: 'Always pays on time'
        },
        {
          id: 'CUST-003',
          name: 'Mike Johnson',
          email: 'mike@example.com',
          phone: '+255555123456',
          location: 'Mwanza, Tanzania',
          totalOrders: 3,
          totalSpent: 2100,
          averageOrderValue: 700,
          lastOrderDate: '2024-01-14T16:20:00Z',
          status: 'active',
          joinedDate: '2023-12-10T00:00:00Z',
          customerType: 'new',
          notes: 'New customer, interested in electronics'
        },
        {
          id: 'CUST-004',
          name: 'Sarah Wilson',
          email: 'sarah@example.com',
          phone: '+255777654321',
          location: 'Dodoma, Tanzania',
          totalOrders: 15,
          totalSpent: 18900,
          averageOrderValue: 1260,
          lastOrderDate: '2024-01-13T11:45:00Z',
          status: 'active',
          joinedDate: '2023-06-20T00:00:00Z',
          customerType: 'premium',
          notes: 'VIP customer, bulk orders'
        },
        {
          id: 'CUST-005',
          name: 'David Brown',
          email: 'david@example.com',
          phone: '+255888999111',
          location: 'Mbeya, Tanzania',
          totalOrders: 6,
          totalSpent: 4800,
          averageOrderValue: 800,
          lastOrderDate: '2024-01-12T14:15:00Z',
          status: 'active',
          joinedDate: '2023-11-05T00:00:00Z',
          customerType: 'regular',
          notes: 'Prefers weekend delivery'
        },
        {
          id: 'CUST-006',
          name: 'Lisa Garcia',
          email: 'lisa@example.com',
          phone: '+255666777888',
          location: 'Kilimanjaro, Tanzania',
          totalOrders: 2,
          totalSpent: 800,
          averageOrderValue: 400,
          lastOrderDate: '2024-01-11T09:30:00Z',
          status: 'inactive',
          joinedDate: '2023-12-28T00:00:00Z',
          customerType: 'new',
          notes: 'Had one cancelled order'
        },
        {
          id: 'CUST-007',
          name: 'Ahmed Hassan',
          email: 'ahmed@example.com',
          phone: '+255111222333',
          location: 'Morogoro, Tanzania',
          totalOrders: 9,
          totalSpent: 11400,
          averageOrderValue: 1267,
          lastOrderDate: '2024-01-10T13:20:00Z',
          status: 'active',
          joinedDate: '2023-09-12T00:00:00Z',
          customerType: 'regular',
          notes: 'Loyal customer, good reviews'
        },
        {
          id: 'CUST-008',
          name: 'Maria Santos',
          email: 'maria@example.com',
          phone: '+255444555666',
          location: 'Iringa, Tanzania',
          totalOrders: 4,
          totalSpent: 3200,
          averageOrderValue: 800,
          lastOrderDate: '2024-01-09T16:45:00Z',
          status: 'active',
          joinedDate: '2023-11-18T00:00:00Z',
          customerType: 'regular',
          notes: 'Interested in accessories'
        }
      ],
      stats: {
        totalCustomers: 8,
        activeCustomers: 7,
        newThisMonth: 2,
        averageSatisfaction: 4.7,
        totalRevenue: 66000,
        averageLifetimeValue: 8250
      }
    }
  });
});

// ===== REVIEWS API =====
router.get('/reviews', async (req, res) => {
  res.json({
    success: true,
    data: {
      reviews: [
        {
          id: 'REV-001',
          productId: 'PROD-001',
          productName: 'Wireless Bluetooth Headphones',
          customer: 'John Doe',
          rating: 5,
          comment: 'Excellent sound quality and comfortable to wear!',
          date: '2024-01-14T16:30:00Z',
          status: 'published'
        },
        {
          id: 'REV-002',
          productId: 'PROD-002',
          productName: 'Smartphone Protective Case',
          customer: 'Jane Smith',
          rating: 4,
          comment: 'Good protection, fits perfectly.',
          date: '2024-01-13T11:20:00Z',
          status: 'published'
        },
        {
          id: 'REV-003',
          productId: 'PROD-001',
          productName: 'Wireless Bluetooth Headphones',
          customer: 'Mike Johnson',
          rating: 2,
          comment: 'Battery life is not as advertised.',
          date: '2024-01-12T09:45:00Z',
          status: 'pending'
        }
      ],
      stats: {
        totalReviews: 234,
        averageRating: 4.7,
        ratingDistribution: {
          5: 156,
          4: 45,
          3: 23,
          2: 8,
          1: 2
        }
      }
    }
  });
});

// ===== ANALYTICS API =====
router.get('/analytics', async (req, res) => {
  res.json({
    success: true,
    data: {
      salesData: [
        { date: '2024-01-01', sales: 12500, orders: 25 },
        { date: '2024-01-02', sales: 15600, orders: 32 },
        { date: '2024-01-03', sales: 11200, orders: 28 },
        { date: '2024-01-04', sales: 18900, orders: 41 },
        { date: '2024-01-05', sales: 16700, orders: 35 }
      ],
      topProducts: [
        { name: 'Wireless Headphones', sales: 45, revenue: 22500 },
        { name: 'Phone Case', sales: 38, revenue: 7600 },
        { name: 'USB Cable', sales: 32, revenue: 4800 }
      ],
      customerInsights: {
        newCustomers: 23,
        returningCustomers: 67,
        customerRetentionRate: 74.2,
        averageClv: 8250,
        newCustomerClv: 3200,
        returningCustomerClv: 12400
      }
    }
  });
});

// ===== ENABLER REQUEST API =====
router.post('/request-enabler', async (req, res) => {
  const { requestType, description, targetSales, deadline, products, requirements, commission } = req.body;

  res.json({
    success: true,
    data: {
      requestId: `req-${Date.now()}`,
      status: 'pending',
      requestType,
      description,
      targetSales,
      deadline,
      products,
      requirements,
      commission,
      createdAt: new Date().toISOString()
    }
  });
});

router.get('/enabler-requests', async (req, res) => {
  res.json({
    success: true,
    data: {
      requests: [
        {
          id: 'REQ-001',
          sellerId: 'SELL-001',
          sellerName: 'Amina Electronics Store',
          requestType: 'sales_support',
          priority: 'high',
          status: 'pending',
          description: 'Need help boosting smartphone sales during holiday season with targeted customer outreach and product demonstrations',
          targetSales: 2500000,
          currentSales: 850000,
          deadline: '2024-01-15',
          products: ['iPhone 15', 'Samsung Galaxy S24', 'Xiaomi Redmi Note 13'],
          requirements: ['Product Knowledge', 'Customer Service', 'Sales Experience'],
          commission: '5%',
          estimatedEarnings: 125000,
          createdAt: '2024-01-02',
          location: 'Dar es Salaam'
        },
        {
          id: 'REQ-002',
          sellerId: 'SELL-002',
          sellerName: 'Fatima Fashion Boutique',
          requestType: 'digital_marketing',
          priority: 'medium',
          status: 'in_progress',
          description: 'Assist with online store setup and social media marketing for traditional wear collection',
          targetSales: 1800000,
          currentSales: 1200000,
          deadline: '2024-01-20',
          products: ['Kanga Dresses', 'Traditional Jewelry', 'Headwraps'],
          requirements: ['Social Media Skills', 'Photography', 'Content Creation'],
          commission: '5%',
          estimatedEarnings: 90000,
          createdAt: '2023-12-28',
          location: 'Arusha'
        },
        {
          id: 'REQ-003',
          sellerId: 'SELL-003',
          sellerName: 'Hassan Auto Parts',
          requestType: 'customer_acquisition',
          priority: 'high',
          status: 'pending',
          description: 'Expand customer base for motorcycle spare parts through community outreach and B2B networking',
          targetSales: 3200000,
          currentSales: 450000,
          deadline: '2024-01-25',
          products: ['Motorcycle Engines', 'Brake Pads', 'Tires', 'Oil Filters'],
          requirements: ['Automotive Knowledge', 'Community Networks', 'B2B Sales'],
          commission: '5%',
          estimatedEarnings: 160000,
          createdAt: '2024-01-01',
          location: 'Mwanza'
        },
        {
          id: 'REQ-004',
          sellerId: 'SELL-004',
          sellerName: 'Mwalimu Book Center',
          requestType: 'bulk_sales',
          priority: 'medium',
          status: 'pending',
          description: 'Promote educational materials to schools and increase bulk order sales for the new academic year',
          targetSales: 1500000,
          currentSales: 300000,
          deadline: '2024-02-01',
          products: ['Textbooks', 'Stationery', 'Educational Software', 'School Uniforms'],
          requirements: ['Education Sector Knowledge', 'Bulk Sales Experience', 'School Relationships'],
          commission: '5%',
          estimatedEarnings: 75000,
          createdAt: '2023-12-30',
          location: 'Dodoma'
        },
        {
          id: 'REQ-005',
          sellerId: 'SELL-005',
          sellerName: 'Mama Pendo Food Supplies',
          requestType: 'b2b_development',
          priority: 'low',
          status: 'pending',
          description: 'Help establish wholesale relationships with restaurants and hotels for bulk food supply contracts',
          targetSales: 2800000,
          currentSales: 1100000,
          deadline: '2024-01-30',
          products: ['Rice', 'Cooking Oil', 'Spices', 'Canned Goods'],
          requirements: ['Restaurant Connections', 'Wholesale Experience', 'Food Safety Knowledge'],
          commission: '5%',
          estimatedEarnings: 140000,
          createdAt: '2024-01-03',
          location: 'Mbeya'
        }
      ],
      stats: {
        totalRequests: 5,
        pendingRequests: 4,
        activeRequests: 1,
        completedRequests: 0,
        totalPotentialEarnings: 590000
      }
    }
  });
});

// ===== ENABLERS API =====
router.get('/enablers', async (req, res) => {
  res.json({
    success: true,
    data: {
      products: [
        { id: '1', name: 'Samsung Galaxy A54', price: 850000, category: 'Electronics', stock: 25 },
        { id: '2', name: 'Nike Air Max 270', price: 320000, category: 'Fashion', stock: 15 },
        { id: '3', name: 'MacBook Air M2', price: 2800000, category: 'Electronics', stock: 8 },
        { id: '4', name: 'Adidas Ultraboost 22', price: 280000, category: 'Fashion', stock: 20 }
      ],
      enablerRanks: [
        { value: 'associate', label: 'Associate', color: 'blue' },
        { value: 'specialist', label: 'Specialist', color: 'green' },
        { value: 'senior', label: 'Senior', color: 'yellow' },
        { value: 'expert', label: 'Expert', color: 'orange' },
        { value: 'master', label: 'Master', color: 'red' },
        { value: 'director', label: 'Director', color: 'purple' }
      ]
    }
  });
});

// ===== PAYMENTS API =====
router.get('/payments', async (req, res) => {
  res.json({
    success: true,
    data: {
      balance: {
        available: 1245000,
        pending: 185000,
        totalFees: 28500,
        successRate: 96.8
      },
      transactions: [
        {
          id: 'TXN-001',
          orderNumber: 'ORD-2024-001',
          customer: 'John Doe',
          amount: 45000,
          method: 'M-Pesa',
          status: 'completed',
          date: '2024-01-15T10:30:00Z',
          fee: 900,
          reference: 'MP240115001'
        },
        {
          id: 'TXN-002',
          orderNumber: 'ORD-2024-002',
          customer: 'Jane Smith',
          amount: 85000,
          method: 'Bank Transfer',
          status: 'pending',
          date: '2024-01-15T09:15:00Z',
          fee: 1275,
          reference: 'BT240115002'
        },
        {
          id: 'TXN-003',
          orderNumber: 'ORD-2024-003',
          customer: 'Mike Johnson',
          amount: 32000,
          method: 'Airtel Money',
          status: 'completed',
          date: '2024-01-14T16:20:00Z',
          fee: 800,
          reference: 'AM240114003'
        },
        {
          id: 'TXN-004',
          orderNumber: 'ORD-2024-004',
          customer: 'Sarah Wilson',
          amount: 67000,
          method: 'M-Pesa',
          status: 'failed',
          date: '2024-01-14T11:45:00Z',
          fee: 1340,
          reference: 'MP240114004'
        },
        {
          id: 'TXN-005',
          orderNumber: 'ORD-2024-005',
          customer: 'David Brown',
          amount: 23000,
          method: 'Bank Transfer',
          status: 'completed',
          date: '2024-01-13T14:30:00Z',
          fee: 345,
          reference: 'BT240113005'
        }
      ],
      payouts: [
        {
          id: 'PAYOUT-001',
          amount: 450000,
          method: 'Bank Transfer',
          status: 'completed',
          date: '2024-01-10T00:00:00Z',
          reference: 'PO-2024-001',
          bankAccount: '****1234',
          processingFee: 2500
        },
        {
          id: 'PAYOUT-002',
          amount: 320000,
          method: 'M-Pesa',
          status: 'processing',
          date: '2024-01-15T00:00:00Z',
          reference: 'PO-2024-002',
          phoneNumber: '****6789',
          processingFee: 1600
        },
        {
          id: 'PAYOUT-003',
          amount: 1245000,
          method: 'Bank Transfer',
          status: 'scheduled',
          date: '2024-01-20T00:00:00Z',
          reference: 'PO-2024-003',
          bankAccount: '****1234',
          processingFee: 6225
        }
      ],
      analytics: {
        nextPayout: {
          date: '2024-01-20T00:00:00Z',
          amount: 1245000
        },
        averageTransaction: {
          amount: 47333,
          growth: 12,
          period: 'month'
        },
        failedTransactions: {
          rate: 3.2,
          change: -0.8,
          period: 'month'
        },
        volumeTrend: [
          { date: '2024-01-01', volume: 125000, transactions: 28 },
          { date: '2024-01-02', volume: 156000, transactions: 34 },
          { date: '2024-01-03', volume: 142000, transactions: 31 },
          { date: '2024-01-04', volume: 189000, transactions: 42 },
          { date: '2024-01-05', volume: 167000, transactions: 38 }
        ]
      },
      stats: {
        totalTransactions: 1247,
        completedTransactions: 1205,
        pendingTransactions: 23,
        failedTransactions: 19,
        totalVolume: 5890000,
        totalFees: 118500,
        averageTransactionValue: 47333,
        paymentSuccessRate: 96.8
      }
    }
  });
});

// ===== KYC API =====
router.get('/kyc', async (req, res) => {
  res.json({
    success: true,
    data: {
      kycStatus: {
        level: 'Level 2',
        status: 'verified',
        verifiedDate: '2023-12-15T10:00:00Z',
        overallProgress: 85,
        nextReviewDate: '2024-12-15T00:00:00Z'
      },
      personalInfo: {
        fullName: 'John Smith',
        nationalId: '19851234567890',
        dateOfBirth: '1985-06-15',
        phoneNumber: '+255712345678',
        email: 'john.smith@techstore.com',
        address: 'Plot 123, Msimbazi Street, Kariakoo',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        verificationStatus: 'verified'
      },
      businessInfo: {
        businessName: 'Tech Electronics Store',
        businessType: 'Electronics',
        businessRegistration: 'BRELA-2020-123456',
        tinNumber: 'TIN-123-456-789',
        businessAddress: 'Shop 45, Kariakoo Market, Dar es Salaam',
        businessPhone: '+255712345679',
        businessEmail: 'info@techstore.com',
        website: 'https://www.techstore.com',
        yearEstablished: '2020',
        numberOfEmployees: '5-10',
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
          type: 'Business License',
          status: 'verified',
          uploadDate: '2023-12-10T14:35:00Z',
          verifiedDate: '2023-12-12T10:20:00Z',
          fileName: 'business_license.pdf',
          required: true
        },
        {
          type: 'TIN Certificate',
          status: 'verified',
          uploadDate: '2023-12-10T14:40:00Z',
          verifiedDate: '2023-12-12T10:25:00Z',
          fileName: 'tin_certificate.pdf',
          required: true
        },
        {
          type: 'Bank Statement',
          status: 'pending',
          uploadDate: '2023-12-14T16:20:00Z',
          fileName: 'bank_statement_3months.pdf',
          required: true,
          rejectionReason: null
        },
        {
          type: 'Business Permit',
          status: 'not_uploaded',
          required: false
        }
      ],
      bankDetails: {
        bankName: 'CRDB Bank',
        accountNumber: '0150123456789',
        accountName: 'Tech Electronics Store',
        branchCode: 'CRDB001',
        swiftCode: 'CORUTZTZ',
        verificationStatus: 'verified',
        verifiedDate: '2023-12-13T11:30:00Z'
      },
      complianceChecks: {
        amlScreening: {
          status: 'passed',
          checkedDate: '2023-12-15T08:00:00Z',
          score: 95
        },
        sanctionsList: {
          status: 'clear',
          checkedDate: '2023-12-15T08:05:00Z'
        },
        pepCheck: {
          status: 'clear',
          checkedDate: '2023-12-15T08:10:00Z'
        },
        creditCheck: {
          status: 'good',
          score: 750,
          checkedDate: '2023-12-15T08:15:00Z'
        }
      },
      verificationHistory: [
        {
          date: '2023-12-15T10:00:00Z',
          action: 'KYC Level 2 Approved',
          reviewer: 'System Admin',
          notes: 'All documents verified successfully'
        },
        {
          date: '2023-12-12T10:25:00Z',
          action: 'TIN Certificate Verified',
          reviewer: 'KYC Officer',
          notes: 'Valid TIN certificate confirmed'
        },
        {
          date: '2023-12-11T09:15:00Z',
          action: 'Identity Documents Verified',
          reviewer: 'KYC Officer',
          notes: 'National ID verified against government database'
        }
      ],
      requirements: {
        currentLevel: 'Level 2',
        nextLevel: 'Level 3',
        requiredDocuments: ['Tax Certificate', 'Audited Financial Statements'],
        benefits: {
          current: [
            'Higher transaction limits (TZS 10M/month)',
            'Priority customer support',
            'Access to business loans',
            'Reduced transaction fees'
          ],
          nextLevel: [
            'Unlimited transaction limits',
            'Dedicated account manager',
            'Advanced analytics tools',
            'White-label solutions'
          ]
        },
        transactionLimits: {
          daily: 500000,
          monthly: 10000000,
          perTransaction: 100000
        }
      },
      riskAssessment: {
        overallRisk: 'low',
        riskScore: 25,
        factors: [
          { factor: 'Business Type', risk: 'low', score: 10 },
          { factor: 'Transaction Volume', risk: 'medium', score: 15 },
          { factor: 'Geographic Location', risk: 'low', score: 5 },
          { factor: 'Document Quality', risk: 'low', score: 5 }
        ],
        lastAssessment: '2023-12-15T10:00:00Z',
        nextAssessment: '2024-06-15T00:00:00Z'
      }
    }
  });
});

// ===== SETTINGS API =====
router.get('/settings', async (req, res) => {
  res.json({
    success: true,
    data: {
      profile: {
        businessName: 'Tech Electronics Store',
        ownerName: 'John Smith',
        email: 'john@techstore.com',
        phone: '+255123456789',
        address: 'Dar es Salaam, Tanzania',
        businessType: 'Electronics',
        taxId: 'TIN123456789'
      },
      preferences: {
        notifications: {
          email: true,
          sms: true,
          push: true
        },
        language: 'en',
        currency: 'TSh',
        timezone: 'Africa/Dar_es_Salaam'
      }
    }
  });
});

// ===== PROMOTIONS API =====
router.get('/promotions', async (req, res) => {
  res.json({
    success: true,
    data: {
      promotions: [
        {
          id: 'PROMO-001',
          name: 'Summer Sale',
          discount: '20%',
          discountType: 'percentage',
          discountValue: 20,
          status: 'active',
          products: 15,
          startDate: '2024-07-01T00:00:00Z',
          endDate: '2024-08-31T23:59:59Z',
          createdAt: '2024-06-25T10:00:00Z',
          description: 'Beat the heat with our summer electronics sale!',
          minOrderValue: 50000,
          maxDiscount: 100000,
          usageLimit: 1000,
          usedCount: 234
        },
        {
          id: 'PROMO-002',
          name: 'Electronics Deal',
          discount: '15%',
          discountType: 'percentage',
          discountValue: 15,
          status: 'scheduled',
          products: 8,
          startDate: '2024-09-01T00:00:00Z',
          endDate: '2024-09-15T23:59:59Z',
          createdAt: '2024-08-20T14:30:00Z',
          description: 'Special discount on all electronics items',
          minOrderValue: 30000,
          maxDiscount: 75000,
          usageLimit: 500,
          usedCount: 0
        },
        {
          id: 'PROMO-003',
          name: 'Back to School',
          discount: '25%',
          discountType: 'percentage',
          discountValue: 25,
          status: 'ended',
          products: 12,
          startDate: '2024-07-01T00:00:00Z',
          endDate: '2024-07-30T23:59:59Z',
          createdAt: '2024-06-15T09:00:00Z',
          description: 'Get ready for school with amazing discounts',
          minOrderValue: 25000,
          maxDiscount: 50000,
          usageLimit: 300,
          usedCount: 287
        }
      ],
      stats: {
        totalPromotions: 3,
        activePromotions: 1,
        scheduledPromotions: 1,
        endedPromotions: 1,
        totalSavings: 2450000,
        averageDiscount: 20
      },
      tips: [
        {
          title: 'Seasonal Sales',
          description: 'Create promotions around holidays and seasons for maximum impact.',
          category: 'timing'
        },
        {
          title: 'Bundle Deals',
          description: 'Offer discounts on product bundles to increase average order value.',
          category: 'strategy'
        },
        {
          title: 'Limited Time Offers',
          description: 'Create urgency with time-limited promotions to boost conversions.',
          category: 'psychology'
        },
        {
          title: 'Customer Segmentation',
          description: 'Target specific customer groups with personalized promotional offers.',
          category: 'targeting'
        }
      ]
    }
  });
});

// ===== ENABLER REQUESTS MANAGEMENT =====
// In-memory storage for demo purposes (replace with database in production)
let enablerRequests = [
  {
    id: 'REQ-001',
    sellerId: 'SELL-001',
    sellerName: 'Amina Electronics Store',
    requestType: 'sales_support',
    priority: 'high',
    status: 'pending',
    description: 'Need help boosting smartphone sales during holiday season with targeted customer outreach and product demonstrations',
    targetSales: 2500000,
    currentSales: 850000,
    deadline: '2024-01-15',
    products: ['iPhone 15', 'Samsung Galaxy S24', 'Xiaomi Redmi Note 13'],
    requirements: ['Product Knowledge', 'Customer Service', 'Sales Experience'],
    commission: '5%',
    estimatedEarnings: 125000,
    createdAt: '2024-01-02',
    location: 'Dar es Salaam'
  },
  {
    id: 'REQ-002',
    sellerId: 'SELL-002',
    sellerName: 'Fatima Fashion Boutique',
    requestType: 'digital_marketing',
    priority: 'medium',
    status: 'in_progress',
    description: 'Assist with online store setup and social media marketing for traditional wear collection',
    targetSales: 1800000,
    currentSales: 1200000,
    deadline: '2024-01-20',
    products: ['Kanga Dresses', 'Traditional Jewelry', 'Headwraps'],
    requirements: ['Social Media Skills', 'Photography', 'Content Creation'],
    commission: '5%',
    estimatedEarnings: 90000,
    createdAt: '2023-12-28',
    location: 'Arusha'
  }
];

router.get('/enabler-requests', async (req, res) => {
  try {
    // In production, filter by seller ID from authentication
    res.json({
      success: true,
      data: {
        requests: enablerRequests
      }
    });
  } catch (error) {
    console.error('Error fetching enabler requests:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch enabler requests'
    });
  }
});

router.post('/request-enabler', async (req, res) => {
  try {
    const {
      requestType,
      description,
      targetSales,
      deadline,
      products,
      requirements,
      commission,
      priority,
      location
    } = req.body;

    // In production, get seller ID from authentication
    const sellerId = 'SELL-001'; // Mock seller ID
    const sellerName = 'Amina Electronics Store'; // Mock seller name

    // Calculate estimated earnings
    const commissionValue = parseFloat(commission.replace('%', ''));
    const estimatedEarnings = Math.round((targetSales * commissionValue) / 100);

    const newRequest = {
      id: `REQ-${Date.now()}`,
      sellerId,
      sellerName,
      requestType,
      priority,
      status: 'pending',
      description,
      targetSales: Number(targetSales),
      currentSales: 0, // New request starts at 0
      deadline,
      products,
      requirements,
      commission,
      estimatedEarnings,
      createdAt: new Date().toISOString().split('T')[0], // YYYY-MM-DD format
      location
    };

    enablerRequests.push(newRequest);

    res.json({
      success: true,
      data: {
        requestId: newRequest.id,
        message: 'Enabler request submitted successfully'
      }
    });
  } catch (error) {
    console.error('Error creating enabler request:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create enabler request'
    });
  }
});

module.exports = router;
