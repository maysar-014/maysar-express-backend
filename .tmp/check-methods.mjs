import yaml from 'js-yaml';
import fs from 'fs';
const spec = yaml.load(fs.readFileSync('openapi.yaml','utf-8'));
const paths = spec.paths || {};

const METHODS = ['get','post','put','patch','delete','head','options'];

function getMethods(pathKey) {
  const entry = paths[pathKey] || paths[`'${pathKey}'`] || paths[`"${pathKey}"`];
  if (!entry) return null;
  return METHODS.filter(m => entry[m]);
}

const checks = [
  '/api/kyc/admin/{userId}',
  '/api/logistics/api/v1/couriers',
  '/api/logistics/api/v1/couriers/{courierId}/status',
  '/api/logistics/api/v1/deliveries/{deliveryId}/status',
  '/api/logistics/api/v1/deliveries/{deliveryId}/cod/generate-otp',
  '/api/logistics/api/v1/deliveries/{deliveryId}/cod/verify',
];

checks.forEach(p => {
  const methods = getMethods(p);
  console.log(p, '->', methods ? methods.join(', ') : 'NOT FOUND');
});
