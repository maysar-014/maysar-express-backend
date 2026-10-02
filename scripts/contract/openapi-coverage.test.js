const fs = require('fs');
const path = require('path');
const { verifyRoutes } = require('./verify-openapi-routes');

const repoRoot = path.resolve(__dirname, '..', '..');
const baselinePath = path.join(__dirname, 'openapi-coverage-baseline.json');

describe('openapi route coverage', () => {
  const result = verifyRoutes(path.join(repoRoot, 'openapi.yaml'));

  it('documents no unreachable path (every documented operation is mounted)', () => {
    // A documented-but-unmounted path is what a client can call and never reach
    // (DEF-005 shipped 4 of them). This is a hard invariant: the contract must
    // never advertise a route the bootstrap does not serve.
    const unreachable = result.extraInSpec
      .map(route => `${route.method} ${route.path}`)
      .sort();

    expect(unreachable).toEqual([]);
  });

  it('does not regress the documented surface below the recorded baseline', () => {
    const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
    const undocumentedCount = result.missingFromSpec.length;

    // Ratchet: the gap may only shrink as routes are documented. If a new route
    // is mounted without being added to openapi.yaml, this fails.
    expect(undocumentedCount).toBeLessThanOrEqual(baseline.undocumentedCount);
  });

  it('keeps api-contract.yaml in step with openapi.yaml', () => {
    const contractPath = path.join(repoRoot, 'api-contract.yaml');
    const contract = verifyRoutes(contractPath);

    // The legacy contract is a mirror of openapi.yaml (npm run contract:sync),
    // so it must carry the same route surface; otherwise the two specs disagree
    // about what exists.
    const openApiOperations = new Set(
      result.extraInSpec.concat(result.missingFromSpec).map(route => `${route.method} ${route.path}`)
    );
    const contractOperations = new Set(
      contract.extraInSpec.concat(contract.missingFromSpec).map(route => `${route.method} ${route.path}`)
    );

    const onlyOpenApi = [...openApiOperations].filter(op => !contractOperations.has(op));
    const onlyContract = [...contractOperations].filter(op => !openApiOperations.has(op));

    expect({ onlyOpenApi, onlyContract }).toEqual({ onlyOpenApi: [], onlyContract: [] });
  });
});
