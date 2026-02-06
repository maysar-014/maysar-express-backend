module.exports = async () => {
  // @ts-ignore
  process.env.NODE_ENV = 'test';
  console.log('[GLOBAL SETUP] Initializing checkout-service test environment...');
};
