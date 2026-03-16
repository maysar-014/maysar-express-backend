import { CourierRepository } from './courier.repository';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import { DistanceCalculationAlgorithm } from '../../domain/algorithms/distance-calculation.algorithm';

jest.mock('../../domain/algorithms/distance-calculation.algorithm', () => ({
  DistanceCalculationAlgorithm: {
    calculateDeliveryDistance: jest.fn()
  }
}));

type QueryResult = { data: any; error: any; count?: number | null };

const buildDatabaseClient = (params?: {
  selectResults?: QueryResult[];
  updateResults?: QueryResult[];
  insertResults?: QueryResult[];
}) => {
  const selectQueue = [...(params?.selectResults || [])];
  const updateQueue = [...(params?.updateResults || [])];
  const insertQueue = [...(params?.insertResults || [])];

  const calls = {
    from: [] as string[],
    select: [] as Array<{ table: string; fields: string }>,
    eq: [] as Array<{ table: string; field: string; value: any }>,
    gte: [] as Array<{ table: string; field: string; value: any }>,
    filter: [] as Array<{ table: string; field: string; op: string; value: any }>,
    update: [] as Array<{ table: string; data: any }>,
    updateEq: [] as Array<{ table: string; field: string; value: any }>,
    insert: [] as Array<{ table: string; data: any }>
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
      filter: (field: string, op: string, value: any) => {
        calls.filter.push({ table, field, op, value });
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
        },
        insert: (data: any) => {
          calls.insert.push({ table, data });
          const result = insertQueue.shift() || { data: null, error: null };
          return Promise.resolve(result);
        }
      };
    }
  };

  return { client, calls };
};

const courierRow = {
  id: 'cour-1',
  name: 'Courier One',
  phone: '+255700000001',
  vehicle_type: 'bike',
  max_weight: 15,
  max_volume: 0.6,
  max_items: 20,
  rating: 4.8,
  completion_rate: 0.95,
  current_lat: -6.792,
  current_lng: 39.208,
  current_address: 'Kariakoo',
  is_available: true,
  status: 'online',
  traffic_experience: 0.9
};

