# Programmatic API

The Cucumber.js programmatic API allows you to run tests, load configurations, and integrate Cucumber into build tools, IDEs, and custom test runners without using the command-line interface.

## Capabilities

### Running Tests

Execute Cucumber tests programmatically with full control over configuration and execution.

```typescript { .api }
/**
 * Run Cucumber tests programmatically
 * @param options - Test execution options
 * @param environment - Runtime environment context (optional)
 * @param onMessage - Message handler for test events (optional)
 * @returns Promise resolving to test execution results
 */
function runCucumber(
  options: IRunOptions,
  environment?: IRunEnvironment,
  onMessage?: (message: Envelope) => void
): Promise<IRunResult>;
```

**Usage Examples:**

```typescript
import { runCucumber } from "@cucumber/cucumber/api";

// Basic test execution
const result = await runCucumber({
  sources: {
    paths: ['features/**/*.feature']
  },
  support: {
    requireModules: ['ts-node/register'],
    requirePaths: ['features/step_definitions/**/*.ts']
  }
});

console.log(`Tests completed: ${result.success ? 'PASSED' : 'FAILED'}`);

// Advanced configuration with custom options
const advancedResult = await runCucumber({
  sources: {
    paths: ['features/**/*.feature'],
    names: ['User login', 'Password reset'],  // Run specific scenarios
    tagExpression: '@smoke and not @skip'     // Filter by tags
  },
  support: {
    requireModules: ['ts-node/register'],
    requirePaths: ['features/support/**/*.ts']
  },
  runtime: {
    dryRun: false,
    failFast: true,
    filterStackTraces: true,
    parallel: 4,
    retry: 1,
    retryTagFilter: '@flaky',
    worldParameters: {
      apiUrl: 'https://api.staging.example.com',
      timeout: 30000
    }
  },
  formats: [
    { type: 'progress' },
    { type: 'json', outputTo: 'reports/results.json' },
    { type: 'html', outputTo: 'reports/results.html' }
  ]
});

// Custom message handling for real-time monitoring
const monitoredResult = await runCucumber({
  sources: { paths: ['features/**/*.feature'] },
  support: { requirePaths: ['features/support/**/*.js'] }
}, undefined, (message) => {
  // Handle test events in real-time
  switch (message.type) {
    case 'testCaseStarted':
      console.log(`Starting: ${getScenarioName(message)}`);
      break;
    case 'testCaseFinished':
      const status = message.testCaseFinished.result.status;
      console.log(`Finished: ${status}`);
      break;
    case 'testStepFinished':
      if (message.testStepFinished.result.status === 'FAILED') {
        console.error(`Step failed: ${getStepText(message)}`);
      }
      break;
  }
});
```

### Configuration Loading

Load and resolve Cucumber configuration from various sources.

```typescript { .api }
/**
 * Load and resolve Cucumber configuration
 * @param options - Configuration loading options (optional)
 * @param environment - Runtime environment context (optional)
 * @returns Promise resolving to resolved configuration
 */
function loadConfiguration(
  options?: ILoadConfigurationOptions,
  environment?: IRunEnvironment
): Promise<IResolvedConfiguration>;
```

**Usage Examples:**

```typescript
import { loadConfiguration } from "@cucumber/cucumber/api";

// Load default configuration
const config = await loadConfiguration();
console.log('Default config:', config);

// Load with custom options
const customConfig = await loadConfiguration({
  file: 'cucumber.staging.js',          // Custom config file
  profiles: ['staging', 'integration'], // Activate specific profiles
  provided: {                           // Override specific settings
    parallel: 2,
    format: ['json:test-results.json']
  }
});

// Load with environment context
const envConfig = await loadConfiguration({
  profiles: ['ci']
}, {
  cwd: '/path/to/project',
  stdout: process.stdout,
  stderr: process.stderr,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    API_URL: 'https://test-api.example.com'
  }
});

// Validate configuration before use
if (!customConfig.sources.paths.length) {
  throw new Error('No feature files specified');
}

if (customConfig.runtime.parallel > 1 && !customConfig.support.requirePaths.length) {
  console.warn('Parallel execution enabled but no support files specified');
}
```

