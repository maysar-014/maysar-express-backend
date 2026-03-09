import { RouteRepository } from './route.repository';
import { Route } from '../../domain/entities/route.entity';
import { RouteStatus } from '../../domain/enums/route-status.enum';
import { RouteProgress } from '../../domain/value-objects/route-progress.value-object';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

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
    select: [] as Array<{ table: string; fields: string; options?: any }>,
    eq: [] as Array<{ table: string; field: string; value: any }>,
    gte: [] as Array<{ table: string; field: string; value: any }>,
    lte: [] as Array<{ table: string; field: string; value: any }>,
    order: [] as Array<{ table: string; field: string; options: { ascending: boolean } }>,
    range: [] as Array<{ table: string; from: number; to: number }>,
    upsert: [] as Array<{ table: string; data: any; options: any }>,
    deleteEq: [] as Array<{ table: string; field: string; value: any }>
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
      range: (from: number, to: number) => {
        calls.range.push({ table, from, to });
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
        select: (fields: string, options?: any) => {
          calls.select.push({ table, fields, options });
          const result = selectQueue.shift() || { data: [], error: null, count: 0 };
          return createSelectBuilder(table, result);
        },
        delete: () => ({
          eq: (field: string, value: any) => {
            calls.deleteEq.push({ table, field, value });
            const result = deleteQueue.shift() || { data: null, error: null };
            return Promise.resolve(result);
          }
        })
      };
    }
  };

  return { client, calls };
};

const routeRow = {
  id: 'route-1',
  courier_id: 'cour-1',
  status: RouteStatus.ASSIGNED,
  total_distance: 12.5,
  estimated_duration: 34,
  actual_duration: null,
  waypoints: [
    { lat: -6.79, lng: 39.2, address: 'Pickup A' },
    { lat: -6.8, lng: 39.21, address: 'Stop B' },
    { lat: -6.81, lng: 39.22, address: 'Dropoff C' }
  ],
  progress: {
    completed_stops: 1,
    total_stops: 3,
    current_lat: -6.8,
    current_lng: 39.21,
    current_address: 'Stop B',
    last_update_time: '2026-03-08T08:00:00.000Z',
    estimated_completion_time: '2026-03-08T08:40:00.000Z',
    notes: 'running on schedule'
  },
  created_at: '2026-03-08T07:00:00.000Z',
  updated_at: '2026-03-08T08:05:00.000Z',
  completed_at: null
};

const createRoute = () =>
  Route.create({
    id: 'route-2',
    courierId: 'cour-2',
    status: RouteStatus.IN_PROGRESS,
    totalDistance: 8.2,
    estimatedDuration: 25,
    waypoints: [
      GeoPoint.create(-6.77, 39.18, 'Start'),
      GeoPoint.create(-6.78, 39.19, 'End')
    ],
    progress: RouteProgress.create(
      1,
      2,
      GeoPoint.create(-6.78, 39.19, 'End'),
      new Date('2026-03-08T08:10:00.000Z'),
      new Date('2026-03-08T08:30:00.000Z'),
      'almost there'
    ),
    createdAt: new Date('2026-03-08T07:40:00.000Z'),
    updatedAt: new Date('2026-03-08T08:10:00.000Z')
  });

