/**
 * MasterOrderRepository interface
 * Defines the contract for persisting and reading Order_MasterOrder records.
 */

export interface MasterOrderData {
  id: string;
  buyerId: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  sellerOrderIds: string[];
}

export interface SellerOrderSummary {
  orderId: string;
  sellerId: string;
  status: string;
  totalAmount: number;
  deliveryFee?: number;
  items: any[];
  verificationDeadlineAt?: string;
  chatConversationId?: string;
  createdAt: Date;
}

export interface MasterOrderWithOrders {
  masterOrderId: string;
  buyerId: string;
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  createdAt: Date;
  isVirtual: false;
  sellerOrders: SellerOrderSummary[];
}

export interface MasterOrderSummary {
  masterOrderId: string;
  status: string;        // derived at read time
  totalAmount: number;
  currency: string;
  paymentMethod: string;
  sellerOrderCount: number;
  itemCount: number;
  isVirtual: boolean;
  createdAt: Date;
}

export interface PaginatedMasterOrders {
  items: MasterOrderSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface MasterOrderRepository {
  create(data: MasterOrderData): Promise<void>;
  findById(masterOrderId: string): Promise<MasterOrderWithOrders | null>;
  findByBuyerId(buyerId: string, page: number, pageSize: number): Promise<PaginatedMasterOrders>;
}
