// Integration specs run against a real Postgres, so they are a separate suite
// from the mocked unit specs picked up by the jest block in package.json.
module.exports = {
  rootDir: ".",
  testEnvironment: "node",
  testRegex: "test/integration/.*\\.int-spec\\.ts$",
  moduleFileExtensions: ["js", "json", "ts"],
  moduleNameMapper: { "^src/(.*)$": "<rootDir>/src/$1" },
  transform: { "^.+\\.(t|j)s$": "ts-jest" },
  setupFiles: ["<rootDir>/test/integration/setup.ts"],
  testTimeout: 30000,
  maxWorkers: 1,
};
