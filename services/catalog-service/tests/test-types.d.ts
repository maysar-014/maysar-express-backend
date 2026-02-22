// Type declarations for Jest custom matchers and global test utilities

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidProduct(): R;
      toBeValidUser(): R;
      toHaveValidPermissions(): R;
    }
  }

  let TestDataFactory: Record<string, unknown>;
  let TestUtils: Record<string, unknown>;
}

export {};
