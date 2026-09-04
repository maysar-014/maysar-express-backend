import { OrderStatus } from './order.entity';

export type AuditActor = 'buyer' | 'seller' | 'system' | 'admin';
export type AuditEntryType = 'STATUS_TRANSITION' | 'ADMIN_ACTION' | 'ADMIN_OVERRIDE';

export interface VerificationAuditLogEntry {
  id: string;
  orderId: string;
  entryType: AuditEntryType;
  actorType: AuditActor;
  /** userId of buyer/seller/admin; undefined for system-triggered transitions */
  actorId?: string;
  previousStatus: string;
  newStatus: string;
  /** Mandatory for ADMIN_OVERRIDE entries */
  reason?: string;
  notes?: string;
  timestamp: Date;
}
