// =====================================================================================
// JEST GLOBAL SETUP - Test Suite Initialization
// =====================================================================================

module.exports = async () => {
  // Initialize test environment
  process.env.NODE_ENV = 'test';
  process.env.LOG_LEVEL = 'error';
};
