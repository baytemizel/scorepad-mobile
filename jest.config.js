/**
 * The sport engines and the match stores are pure TypeScript — no React, no
 * native modules — so they run under plain babel-jest with the project's own
 * Babel config (which supplies the `@/` alias). Tests live next to the code
 * they cover, in `src/**\/__tests__`.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/src/**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
