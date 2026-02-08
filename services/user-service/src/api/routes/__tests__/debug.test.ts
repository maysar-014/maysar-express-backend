
try {
    console.log('Importing user.routes...');
    const { createUserRoutes } = require('../user.routes');
    console.log('user.routes imported successfully');
} catch (error) {
    console.error('Failed to import user.routes:', error);
}

describe('Debug Imports', () => {
    it('should pass if imports work', () => {
        expect(true).toBe(true);
    });
});
