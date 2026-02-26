// Module Registry Export
export { AnalyticsModule } from './analytics-service';
export { ApiGatewayModule } from './api-gateway';
export { AuthModule } from './auth-service'; // Now includes session-service & two-factor-service
export { BusinessRegistryModule } from './business-registry-service';
// CampaignModule merged into CatalogModule
export { CatalogModule } from './catalog-service'; // Now includes campaign-service & pricing-service
export { CheckoutModule } from './checkout-service';
export { CommissionModule } from './commission-service';
export { CommunityModule } from './community-service';
export { ComplianceModule } from './compliance-service';
export { EnablerModule } from './enabler-service';
export { InventoryModule } from './inventory-service';
export { LogisticsModule } from './logistics-service';
export { MapsModule } from './maps-service';
export { ModerationModule } from './moderation-service';
export { NotificationModule } from './notification-service'; // Now includes sms-service
export { OrderModule } from './order-service';
export { PaymentModule } from './payment-service';
export { PayoutModule } from './payout-service';
export { PermissionModule } from './permission-service';
// PricingModule merged into CatalogModule
export { ProductionModule } from './production-service';
// SessionModule merged into AuthModule
// SmsModule merged into NotificationModule
export { SupportModule } from './support-service';
export { TrainingModule } from './training-service';
// TwoFactorModule merged into AuthModule
export { UserModule } from './user-service';
export { WalletModule } from './wallet-service';
