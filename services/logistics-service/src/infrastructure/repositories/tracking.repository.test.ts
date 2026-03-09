import { TrackingRepository } from './tracking.repository';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';
import type { Tracking } from '../../domain/repositories';

type QueryResult = { data: any; error: any; count?: number | null };

const buildSupabaseClient = (params?: {
  selectResults?: QueryResult[];
  upsertResult?: QueryResult;
  deleteResults?: QueryResult[];
}) => {
  const selectQueue = [...(params?.selectResults || [])];
  const upsertResult = params?.upsertResult || { data: null, error: null };
  const deleteQueue = [...(params?.deleteResults || [])];

  const calls = {
    from: [] as string[],
    select: [] as Array<{ table: string; fields: string }>,
    eq: [] as Array<{ table: string; field: string; value: any }>,
    gte: [] as Array<{ table: string; field: string; value: any }>,
    lte: [] as Array<{ table: string; field: string; value: any }>,
    order: [] as Array<{ table: string; field: string; options: { ascending: boolean } }>,
    limit: [] as Array<{ table: string; value: number }>,
    upsert: [] as Array<{ table: string; data: any; options: any }>,
    deleteLt: [] as Array<{ table: string; field: string; value: any }>
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
      limit: (value: number) => {
        calls.limit.push({ table, value });
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
        delete: () => ({
          lt: (field: string, value: any) => {
            calls.deleteLt.push({ table, field, value });
            const result = deleteQueue.shift() || { data: [], error: null };
            return Promise.resolve(result);
          }
        })
      };
    }
  };

  return { client, calls };
};

const createTracking = (): Tracking => ({
  id: 'trk-1',
  deliveryId: 'del-1',
  courierId: 'cour-1',
  location: GeoPoint.create(-6.79, 39.2, 'Kariakoo'),
  speed: 28,
  heading: 120,
  timestamp: new Date('2026-03-08T10:00:00.000Z'),
  status: 'in_transit',
  batteryLevel: 84,
  accuracy: 5
});

const trackingRow = {
  id: 'trk-2',
  delivery_id: 'del-2',
  courier_id: 'cour-2',
  location_lat: -6.8,
  location_lng: 39.21,
  location_address: 'Upanga',
  speed: 24,
  heading: 95,
  timestamp: '2026-03-08T10:05:00.000Z',
  status: 'picked_up',
  battery_level: 76,
  accuracy: 7
};

describe('TrackingRepository', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    errorSpy.mockRestore();
  });

  it('save upserts mapped tracking payload', async () => {
    const { client, calls } = buildSupabaseClient();
    const repository = new TrackingRepository(client);

    await repository.save(createTracking());

    expect(calls.upsert[0]).toEqual(
      expect.objectContaining({
        table: 'tracking',
        options: { onConflict: 'id' },
        data: expect.objectContaining({
          id: 'trk-1',
          delivery_id: 'del-1',
          courier_id: 'cour-1',
          location_lat: -6.79,
          status: 'in_transit'
        })
      })
    );
  });

  it('save throws wrapped error when upsert fails', async () => {
    const { client } = buildSupabaseClient({
      upsertResult: { data: null, error: { message: 'cannot persist' } }
    });
    const repository = new TrackingRepository(client);

    await expect(repository.save(createTracking())).rejects.toThrow('Failed to save tracking data');
  });

  it('findByDeliveryId maps rows and returns [] when query errors', async () => {
    const success = buildSupabaseClient({
      selectResults: [{ data: [trackingRow], error: null }]
    });
    const repository = new TrackingRepository(success.client);
    const entries = await repository.findByDeliveryId('del-2');

    expect(entries).toHaveLength(1);
    expect(entries[0]).toEqual(
      expect.objectContaining({
        id: 'trk-2',
        deliveryId: 'del-2',
        courierId: 'cour-2',
        speed: 24
      })
    );
    expect(entries[0].location.getAddress()).toBe('Upanga');
    expect(success.calls.order).toContainEqual({
      table: 'tracking',
      field: 'timestamp',
      options: { ascending: false }
    });

    const errored = buildSupabaseClient({
      selectResults: [{ data: null, error: { message: 'failed' } }]
    });
    await expect(new TrackingRepository(errored.client).findByDeliveryId('del-err')).resolves.toEqual([]);
  });

  it('findByCourierId applies optional time range and maps records', async () => {
    const { client, calls } = buildSupabaseClient({
      selectResults: [{ data: [trackingRow], error: null }]
    });
    const repository = new TrackingRepository(client);

    const entries = await repository.findByCourierId('cour-2', {
      start: new Date('2026-03-01T00:00:00.000Z'),
      end: new Date('2026-03-31T23:59:59.999Z')
    });

    expect(entries).toHaveLength(1);
    expect(calls.eq).toContainEqual({ table: 'tracking', field: 'courier_id', value: 'cour-2' });
    expect(calls.gte.length).toBeGreaterThan(0);
    expect(calls.lte.length).toBeGreaterThan(0);
  });

  it('getLatestTracking returns latest mapped row and null fallback cases', async () => {
    const success = buildSupabaseClient({
      selectResults: [{ data: trackingRow, error: null }]
    });
    const repository = new TrackingRepository(success.client);
    const latest = await repository.getLatestTracking('del-2');

    expect(latest?.id).toBe('trk-2');
    expect(success.calls.limit).toContainEqual({ table: 'tracking', value: 1 });

    const missing = buildSupabaseClient({
      selectResults: [{ data: null, error: null }]
    });
    await expect(new TrackingRepository(missing.client).getLatestTracking('none')).resolves.toBeNull();

    const errored = buildSupabaseClient({
      selectResults: [{ data: null, error: { message: 'broken' } }]
    });
    await expect(new TrackingRepository(errored.client).getLatestTracking('err')).resolves.toBeNull();
  });

  it('deleteOldTracking deletes by cutoff time and returns deleted count', async () => {
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-03-08T12:00:00.000Z').getTime());

    const { client, calls } = buildSupabaseClient({
      deleteResults: [{ data: [{ id: 'a' }, { id: 'b' }], error: null }]
    });
    const repository = new TrackingRepository(client);

    const deleted = await repository.deleteOldTracking(2);

    expect(deleted).toBe(2);
    expect(calls.deleteLt).toContainEqual({
      table: 'tracking',
      field: 'timestamp',
      value: '2026-03-08T10:00:00.000Z'
    });

    nowSpy.mockRestore();
  });

  it('deleteOldTracking returns 0 on delete errors', async () => {
    const { client } = buildSupabaseClient({
      deleteResults: [{ data: null, error: { message: 'cannot delete' } }]
    });
    const repository = new TrackingRepository(client);

    await expect(repository.deleteOldTracking(3)).resolves.toBe(0);
  });
});
