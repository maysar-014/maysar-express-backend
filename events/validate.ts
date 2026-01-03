#!/usr/bin/env node

import { eventSchemaRegistry } from './schemaRegistry';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

interface ValidationResult {
  success: boolean;
  errors: string[];
  warnings: string[];
}

class EventSchemaValidator {
  private catalogPath: string;
  private result: ValidationResult;

  constructor() {
    this.catalogPath = join(__dirname, 'CATALOG.md');
    this.result = {
      success: true,
      errors: [],
      warnings: []
    };
  }

  async validate(): Promise<ValidationResult> {
    console.log('🔍 Validating Event Catalog & Schema Registry...\n');

    // Check if catalog exists
    if (!existsSync(this.catalogPath)) {
      this.result.errors.push('Event catalog (CATALOG.md) not found');
      this.result.success = false;
      return this.result;
    }

    // Validate schema registry
    this.validateSchemaRegistry();
    
    // Validate event type definitions
    this.validateEventTypes();
    
    // Check for breaking changes
    this.checkBreakingChanges();
    
    // Validate producer/consumer contracts
    this.validateContracts();

    this.printResults();
    return this.result;
  }

  private validateSchemaRegistry(): void {
    console.log('📋 Validating Schema Registry...');
    
    const requiredEvents = [
      'order.created',
      'payment.succeeded',
      'payment.failed',
      'inventory.reserved',
      'seller.kyc.approved',
      'logistics.delivery.completed'
    ];

    for (const eventType of requiredEvents) {
      const versions = eventSchemaRegistry.getSupportedVersions(eventType);
      
      if (versions.length === 0) {
        this.result.errors.push(`Missing schema for required event: ${eventType}`);
        this.result.success = false;
      } else {
        console.log(`  ✅ ${eventType} - versions: ${versions.join(', ')}`);
        
        // Validate each version
        for (const version of versions) {
          const schema = eventSchemaRegistry.getSchema(eventType, version);
          if (!schema) {
            this.result.errors.push(`Schema definition missing for ${eventType}.${version}`);
            this.result.success = false;
          }
        }
      }
    }
  }

  private validateEventTypes(): void {
    console.log('\n🏗️  Validating Event Type Definitions...');
    
    try {
      // This would normally import and validate the types file
      // For now, just check if it exists and is valid TypeScript
      const typesPath = join(__dirname, 'types.ts');
      if (!existsSync(typesPath)) {
        this.result.errors.push('Event types file (types.ts) not found');
        this.result.success = false;
      } else {
        console.log('  ✅ Event types file exists');
      }
    } catch (error) {
      this.result.errors.push(`Event types validation failed: ${error}`);
      this.result.success = false;
    }
  }

  private checkBreakingChanges(): void {
    console.log('\n🔄 Checking for Breaking Changes...');
    
    // This would normally compare against previous version
    // For now, just validate current schemas
    const eventTypes = eventSchemaRegistry.getAllEventTypes();
    
    for (const eventType of eventTypes) {
      const versions = eventSchemaRegistry.getSupportedVersions(eventType);
      
      if (versions.length > 1) {
        // Check compatibility between versions
        const sortedVersions = versions.sort();
        for (let i = 1; i < sortedVersions.length; i++) {
          const fromVersion = sortedVersions[i - 1];
          const toVersion = sortedVersions[i];
          
          const compatibility = eventSchemaRegistry.checkCompatibility(
            eventType, 
            fromVersion, 
            toVersion
          );
          
          if (!compatibility.compatible) {
            this.result.warnings.push(
              `Potential breaking change in ${eventType} from ${fromVersion} to ${toVersion}`
            );
          }
        }
      }
    }
    
    console.log('  ✅ Breaking change analysis complete');
  }

