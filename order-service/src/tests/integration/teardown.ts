// Integration test teardown
module.exports = async () => {
  console.log('🧹 Cleaning up integration test environment...');
  
  // Cleanup test data
  try {
    // Clear test cache
    if (global.testCache) {
      await global.testCache.clear();
    }
    
    // Close database connections
    if (global.testDb) {
      await global.testDb.close();
    }
    
    // Clear any remaining timers
    jest.clearAllTimers();
    
    console.log('✅ Integration test cleanup completed');
  } catch (error) {
    console.error('❌ Cleanup error:', error);
  }
};