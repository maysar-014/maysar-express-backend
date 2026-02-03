// Type declarations for Jest custom matchers and global test utilities

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidProduct(): R;
      toBeValidUser(): R;
      toHaveValidPermissions(): R;
    }
  }

  var testUtils: any;
  var TestDataFactory: any;
  var TestUtils: any;
}

export {};