  private validateContracts(): void {
    console.log('\n📝 Validating Producer/Consumer Contracts...');
    
    const sampleEvents = [
      {
        eventType: 'order.created',
        version: 'v1',
        payload: {
          orderId: '123e4567-e89b-12d3-a456-426614174000',
          orderNumber: 'ORD-1640995200000-001',
          buyerId: '123e4567-e89b-12d3-a456-426614174001',
          sellerId: '123e4567-e89b-12d3-a456-426614174002',
          items: [{
            productVariantId: '123e4567-e89b-12d3-a456-426614174003',
            quantity: 2,
            unitPrice: 1500,
            totalPrice: 3000
          }],
          totalAmount: 3000,
          currency: 'TZS',
          shippingAddress: {},
          billingAddress: {}
        }
      },
      {
        eventType: 'order.created',
        version: 'v2',
        payload: {
          orderId: '123e4567-e89b-12d3-a456-426614174000',
          orderNumber: 'ORD-1640995200000-001',
          buyerId: '123e4567-e89b-12d3-a456-426614174001',
          sellerId: '123e4567-e89b-12d3-a456-426614174002',
          items: [{
            productVariantId: '123e4567-e89b-12d3-a456-426614174003',
            quantity: 2,
            unitPrice: 1500,
            totalPrice: 3000,
            discountAmount: 100,
            taxAmount: 200
          }],
          totalAmount: 3000,
          currency: 'TZS',
          shippingAddress: {},
          billingAddress: {},
          discountCode: 'SAVE10',
          totalDiscount: 100,
          orderSource: 'web'
        }
      },
      {
        eventType: 'payment.succeeded',
        version: 'v1',
        payload: {
          paymentId: '123e4567-e89b-12d3-a456-426614174004',
          orderId: '123e4567-e89b-12d3-a456-426614174000',
          amount: 3000,
          currency: 'TZS',
          paymentMethod: 'mobile_money',
          transactionId: 'TXN-123456789'
        }
      },
      {
        eventType: 'payment.succeeded',
        version: 'v2',
        payload: {
          paymentId: '123e4567-e89b-12d3-a456-426614174004',
          orderId: '123e4567-e89b-12d3-a456-426614174000',
          amount: 3000,
          currency: 'TZS',
          paymentMethod: 'crypto',
          transactionId: 'TXN-123456789',
          processingFee: 50,
          exchangeRate: 1.0
        }
      }
    ];

    for (const event of sampleEvents) {
      const validation = eventSchemaRegistry.validateEvent(
        event.eventType,
        event.version,
        event.payload
      );

      if (!validation.valid) {
        this.result.errors.push(
          `Schema validation failed for ${event.eventType}.${event.version}: ${validation.errors?.join(', ')}`
        );
        this.result.success = false;
      } else {
        console.log(`  ✅ ${event.eventType}.${event.version} - valid`);
      }
    }
  }

  private printResults(): void {
    console.log('\n' + '='.repeat(60));
    console.log('📊 VALIDATION RESULTS');
    console.log('='.repeat(60));
    
    if (this.result.success) {
      console.log('🎉 SUCCESS: All validations passed!');
    } else {
      console.log('❌ FAILURE: Validation errors found');
    }
    
    if (this.result.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      this.result.errors.forEach(error => console.log(`  - ${error}`));
    }
    
    if (this.result.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.result.warnings.forEach(warning => console.log(`  - ${warning}`));
    }
    
    console.log('\n📈 STATISTICS:');
    console.log(`  - Event types: ${eventSchemaRegistry.getAllEventTypes().length}`);
    console.log(`  - Total schemas: ${this.getTotalSchemaCount()}`);
    console.log(`  - Errors: ${this.result.errors.length}`);
    console.log(`  - Warnings: ${this.result.warnings.length}`);
  }

  private getTotalSchemaCount(): number {
    return eventSchemaRegistry.getAllEventTypes()
      .reduce((total, eventType) => {
        return total + eventSchemaRegistry.getSupportedVersions(eventType).length;
      }, 0);
  }
}

// Run validation if called directly
if (require.main === module) {
  const validator = new EventSchemaValidator();
  validator.validate().then(result => {
    process.exit(result.success ? 0 : 1);
  });
}

export { EventSchemaValidator };