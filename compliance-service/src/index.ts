#!/usr/bin/env tsx

/**
 * Compliance Service Main Entry Point
 * Orchestrates GDPR, PCI DSS, SOX, and KYC compliance automation
 */

import { EventBus } from './shared/events/eventBus';
import { GDPRComplianceService, GDPREventHandlers } from './gdprCompliance';
import { PCIComplianceService, PCIEventHandlers } from './pciCompliance';
import { SOXComplianceService, SOXEventHandlers } from './soxCompliance';
import { KYCComplianceService, KYCEventHandlers } from './kycCompliance';

const eventBus = new EventBus();

// Initialize compliance services
const gdprService = new GDPRComplianceService();
const pciService = new PCIComplianceService();
const soxService = new SOXComplianceService();
const kycService = new KYCComplianceService();

// Initialize event handlers
const gdprHandlers = new GDPREventHandlers();
const pciHandlers = new PCIEventHandlers();
const soxHandlers = new SOXEventHandlers();
const kycHandlers = new KYCEventHandlers();

// Register event handlers
eventBus.onEvent('SubjectRightsRequestCreated.v1', gdprHandlers.handleSubjectRightsRequestCreated.bind(gdprHandlers));
eventBus.onEvent('DataRetentionCheck.v1', gdprHandlers.handleDataRetentionCheck.bind(gdprHandlers));

eventBus.onEvent('PCIAssessmentDue.v1', pciHandlers.handlePCIAssessmentDue.bind(pciHandlers));
eventBus.onEvent('PCIVulnerabilityScan.v1', pciHandlers.handlePCIVulnerabilityScan.bind(pciHandlers));

eventBus.onEvent('SOXControlReviewDue.v1', soxHandlers.handleSOXControlReviewDue.bind(soxHandlers));
eventBus.onEvent('SOXComplianceCheck.v1', soxHandlers.handleSOXComplianceCheck.bind(soxHandlers));

eventBus.onEvent('KYCVerificationSubmitted.v1', kycHandlers.handleKYCVerificationSubmitted.bind(kycHandlers));
eventBus.onEvent('KYCExpiryCheck.v1', kycHandlers.handleKYCExpiryCheck.bind(kycHandlers));
eventBus.onEvent('RetentionPolicyCheck.v1', kycHandlers.handleRetentionPolicyCheck.bind(kycHandlers));

// Schedule periodic compliance checks
setInterval(() => {
  eventBus.publish('DataRetentionCheck.v1', {});
  eventBus.publish('PCIVulnerabilityScan.v1', {});
  eventBus.publish('SOXComplianceCheck.v1', {});
  eventBus.publish('RetentionPolicyCheck.v1', {});
}, 24 * 60 * 60 * 1000); // Daily

// Schedule quarterly compliance reviews
setInterval(() => {
  eventBus.publish('KYCExpiryCheck.v1', {});
}, 90 * 24 * 60 * 60 * 1000); // Quarterly

console.log('Compliance Service started successfully');
console.log('Monitoring GDPR, PCI DSS, SOX, and KYC compliance');
console.log('Automated compliance checks scheduled');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down Compliance Service...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('Shutting down Compliance Service...');
  process.exit(0);
});
