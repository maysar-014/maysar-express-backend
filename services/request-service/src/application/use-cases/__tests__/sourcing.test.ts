/**
 * Sourcing gate + procurement generation (Phase 2 §2.2–2.3 acceptance).
 */

import { CreateRequestUseCase } from '../create-request.use-case';
import { AssignRequestProviderUseCase } from '../assign-request-provider.use-case';
import { AssessRequestUseCase } from '../assess-request.use-case';
import { CreateQuoteUseCase } from '../create-quote.use-case';
import { PublishQuoteUseCase } from '../publish-quote.use-case';
import { GenerateAssessmentLinkUseCase } from '../generate-assessment-link.use-case';
import { ResolveAssessmentLinkUseCase } from '../resolve-assessment-link.use-case';
import { ConvertQuoteToOrderUseCase } from '../convert-quote-to-order.use-case';
import { RegisterSupplierUseCase } from '../register-supplier.use-case';
import { SetItemSourceUseCase } from '../set-item-source.use-case';
import { ListSuppliersUseCase } from '../list-suppliers.use-case';
import { AdvanceProcurementUseCase } from '../advance-procurement.use-case';
import { RequestProcurement } from '../../../domain/entities/request-procurement.entity';
import { MAYSAR_INVENTORY_SUPPLIER_ID } from '../../../domain/entities/request-supplier.entity';
import {
  FakeRequestRepository,
  FakeMessageRepository,
  FakeQuoteRepository,
  FakeAssessmentRepository,
  FakeLinkRepository,
  FakeItemRepository,
  FakeSourceRepository,
  FakeSupplierRepository,
  FakeProcurementRepository,
  silenceOutbox,
} from './fakes';

const quoteInput = {
  label: 'Recommended',
  items: [
    { description: 'CCTV camera', quantity: 8, unitPriceTzs: 120000 },
    { description: 'Installation service', quantity: 1, unitPriceTzs: 40000 },
  ],
  procurementCostTzs: 900000,
  logisticsCostTzs: 50000,
  sellingPriceTzs: 1050000,
  deliveryDate: new Date(Date.now() + 5 * 86400000).toISOString(),
  validUntil: new Date(Date.now() + 7 * 86400000).toISOString(),
};

