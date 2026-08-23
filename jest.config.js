/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  // tsconfig.json sets isolatedModules, so ts-jest transpiles without full type
  // checking: `npm test` proves behaviour, `npx tsc --noEmit` is the type gate.
  // Run both.
  // The `@/` alias mirrors tsconfig.json `paths: { "@/*": ["./*"] }`. jest does
  // not read tsconfig paths, so this mapping is what makes `@/lib/analytics`
  // resolvable from a test file — without it every test fails instantly on
  // module resolution.
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Analytics math is pure TypeScript: no DOM, no React, no Supabase.
  //
  // `roots` narrows discovery to lib/. Matching uses testRegex rather than a
  // testMatch glob because on Windows <rootDir> interpolates backslashes into the
  // pattern and micromatch reads those as escapes, so the glob silently matches
  // nothing. A regex is applied to the path directly and handles either separator.
  roots: ['<rootDir>/lib'],
  testRegex: '__tests__[\\\\/].*\\.test\\.ts$',
}
