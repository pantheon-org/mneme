# Hooks

Hooks are functions that run at specific points during test execution, providing setup and teardown capabilities at various levels. They enable test preparation, cleanup, and conditional execution based on tags and test outcomes.

## Capabilities  

### Before Hook

Runs before each test scenario for setup and preparation.

```typescript { .api }
/**
 * Run function before each test scenario
 * @param code - Function to execute before each scenario
 */
function Before<WorldType = IWorld>(code: TestCaseHookFunction<WorldType>): void;

/**
 * Run function before scenarios matching specific tags
 * @param tags - Tag expression to filter scenarios
 * @param code - Function to execute before matching scenarios
 */
function Before<WorldType = IWorld>(tags: string, code: TestCaseHookFunction<WorldType>): void;

/**
 * Run function before scenarios with options
 * @param options - Hook configuration options
 * @param code - Function to execute before scenarios
 */
function Before<WorldType = IWorld>(options: IDefineTestCaseHookOptions, code: TestCaseHookFunction<WorldType>): void;
```

**Usage Examples:**

```typescript
import { Before } from "@cucumber/cucumber";

// Basic setup before each scenario
Before(function () {
  this.startTime = Date.now();
  this.testData = {};
});

// Setup only for scenarios tagged with @database
Before('@database', function () {
  this.database = new TestDatabase();
  return this.database.connect();
});

// Setup with timeout and name
Before({ name: 'Browser Setup', timeout: 10000 }, async function () {
  this.browser = await launchBrowser();
});

// Conditional setup based on test case info
Before(function (testCase) {
  if (testCase.pickle.name.includes('mobile')) {
    this.device = 'mobile';
  }
});
```

### After Hook

Runs after each test scenario for cleanup and teardown.

```typescript { .api }
/**
 * Run function after each test scenario
 * @param code - Function to execute after each scenario
 */
function After(code: TestCaseHookFunction): void;

/**
 * Run function after scenarios matching specific tags  
 * @param tags - Tag expression to filter scenarios
 * @param code - Function to execute after matching scenarios
 */
function After(tags: string, code: TestCaseHookFunction): void;

/**
 * Run function after scenarios with options
 * @param options - Hook configuration options
 * @param code - Function to execute after scenarios
 */
function After(options: IDefineTestCaseHookOptions, code: TestCaseHookFunction): void;
```

**Usage Examples:**

```typescript
import { After } from "@cucumber/cucumber";

// Basic cleanup after each scenario  
After(function () {
  this.testData = null;
});

// Cleanup only for database scenarios
After('@database', function () {
  if (this.database) {
    return this.database.disconnect();
  }
});

// Cleanup with error handling
After(function (testCase) {
  if (testCase.result?.status === 'FAILED') {
    // Take screenshot on failure
    if (this.browser) {
      this.attach(this.browser.screenshot(), 'image/png');
    }
  }
  
  if (this.browser) {
    return this.browser.close();
  }
});

// Named cleanup hook
After({ name: 'Cleanup temporary files' }, function () {
  this.cleanupTempFiles();
});
```

### BeforeAll Hook

Runs once before all test scenarios in the test run.

```typescript { .api }
/**
 * Run function once before all scenarios
 * @param code - Function to execute before test run
 */
function BeforeAll(code: TestRunHookFunction): void;

/**
 * Run function before all scenarios with options
 * @param options - Hook configuration options
 * @param code - Function to execute before test run
 */
function BeforeAll(options: IDefineTestRunHookOptions, code: TestRunHookFunction): void;
```

**Usage Examples:**

```typescript
import { BeforeAll } from "@cucumber/cucumber";

// Global test setup
BeforeAll(function () {
  // Start test servers, initialize global resources
  this.testServer = startTestServer();
  return this.testServer.ready();
});

// Setup with timeout
BeforeAll({ timeout: 30000 }, async function () {
  await initializeTestEnvironment();
});
```

### AfterAll Hook

Runs once after all test scenarios have completed.

```typescript { .api }
/**
 * Run function once after all scenarios
 * @param code - Function to execute after test run
 */
function AfterAll(code: TestRunHookFunction): void;

/**
 * Run function after all scenarios with options
 * @param options - Hook configuration options
 * @param code - Function to execute after test run
 */
function AfterAll(options: IDefineTestRunHookOptions, code: TestRunHookFunction): void;
```

**Usage Examples:**