describe('Sourcing publish gate (§2.2)', () => {
  let requestRepo: FakeRequestRepository;
  let quoteRepo: FakeQuoteRepository;
  let messageRepo: FakeMessageRepository;
  let itemRepo: FakeItemRepository;
  let sourceRepo: FakeSourceRepository;
  let supplierRepo: FakeSupplierRepository;
  let requestId: string;
  let createQuote: CreateQuoteUseCase;
  let publishQuote: PublishQuoteUseCase;
  let setSource: SetItemSourceUseCase;

  beforeAll(() => silenceOutbox());

  beforeEach(async () => {
    requestRepo = new FakeRequestRepository();
    quoteRepo = new FakeQuoteRepository();
    messageRepo = new FakeMessageRepository();
    itemRepo = new FakeItemRepository();
    sourceRepo = new FakeSourceRepository();
    supplierRepo = new FakeSupplierRepository();

    requestId = (await new CreateRequestUseCase(requestRepo, messageRepo).execute('usr_customer', {
      title: 'T',
      description: 'Need CCTV',
      deliveryAddress: { city: 'X', region: 'Y' },
    })).request.id;

    await new AssignRequestProviderUseCase(requestRepo).execute('usr_admin', requestId, 'usr_provider');
    await new AssessRequestUseCase(requestRepo, new FakeAssessmentRepository(), messageRepo).execute(
      'usr_provider', requestId, { decision: 'FULFILLABLE' },
    );

    createQuote = new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo);
    publishQuote = new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo);
    setSource = new SetItemSourceUseCase(itemRepo, sourceRepo, supplierRepo);
  });

  it('PENDING sources cannot back a published quote', async () => {
    const { quote } = await createQuote.execute('usr_provider', requestId, quoteInput);
    // Items have NO sources yet → publish must fail.
    await expect(publishQuote.execute('usr_provider', quote.id)).rejects.toThrow('no CONFIRMED source');
  });

  it('attaching CONFIRMED sources unlocks publish', async () => {
    const external = await new RegisterSupplierUseCase(supplierRepo).create({
      name: 'Supplier A', contact: { phone: '+255700' },
    });
    const { quote, itemIds } = await createQuote.execute('usr_provider', requestId, quoteInput);
    expect(itemIds).toHaveLength(2);
    for (const itemId of itemIds) {
      await setSource.attach(itemId, { supplierId: external.id, agreedPriceTzs: 90000, availability: 'CONFIRMED' });
    }
    await expect(publishQuote.execute('usr_provider', quote.id)).resolves.toBeTruthy();
  });

  it('MAYSAR_INVENTORY items source with a null supplier', async () => {
    const inventoryInput = {
      ...quoteInput,
      items: quoteInput.items.map((i) => ({ ...i, sourceType: 'MAYSAR_INVENTORY' as const })),
    };
    const { quote, itemIds } = await createQuote.execute('usr_provider', requestId, inventoryInput);
    for (const itemId of itemIds) {
      await setSource.attach(itemId, { supplierId: null, agreedPriceTzs: 90000, availability: 'CONFIRMED' });
    }
    await expect(publishQuote.execute('usr_provider', quote.id)).resolves.toBeTruthy();
  });

  it('supplier registry: register + list with suppliedCount; DISCOVERED carries the request ref', async () => {
    const register = new RegisterSupplierUseCase(supplierRepo);
    const known = await register.create({ name: 'Supplier A', contact: { phone: '+255700' } });
    const discovered = await register.create({
      name: 'Kariakoo Electronics',
      contact: { whatsapp: '+255711' },
      source: 'DISCOVERED',
      discoveredViaRequestId: requestId,
    });
    expect(discovered.discoveredViaRequestId).toBe(requestId);

    const { itemIds } = await createQuote.execute('usr_provider', requestId, quoteInput);
    await setSource.attach(itemIds[0], { supplierId: known.id, agreedPriceTzs: 90000, availability: 'CONFIRMED' });

    const summaries = await new ListSuppliersUseCase(supplierRepo, sourceRepo).execute();
    const a = summaries.find((s) => s.supplier.id === known.id)!;
    expect(a.suppliedCount).toBe(1);
    expect(a.isInventory).toBe(false);
    expect(summaries.find((s) => s.supplier.id === MAYSAR_INVENTORY_SUPPLIER_ID)!.isInventory).toBe(true);
  });
