export interface ValidationInput {
  orderId?: string;
  customerId: string;
  productItems: ProductItem[];
  shippingAddress: Address;
  billingAddress?: Address;
  paymentMethod: PaymentMethod;
  orderType: 'standard' | 'express' | 'bulk' | 'subscription';
  channel: 'web' | 'mobile' | 'api' | 'pos';
  metadata?: Record<string, any>;
}

export interface ProductItem {
  productId: string;
  variantId?: string;
  quantity: number;
  unitPrice: number;
  sellerId: string;
}

export interface Address {
  street: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
  coordinates?: { lat: number; lng: number };
}

export interface PaymentMethod {
  type: 'card' | 'mobile_money' | 'bank_transfer' | 'wallet' | 'cash_on_delivery';
  provider: string;
  accountId?: string;
  verified: boolean;
}

export interface ValidationOutput {
  success: boolean;
  isValid: boolean;
  validationId: string;
  errors: ValidationError[];
  warnings: ValidationWarning[];
  suggestions: ValidationSuggestion[];
  compliance: ComplianceResult;
  businessRules: BusinessRuleResult[];
  dataIntegrity: DataIntegrityResult;
  confidence: number;
  processingTime: number;
}

export interface ValidationError {
  code: string;
  field: string;
  message: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: 'format' | 'business' | 'compliance' | 'integrity';
}

export interface ValidationWarning {
  code: string;
  field: string;
  message: string;
  impact: 'performance' | 'user_experience' | 'business_risk';
}

export interface ValidationSuggestion {
  type: 'correction' | 'optimization' | 'enhancement';
  field: string;
  suggestion: string;
  benefit: string;
}

export interface ComplianceResult {
  gdprCompliant: boolean;
  botCompliant: boolean;
  taxCompliant: boolean;
  dataRetentionCompliant: boolean;
  issues: string[];
}

export interface BusinessRuleResult {
  ruleId: string;
  ruleName: string;
  passed: boolean;
  value: any;
  threshold: any;
  impact: string;
}

export interface DataIntegrityResult {
  checksumValid: boolean;
  referencesValid: boolean;
  constraintsValid: boolean;
  consistencyScore: number;
}

export class ValidationEngine {
  private readonly ACCURACY_TARGET = 99.99;
  private readonly MAX_PROCESSING_TIME = 25; // ms

