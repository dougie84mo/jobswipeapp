// Jest config for the app side. Uses the SDK-aligned jest-expo preset (which
// sets the RN/Expo transform + transformIgnorePatterns) and maps the `@/`
// alias to src/ so tests resolve imports the same way the app does.
module.exports = {
  preset: 'jest-expo',
  // Only the Expo app's tests — never the read-only legacy CRA app under legacy/.
  roots: ['<rootDir>/src'],
  testPathIgnorePatterns: ['/node_modules/', '/legacy/'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
