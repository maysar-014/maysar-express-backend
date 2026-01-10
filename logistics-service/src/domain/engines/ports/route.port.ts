import { Route } from '../../entities/route.entity';
import { RouteStatus } from '../../enums/route-status.enum';

export interface RouteRepositoryPort {
  save(route: Route): Promise<void>;
  findById(id: string): Promise<Route | null>;
  findByCourierId(courierId: string, status?: RouteStatus): Promise<Route[]>;
  findAll(options?: {
    page?: number;
    limit?: number;
    status?: RouteStatus;
    courierId?: string;
    dateFrom?: Date;
    dateTo?: Date;
  }): Promise<{ routes: Route[]; total: number }>;
  updateRoute(id: string, updates: Partial<Route>): Promise<Route>;
  deleteRoute(id: string): Promise<void>;
}