### Source Loading

Load and parse Gherkin feature files.

```typescript { .api }
/**
 * Load and parse feature files
 * @param coordinates - Source file coordinates and filters
 * @param environment - Runtime environment context (optional)
 * @returns Promise resolving to loaded sources with parsed features
 */
function loadSources(
  coordinates: ISourcesCoordinates,
  environment?: IRunEnvironment
): Promise<ILoadSourcesResult>;
```

**Usage Examples:**

```typescript
import { loadSources } from "@cucumber/cucumber/api";

// Load all feature files
const sources = await loadSources({
  paths: ['features/**/*.feature']
});

console.log(`Loaded ${sources.features.length} features`);
sources.features.forEach(feature => {
  console.log(`Feature: ${feature.feature.name}`);
  feature.feature.children.forEach(scenario => {
    console.log(`  Scenario: ${scenario.scenario?.name}`);
  });
});

// Load with filters
const filteredSources = await loadSources({
  paths: ['features/**/*.feature'],
  names: ['Login functionality'],        // Filter by scenario names
  tagExpression: '@smoke',               // Filter by tags
  order: 'random'                        // Randomize execution order
});

// Load specific files
const specificSources = await loadSources({
  paths: [
    'features/authentication.feature',
    'features/user-management.feature'
  ]
});

// Inspect loaded content
filteredSources.features.forEach(gherkinDocument => {
  gherkinDocument.feature.children.forEach(child => {
    if (child.scenario) {
      console.log(`Scenario: ${child.scenario.name}`);
      child.scenario.steps.forEach(step => {
        console.log(`  ${step.keyword}${step.text}`);
      });
    }
  });
});
```

### Support Code Loading

Load step definitions, hooks, and other support code.

```typescript { .api }
/**
 * Load support code (step definitions, hooks, etc.)
 * @param options - Support code loading options
 * @param environment - Runtime environment context (optional)
 * @returns Promise resolving to loaded support code library
 */
function loadSupport(
  options: ILoadSupportOptions,
  environment?: IRunEnvironment
): Promise<ISupportCodeLibrary>;
```

**Usage Examples:**

```typescript
import { loadSupport } from "@cucumber/cucumber/api";

// Load support code
const supportLibrary = await loadSupport({
  requireModules: ['ts-node/register', '@babel/register'],
  requirePaths: ['features/support/**/*.ts'],
  worldParameters: {
    apiUrl: 'https://api.example.com',
    databaseUrl: 'postgresql://localhost/test'
  }
});

console.log(`Loaded ${supportLibrary.stepDefinitions.length} step definitions`);
console.log(`Loaded ${supportLibrary.beforeTestCaseHookDefinitions.length} Before hooks`);
console.log(`Loaded ${supportLibrary.afterTestCaseHookDefinitions.length} After hooks`);

// Inspect step definitions
supportLibrary.stepDefinitions.forEach(stepDef => {
  console.log(`Step: ${stepDef.pattern} (${stepDef.keyword || 'any'})`);
});

// Load with custom world constructor
const customSupportLibrary = await loadSupport({
  requirePaths: ['features/support/**/*.js'],
  worldParameters: { customParam: 'value' }
});

// Check for undefined steps after loading
if (customSupportLibrary.undefinedParameterTypes.length > 0) {
  console.warn('Undefined parameter types:', 
    customSupportLibrary.undefinedParameterTypes
  );
}
```

### Environment Context

Provide runtime environment context for API functions.

**Usage Examples:**

