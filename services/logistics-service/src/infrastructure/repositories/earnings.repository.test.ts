import { EarningsRepository } from './earnings.repository';
import type { Earnings } from '../../domain/repositories';

type QueryResult = { data: any; error: any; count?: number | null };

const buildSupabaseClient = (params?: {
  selectResults?: QueryResult[];
  upsertResult?: QueryResult;
  updateResults?: QueryResult[];
}) => {
  const selectQueue = [...(params?.selectResults || [])];
  const upsertResult = params?.upsertResult || { data: null, error: null };
  const updateQueue = [...(params?.updateResults || [])];

  const calls = {
    from: [] as string[],
    select: [] as Array<{ table: string; fields: string }>,
    eq: [] as Array<{ table: string; field: string; value: any }>,
    gte: [] as Array<{ table: string; field: string; value: any }>,
    lte: [] as Array<{ table: string; field: string; value: any }>,
    order: [] as Array<{ table: string; field: string; options: { ascending: boolean } }>,
    upsert: [] as Array<{ table: string; data: any; options: any }>,
    update: [] as Array<{ table: string; data: any }>,
    updateEq: [] as Array<{ table: string; field: string; value: any }>
  };

  const createSelectBuilder = (table: string, result: QueryResult) => {
    const builder: any = {
      eq: (field: string, value: any) => {
        calls.eq.push({ table, field, value });
        return builder;
      },
      gte: (field: string, value: any) => {
        calls.gte.push({ table, field, value });
        return builder;
      },
      lte: (field: string, value: any) => {
        calls.lte.push({ table, field, value });
        return builder;
      },
      order: (field: string, options: { ascending: boolean }) => {
        calls.order.push({ table, field, options });
        return builder;
      },
      single: () => Promise.resolve(result),
      then: (resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) =>
        Promise.resolve(result).then(resolve, reject)
    };
    return builder;
  };

  const client = {
    from: (table: string) => {
      calls.from.push(table);
      return {
        upsert: (data: any, options: any) => {
          calls.upsert.push({ table, data, options });
          return Promise.resolve(upsertResult);
        },
        select: (fields: string) => {
          calls.select.push({ table, fields });
          const result = selectQueue.shift() || { data: [], error: null };
          return createSelectBuilder(table, result);
        },
        update: (data: any) => {
          calls.update.push({ table, data });
          return {
            eq: (field: string, value: any) => {
              calls.updateEq.push({ table, field, value });
              const result = updateQueue.shift() || { data: null, error: null };
              return Promise.resolve(result);
            }
          };
        }
      };
    }
  };

  return { client, calls };
};

const createEarnings = (): Earnings => ({
  id: 'earn-1',
  courierId: 'cour-1',
  deliveryId: 'del-1',
  baseFare: 3000,
  distanceFee: 1200,
  weightFee: 800,
  priorityFee: 500,
  totalEarnings: 5500,
  commission: 600,
  netEarnings: 4900,
  paymentStatus: 'pending',
  createdAt: new Date('2026-03-08T07:00:00.000Z'),
  updatedAt: new Date('2026-03-08T07:30:00.000Z')
});

const earningsRow = {
  id: 'earn-2',
  courier_id: 'cour-2',
  delivery_id: 'del-2',
  base_fare: 3500,
  distance_fee: 1400,
  weight_fee: 600,
  priority_fee: 900,
  total_earnings: 6400,
  commission: 700,
  net_earnings: 5700,
  payment_status: 'paid',
  payment_date: '2026-03-08T08:30:00.000Z',
  created_at: '2026-03-08T08:00:00.000Z',
  updated_at: '2026-03-08T08:45:00.000Z'
};

