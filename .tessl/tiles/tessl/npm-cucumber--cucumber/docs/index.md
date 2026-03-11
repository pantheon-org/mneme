# Cucumber.js

Cucumber.js is the official JavaScript implementation of Cucumber, a behavior-driven development (BDD) testing framework that enables automated tests to be written in plain language using the Gherkin syntax. This comprehensive testing library allows teams to write feature specifications in natural language that can be understood by both technical and non-technical stakeholders, promoting better communication and collaboration.

## Package Information

- **Package Name**: @cucumber/cucumber
- **Package Type**: npm
- **Language**: TypeScript/JavaScript
- **Installation**: `npm install @cucumber/cucumber`

## Core Imports

```typescript
import { 
  Given, When, Then, Before, After, BeforeAll, AfterAll, BeforeStep, AfterStep,
  DataTable, World, defineStep, defineParameterType, setDefaultTimeout,
  setWorldConstructor, setDefinitionFunctionWrapper, setParallelCanAssign,
  Formatter, FormatterBuilder, JsonFormatter, ProgressFormatter, RerunFormatter,
  SnippetsFormatter, SummaryFormatter, UsageFormatter, UsageJsonFormatter,
  formatterHelpers, parallelCanAssignHelpers, supportCodeLibraryBuilder,
  wrapPromiseWithTimeout, TestCaseHookDefinition,
  Status, version, world, context
} from "@cucumber/cucumber";
```

For CommonJS:

```javascript
const { 
  Given, When, Then, Before, After, BeforeAll, AfterAll, BeforeStep, AfterStep,
  DataTable, World, defineStep, defineParameterType, setDefaultTimeout,
  setWorldConstructor, setDefinitionFunctionWrapper, setParallelCanAssign,
  Formatter, FormatterBuilder, JsonFormatter, ProgressFormatter, RerunFormatter,
  SnippetsFormatter, SummaryFormatter, UsageFormatter, UsageJsonFormatter,
  formatterHelpers, parallelCanAssignHelpers, supportCodeLibraryBuilder,
  wrapPromiseWithTimeout, TestCaseHookDefinition,
  Status, version, world, context
} = require("@cucumber/cucumber");
```

For programmatic API usage:

```typescript
import { 
  runCucumber, loadConfiguration, loadSources, loadSupport,
  IRunOptions, IRunResult, ILoadConfigurationOptions, IResolvedConfiguration,
  ILoadSourcesResult, ILoadSupportOptions, ISupportCodeLibrary
} from "@cucumber/cucumber/api";
```

## Basic Usage

```typescript
import { Given, When, Then, Before, After, DataTable } from "@cucumber/cucumber";

// Step definitions
Given('I have {int} cucumbers', function (count: number) {
  this.cucumberCount = count;
});

When('I eat {int} cucumbers', function (count: number) {
  this.cucumberCount -= count;
});

Then('I should have {int} cucumbers', function (expected: number) {
  if (this.cucumberCount !== expected) {
    throw new Error(`Expected ${expected}, but got ${this.cucumberCount}`);
  }
});

// Hooks
Before(function () {
  this.cucumberCount = 0;
});

After(function () {
  // Cleanup after each test
});
```

## Architecture

Cucumber.js is built around several key components:

- **Step Definition System**: Pattern matching functions (Given/When/Then) that connect Gherkin steps to JavaScript code
- **Hook System**: Before/After hooks for test setup and teardown at multiple levels (scenario, step, suite)
- **World Object**: Test context object that maintains state between steps within a scenario
- **Data Tables**: Structured data handling for complex test inputs via Gherkin tables
- **Formatter System**: Extensible output formatting for different reporting needs (JSON, HTML, custom)
- **Programmatic API**: Functions for running Cucumber tests programmatically and loading configurations
- **Configuration System**: Flexible configuration via files, CLI options, and programmatic settings
- **Parallel Execution**: Support for running tests in parallel with assignment control

## Capabilities

### Step Definitions

Core functions for defining test steps that match Gherkin language patterns and execute corresponding JavaScript code.