```typescript
import { runCucumber, loadConfiguration } from "@cucumber/cucumber/api";
import path from 'path';

// Custom environment context
const environment = {
  cwd: path.resolve(__dirname, 'my-project'),
  stdout: process.stdout,
  stderr: process.stderr,
  env: {
    ...process.env,
    NODE_ENV: 'test',
    LOG_LEVEL: 'debug'
  }
};

// Use environment with configuration loading
const config = await loadConfiguration({
  file: 'cucumber.test.js'
}, environment);

// Use environment with test execution
const result = await runCucumber({
  sources: { paths: ['features/**/*.feature'] },
  support: { requirePaths: ['features/support/**/*.js'] }
}, environment);

// Capture output streams
let stdoutOutput = '';
let stderrOutput = '';

const captureEnvironment = {
  cwd: process.cwd(),
  stdout: {
    write: (data) => { stdoutOutput += data; return true; }
  },
  stderr: {
    write: (data) => { stderrOutput += data; return true; }
  },
  env: process.env
};

await runCucumber(options, captureEnvironment);
console.log('Captured stdout:', stdoutOutput);
console.log('Captured stderr:', stderrOutput);
```

### Integration Examples

Complete examples for common integration scenarios.

**Build Tool Integration:**

```typescript
// Jest integration
import { runCucumber } from "@cucumber/cucumber/api";

describe('Cucumber Integration Tests', () => {
  it('should pass all cucumber scenarios', async () => {
    const result = await runCucumber({
      sources: { paths: ['features/**/*.feature'] },
      support: { requirePaths: ['features/support/**/*.ts'] },
      runtime: { failFast: true }
    });
    
    expect(result.success).toBe(true);
    expect(result.support.stepDefinitions.length).toBeGreaterThan(0);
  }, 60000);
});

// Webpack/Vite integration
export async function runTests() {
  const config = await loadConfiguration({
    file: 'cucumber.config.js'
  });
  
  const result = await runCucumber(config);
  
  if (!result.success) {
    throw new Error(`Cucumber tests failed: ${result.summary}`);
  }
  
  return result;
}
```

**CI/CD Integration:**

```typescript
// GitHub Actions / CI runner
import { runCucumber } from "@cucumber/cucumber/api";
import fs from 'fs/promises';

async function runCucumberCI() {
  try {
    const result = await runCucumber({
      sources: { 
        paths: ['features/**/*.feature'],
        tagExpression: process.env.CUCUMBER_TAGS || '@smoke'
      },
      support: { 
        requirePaths: ['features/support/**/*.ts'] 
      },
      runtime: { 
        parallel: parseInt(process.env.CUCUMBER_PARALLEL || '1'),
        retry: parseInt(process.env.CUCUMBER_RETRY || '0')
      },
      formats: [
        { type: 'json', outputTo: 'test-results/cucumber-results.json' },
        { type: 'junit', outputTo: 'test-results/cucumber-results.xml' }
      ]
    });
    
    // Generate summary for CI
    await fs.writeFile('test-results/summary.json', JSON.stringify({
      success: result.success,
      scenarios: result.summary,
      duration: result.duration
    }, null, 2));
    
    process.exit(result.success ? 0 : 1);
    
  } catch (error) {
    console.error('Cucumber execution failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runCucumberCI();
}
```

## Types

