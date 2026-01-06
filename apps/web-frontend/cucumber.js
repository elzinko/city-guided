/**
 * Cucumber Configuration
 * E2E test runner configuration
 */

module.exports = {
  default: {
    require: ['tests/e2e/steps/**/*.ts', 'tests/e2e/support/**/*.ts'],
    requireModule: ['ts-node/register/transpile-only'],
    format: ['progress', 'html:test-results/cucumber-report.html'],
    formatOptions: { snippetInterface: 'async-await' },
    publishQuiet: true,
  },
};
