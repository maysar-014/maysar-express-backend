import { PromotedCatalogService } from '../promoted-catalog.service';

describe('PromotedCatalogService', () => {
  const activeEnabler = { id: 'enb_01', status: 'ACTIVE', enablerCode: 'ENABLER01' };

  function makeDb(overrides: Record<string, any> = {}) {
    return {
      enabler_Profile: { findUnique: jest.fn().mockResolvedValue(activeEnabler) },
      enabler_SellerAuthorization: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'auth_01', sellerId: 'sel_01', scopeType: 'PRODUCT',
          scopes: [{ scopeType: 'PRODUCT', productId: 'prd_01', categoryId: null }],
        }]),
      },
      enabler_PermanentLink: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockImplementation(async ({ data }) => ({ publicCode: data.publicCode })),
        update: jest.fn(),
      },
      product: {
        findMany: jest.fn().mockResolvedValue([{
          id: 'prd_01', sellerId: 'sel_01', title: 'Approved product', description: null,
          categoryId: 'cat_01', brand: null,
          variants: [{ price: 12500, images: ['https://cdn.example/image.jpg'] }],
        }]),
        findFirst: jest.fn(),
      },
      ...overrides,
    };
  }

  it('returns only products covered by currently approved seller scopes', async () => {
    const db = makeDb();
    const service = new PromotedCatalogService(db as any, 'https://shop.example');

    const products = await service.getAuthorizedProducts('enb_01');

    expect(db.enabler_SellerAuthorization.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ enablerId: 'enb_01', status: 'APPROVED' }),
      include: { scopes: true },
    }));
    expect(products).toEqual([expect.objectContaining({
      id: 'prd_01', sellerId: 'sel_01', authorizationId: 'auth_01',
      price: 12500, currency: 'TZS', mediaUrls: ['https://cdn.example/image.jpg'],
    })]);
  });

  it('rejects a product share link when the product is outside current approval scope', async () => {
    const db = makeDb();
    db.product.findMany.mockResolvedValue([]);
    const service = new PromotedCatalogService(db as any, 'https://shop.example');

    await expect(service.getProductShareLink('enb_01', 'prd_outside'))
      .rejects.toThrow('Product is not currently approved');
  });

  it('creates a persistent catalog link that resolves to the public catalog route', async () => {
    const db = makeDb();
    const service = new PromotedCatalogService(db as any, 'https://shop.example');

    const link = await service.getOrCreateCatalogLink('enb_01');

    expect(link.publicCode).toBeTruthy();
    expect(link.shareUrl).toBe(`https://shop.example/enabler/catalog/${link.publicCode}`);
    expect(db.enabler_PermanentLink.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ enablerId: 'enb_01', status: 'ACTIVE' }),
    }));
  });

  it('does not let an enabler reactivate a suspended or revoked catalog link', async () => {
    const db = makeDb();
    db.enabler_PermanentLink.findUnique.mockResolvedValue({
      status: 'REVOKED', publicCode: 'OLD123', revokedAt: new Date(), suspendedAt: null,
    });
    const service = new PromotedCatalogService(db as any, 'https://shop.example');

    await expect(service.getOrCreateCatalogLink('enb_01')).rejects.toThrow('cannot be reactivated');
    expect(db.enabler_PermanentLink.create).not.toHaveBeenCalled();
  });

  it('returns display-ready public products without exposing seller authorization identifiers', async () => {
    const db = makeDb();
    db.enabler_PermanentLink.findUnique.mockResolvedValue({
      id: 'link_01', enablerId: 'enb_01', publicCode: 'PUBLIC01', status: 'ACTIVE',
      suspendedAt: null, revokedAt: null,
      enabler: { id: 'enb_01', status: 'ACTIVE', enablerCode: 'ENB-123456' },
    });
    const service = new PromotedCatalogService(db as any, 'https://shop.example');

    const result = await service.getPublicCatalog('PUBLIC01');

    expect(result.products[0]).toEqual(expect.objectContaining({ id: 'prd_01', price: 12500, mediaUrls: ['https://cdn.example/image.jpg'] }));
    expect(result.products[0]).not.toHaveProperty('sellerId');
    expect(result.products[0]).not.toHaveProperty('authorizationId');
    expect(db.enabler_PermanentLink.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'link_01' },
    }));
  });
});
