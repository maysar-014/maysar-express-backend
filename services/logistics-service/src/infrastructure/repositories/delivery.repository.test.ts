import { DeliveryRepository } from './delivery.repository';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import type { Delivery } from '../../domain/repositories';

type QueryResult = { data: any; error: any };

const buildSupabaseClient = (params?: {
  selectResults?: QueryResult[];
  upsertResult?: QueryResult;
  updateResult?: QueryResult;
}) => {
  const selectQueue = [...(params?.selectResults || [])];
  const upsertResult = params?.upsertResult || { data: null, error: null };
  const updateResult = params?.updateResult || { data: null, error: null };

  const calls = {
    from: [] as string[],
    select: [] as string[],
    eq: [] as Array<[string, any]>,
    order: [] as Array<[string, { ascending: boolean }]>,
    gte: [] as Array<[string, string]>,
    lte: [] as Array<[string, string]>,
    in: [] as Array<[string, string[]]>,
    upsert: [] as Array<[any, any]>,
    update: [] as any[],
    updateEq: [] as Array<[string, any]>
  };

  const createSelectBuilder = (result: QueryResult) => {
    const builder: any = {
      eq: (field: string, value: any) => {
        calls.eq.push([field, value]);
        return builder;
      },
      order: (field: string, options: { ascending: boolean }) => {
        calls.order.push([field, options]);
        return builder;
      },
      gte: (field: string, value: string) => {
        calls.gte.push([field, value]);
        return builder;
      },
      lte: (field: string, value: string) => {
        calls.lte.push([field, value]);
        return builder;
      },
      in: (field: string, values: string[]) => {
        calls.in.push([field, values]);
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
          calls.upsert.push([data, options]);
          return Promise.resolve(upsertResult);
        },
        select: (fields: string) => {
          calls.select.push(fields);
          const result = selectQueue.shift() || { data: [], error: null };
          return createSelectBuilder(result);
        },
        update: (data: any) => {
          calls.update.push(data);
          return {
            eq: (field: string, value: any) => {
              calls.updateEq.push([field, value]);
              return Promise.resolve(updateResult);
            }
          };
        }
      };
    }
  };

  return { client, calls };
};

const createDelivery = (): Delivery => ({
  id: 'del-1',
  orderId: 'ord-1',
  courierId: 'cour-1',
  status: 'assigned',
  pickupLocation: GeoPoint.create(-6.79, 39.2, 'Pickup Address'),
  deliveryLocation: GeoPoint.create(-6.8, 39.21, 'Delivery Address'),
  estimatedPickupTime: new Date('2026-03-08T08:00:00.000Z'),
  estimatedDeliveryTime: new Date('2026-03-08T09:00:00.000Z'),
  weight: 2.5,
  priority: 'express',
  specialRequirements: ['fragile'],
  routeDistance: 5.2,
  routeDuration: 22.6,
  totalCost: 8500,
  isCOD: true,
  codAmount: 10000,
  codCurrency: 'TZS',
  codCollected: false,
  codOtpVerified: false,
  buyerId: 'buyer-1',
  sellerId: 'seller-1',
  codCommitmentHoldId: 'hold-1',
  createdAt: new Date('2026-03-08T07:00:00.000Z'),
  updatedAt: new Date('2026-03-08T07:00:00.000Z')
});

const deliveryRow = {
  id: 'del-2',
  order_id: 'ord-2',
  courier_id: 'cour-2',
  status: 'delivered',
  pickup_lat: -6.781,
  pickup_lng: 39.201,
  pickup_address: 'Pickup 2',
  delivery_lat: -6.791,
  delivery_lng: 39.221,
  delivery_address: 'Delivery 2',
  estimated_pickup_time: '2026-03-08T08:00:00.000Z',
  actual_pickup_time: '2026-03-08T08:05:00.000Z',
  estimated_delivery_time: '2026-03-08T09:00:00.000Z',
  actual_delivery_time: '2026-03-08T08:55:00.000Z',
  weight: 4,
  priority: 'urgent',
  special_requirements: ['cold-chain'],
  route_distance: 8,
  route_duration: 30,
  total_cost: 12000,
  created_at: '2026-03-08T07:00:00.000Z',
  updated_at: '2026-03-08T09:00:00.000Z',
  is_cod: true,
  cod_amount: '15000',
  cod_currency: 'TZS',
  cod_collected: true,
  cod_collected_at: '2026-03-08T08:56:00.000Z',
  cod_otp_verified: true,
  otp: '123456',
  otp_expires_at: '2026-03-08T08:30:00.000Z',
  cod_proof_gps_lat: -6.792,
  cod_proof_gps_lng: 39.222,
  cod_proof_timestamp: '2026-03-08T08:56:10.000Z',
  buyer_id: 'buyer-2',
  seller_id: 'seller-2',
  cod_commitment_hold_id: 'hold-2'
};

