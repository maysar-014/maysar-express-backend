import { UserManagementSaga } from './userManagementSaga';
import { KYCWorkflowSaga } from './kycWorkflowSaga';
import { TransactionMonitoringSaga } from './transactionMonitoringSaga';
import { DisputeResolutionSaga } from './disputeResolutionSaga';

export const AdminSagas = {
  UserManagementSaga,
  KYCWorkflowSaga,
  TransactionMonitoringSaga,
  DisputeResolutionSaga
};

export * from './userManagementSaga';
export * from './kycWorkflowSaga';
export * from './transactionMonitoringSaga';
export * from './disputeResolutionSaga';