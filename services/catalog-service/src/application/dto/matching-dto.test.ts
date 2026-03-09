import { MatchLevel } from '../../domain/value-objects/match-result.value-object';
import type {
  MatchAuditDto,
  MatchConfirmationRequestDto,
  MatchConfirmationResponseDto,
  ProductMatchRequestDto,
  ProductMatchResponseDto
} from './matching-dto';

describe('matching-dto types', () => {
  it('supports valid request/response shapes used by matching flow', () => {
    const request: ProductMatchRequestDto = {
      brand: 'HP',
      model: 'LaserJet Pro',
      categoryId: 'printers',
      identifiers: { gtin: '123' },
      attributes: { color: 'black' },
      sellerId: 'seller-1'
    };
    const response: ProductMatchResponseDto = {
      matchFound: true,
      confirmationRequired: false,
      matchedProductId: 'prod-1',
      matchLevel: MatchLevel.STRONG
    };
    const confirmationRequest: MatchConfirmationRequestDto = {
      choice: 'confirm',
      selectedProductId: 'prod-1'
    };
    const confirmationResponse: MatchConfirmationResponseDto = {
      success: true,
      actionTaken: 'merged',
      finalProductId: 'prod-1'
    };
    const audit: MatchAuditDto = {
      id: 'audit-1',
      candidateProductId: 'cand-1',
      matchLevel: 'STRONG',
      decision: 'confirm',
      createdAt: new Date('2026-03-09T12:00:00.000Z')
    };

    expect(request.sellerId).toBe('seller-1');
    expect(response.matchLevel).toBe(MatchLevel.STRONG);
    expect(confirmationRequest.choice).toBe('confirm');
    expect(confirmationResponse.actionTaken).toBe('merged');
    expect(audit.id).toBe('audit-1');
  });
});

