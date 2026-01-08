const API_BASE_URL = process.env.NEXT_PUBLIC_COURIER_API_URL || 'http://localhost:3015/api/courier';

class CourierApiService {
  private async fetchApi(endpoint: string, options?: RequestInit) {
    console.log('[COURIER API CLIENT] Making request to:', `${API_BASE_URL}${endpoint}`);
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Content-Type': 'application/json',
        },
        ...options,
      });
      console.log('[COURIER API CLIENT] Response status:', response.status);
      if (!response.ok) {
        return this.getDefaultData(endpoint);
      }
      const text = await response.text();
      if (!text) {
        return this.getDefaultData(endpoint);
      }
      const data = JSON.parse(text);
      console.log('[COURIER API CLIENT] Response data:', data);
      return data;
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      return this.getDefaultData(endpoint);
    }
  }

  private getDefaultData(endpoint: string) {
    if (endpoint.includes('/dashboard')) {
      return { data: { todayEarnings: 0, activeDeliveries: 0, completedDeliveries: 0, rating: 0 } };
    }
    if (endpoint.includes('/earnings')) {
      return { data: { amount: 0, pending: 0, history: [] } };
    }
    if (endpoint.includes('/deliveries')) {
      return { data: [] };
    }
    if (endpoint.includes('/performance')) {
      return { data: { score: 0, hints: [], insights: [] } };
    }
    if (endpoint.includes('/vehicle')) {
      return { data: { status: 'unknown', maintenance: [], history: [] } };
    }
    if (endpoint.includes('/account')) {
      return { data: { status: 'unknown', documents: [], restrictions: [], history: [] } };
    }
    if (endpoint.includes('/training')) {
      return { data: [] };
    }
    if (endpoint.includes('/alerts/critical')) {
      return { data: [] };
    }
    if (endpoint.includes('/status')) {
      return { 
        data: { 
          status: 'Connecting...', 
          statusMessage: 'Establishing connection to server',
          vehicleType: 'Loading...', 
          vehicleCapacity: 'Fetching vehicle details...',
          behaviorLevel: 'Loading...', 
          behaviorDescription: 'Retrieving performance data...'
        } 
      };
    }
    if (endpoint.includes('/routes/adherence')) {
      return { 
        data: { 
          onRoutePercentage: 'Loading...', 
          gpsAccuracy: 'Fetching GPS data...', 
          speedCompliance: 'Loading...'
        } 
      };
    }
    if (endpoint.includes('/routes/traffic-intelligence')) {
      return { data: [] };
    }
    if (endpoint.includes('/gps/status')) {
      return { 
        data: { 
          active: null,
          status: 'Checking GPS connection...'
        } 
      };
    }
    if (endpoint.includes('/support/tickets')) {
      return { data: [] };
    }
    return { data: {} };
  }

  // ===== DASHBOARD APIs =====
  async getDashboard() {
    return this.fetchApi('/dashboard');
  }



  // ===== DELIVERY MANAGEMENT APIs =====
  async getActiveDeliveries() {
    return this.fetchApi('/deliveries/active');
  }

  async acceptDelivery(deliveryId: string) {
    return this.fetchApi(`/deliveries/${deliveryId}/accept`, {
      method: 'POST',
    });
  }

  async completeDelivery(deliveryId: string) {
    return this.fetchApi(`/deliveries/${deliveryId}/complete`, {
      method: 'POST',
    });
  }



  // ===== ROUTE & NAVIGATION APIs =====
  async getCurrentRoute() {
    return this.fetchApi('/routes/current');
  }

  async requestReroute() {
    return this.fetchApi('/routes/optimize', {
      method: 'POST',
    });
  }

  // ===== ISSUE REPORTING APIs =====
  async getIssueTypes() {
    return this.fetchApi('/issues/types');
  }

  async reportIssue(issueData: any) {
    return this.fetchApi('/issues/report', {
      method: 'POST',
      body: JSON.stringify(issueData),
    });
  }

  // ===== EARNINGS APIs =====
  async getTodayEarnings() {
    return this.fetchApi('/earnings/today');
  }

  async getPendingEarnings() {
    return this.fetchApi('/earnings/pending');
  }

  async getEarningsHistory() {
    return this.fetchApi('/earnings/payout-history');
  }

  // ===== PERFORMANCE & BEHAVIOR APIs =====
  async getPerformanceOverview() {
    return this.fetchApi('/performance/overview');
  }

  async getPerformanceHints() {
    return this.fetchApi('/performance/hints');
  }

  async getPerformanceInsights() {
    return this.fetchApi('/performance/insights');
  }

  // ===== VEHICLE MANAGEMENT APIs =====
  async getVehicleOverview() {
    return this.fetchApi('/vehicle/overview');
  }

  async getVehicleMaintenance() {
    return this.fetchApi('/vehicle/maintenance');
  }

  async getVehicleEligibility() {
    return this.fetchApi('/vehicle/eligibility');
  }

  async submitVehicleChangeRequest(requestData: any) {
    return this.fetchApi('/vehicle/change-request', {
      method: 'POST',
      body: JSON.stringify(requestData),
    });
  }

  async getVehicleHistory() {
    return this.fetchApi('/vehicle/history');
  }

  // ===== ACCOUNT & KYC APIs =====
  async getAccountStatus() {
    return this.fetchApi('/account/status');
  }

  async getAccountDocuments() {
    return this.fetchApi('/account/documents');
  }

  async uploadDocument(documentId: string, fileData: any) {
    return this.fetchApi(`/account/documents/${documentId}/upload`, {
      method: 'POST',
      body: JSON.stringify(fileData),
    });
  }

  async getAccountRestrictions() {
    return this.fetchApi('/account/restrictions');
  }

  async getAccountHistory() {
    return this.fetchApi('/account/history');
  }

  // ===== TRAINING & DEVELOPMENT APIs =====
  async getTrainingModules() {
    return this.fetchApi('/training/modules');
  }

  async getTrainingProgress() {
    return this.fetchApi('/training/progress');
  }

  async getTrainingPaths() {
    return this.fetchApi('/training/paths');
  }

  async getTrainingAchievements() {
    return this.fetchApi('/training/achievements');
  }

  async startTrainingModule(moduleId: string) {
    return this.fetchApi(`/training/modules/${moduleId}/start`, {
      method: 'POST'
    });
  }

  async completeTrainingModule(moduleId: string) {
    return this.fetchApi(`/training/modules/${moduleId}/complete`, {
      method: 'POST'
    });
  }

  // ===== LOCATION & TRACKING APIs =====
  async updateLocation(locationData: { lat: number; lng: number }) {
    return this.fetchApi('/location', {
      method: 'PUT',
      body: JSON.stringify(locationData),
    });
  }

  // ===== ALERTS & STATUS APIs =====
  async getCriticalAlerts() {
    return this.fetchApi('/alerts/critical');
  }

  async getCourierStatus() {
    return this.fetchApi('/status');
  }

  // ===== ROUTE PERFORMANCE APIs =====
  async getRouteAdherence() {
    return this.fetchApi('/routes/adherence');
  }

  async getTrafficIntelligence() {
    return this.fetchApi('/routes/traffic-intelligence');
  }

  async getGpsStatus() {
    return this.fetchApi('/gps/status');
  }

  // ===== SUPPORT APIs =====
  async getSupportTickets() {
    return this.fetchApi('/support/tickets');
  }
}

export const courierApi = new CourierApiService();
