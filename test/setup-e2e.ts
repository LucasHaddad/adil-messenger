import 'reflect-metadata';

// Set NODE_ENV to test for proper entity configuration
process.env.NODE_ENV = 'test';

// E2E test configuration
jest.setTimeout(60000);

// Global setup for E2E tests
beforeAll(async () => {
  // Setup test database or any global resources
  console.log('Setting up E2E test environment...');
});

afterAll(async () => {
  // Cleanup test database or any global resources
  console.log('Cleaning up E2E test environment...');
});