describe('DeliveryRepository', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it('save upserts mapped payload to deliveries table', async () => {
    const { client, calls } = buildSupabaseClient();
    const repository = new DeliveryRepository(client);
    const delivery = createDelivery();

    await repository.save(delivery);

    expect(calls.from).toContain('deliveries');
    expect(calls.upsert[0]?.[1]).toEqual({ onConflict: 'id' });
    expect(calls.upsert[0]?.[0]).toEqual(
      expect.objectContaining({
        id: 'del-1',
        order_id: 'ord-1',
        courier_id: 'cour-1',
        pickup_address: 'Pickup Address',
        delivery_address: 'Delivery Address',
        route_duration: 23,
        total_cost: 8500,
        buyer_id: 'buyer-1',
        seller_id: 'seller-1'
      })
    );
  });

  it('save throws wrapped error when upsert fails', async () => {
    const { client } = buildSupabaseClient({
      upsertResult: { data: null, error: { message: 'db write failed' } }
    });
    const repository = new DeliveryRepository(client);

    await expect(repository.save(createDelivery())).rejects.toThrow(
      'Failed to save delivery: Failed to save delivery to database: db write failed'
    );
  });

  it('findById maps row to domain entity including COD fields', async () => {
    const { client, calls } = buildSupabaseClient({
      selectResults: [{ data: deliveryRow, error: null }]
    });
    const repository = new DeliveryRepository(client);

    const result = await repository.findById('del-2');

    expect(calls.eq).toContainEqual(['id', 'del-2']);
    expect(result).toEqual(
      expect.objectContaining({
        id: 'del-2',
        orderId: 'ord-2',
        courierId: 'cour-2',
        codAmount: 15000,
        codCollected: true,
        codOtpVerified: true,
        buyerId: 'buyer-2'
      })
    );
    expect(result?.pickupLocation.getAddress()).toBe('Pickup 2');
    expect(result?.otpExpiresAt).toBeInstanceOf(Date);
  });

  it('findById returns null for query errors and missing rows', async () => {
    const withError = buildSupabaseClient({
      selectResults: [{ data: null, error: { message: 'select failed' } }]
    });
    const repoWithError = new DeliveryRepository(withError.client);
    await expect(repoWithError.findById('x')).resolves.toBeNull();

    const missing = buildSupabaseClient({
      selectResults: [{ data: null, error: null }]
    });
    const repoMissing = new DeliveryRepository(missing.client);
    await expect(repoMissing.findById('x')).resolves.toBeNull();
  });

  it('findByCourierId, findByStatus, findAll and findActiveDeliveries map result arrays', async () => {
    const { client, calls } = buildSupabaseClient({
      selectResults: [
        { data: [deliveryRow], error: null }, // findByCourierId
        { data: [deliveryRow], error: null }, // findByStatus
        { data: [deliveryRow], error: null }, // findAll
        { data: [deliveryRow], error: null } // findActiveDeliveries
      ]
    });
    const repository = new DeliveryRepository(client);

    const byCourier = await repository.findByCourierId('cour-2');
    const byStatus = await repository.findByStatus('delivered');
    const all = await repository.findAll({
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.999Z')
    });
    const active = await repository.findActiveDeliveries();

    expect(byCourier).toHaveLength(1);
    expect(byStatus).toHaveLength(1);
    expect(all).toHaveLength(1);
    expect(active).toHaveLength(1);
    expect(calls.eq).toContainEqual(['courier_id', 'cour-2']);
    expect(calls.eq).toContainEqual(['status', 'delivered']);
    expect(calls.in).toContainEqual(['status', ['assigned', 'picked_up', 'in_transit']]);
    expect(calls.gte.length).toBeGreaterThanOrEqual(1);
    expect(calls.lte.length).toBeGreaterThanOrEqual(1);
  });

  it('updateStatus applies metadata mappings and status timestamps', async () => {
    const { client, calls } = buildSupabaseClient();
    const repository = new DeliveryRepository(client);

    await repository.updateStatus('del-3', 'delivered', {
      otp: '000111',
      otpExpiresAt: new Date('2026-03-08T08:30:00.000Z'),
      codCollected: true,
      codCollectedAt: new Date('2026-03-08T08:31:00.000Z'),
      codOtpVerified: true,
      codProofGpsLat: -6.8,
      codProofGpsLng: 39.2,
      codProofTimestamp: new Date('2026-03-08T08:31:10.000Z'),
      isCOD: true,
      buyerId: 'buyer-x',
      sellerId: 'seller-x',
      codCommitmentHoldId: 'hold-x'
    });

    expect(calls.updateEq).toContainEqual(['id', 'del-3']);
    expect(calls.update[0]).toEqual(
      expect.objectContaining({
        status: 'delivered',
        actual_delivery_time: expect.any(String),
        otp: '000111',
        cod_collected: true,
        cod_otp_verified: true,
        cod_proof_gps_lat: -6.8,
        buyer_id: 'buyer-x',
        seller_id: 'seller-x',
        cod_commitment_hold_id: 'hold-x'
      })
    );
  });

  it('updateStatus throws when update fails', async () => {
    const { client } = buildSupabaseClient({
      updateResult: { data: null, error: { message: 'update failed' } }
    });
    const repository = new DeliveryRepository(client);

    await expect(repository.updateStatus('del-4', 'picked_up')).rejects.toThrow(
      'Failed to update delivery status'
    );
  });

  it('getDeliveryStats computes totals, average delay and on-time rate', async () => {
    const { client, calls } = buildSupabaseClient({
      selectResults: [
        {
          data: [
            { status: 'delivered', actual_delivery_time: '2026-03-08T09:10:00.000Z', estimated_delivery_time: '2026-03-08T09:00:00.000Z' },
            { status: 'delivered', actual_delivery_time: '2026-03-08T08:55:00.000Z', estimated_delivery_time: '2026-03-08T09:00:00.000Z' },
            { status: 'assigned', actual_delivery_time: null, estimated_delivery_time: null }
          ],
          error: null
        }
      ]
    });
    const repository = new DeliveryRepository(client);

    const stats = await repository.getDeliveryStats({
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.999Z')
    });

    expect(stats).toEqual({
      totalDeliveries: 3,
      completedDeliveries: 2,
      averageDeliveryTime: 3,
      onTimeDeliveryRate: 0.5
    });
    expect(calls.gte.length).toBeGreaterThanOrEqual(1);
    expect(calls.lte.length).toBeGreaterThanOrEqual(1);
  });

  it('getDeliveryStats returns zeroed metrics for errors or empty data', async () => {
    const errorClient = buildSupabaseClient({
      selectResults: [{ data: null, error: { message: 'stats failed' } }]
    });
    const repoError = new DeliveryRepository(errorClient.client);
    await expect(repoError.getDeliveryStats()).resolves.toEqual({
      totalDeliveries: 0,
      completedDeliveries: 0,
      averageDeliveryTime: 0,
      onTimeDeliveryRate: 0
    });

    const emptyClient = buildSupabaseClient({
      selectResults: [{ data: [], error: null }]
    });
    const repoEmpty = new DeliveryRepository(emptyClient.client);
    await expect(repoEmpty.getDeliveryStats()).resolves.toEqual({
      totalDeliveries: 0,
      completedDeliveries: 0,
      averageDeliveryTime: 0,
      onTimeDeliveryRate: 0
    });
  });
});
