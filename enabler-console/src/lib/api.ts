const API_BASE_URL = process.env.NEXT_PUBLIC_ENABLER_API_URL || 'http://localhost:3003/api/enabler';

class EnablerApiService {
  private async fetchApi(endpoint: string) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API Error for ${endpoint}:`, error);
      throw error;
    }
  }

  async getDashboard() {
    return this.fetchApi('/dashboard');
  }

  async getProfile() {
    return this.fetchApi('/profile');
  }

  async getEarnings() {
    return this.fetchApi('/earnings');
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

  async getLogistics() {
    return this.fetchApi('/logistics');
  }

  async getTrustReports() {
    return this.fetchApi('/trust-reports');
  }

  async getSalesSupport() {
    return this.fetchApi('/sales-support');
  }

  async getSettings() {
    return this.fetchApi('/settings');
  }

  async getKYC() {
    return this.fetchApi('/kyc');
  }
}

export const enablerApi = new EnablerApiService();