```typescript { .api }
interface IRunOptions {
  /** Source file configuration */
  sources: ISourcesCoordinates;
  /** Support code configuration */
  support: ISupportCodeCoordinatesOrLibrary;
  /** Runtime execution options */
  runtime: IRunOptionsRuntime;
  /** Output format configuration */
  formats: IRunOptionsFormats;
}

interface ISourcesCoordinates {
  /** Default Gherkin dialect */
  defaultDialect: string;
  /** Paths and/or glob expressions to feature files */
  paths: string[];
  /** Regular expressions of which scenario names should match one of to be run */
  names: string[];
  /** Tag expression to filter which scenarios should be run */
  tagExpression: string;
  /** Run in the order defined, or in a random order */
  order: IPickleOrder;
  /** Shard tests and execute only the selected shard, format `<index>/<total>` */
  shard?: string;
}

interface ISupportCodeCoordinates {
  /** Names of transpilation modules to load, via require() */
  requireModules: string[];
  /** Paths and/or glob expressions of user code to load, via require() */
  requirePaths: string[];
  /** Paths and/or glob expressions of user code to load, via import() */
  importPaths: string[];
  /** Specifiers of loaders to register, via register() */
  loaders: string[];
}

type ISupportCodeCoordinatesOrLibrary = Partial<ISupportCodeCoordinates> | ISupportCodeLibrary;

interface IRunOptionsRuntime {
  /** Perform a dry run, where a test run is prepared but nothing is executed */
  dryRun: boolean;
  /** Stop running tests when a test fails */
  failFast: boolean;
  /** Filter out stack frames from Cucumber's code when formatting stack traces */
  filterStacktraces: boolean;
  /** Run tests in parallel with the given number of worker processes */
  parallel: number;
  /** Retry failing tests up to the given number of times */
  retry: number;
  /** Tag expression to filter which scenarios can be retried */
  retryTagFilter: string;
  /** Fail the test run if there are pending steps */
  strict: boolean;
  /** Parameters to be passed to the World */
  worldParameters: JsonObject;
}

interface IRunOptionsFormats {
  /** Name/path of the formatter to use for stdout output */
  stdout: string;
  /** Zero or more mappings of file output path (key) to name/path of the formatter to use (value) */
  files: Record<string, string>;
  /** Options for report publication, or false to disable publication */
  publish: IPublishConfig | false;
  /** Options to be provided to formatters */
  options: JsonObject;
}

interface IRunResult {
  /** Whether the test run was overall successful */
  success: boolean;
  /** The support code library that was used in the test run */
  support: ISupportCodeLibrary;
}

interface IRunEnvironment {
  /** Current working directory */
  cwd?: string;
  /** Standard output stream */
  stdout?: WriteStream;
  /** Standard error stream */
  stderr?: WriteStream;
  /** Environment variables */
  env?: { [key: string]: string };
}

interface ILoadConfigurationOptions {
  /** Path to load configuration file from, or false to skip */
  file?: string | false;
  /** Zero or more profile names from which to source configuration in the file */
  profiles?: string[];
  /** Ad-hoc configuration options to be merged over the top of whatever is loaded from the configuration file/profiles */
  provided?: Partial<IConfiguration> | string[] | string;
}

interface IResolvedConfiguration {
  /** The final flat configuration object resolved from the configuration file/profiles plus any extra provided */
  useConfiguration: IConfiguration;
  /** The format that can be passed into runCucumber */
  runConfiguration: IRunConfiguration;
}

interface IPlannedPickle {
  /** Name of the pickle (after parameter resolution) */
  name: string;
  uri: string;
  location: {
    line: number;
    column?: number;
  };
}

interface ISourcesError {
  uri: string;
  location: {
    line: number;
    column?: number;
  };
  /** Error message explaining what went wrong with the parse */
  message: string;
}

interface ILoadSourcesResult {
  /** Pickles that have been successfully compiled, in the order they would be run in */
  plan: IPlannedPickle[];
  /** Any errors encountered when parsing sources */
  errors: ISourcesError[];
}

interface ILoadSupportOptions {
  /** This is needed because the default support path locations are derived from feature file locations */
  sources: ISourcesCoordinates;
  support: Partial<ISupportCodeCoordinates>;
}

interface ISupportCodeLibrary {
  readonly originalCoordinates: ISupportCodeCoordinates;
}

interface IRunConfiguration {
  sources: ISourcesCoordinates;
  support: Partial<ISupportCodeCoordinates>;
  runtime: IRunOptionsRuntime;
  formats: IRunOptionsFormats;
}
```