describe('RouteRepository', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    errorSpy.mockRestore();
  });

  it('save upserts serialized route payload', async () => {
    const { client, calls } = buildSupabaseClient();
    const repository = new RouteRepository(client);

    await repository.save(createRoute());

    expect(calls.upsert[0]).toEqual(
      expect.objectContaining({
        table: 'routes',
        options: { onConflict: 'id' },
        data: expect.objectContaining({
          id: 'route-2',
          courier_id: 'cour-2',
          status: RouteStatus.IN_PROGRESS,
          total_distance: 8.2,
          estimated_duration: 25
        })
      })
    );
    expect(calls.upsert[0]?.data.waypoints).toHaveLength(2);
    expect(calls.upsert[0]?.data.progress).toEqual(
      expect.objectContaining({
        completed_stops: 1,
        total_stops: 2,
        current_address: 'End'
      })
    );
  });

  it('save throws wrapped error on persistence failures', async () => {
    const { client } = buildSupabaseClient({
      upsertResult: { data: null, error: { message: 'cannot save' } }
    });
    const repository = new RouteRepository(client);

    await expect(repository.save(createRoute())).rejects.toThrow('Failed to save route');
  });

  it('findById maps database row into route entity', async () => {
    const { client, calls } = buildSupabaseClient({
      selectResults: [{ data: routeRow, error: null }]
    });
    const repository = new RouteRepository(client);

    const route = await repository.findById('route-1');

    expect(calls.eq).toContainEqual({ table: 'routes', field: 'id', value: 'route-1' });
    expect(route).not.toBeNull();
    expect(route?.getId()).toBe('route-1');
    expect(route?.getCourierId()).toBe('cour-1');
    expect(route?.getStatus()).toBe(RouteStatus.ASSIGNED);
    expect(route?.getWaypoints()).toHaveLength(3);
  });

  it('findById returns null for no-row codes and missing data', async () => {
    const notFoundCode = buildSupabaseClient({
      selectResults: [{ data: null, error: { code: 'PGRST116' } }]
    });
    await expect(new RouteRepository(notFoundCode.client).findById('missing')).resolves.toBeNull();

    const missingData = buildSupabaseClient({
      selectResults: [{ data: null, error: null }]
    });
    await expect(new RouteRepository(missingData.client).findById('missing')).resolves.toBeNull();
  });

  it('findById throws wrapped error for non-116 query failures', async () => {
    const { client } = buildSupabaseClient({
      selectResults: [{ data: null, error: { code: '500', message: 'query failed' } }]
    });
    const repository = new RouteRepository(client);

    await expect(repository.findById('route-err')).rejects.toThrow('Failed to find route');
  });

  it('findByCourierId applies optional status filter and maps route list', async () => {
    const { client, calls } = buildSupabaseClient({
      selectResults: [{ data: [routeRow], error: null }]
    });
    const repository = new RouteRepository(client);

    const routes = await repository.findByCourierId('cour-1', RouteStatus.ASSIGNED);

    expect(routes).toHaveLength(1);
    expect(routes[0].getId()).toBe('route-1');
    expect(calls.eq).toContainEqual({ table: 'routes', field: 'courier_id', value: 'cour-1' });
    expect(calls.eq).toContainEqual({ table: 'routes', field: 'status', value: RouteStatus.ASSIGNED });
    expect(calls.order).toContainEqual({
      table: 'routes',
      field: 'created_at',
      options: { ascending: false }
    });
  });

  it('findAll applies filters and pagination and returns count', async () => {
    const { client, calls } = buildSupabaseClient({
      selectResults: [{ data: [routeRow], error: null, count: 11 }]
    });
    const repository = new RouteRepository(client);

    const result = await repository.findAll({
      page: 2,
      limit: 5,
      status: RouteStatus.ASSIGNED,
      courierId: 'cour-1',
      dateFrom: new Date('2026-03-01T00:00:00.000Z'),
      dateTo: new Date('2026-03-31T23:59:59.999Z')
    });

    expect(result.total).toBe(11);
    expect(result.routes).toHaveLength(1);
    expect(calls.select[0]?.options).toEqual({ count: 'exact' });
    expect(calls.range).toContainEqual({ table: 'routes', from: 5, to: 9 });
    expect(calls.eq).toContainEqual({ table: 'routes', field: 'status', value: RouteStatus.ASSIGNED });
    expect(calls.eq).toContainEqual({ table: 'routes', field: 'courier_id', value: 'cour-1' });
    expect(calls.gte.length).toBeGreaterThan(0);
    expect(calls.lte.length).toBeGreaterThan(0);
  });

  it('findAll returns empty payload when no rows are returned', async () => {
    const { client } = buildSupabaseClient({
      selectResults: [{ data: [], error: null, count: 0 }]
    });
    const repository = new RouteRepository(client);

    await expect(repository.findAll()).resolves.toEqual({ routes: [], total: 0 });
  });

  it('updateRoute returns current route and throws when route does not exist', async () => {
    const success = buildSupabaseClient({
      selectResults: [{ data: routeRow, error: null }]
    });
    const repository = new RouteRepository(success.client);
    const unchanged = await repository.updateRoute('route-1', {});

    expect(unchanged.getId()).toBe('route-1');

    const missing = buildSupabaseClient({
      selectResults: [{ data: null, error: { code: 'PGRST116' } }]
    });
    await expect(new RouteRepository(missing.client).updateRoute('none', {})).rejects.toThrow(
      'Failed to update route'
    );
  });

  it('deleteRoute deletes by id and throws on errors', async () => {
    const success = buildSupabaseClient({
      deleteResults: [{ data: null, error: null }]
    });
    const repository = new RouteRepository(success.client);
    await repository.deleteRoute('route-1');

    expect(success.calls.deleteEq).toContainEqual({ table: 'routes', field: 'id', value: 'route-1' });

    const failed = buildSupabaseClient({
      deleteResults: [{ data: null, error: { message: 'cannot delete' } }]
    });
    await expect(new RouteRepository(failed.client).deleteRoute('route-2')).rejects.toThrow(
      'Failed to delete route'
    );
  });
});
