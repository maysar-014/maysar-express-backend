/**
 * User Service Port - Domain interface for user service integration
 * Implemented by infrastructure adapters (user-service HTTP, etc.)
 */
export interface IUserServiceAdapter {
  notifyBusinessRegistered(params: {
    ownerId: string;
    businessId: string;
    businessName: string;
    correlationId: string;
  }): Promise<void>;
}