describe('CourierRepository', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const distanceMock = DistanceCalculationAlgorithm.calculateDeliveryDistance as jest.Mock;

  afterAll(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  beforeEach(() => {
    distanceMock.mockReset();
    distanceMock.mockResolvedValue({ distance: 1 });
  });

  it('findAvailableCouriers validates location and radius inputs', async () => {
    const repository = new CourierRepository(buildDatabaseClient().client);

    await expect(repository.findAvailableCouriers(null as any, 5)).rejects.toThrow('Location is required');
    await expect(
      repository.findAvailableCouriers(GeoPoint.create(-6.8, 39.2, 'Center'), 0)
    ).rejects.toThrow('Radius must be a positive number');
  });

  it('findAvailableCouriers filters by distance and maps matching couriers', async () => {
    const { client, calls } = buildDatabaseClient({
      selectResults: [
        {
          data: [
            courierRow,
            {
              ...courierRow,
              id: 'cour-2',
              current_lat: -6.90,
              current_lng: 39.40,
              current_address: 'Far Away'
            }
          ],
          error: null
        }
      ]
    });
    const repository = new CourierRepository(client);
    const center = GeoPoint.create(-6.792, 39.208, 'Search center');
    distanceMock
      .mockResolvedValueOnce({ distance: 2 })
      .mockResolvedValueOnce({ distance: 10 });

    const result = await repository.findAvailableCouriers(center, 5);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(
      expect.objectContaining({
        id: 'cour-1',
        rating: 4.8,
        completionRate: 0.95,
        isAvailable: true
      })
    );
    expect(calls.eq).toContainEqual({ table: 'couriers', field: 'is_available', value: true });
    expect(calls.gte).toContainEqual({ table: 'couriers', field: 'rating', value: 4 });
    expect(calls.filter).toContainEqual({
      table: 'couriers',
      field: 'current_lat',
      op: 'not.is',
      value: null
    });
  });

  it('findAvailableCouriers throws wrapped error when query fails', async () => {
    const { client } = buildDatabaseClient({
      selectResults: [{ data: null, error: { message: 'db query failed' } }]
    });
    const repository = new CourierRepository(client);

    await expect(
      repository.findAvailableCouriers(GeoPoint.create(-6.8, 39.2, 'Center'), 5)
    ).rejects.toThrow('Failed to find available couriers');
  });

  it('findAvailable returns mapped couriers and [] for errors', async () => {
    const success = buildDatabaseClient({
      selectResults: [{ data: [courierRow], error: null }]
    });
    const repository = new CourierRepository(success.client);
    const mapped = await repository.findAvailable();

    expect(mapped).toHaveLength(1);
    expect(mapped[0].id).toBe('cour-1');

    const withError = buildDatabaseClient({
      selectResults: [{ data: null, error: { message: 'failed' } }]
    });
    const errorRepository = new CourierRepository(withError.client);
    await expect(errorRepository.findAvailable()).resolves.toEqual([]);
  });

  it('findById maps courier and returns null for missing or errored lookups', async () => {
    const success = buildDatabaseClient({
      selectResults: [{ data: courierRow, error: null }]
    });
    const repository = new CourierRepository(success.client);
    const found = await repository.findById('cour-1');

    expect(found?.currentLocation.getAddress()).toBe('Kariakoo');

    const missing = buildDatabaseClient({
      selectResults: [{ data: null, error: null }]
    });
    await expect(new CourierRepository(missing.client).findById('cour-x')).resolves.toBeNull();

    const errored = buildDatabaseClient({
      selectResults: [{ data: null, error: { message: 'query failed' } }]
    });
    await expect(new CourierRepository(errored.client).findById('cour-y')).resolves.toBeNull();
  });

  it('assignCourier updates availability and creates assignment record', async () => {
    const { client, calls } = buildDatabaseClient({
      updateResults: [{ data: null, error: null }],
      insertResults: [{ data: null, error: null }]
    });
    const repository = new CourierRepository(client);

    await repository.assignCourier('del-1', 'cour-1');

    expect(calls.updateEq).toContainEqual({ table: 'couriers', field: 'id', value: 'cour-1' });
    expect(calls.insert).toContainEqual({
      table: 'delivery_assignments',
      data: expect.objectContaining({
        delivery_id: 'del-1',
        courier_id: 'cour-1',
        status: 'assigned'
      })
    });
  });

  it('assignCourier rolls back courier update when assignment insert fails', async () => {
    const { client, calls } = buildDatabaseClient({
      updateResults: [
        { data: null, error: null },
        { data: null, error: null }
      ],
      insertResults: [{ data: null, error: { message: 'insert failed' } }]
    });
    const repository = new CourierRepository(client);

    await expect(repository.assignCourier('del-2', 'cour-2')).rejects.toThrow(
      'Failed to assign courier to delivery'
    );

    const rollbackCall = calls.update.find(
      call => call.table === 'couriers' && call.data.is_available === true
    );
    expect(rollbackCall).toBeDefined();
  });

  it('getCourierById returns mapped courier and throws for missing records', async () => {
    const success = buildDatabaseClient({
      selectResults: [{ data: courierRow, error: null }]
    });
    const repository = new CourierRepository(success.client);
    await expect(repository.getCourierById('cour-1')).resolves.toEqual(
      expect.objectContaining({ id: 'cour-1', phone: '+255700000001' })
    );

    const missing = buildDatabaseClient({
      selectResults: [{ data: null, error: null }]
    });
    await expect(new CourierRepository(missing.client).getCourierById('none')).rejects.toThrow(
      'Failed to get courier information'
    );
  });

  it('updateCourierLocation accepts raw location-like object and persists coordinates', async () => {
    const { client, calls } = buildDatabaseClient({
      updateResults: [{ data: null, error: null }]
    });
    const repository = new CourierRepository(client);

    await repository.updateCourierLocation('cour-3', {
      lat: -6.81,
      lng: 39.25,
      address: 'Raw payload'
    } as any);

    expect(calls.update[0]).toEqual(
      expect.objectContaining({
        table: 'couriers',
        data: expect.objectContaining({
          current_lat: -6.81,
          current_lng: 39.25,
          current_address: 'Raw payload'
        })
      })
    );
  });

  it('updateCourierAvailability clears current delivery when becoming available', async () => {
    const { client, calls } = buildDatabaseClient({
      updateResults: [{ data: null, error: null }]
    });
    const repository = new CourierRepository(client);

    await repository.updateCourierAvailability('cour-4', true);

    expect(calls.update[0]?.data).toEqual(
      expect.objectContaining({ is_available: true, status: 'online', current_delivery_id: null })
    );
  });

  it('getCourierPerformance computes delivered metrics and falls back to zeros', async () => {
    const periodClient = buildDatabaseClient({
      selectResults: [
        {
          data: [
            {
              status: 'delivered',
              actual_delivery_time: '2026-03-08T09:00:00.000Z',
              estimated_delivery_time: '2026-03-08T09:10:00.000Z'
            },
            {
              status: 'delivered',
              actual_delivery_time: '2026-03-08T09:20:00.000Z',
              estimated_delivery_time: '2026-03-08T09:10:00.000Z'
            }
          ],
          error: null
        },
        { data: { rating: 4.7 }, error: null }
      ]
    });
    const repository = new CourierRepository(periodClient.client);

    const metrics = await repository.getCourierPerformance('cour-1');
    expect(metrics).toEqual({
      totalDeliveries: 2,
      onTimeRate: 0.5,
      averageRating: 4.7
    });

    const zeroClient = buildDatabaseClient({
      selectResults: [{ data: [], error: null }]
    });
    await expect(new CourierRepository(zeroClient.client).getCourierPerformance('cour-x')).resolves.toEqual({
      totalDeliveries: 0,
      onTimeRate: 0,
      averageRating: 0
    });
  });

  it('getCourierPerformance throws wrapped error when deliveries query fails', async () => {
    const { client } = buildDatabaseClient({
      selectResults: [{ data: null, error: { message: 'stats query failed' } }]
    });
    const repository = new CourierRepository(client);

    await expect(repository.getCourierPerformance('cour-z')).rejects.toThrow(
      'Failed to get courier performance metrics'
    );
  });
});