describe('EarningsRepository', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    errorSpy.mockRestore();
  });

  it('save upserts mapped data and throws wrapped errors', async () => {
    const success = buildSupabaseClient();
    const repository = new EarningsRepository(success.client);

    await repository.save(createEarnings());

    expect(success.calls.upsert[0]).toEqual(
      expect.objectContaining({
        table: 'earnings',
        options: { onConflict: 'id' },
        data: expect.objectContaining({
          id: 'earn-1',
          courier_id: 'cour-1',
          total_earnings: 5500,
          payment_status: 'pending'
        })
      })
    );

    const failed = buildSupabaseClient({
      upsertResult: { data: null, error: { message: 'write failed' } }
    });
    await expect(new EarningsRepository(failed.client).save(createEarnings())).rejects.toThrow(
      'Failed to save earnings'
    );
  });

  it('findByCourierId applies optional time range, ordering, and maps rows', async () => {
    const { client, calls } = buildSupabaseClient({
      selectResults: [{ data: [earningsRow], error: null }]
    });
    const repository = new EarningsRepository(client);

    const result = await repository.findByCourierId('cour-2', {
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.999Z')
    });

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        courierId: 'cour-2',
        deliveryId: 'del-2',
        totalEarnings: 6400,
        paymentStatus: 'paid'
      })
    );
    expect(result[0].paymentDate).toBeInstanceOf(Date);
    expect(calls.eq).toContainEqual({ table: 'earnings', field: 'courier_id', value: 'cour-2' });
    expect(calls.gte.length).toBeGreaterThan(0);
    expect(calls.lte.length).toBeGreaterThan(0);
    expect(calls.order).toContainEqual({
      table: 'earnings',
      field: 'created_at',
      options: { ascending: false }
    });
  });

  it('findByCourierId returns [] on query errors', async () => {
    const { client } = buildSupabaseClient({
      selectResults: [{ data: null, error: { message: 'query failed' } }]
    });
    const repository = new EarningsRepository(client);

    await expect(repository.findByCourierId('cour-x')).resolves.toEqual([]);
  });

  it('findByDeliveryId returns mapped row and null for missing or errored lookups', async () => {
    const success = buildSupabaseClient({
      selectResults: [{ data: earningsRow, error: null }]
    });
    const repository = new EarningsRepository(success.client);
    const found = await repository.findByDeliveryId('del-2');

    expect(found?.id).toBe('earn-2');

    const missing = buildSupabaseClient({
      selectResults: [{ data: null, error: null }]
    });
    await expect(new EarningsRepository(missing.client).findByDeliveryId('del-missing')).resolves.toBeNull();

    const errored = buildSupabaseClient({
      selectResults: [{ data: null, error: { message: 'broken' } }]
    });
    await expect(new EarningsRepository(errored.client).findByDeliveryId('del-error')).resolves.toBeNull();
  });

  it('findAllEarnings handles time filters and returns [] for empty result sets', async () => {
    const { client, calls } = buildSupabaseClient({
      selectResults: [{ data: [earningsRow], error: null }]
    });
    const repository = new EarningsRepository(client);

    const all = await repository.findAllEarnings({
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.999Z')
    });

    expect(all).toHaveLength(1);
    expect(calls.gte.length).toBeGreaterThan(0);
    expect(calls.lte.length).toBeGreaterThan(0);

    const empty = buildSupabaseClient({
      selectResults: [{ data: [], error: null }]
    });
    await expect(new EarningsRepository(empty.client).findAllEarnings()).resolves.toEqual([]);
  });

  it('updatePaymentStatus updates base fields and optional paid timestamp', async () => {
    const { client, calls } = buildSupabaseClient({
      updateResults: [{ data: null, error: null }, { data: null, error: null }]
    });
    const repository = new EarningsRepository(client);

    await repository.updatePaymentStatus('earn-5', 'pending');
    await repository.updatePaymentStatus('earn-6', 'paid', new Date('2026-03-08T10:00:00.000Z'));

    expect(calls.updateEq).toContainEqual({ table: 'earnings', field: 'id', value: 'earn-5' });
    expect(calls.updateEq).toContainEqual({ table: 'earnings', field: 'id', value: 'earn-6' });
    expect(calls.update[0]?.data).toEqual(expect.objectContaining({ payment_status: 'pending' }));
    expect(calls.update[1]?.data).toEqual(
      expect.objectContaining({
        payment_status: 'paid',
        payment_date: '2026-03-08T10:00:00.000Z'
      })
    );
  });

  it('updatePaymentStatus throws when update fails', async () => {
    const { client } = buildSupabaseClient({
      updateResults: [{ data: null, error: { message: 'cannot update' } }]
    });
    const repository = new EarningsRepository(client);

    await expect(repository.updatePaymentStatus('earn-7', 'failed')).rejects.toThrow(
      'Failed to update payment status'
    );
  });

  it('getCourierEarningsSummary computes totals and rounds average', async () => {
    const { client } = buildSupabaseClient({
      selectResults: [
        {
          data: [
            { total_earnings: 5000, net_earnings: 4500, payment_status: 'pending' },
            { total_earnings: 6000, net_earnings: 5400, payment_status: 'paid' },
            { total_earnings: 7000, net_earnings: 6200, payment_status: 'paid' }
          ],
          error: null
        }
      ]
    });
    const repository = new EarningsRepository(client);

    const result = await repository.getCourierEarningsSummary('cour-1', {
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.999Z')
    });

    expect(result).toEqual({
      totalEarnings: 18000,
      totalDeliveries: 3,
      averagePerDelivery: 6000,
      pendingPayments: 4500,
      paidPayments: 11600
    });
  });

  it('getCourierEarningsSummary returns zeroed output for empty data or errors', async () => {
    const empty = buildSupabaseClient({
      selectResults: [{ data: [], error: null }]
    });
    await expect(
      new EarningsRepository(empty.client).getCourierEarningsSummary('cour-1', {
        start: new Date('2026-03-01T00:00:00.000Z'),
        end: new Date('2026-03-31T23:59:59.999Z')
      })
    ).resolves.toEqual({
      totalEarnings: 0,
      totalDeliveries: 0,
      averagePerDelivery: 0,
      pendingPayments: 0,
      paidPayments: 0
    });

    const errored = buildSupabaseClient({
      selectResults: [{ data: null, error: { message: 'failed' } }]
    });
    await expect(
      new EarningsRepository(errored.client).getCourierEarningsSummary('cour-1', {
        start: new Date('2026-03-01T00:00:00.000Z'),
        end: new Date('2026-03-31T23:59:59.999Z')
      })
    ).resolves.toEqual({
      totalEarnings: 0,
      totalDeliveries: 0,
      averagePerDelivery: 0,
      pendingPayments: 0,
      paidPayments: 0
    });
  });

  it('getPlatformEarningsSummary computes aggregate totals and fallback output', async () => {
    const success = buildSupabaseClient({
      selectResults: [
        {
          data: [
            { total_earnings: 9000, commission: 1000, net_earnings: 8000, payment_status: 'paid' },
            { total_earnings: 7000, commission: 900, net_earnings: 6100, payment_status: 'pending' },
            { total_earnings: 5000, commission: 700, net_earnings: 4300, payment_status: 'paid' }
          ],
          error: null
        }
      ]
    });
    const repository = new EarningsRepository(success.client);
    const totals = await repository.getPlatformEarningsSummary({
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.999Z')
    });

    expect(totals).toEqual({
      totalRevenue: 21000,
      totalCommissions: 2600,
      totalPayouts: 12300,
      netProfit: 8700,
      deliveryCount: 3
    });

    const errored = buildSupabaseClient({
      selectResults: [{ data: null, error: { message: 'failed' } }]
    });
    await expect(
      new EarningsRepository(errored.client).getPlatformEarningsSummary({
        start: new Date('2026-03-01T00:00:00.000Z'),
        end: new Date('2026-03-31T23:59:59.999Z')
      })
    ).resolves.toEqual({
      totalRevenue: 0,
      totalCommissions: 0,
      totalPayouts: 0,
      netProfit: 0,
      deliveryCount: 0
    });
  });
});
