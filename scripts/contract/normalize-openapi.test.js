const {
  OPENAPI_NORMALIZATION_TRANSFORM_NAMES,
  normalizeOpenApiDocument,
  removeSafeMethodRequestBodies,
} = require('./normalize-openapi');

describe('normalizeOpenApiDocument', () => {
  it('runs the named transform pipeline and normalizes a minimal document shape', () => {
    const doc = {
      openapi: '3.0.3',
      info: {
        title: 'Contract Test',
        version: '1.0.0',
      },
      paths: {
        '/health{?ping}': {
          get: {
            responses: {
              200: {
                description: 'Healthy',
              },
            },
          },
        },
        '/api/auth/login': {
          post: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                      email: { type: 'string' },
                      password: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              200: {
                description: 'Authenticated',
              },
            },
          },
        },
      },
    };

    const result = normalizeOpenApiDocument(doc);

    expect(result.appliedTransforms).toEqual(OPENAPI_NORMALIZATION_TRANSFORM_NAMES);
    expect(doc.paths['/health']).toBeDefined();
    expect(doc.paths['/health{?ping}']).toBeUndefined();
    expect(doc.paths['/health'].parameters).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'ping',
          in: 'query',
          required: false,
        }),
      ])
    );
    expect(doc.paths['/health'].get.security).toEqual([]);
    expect(doc.paths['/api/auth/login'].post.security).toEqual([]);
    expect(doc.components.securitySchemes.BearerAuth).toEqual(
      expect.objectContaining({
        type: 'http',
        scheme: 'bearer',
      })
    );
    expect(
      doc.paths['/api/auth/login'].post.requestBody.content['application/json'].example
    ).toEqual({
      email: 'contract.auth@example.com',
      password: 'StrongPass123!',
    });
  });

  it('removes request bodies from GET and HEAD operations', () => {
    const doc = {
      openapi: '3.0.3',
      info: { title: 'Contract Test', version: '1.0.0' },
      paths: {
        '/api/logistics/api/v1/couriers/{courierId}': {
          get: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'OK' },
            },
          },
          post: {
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      status: { type: 'string' },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'OK' },
            },
          },
        },
      },
    };

    removeSafeMethodRequestBodies(doc);

    expect(doc.paths['/api/logistics/api/v1/couriers/{courierId}'].get.requestBody).toBeUndefined();
    expect(doc.paths['/api/logistics/api/v1/couriers/{courierId}'].post.requestBody).toBeDefined();
  });

  it('marks maintenance cleanup routes as service-key-only security', () => {
    const doc = {
      openapi: '3.0.3',
      info: { title: 'Contract Test', version: '1.0.0' },
      paths: {
        '/api/payment/system/maintenance/cleanup/outbox': {
          post: {
            requestBody: {
              required: false,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                  },
                },
              },
            },
            responses: {
              200: { description: 'OK' },
            },
          },
        },
      },
    };

    normalizeOpenApiDocument(doc);

    expect(doc.paths['/api/payment/system/maintenance/cleanup/outbox'].post.security).toEqual([
      { ServiceKey: [] },
    ]);
  });

  it('applies parameter overrides to both path-level and operation-level parameters', () => {
    const doc = {
      openapi: '3.0.3',
      info: { title: 'Contract Test', version: '1.0.0' },
      paths: {
        '/api/business-registry/{id}/verify': {
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string' },
            },
          ],
          post: {
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: { type: 'string' },
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['verifiedBy', 'documentTypes'],
                    properties: {
                      verifiedBy: { type: 'string' },
                      documentTypes: {
                        type: 'array',
                        items: { type: 'string' },
                      },
                    },
                  },
                },
              },
            },
            responses: {
              200: { description: 'OK' },
            },
          },
        },
      },
    };

    normalizeOpenApiDocument(doc);

    expect(doc.paths['/api/business-registry/{id}/verify'].parameters[0].schema.enum).toEqual([
      'biz_01ARZ3NDEKTSV4RRFFQ69G5FAV',
    ]);
    expect(doc.paths['/api/business-registry/{id}/verify'].post.parameters[0].schema.enum).toEqual([
      'biz_01ARZ3NDEKTSV4RRFFQ69G5FAV',
    ]);
  });
});
