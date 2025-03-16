module.exports = {
  // Test environment for simulating browser DOM
  testEnvironment: 'jsdom',
  
  // Define where Jest should look for tests
  roots: ['<rootDir>/src'],
  
  // Files to run after Jest is initialized
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  
  // Map module paths and mock file imports
  moduleNameMapper: {
    // Support path aliases defined in tsconfig.json
    '^@/(.*)$': '<rootDir>/src/$1',
    // Mock CSS imports to prevent test failures
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    // Mock image imports
    '\\.(jpg|jpeg|png|gif|svg)$': '<rootDir>/src/__mocks__/fileMock.js',
  },
  
  // Transform source files using babel-jest
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['react-app'] }],
  },
  
  // Files to include in coverage reports
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/index.tsx',
    '!src/setupTests.ts',
    '!src/reportWebVitals.ts',
    '!src/**/*.stories.{js,jsx,ts,tsx}',
    '!src/mocks/**',
  ],
  
  // Coverage thresholds to maintain code quality
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80,
    },
    'src/components/': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85,
    },
  },
  
  // Watch plugins for better developer experience
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  
  // Reset mocks automatically between tests
  resetMocks: true,
  
  // Patterns to identify test files
  testMatch: [
    '**/__tests__/**/*.{js,jsx,ts,tsx}',
    '**/*.{spec,test}.{js,jsx,ts,tsx}',
  ],
  
  // File extensions Jest should recognize
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
};