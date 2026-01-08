const API_BASE_URL = process.env.NEXT_PUBLIC_ENABLER_API_URL || 'http://localhost:3014/api/enabler';

class EnablerApiService {
  private async fetchApi(endpoint: string) {
    console.log('[API CLIENT] Making request to:', `${API_BASE_URL}${endpoint}`);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      console.log('[API CLIENT] Response status:', response.status);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('[API CLIENT] Response data:', data);
      return data;
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  async getDashboard() {
    // Mock data for development
    return {
      success: true,
      data: {
        stats: {
          totalEarnings: 125000,
          tasksCompleted: 8,
          completionRate: 85,
          activeTasks: 3,
          rankProgress: 65
        },
        recentTasks: [
          {
            id: '1',
            type: 'Sales Support',
            status: 'completed',
            seller: 'TechStore Tanzania',
            time: '2 hours ago',
            earnings: 25000
          }
        ],
        upcomingTasks: [
          {
            id: '1',
            type: 'Sales Assignment',
            priority: 'high',
            deadline: '2 days',
            earnings: 35000
          }
        ]
      }
    };
  }

  async getProfile() {
    return this.fetchApi('/profile');
  }

  async getEarnings() {
    return this.fetchApi('/earnings');
  }

  async getPayments() {
    return this.fetchApi('/payments');
  }

  async getTasks() {
    return this.fetchApi('/tasks');
  }

  async getSellerOnboarding() {
    return this.fetchApi('/seller-onboarding');
  }

  async getBuyerAssistance() {
    return this.fetchApi('/buyer-assistance');
  }

  async getPerformance() {
    return this.fetchApi('/performance');
  }

  async getTraining() {
    return this.fetchApi('/training');
  }

  async getTrustReports() {
    return this.fetchApi('/trust-reports');
  }

  async getSalesSupport() {
    console.log('[API CLIENT] Calling getSalesSupport, URL:', `${API_BASE_URL}/sales-support`);
    // Mock data for development
    return {
      success: true,
      data: {
        activeSessions: [
          {
            id: '1',
            sellerName: 'TechStore Tanzania',
            priority: 'high',
            status: 'pending',
            description: 'Need help promoting iPhone 15 to tech enthusiasts in Dar es Salaam area',
            type: 'sales_support',
            product: 'iPhone 15 Pro Max 256GB',
            productPrice: 2500000,
            deadline: '2024-02-15',
            requirements: ['Product Knowledge', 'Customer Service Skills', 'Digital Marketing'],
            earnings: 125000,
            commission: '5%',
            createdAt: '2024-01-15'
          }
        ],
        completedSessions: [],
        stats: {
          averageRating: 5,
          averageSessionDuration: '2 hours'
        }
      }
    };
  }

  async getSettings() {
    return this.fetchApi('/settings');
  }

  async getKYC() {
    return this.fetchApi('/kyc');
  }

  async getShop() {
    console.log('[API] getShop called');
    // Mock data for development
    const products = [
      {
        id: '1',
        name: 'iPhone 15 Pro Max 256GB',
        price: 2500000,
        category: 'Electronics',
        commission: '5',
        views: 245,
        sellerName: 'TechStore Tanzania',
        expiryDate: '2026-06-15',
        image: '/placeholder-phone.jpg'
      },
      {
        id: '2',
        name: 'Nike Air Jordan 1 Retro',
        price: 450000,
        category: 'Fashion',
        commission: '5',
        views: 89,
        sellerName: 'Fashion Hub',
        expiryDate: '2026-05-20',
        image: '/placeholder-shoes.jpg'
      },
      {
        id: '3',
        name: 'Samsung Galaxy Watch',
        price: 800000,
        category: 'Electronics',
        commission: '4',
        views: 67,
        sellerName: 'Tech World',
        expiryDate: '2026-02-10',
        image: '/placeholder-watch.jpg'
      },
      {
        id: '4',
        name: 'Dell XPS 13 Laptop',
        price: 3200000,
        category: 'Electronics',
        commission: '6',
        views: 156,
        sellerName: 'Computer Solutions Ltd',
        expiryDate: '2026-01-20',
        image: '/placeholder-laptop.jpg'
      }
    ];
    
    console.log('[API] Raw products:', products);
    
    const getDaysRemaining = (expiryDate: string) => {
      const expiry = new Date(expiryDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Reset time to start of day
      expiry.setHours(0, 0, 0, 0); // Reset time to start of day
      const diffTime = expiry.getTime() - today.getTime();
      const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      console.log(`[API] Days remaining for ${expiryDate}:`, days);
      return days;
    };
    
    const activeProducts = products.filter(p => getDaysRemaining(p.expiryDate) > 0);
    console.log('[API] Active products:', activeProducts);
    
    const expiringSoon = activeProducts.filter(p => {
      const days = getDaysRemaining(p.expiryDate);
      return days > 0 && days <= 30;
    });
    console.log('[API] Expiring soon:', expiringSoon);
    
    const result = {
      success: true,
      data: {
        products: activeProducts,
        stats: {
          totalProducts: products.length,
          activeProducts: activeProducts.length,
          expiringSoon: expiringSoon.length,
          totalViews: activeProducts.reduce((sum, p) => sum + p.views, 0)
        }
      }
    };
    
    console.log('[API] Final result:', result);
    return result;
  }
}

export const enablerApi = new EnablerApiService();