```typescript { .api }
function Given<WorldType = IWorld>(pattern: string | RegExp, code: TestStepFunction<WorldType>): void;
function Given<WorldType = IWorld>(pattern: string | RegExp, options: IDefineStepOptions, code: TestStepFunction<WorldType>): void;
function When<WorldType = IWorld>(pattern: string | RegExp, code: TestStepFunction<WorldType>): void;
function When<WorldType = IWorld>(pattern: string | RegExp, options: IDefineStepOptions, code: TestStepFunction<WorldType>): void;
function Then<WorldType = IWorld>(pattern: string | RegExp, code: TestStepFunction<WorldType>): void;
function Then<WorldType = IWorld>(pattern: string | RegExp, options: IDefineStepOptions, code: TestStepFunction<WorldType>): void;
function defineStep<WorldType = IWorld>(pattern: string | RegExp, code: TestStepFunction<WorldType>): void;
function defineStep<WorldType = IWorld>(pattern: string | RegExp, options: IDefineStepOptions, code: TestStepFunction<WorldType>): void;
```

[Step Definitions](./step-definitions.md)

### Hook System

Lifecycle hooks for test setup and teardown at scenario, step, and suite levels with support for conditional execution.

```typescript { .api }
function Before<WorldType = IWorld>(code: TestCaseHookFunction<WorldType>): void;
function Before<WorldType = IWorld>(tags: string, code: TestCaseHookFunction<WorldType>): void;
function Before<WorldType = IWorld>(options: IDefineTestCaseHookOptions, code: TestCaseHookFunction<WorldType>): void;
function After<WorldType = IWorld>(code: TestCaseHookFunction<WorldType>): void;
function After<WorldType = IWorld>(tags: string, code: TestCaseHookFunction<WorldType>): void;
function After<WorldType = IWorld>(options: IDefineTestCaseHookOptions, code: TestCaseHookFunction<WorldType>): void;
function BeforeAll(code: TestRunHookFunction): void;
function AfterAll(code: TestRunHookFunction): void;
function BeforeStep<WorldType = IWorld>(code: TestStepHookFunction<WorldType>): void;
function AfterStep<WorldType = IWorld>(code: TestStepHookFunction<WorldType>): void;
```

[Hooks](./hooks.md)

### World and Context

Test context management system providing state sharing between steps and access to test metadata.

```typescript { .api }
class World<ParametersType = any> implements IWorld<ParametersType> {
  constructor({ attach, log, link, parameters }: IWorldOptions<ParametersType>);
  readonly attach: ICreateAttachment;
  readonly log: ICreateLog;
  readonly link: ICreateLink;
  readonly parameters: ParametersType;
}

interface IWorld<ParametersType = any> {
  readonly attach: ICreateAttachment;
  readonly log: ICreateLog;
  readonly link: ICreateLink;
  readonly parameters: ParametersType;
  [key: string]: any;
}

interface IWorldOptions<ParametersType = any> {
  attach: ICreateAttachment;
  log: ICreateLog;
  link: ICreateLink;
  parameters: ParametersType;
}

const world: IWorld;
const context: IContext;
```

[World and Context](./world-context.md)

### Data Handling

Utilities for working with structured test data including Gherkin data tables and parameter types.

```typescript { .api }
class DataTable {
  constructor(sourceTable: messages.PickleTable | string[][]);
  hashes(): Record<string, string>[];
  raw(): string[][];
  rows(): string[][];
  rowsHash(): Record<string, string>;
  transpose(): DataTable;
}

function defineParameterType<T>(options: IParameterTypeDefinition<T>): void;
```

[Data Handling](./data-handling.md)

### Formatters

Extensible output formatting system for generating test reports in various formats including JSON, HTML, and custom formats.

```typescript { .api }
abstract class Formatter {
  constructor(options: IFormatterOptions);
  abstract handleMessage(message: Envelope): void;
}

class JsonFormatter extends Formatter;
class ProgressFormatter extends Formatter;
class SummaryFormatter extends Formatter;
class UsageFormatter extends Formatter;
```

[Formatters](./formatters.md)

### Programmatic API

Functions for running Cucumber tests programmatically, loading configurations, and integrating with build tools and IDEs.

```typescript { .api }
function runCucumber(
  options: IRunOptions,
  environment?: IRunEnvironment,
  onMessage?: (message: Envelope) => void
): Promise<IRunResult>;

function loadConfiguration(
  options?: ILoadConfigurationOptions,
  environment?: IRunEnvironment
): Promise<IResolvedConfiguration>;

function loadSources(
  coordinates: ISourcesCoordinates,
  environment?: IRunEnvironment
): Promise<ILoadSourcesResult>;

function loadSupport(
  options: ILoadSupportOptions,
  environment?: IRunEnvironment
): Promise<ISupportCodeLibrary>;
```