```typescript
import { AfterAll } from "@cucumber/cucumber";

// Global test cleanup
AfterAll(function () {
  if (this.testServer) {
    return this.testServer.stop();
  }
});

// Cleanup with timeout
AfterAll({ timeout: 15000 }, async function () {
  await cleanupTestEnvironment();
});
```

### BeforeStep Hook

Runs before each individual step execution.

```typescript { .api }
/**
 * Run function before each step
 * @param code - Function to execute before each step
 */
function BeforeStep(code: TestStepHookFunction): void;

/**
 * Run function before steps in scenarios matching tags
 * @param tags - Tag expression to filter scenarios
 * @param code - Function to execute before steps
 */
function BeforeStep(tags: string, code: TestStepHookFunction): void;

/**
 * Run function before steps with options
 * @param options - Hook configuration options
 * @param code - Function to execute before steps
 */
function BeforeStep(options: IDefineTestStepHookOptions, code: TestStepHookFunction): void;
```

**Usage Examples:**

```typescript
import { BeforeStep } from "@cucumber/cucumber";

// Log each step before execution
BeforeStep(function (testStep) {
  console.log(`About to execute: ${testStep.pickleStep.text}`);
});

// Step setup for UI tests
BeforeStep('@ui', function () {
  if (this.browser) {
    // Wait for page to be ready before each step
    return this.browser.waitForPageLoad();
  }
});
```

### AfterStep Hook  

Runs after each individual step execution.

```typescript { .api }
/**
 * Run function after each step
 * @param code - Function to execute after each step
 */
function AfterStep(code: TestStepHookFunction): void;

/**
 * Run function after steps in scenarios matching tags
 * @param tags - Tag expression to filter scenarios  
 * @param code - Function to execute after steps
 */
function AfterStep(tags: string, code: TestStepHookFunction): void;

/**
 * Run function after steps with options
 * @param options - Hook configuration options
 * @param code - Function to execute after steps
 */
function AfterStep(options: IDefineTestStepHookOptions, code: TestStepHookFunction): void;
```

**Usage Examples:**

```typescript
import { AfterStep } from "@cucumber/cucumber";

// Take screenshot after failed steps
AfterStep(function (testStep) {
  if (testStep.result.status === 'FAILED' && this.browser) {
    this.attach(this.browser.screenshot(), 'image/png');
  }
});

// Performance monitoring
AfterStep(function (testStep) {
  const duration = testStep.result.duration?.nanos || 0;
  if (duration > 5000000000) { // 5 seconds in nanoseconds
    console.warn(`Slow step detected: ${testStep.pickleStep.text} took ${duration/1000000}ms`);
  }
});
```

## Types

```typescript { .api }
type TestCaseHookFunction<WorldType> = (this: WorldType, arg: ITestCaseHookParameter) => any | Promise<any>;
type TestStepHookFunction<WorldType> = (this: WorldType, arg: ITestStepHookParameter) => any | Promise<any>;
type TestRunHookFunction = (this: { parameters: JsonObject }) => any | Promise<any>;

interface IDefineTestCaseHookOptions {
  /** Optional name for the hook */
  name?: string;
  /** Tag expression to filter scenarios */
  tags?: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

interface IDefineTestStepHookOptions {
  /** Optional name for the hook */
  name?: string;
  /** Tag expression to filter scenarios */
  tags?: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

interface IDefineTestRunHookOptions {
  /** Optional name for the hook */
  name?: string;
  /** Timeout in milliseconds */
  timeout?: number;
}

interface ITestCaseHookParameter {
  /** Parsed Gherkin document */
  gherkinDocument: messages.GherkinDocument;
  /** Test scenario being executed */
  pickle: messages.Pickle;
  /** Test result (available in After hooks) */
  result?: messages.TestStepResult;
  /** Error information if test failed */
  error?: any;
  /** Whether test will be retried after failure */
  willBeRetried?: boolean;
  /** Unique ID for this test case execution */
  testCaseStartedId: string;
}

interface ITestStepHookParameter {
  /** Parsed Gherkin document */
  gherkinDocument: messages.GherkinDocument;
  /** Test scenario being executed */
  pickle: messages.Pickle;
  /** Individual step being executed */
  pickleStep: messages.PickleStep;
  /** Step execution result */
  result: messages.TestStepResult;
  /** Error information if step failed */
  error?: any;
  /** Unique ID for this test case execution */
  testCaseStartedId: string;
  /** Unique ID for this step execution */
  testStepId: string;
}
```