import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { verifyRoutes } = require('./scripts/contract/verify-openapi-routes.js');
const result = verifyRoutes('./openapi.yaml');
console.log('missingFromSpec type:', typeof result.missingFromSpec[0]);
const missing = result.missingFromSpec.filter(r => String(r).includes('business-registry'));
console.log('Missing business-registry:', missing.slice(0,5));
console.log('Total missing:', result.missingFromSpec.length);