describe('Procurement generation on conversion (§2.3)', () => {
  it('conversion creates one procurement row per item; ops walks PENDING → ORDERED → RECEIVED', async () => {
    silenceOutbox();
    const requestRepo = new FakeRequestRepository();
    const quoteRepo = new FakeQuoteRepository();
    const messageRepo = new FakeMessageRepository();
    const itemRepo = new FakeItemRepository();
    const sourceRepo = new FakeSourceRepository();
    const supplierRepo = new FakeSupplierRepository();
    const linkRepo = new FakeLinkRepository();

    const requestId = (await new CreateRequestUseCase(requestRepo, messageRepo).execute('usr_customer', {
      title: 'T',
      description: 'Need CCTV',
      deliveryAddress: { city: 'X', region: 'Y' },
    })).request.id;
    await new AssignRequestProviderUseCase(requestRepo).execute('usr_admin', requestId, 'usr_provider');
    await new AssessRequestUseCase(requestRepo, new FakeAssessmentRepository(), messageRepo).execute(
      'usr_provider', requestId, { decision: 'FULFILLABLE' },
    );

    // One external item + one inventory item — exercises both supplier paths.
    const mixedInput = {
      ...quoteInput,
      items: [
        { description: 'CCTV camera', quantity: 8, unitPriceTzs: 120000 },
        { description: 'Wall mount (from Maysar stock)', quantity: 1, unitPriceTzs: 40000, sourceType: 'MAYSAR_INVENTORY' as const },
      ],
    };
    const { quote, itemIds } = await new CreateQuoteUseCase(requestRepo, quoteRepo, itemRepo).execute(
      'usr_provider', requestId, mixedInput,
    );
    const external = await new RegisterSupplierUseCase(supplierRepo).create({
      name: 'Supplier A', contact: { phone: '+255700' },
    });
    await new SetItemSourceUseCase(itemRepo, sourceRepo, supplierRepo).attach(itemIds[0], {
      supplierId: external.id, agreedPriceTzs: 110000, availability: 'CONFIRMED',
    });
    await new SetItemSourceUseCase(itemRepo, sourceRepo, supplierRepo).attach(itemIds[1], {
      supplierId: null, agreedPriceTzs: 35000, availability: 'CONFIRMED',
    });
    await new PublishQuoteUseCase(requestRepo, quoteRepo, messageRepo, itemRepo, sourceRepo).execute('usr_provider', quote.id);

    const generateLink = new GenerateAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo, 'https://x.test');
    const { token } = await generateLink.execute('usr_provider', quote.id);
    const resolveLink = new ResolveAssessmentLinkUseCase(requestRepo, quoteRepo, linkRepo);

    const procurementRows = new Map<string, any>();
    const fakePrisma = {
      order_Order: {
        findUnique: async () => null,
        create: async ({ data }: any) => ({ ...data, items: (data.items?.create ?? []).map((i: any) => ({ ...i })) }),
      },
      request_Quote: { update: async () => undefined },
      request_Request: { update: async () => undefined },
      request_AccessLink: { update: async () => undefined },
      request_Procurement: {
        create: async ({ data }: any) => {
          procurementRows.set(data.id, { ...data });
          return { ...data };
        },
      },
      $transaction: async (fn: any) => fn(fakePrisma),
    };

    const convert = new ConvertQuoteToOrderUseCase(
      requestRepo, quoteRepo, linkRepo, messageRepo, resolveLink, fakePrisma, itemRepo, sourceRepo,
    );
    const result = await convert.execute({ token });
    expect(result.created).toBe(true);

    // One procurement row per item, exact Order → Item → Supplier map.
    expect(procurementRows.size).toBe(2);
    const rows = [...procurementRows.values()];
    const externalRow = rows.find((r) => r.itemId === itemIds[0])!;
    const inventoryRow = rows.find((r) => r.itemId === itemIds[1])!;
    expect(externalRow.supplierId).toBe(external.id);
    expect(externalRow.agreedPriceTzs).toBe(110000);
    expect(externalRow.orderId).toBe(result.orderId);
    expect(externalRow.procurementStatus).toBe('PENDING');
    expect(inventoryRow.supplierId).toBe(MAYSAR_INVENTORY_SUPPLIER_ID);
    expect(inventoryRow.agreedPriceTzs).toBe(35000);

    // Ops advances the lifecycle via the repository-backed use case.
    const procurementRepo = new FakeProcurementRepository();
    for (const row of rows) {
      await procurementRepo.save(RequestProcurement.create({
        orderId: row.orderId,
        itemId: row.itemId,
        supplierId: row.supplierId,
        sourceId: row.sourceId,
        agreedPriceTzs: row.agreedPriceTzs,
      }));
    }
    const advance = new AdvanceProcurementUseCase(procurementRepo, itemRepo);
    const all = await procurementRepo.findByOrderId(result.orderId);
    for (const p of all) {
      await advance.execute(p.id, 'ORDERED');
      await advance.execute(p.id, 'RECEIVED');
    }
    expect((await procurementRepo.findByOrderId(result.orderId)).every((p) => p.procurementStatus === 'RECEIVED')).toBe(true);
    await expect(advance.execute(all[0].id, 'ORDERED')).rejects.toThrow('only PENDING can be ordered');
  });
});
});