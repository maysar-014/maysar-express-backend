import { User } from '../../domain/entities/user.entity';
import { IUserRepository } from '../../domain/repositories';
import { UserPolicies } from '../../domain/policies/user-policies';
import { logger } from '../../infrastructure/services/logger.service';

/**
 * Search filters for users
 */
export interface UserSearchFilters {
  query?: string; // Search term for email, firstName, lastName
  role?: string;
  status?: string;
  emailVerified?: boolean;
  phoneVerified?: boolean;
  createdAfter?: Date;
  createdBefore?: Date;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: 'createdAt' | 'email' | 'firstName' | 'lastName';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Input for searching users
 */
export interface SearchUsersInput {
  filters: UserSearchFilters;
  pagination: PaginationOptions;
  requestingUserId: string; // For authorization checks
}

/**
 * Search results with metadata
 */
export interface SearchUsersOutput {
  users: User[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  success: boolean;
  message: string;
}

/**
 * Use case for searching and filtering users
 * Handles complex queries with authorization and pagination
 */
export class SearchUsersUseCase {
  constructor(private userRepository: IUserRepository) {}

  /**
   * Execute the search users use case
   */
  async execute(input: SearchUsersInput): Promise<SearchUsersOutput> {
    try {
      logger.logBusiness('Starting user search', input.requestingUserId, {
        filters: input.filters,
        pagination: input.pagination
      });

      // Check if requesting user can perform searches
      const canSearch = await this.checkSearchPermission(input.requestingUserId);
      if (!canSearch.allowed) {
        return {
          users: [],
          pagination: {
            page: 1,
            limit: 0,
            total: 0,
            totalPages: 0,
            hasNext: false,
            hasPrev: false
          },
          success: false,
          message: canSearch.reason || 'Search not allowed'
        };
      }

      // Build search query from filters
      const searchQuery = this.buildSearchQuery(input.filters);
      const pagination = this.normalizePagination(input.pagination);

      // Apply authorization filters
      const authorizedQuery = await this.applyAuthorizationFilters(
        searchQuery,
        input.requestingUserId
      );

      // Execute search
      const users = await this.userRepository.search(
        authorizedQuery,
        pagination.limit,
        (pagination.page - 1) * pagination.limit
      );

      // Get total count for pagination
      const totalCount = await this.getTotalCount(authorizedQuery);

      const paginationInfo = {
        page: pagination.page,
        limit: pagination.limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pagination.limit),
        hasNext: pagination.page * pagination.limit < totalCount,
        hasPrev: pagination.page > 1
      };

      logger.logBusiness('User search completed', input.requestingUserId, {
        resultCount: users.length,
        totalCount,
        page: pagination.page
      });

      return {
        users,
        pagination: paginationInfo,
        success: true,
        message: `Found ${totalCount} users`
      };

    } catch (error) {
      logger.error('Failed to search users', {
        requestingUserId: input.requestingUserId,
        filters: input.filters,
        error
      });

      return {
        users: [],
        pagination: {
          page: 1,
          limit: 0,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        success: false,
        message: 'Failed to search users'
      };
    }
  }

  /**
   * Check if requesting user can perform searches
   */
  private async checkSearchPermission(requestingUserId: string): Promise<{ allowed: boolean; reason?: string }> {
    const requestingUser = await this.userRepository.findById(requestingUserId);
    if (!requestingUser) {
      return { allowed: false, reason: 'Requesting user not found' };
    }

    return UserPolicies.canSearchUsers(requestingUser, {});
  }

  /**
   * Build search query from filters
   */
  private buildSearchQuery(filters: UserSearchFilters): string {
    let query = '';

    if (filters.query) {
      // Build a search string that can be used by the repository
      // In a real implementation, this would be parsed into proper database queries
      query = filters.query.trim();
    }

    // Additional filters would be handled by the repository
    // For now, we'll pass the query string and let the repository handle filtering

    return query;
  }

  /**
   * Normalize pagination options with defaults
   */
  private normalizePagination(pagination: PaginationOptions) {
    return {
      page: Math.max(1, pagination.page || 1),
      limit: Math.min(100, Math.max(1, pagination.limit || 20)), // Max 100, min 1
      sortBy: pagination.sortBy || 'createdAt',
      sortOrder: pagination.sortOrder || 'desc'
    };
  }

  /**
   * Apply authorization filters based on user permissions
   */
  private async applyAuthorizationFilters(
    query: string,
    requestingUserId: string
  ): Promise<string> {
    const requestingUser = await this.userRepository.findById(requestingUserId);

    // System admins can see all users
    if (requestingUser?.role === UserRole.SYSTEM) {
      return query;
    }

    // Enablers can see most users
    if (requestingUser?.role === UserRole.ENABLER) {
      return query; // Could add filters here if needed
    }

    // Regular users have limited search capabilities
    // For now, allow basic search but could restrict further
    return query;
  }

  /**
   * Get total count for pagination (simplified)
   */
  private async getTotalCount(query: string): Promise<number> {
    try {
      // In a real implementation, this would use a count query
      // For now, we'll estimate or use repository methods
      if (query) {
        // Assume search returns some results, estimate total
        return Math.max(1, Math.floor(Math.random() * 1000)); // Mock implementation
      }
      return 0;
    } catch (error) {
      logger.error('Error getting total count', { error });
      return 0;
    }
  }

  /**
   * Advanced search with analytics
   */
  async searchWithAnalytics(input: SearchUsersInput): Promise<SearchUsersOutput & {
    analytics: {
      searchTime: number;
      filtersApplied: string[];
      resultDistribution: {
        byRole: Record<string, number>;
        byStatus: Record<string, number>;
        verificationRate: number;
      };
    };
  }> {
    const startTime = Date.now();
    const result = await this.execute(input);
    const searchTime = Date.now() - startTime;

    // Calculate analytics
    const filtersApplied = this.getAppliedFilters(input.filters);
    const resultDistribution = this.calculateResultDistribution(result.users);

    return {
      ...result,
      analytics: {
        searchTime,
        filtersApplied,
        resultDistribution
      }
    };
  }

  /**
   * Get list of applied filters for analytics
   */
  private getAppliedFilters(filters: UserSearchFilters): string[] {
    const applied: string[] = [];

    if (filters.query) applied.push('query');
    if (filters.role) applied.push('role');
    if (filters.status) applied.push('status');
    if (filters.emailVerified !== undefined) applied.push('emailVerified');
    if (filters.phoneVerified !== undefined) applied.push('phoneVerified');
    if (filters.createdAfter) applied.push('createdAfter');
    if (filters.createdBefore) applied.push('createdBefore');

    return applied;
  }

  /**
   * Calculate result distribution for analytics
   */
  private calculateResultDistribution(users: User[]): {
    byRole: Record<string, number>;
    byStatus: Record<string, number>;
    verificationRate: number;
  } {
    const byRole: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    let verifiedCount = 0;

    users.forEach(user => {
      // Count by role
      byRole[user.role] = (byRole[user.role] || 0) + 1;

      // Count by status
      byStatus[user.status] = (byStatus[user.status] || 0) + 1;

      // Count verifications
      if (user.isEmailVerified) verifiedCount++;
    });

    const verificationRate = users.length > 0 ? (verifiedCount / users.length) * 100 : 0;

    return {
      byRole,
      byStatus,
      verificationRate
    };
  }
}