  async processValidationRequest(input: ValidationInput): Promise<ValidationOutput> {
    const startTime = Date.now();
    const validationId = `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    try {
      const [formatValidation, businessRuleValidation, complianceValidation, integrityValidation, crossReferenceValidation] = await Promise.all([
        this.validateFormat(input),
        this.validateBusinessRules(input),
        this.validateCompliance(input),
        this.validateDataIntegrity(input),
        this.validateCrossReferences(input)
      ]);

      const errors = [
        ...formatValidation.errors,
        ...businessRuleValidation.errors,
        ...complianceValidation.errors,
        ...integrityValidation.errors,
        ...crossReferenceValidation.errors
      ];

      const warnings = [
        ...formatValidation.warnings,
        ...businessRuleValidation.warnings,
        ...complianceValidation.warnings,
        ...integrityValidation.warnings
      ];

      const suggestions = [
        ...formatValidation.suggestions,
        ...businessRuleValidation.suggestions,
        ...complianceValidation.suggestions
      ];

      const compliance: ComplianceResult = {
        gdprCompliant: complianceValidation.gdprCompliant,
        botCompliant: complianceValidation.botCompliant,
        taxCompliant: complianceValidation.taxCompliant,
        dataRetentionCompliant: complianceValidation.dataRetentionCompliant,
        issues: complianceValidation.issues
      };

      const businessRules = businessRuleValidation.rules;

      const dataIntegrity: DataIntegrityResult = {
        checksumValid: integrityValidation.checksumValid,
        referencesValid: crossReferenceValidation.referencesValid,
        constraintsValid: integrityValidation.constraintsValid,
        consistencyScore: integrityValidation.consistencyScore
      };

      const confidence = this.calculateConfidence(formatValidation, businessRuleValidation, complianceValidation, integrityValidation);
      const processingTime = Date.now() - startTime;
      const isValid = errors.filter(e => e.severity === 'critical' || e.severity === 'high').length === 0;

      return {
        success: true,
        isValid,
        validationId,
        errors,
        warnings,
        suggestions,
        compliance,
        businessRules,
        dataIntegrity,
        confidence,
        processingTime
      };

    } catch (error: any) {
      return {
        success: false,
        isValid: false,
        validationId,
        errors: [{ code: 'VALIDATION_FAILED', field: 'system', message: error.message, severity: 'critical', category: 'integrity' }],
        warnings: [],
        suggestions: [],
        compliance: { gdprCompliant: false, botCompliant: false, taxCompliant: false, dataRetentionCompliant: false, issues: [error.message] },
        businessRules: [],
        dataIntegrity: { checksumValid: false, referencesValid: false, constraintsValid: false, consistencyScore: 0 },
        confidence: 0,
        processingTime: Date.now() - startTime
      };
    }
  }

  private async validateFormat(input: ValidationInput): Promise<any> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];

    if (!input.customerId || !/^cust_[a-zA-Z0-9_]{10,50}$/.test(input.customerId)) {
      errors.push({
        code: 'INVALID_CUSTOMER_ID',
        field: 'customerId',
        message: 'Customer ID must follow format: cust_[alphanumeric]',
        severity: 'critical',
        category: 'format'
      });
    }

    if (!input.productItems || input.productItems.length === 0) {
      errors.push({
        code: 'NO_PRODUCTS',
        field: 'productItems',
        message: 'At least one product item is required',
        severity: 'critical',
        category: 'format'
      });
    } else {
      input.productItems.forEach((item, index) => {
        if (!item.productId || !/^prod_[a-zA-Z0-9_]{10,50}$/.test(item.productId)) {
          errors.push({
            code: 'INVALID_PRODUCT_ID',
            field: `productItems[${index}].productId`,
            message: 'Product ID must follow format: prod_[alphanumeric]',
            severity: 'critical',
            category: 'format'
          });
        }

        if (item.quantity <= 0 || item.quantity > 10000) {
          errors.push({
            code: 'INVALID_QUANTITY',
            field: `productItems[${index}].quantity`,
            message: 'Quantity must be between 1 and 10000',
            severity: 'high',
            category: 'format'
          });
        }

        if (item.unitPrice <= 0 || item.unitPrice > 10000000) {
          errors.push({
            code: 'INVALID_PRICE',
            field: `productItems[${index}].unitPrice`,
            message: 'Unit price must be between 1 and 10,000,000',
            severity: 'high',
            category: 'format'
          });
        }
      });
    }

    if (!this.validateAddress(input.shippingAddress)) {
      errors.push({
        code: 'INVALID_SHIPPING_ADDRESS',
        field: 'shippingAddress',
        message: 'Complete shipping address is required',
        severity: 'critical',
        category: 'format'
      });
    }

    if (!input.paymentMethod.verified) {
      warnings.push({
        code: 'UNVERIFIED_PAYMENT',
        field: 'paymentMethod',
        message: 'Payment method is not verified',
        impact: 'business_risk'
      });
    }

    return { errors, warnings, suggestions, score: errors.length === 0 ? 100 : Math.max(0, 100 - errors.length * 10) };
  }

  private async validateBusinessRules(input: ValidationInput): Promise<any> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];
    const rules: BusinessRuleResult[] = [];

    const totalValue = input.productItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    const maxOrderValue = 50000000; // 50M TZS
    
    rules.push({
      ruleId: 'MAX_ORDER_VALUE',
      ruleName: 'Maximum Order Value',
      passed: totalValue <= maxOrderValue,
      value: totalValue,
      threshold: maxOrderValue,
      impact: 'Risk management and fraud prevention'
    });

    if (totalValue > maxOrderValue) {
      errors.push({
        code: 'ORDER_VALUE_EXCEEDED',
        field: 'productItems',
        message: `Order value ${totalValue} exceeds maximum ${maxOrderValue}`,
        severity: 'high',
        category: 'business'
      });
    }

    const sellerQuantities = new Map<string, number>();
    input.productItems.forEach(item => {
      const current = sellerQuantities.get(item.sellerId) || 0;
      sellerQuantities.set(item.sellerId, current + item.quantity);
    });

    sellerQuantities.forEach((quantity, sellerId) => {
      const minQuantity = 1;
      rules.push({
        ruleId: 'MIN_SELLER_QUANTITY',
        ruleName: 'Minimum Seller Quantity',
        passed: quantity >= minQuantity,
        value: quantity,
        threshold: minQuantity,
        impact: 'Seller efficiency and logistics optimization'
      });
    });

    if (input.orderType === 'express') {
      const maxExpressItems = 5;
      const expressItemCount = input.productItems.length;
      
      rules.push({
        ruleId: 'EXPRESS_ITEM_LIMIT',
        ruleName: 'Express Order Item Limit',
        passed: expressItemCount <= maxExpressItems,
        value: expressItemCount,
        threshold: maxExpressItems,
        impact: 'Express delivery capability'
      });

      if (expressItemCount > maxExpressItems) {
        warnings.push({
          code: 'EXPRESS_ITEM_LIMIT_EXCEEDED',
          field: 'orderType',
          message: `Express orders limited to ${maxExpressItems} items`,
          impact: 'performance'
        });
      }
    }

    return { errors, warnings, suggestions, rules, score: rules.filter(r => r.passed).length / rules.length * 100 };
  }

  private async validateCompliance(input: ValidationInput): Promise<any> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];
    const suggestions: ValidationSuggestion[] = [];
    const issues: string[] = [];

    let gdprCompliant = true;
    if (!input.customerId) {
      gdprCompliant = false;
      issues.push('Customer consent tracking requires valid customer ID');
    }

    let botCompliant = true;
    const totalValue = input.productItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
    if (totalValue > 10000000 && input.paymentMethod.type !== 'bank_transfer') {
      botCompliant = false;
      issues.push('High-value transactions require bank transfer verification');
    }

    let taxCompliant = true;
    if (input.shippingAddress.country !== 'TZ') {
      warnings.push({
        code: 'INTERNATIONAL_TAX',
        field: 'shippingAddress.country',
        message: 'International orders may require additional tax documentation',
        impact: 'business_risk'
      });
    }

    const dataRetentionCompliant = true;

    return {
      errors,
      warnings,
      suggestions,
      gdprCompliant,
      botCompliant,
      taxCompliant,
      dataRetentionCompliant,
      issues,
      score: (gdprCompliant && botCompliant && taxCompliant && dataRetentionCompliant) ? 100 : 75
    };
  }

  private async validateDataIntegrity(input: ValidationInput): Promise<any> {
    const errors: ValidationError[] = [];
    const warnings: ValidationWarning[] = [];

    const checksumValid = true;
    let constraintsValid = true;
    
    const productIds = input.productItems.map(item => `${item.productId}_${item.variantId || 'default'}`);
    const uniqueProductIds = new Set(productIds);
    
    if (productIds.length !== uniqueProductIds.size) {
      constraintsValid = false;
      errors.push({
        code: 'DUPLICATE_PRODUCTS',
        field: 'productItems',
        message: 'Duplicate product items detected',
        severity: 'medium',
        category: 'integrity'
      });
    }

    let consistencyScore = 100;
    if (errors.length > 0) consistencyScore -= errors.length * 10;
    if (warnings.length > 0) consistencyScore -= warnings.length * 5;

    return {
      errors,
      warnings,
      checksumValid,
      constraintsValid,
      consistencyScore: Math.max(0, consistencyScore),
      score: constraintsValid && checksumValid ? 100 : 80
    };
  }

  private async validateCrossReferences(input: ValidationInput): Promise<any> {
    const errors: ValidationError[] = [];
    const referencesValid = true;

    return {
      errors,
      referencesValid,
      score: referencesValid ? 100 : 0
    };
  }

  private validateAddress(address: Address): boolean {
    return !!(
      address.street &&
      address.city &&
      address.region &&
      address.country &&
      address.street.length >= 5 &&
      address.city.length >= 2 &&
      address.region.length >= 2 &&
      address.country.length === 2
    );
  }

  private calculateConfidence(formatValidation: any, businessRuleValidation: any, complianceValidation: any, integrityValidation: any): number {
    const factors = {
      formatValidation: formatValidation.score / 100,
      businessRules: businessRuleValidation.score / 100,
      dataIntegrity: integrityValidation.score / 100,
      compliance: complianceValidation.score / 100,
      systemReliability: 0.999
    };

    const confidence = Object.entries(factors).reduce((total, [key, value]) => {
      return total + (value * 0.2);
    }, 0) * 100;

    return Math.min(confidence, 99.99);
  }
}