[Programmatic API](./programmatic-api.md)

### Parallel Execution Helpers

Utilities for controlling parallel test execution and assignment validation.

```typescript { .api }
function atMostOnePicklePerTag(tagNames: string[]): ParallelAssignmentValidator;

interface ParallelAssignmentValidator {
  (inQuestion: messages.Pickle, inProgress: messages.Pickle[]): boolean;
}

const parallelCanAssignHelpers: {
  atMostOnePicklePerTag: typeof atMostOnePicklePerTag;
};
```

### Time Utilities

Promise timeout wrapper and time-related helper functions.

```typescript { .api }
function wrapPromiseWithTimeout<T>(
  promise: Promise<T>,
  timeoutInMilliseconds: number,
  timeoutMessage?: string
): Promise<T>;
```

### Support Code Library Builder

Core support code library construction and management.

```typescript { .api }
const supportCodeLibraryBuilder: {
  methods: {
    After: typeof After;
    AfterAll: typeof AfterAll;
    AfterStep: typeof AfterStep;
    Before: typeof Before;
    BeforeAll: typeof BeforeAll;
    BeforeStep: typeof BeforeStep;
    defineStep: typeof defineStep;
    defineParameterType: typeof defineParameterType;
    Given: typeof Given;
    setDefaultTimeout: typeof setDefaultTimeout;
    setDefinitionFunctionWrapper: typeof setDefinitionFunctionWrapper;
    setWorldConstructor: typeof setWorldConstructor;
    setParallelCanAssign: typeof setParallelCanAssign;
    Then: typeof Then;
    When: typeof When;
  };
};
```

### Formatter Helpers

Collection of utilities for custom formatter development.

```typescript { .api }
const formatterHelpers: {
  EventDataCollector: typeof EventDataCollector;
  parseTestCaseAttempt: (messages: Envelope[]) => TestCaseAttempt;
  formatLocation: (location: Location) => string;
  formatSummary: (summary: TestSummary) => string;
  formatDuration: (duration: Duration) => string;
  formatIssue: (issue: TestIssue) => string;
};
```

### Configuration

Configuration system supporting profiles, CLI options, and programmatic settings for customizing test execution behavior.

```typescript { .api }
interface IConfiguration {
  paths?: string[];
  backtrace?: boolean;
  dryRun?: boolean;
  failFast?: boolean;
  format?: string[];
  formatOptions?: { [key: string]: any };
  parallel?: number;
  profiles?: IProfiles;
  require?: string[];
  requireModule?: string[];
  tags?: string;
  worldParameters?: { [key: string]: any };
}

interface IProfiles {
  [profileName: string]: Partial<IConfiguration>;
}
```

[Configuration](./configuration.md)

## Global Constants

```typescript { .api }
const Status: typeof messages.TestStepResultStatus;

const version: string;

class TestCaseHookDefinition;
```

## Types

```typescript { .api }
type TestStepFunction<WorldType> = (this: WorldType, ...args: any[]) => any | Promise<any>;
type TestCaseHookFunction<WorldType> = (this: WorldType, arg: ITestCaseHookParameter) => any | Promise<any>;
type TestStepHookFunction<WorldType> = (this: WorldType, arg: ITestStepHookParameter) => any | Promise<any>;
type TestRunHookFunction = (this: { parameters: JsonObject }) => any | Promise<any>;

interface IDefineStepOptions {
  timeout?: number;
  wrapperOptions?: any;
}

interface IDefineTestCaseHookOptions {
  name?: string;
  tags?: string;
  timeout?: number;
}

interface ITestCaseHookParameter {
  gherkinDocument: messages.GherkinDocument;
  pickle: messages.Pickle;
  result?: messages.TestStepResult;
  error?: any;
  willBeRetried?: boolean;
  testCaseStartedId: string;
}

interface ITestStepHookParameter {
  gherkinDocument: messages.GherkinDocument;
  pickle: messages.Pickle;
  pickleStep: messages.PickleStep;
  result: messages.TestStepResult;
  error?: any;
  testCaseStartedId: string;
  testStepId: string;
}

interface IParameterTypeDefinition<T> {
  name: string;
  regexp: readonly RegExp[] | readonly string[] | RegExp | string;
  transformer?: (...match: string[]) => T;
  useForSnippets?: boolean;
  preferForRegexpMatch?: boolean;
}
```