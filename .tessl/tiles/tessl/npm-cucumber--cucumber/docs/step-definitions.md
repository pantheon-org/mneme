# Step Definitions

Step definitions are functions that connect Gherkin steps to JavaScript code. They define the implementation behind natural language test steps like "Given I have 5 cucumbers" or "When I click the login button".

## Capabilities

### Given Step Definition

Defines the initial context or preconditions for a test scenario.

```typescript { .api }
/**
 * Define a Given step for setting up test preconditions
 * @param pattern - String or RegExp pattern to match Gherkin steps
 * @param code - Function to execute when step matches
 */
function Given<WorldType = IWorld>(pattern: string | RegExp, code: TestStepFunction<WorldType>): void;

/**
 * Define a Given step with options
 * @param pattern - String or RegExp pattern to match Gherkin steps  
 * @param options - Step definition options
 * @param code - Function to execute when step matches
 */
function Given<WorldType = IWorld>(pattern: string | RegExp, options: IDefineStepOptions, code: TestStepFunction<WorldType>): void;
```

**Usage Examples:**

```typescript
import { Given } from "@cucumber/cucumber";

// Simple Given step
Given('I have {int} cucumbers', function (count: number) {
  this.cucumberCount = count;
});

// Given step with timeout option
Given('I wait for the slow database', { timeout: 10000 }, function () {
  return this.database.slowQuery();
});

// Given step with table data
Given('I have the following users:', function (dataTable: DataTable) {
  this.users = dataTable.hashes();
});
```

### When Step Definition

Defines actions or events that trigger the behavior being tested.

```typescript { .api }
/**
 * Define a When step for triggering actions
 * @param pattern - String or RegExp pattern to match Gherkin steps
 * @param code - Function to execute when step matches
 */
function When<WorldType = IWorld>(pattern: string | RegExp, code: TestStepFunction<WorldType>): void;

/**
 * Define a When step with options
 * @param pattern - String or RegExp pattern to match Gherkin steps
 * @param options - Step definition options  
 * @param code - Function to execute when step matches
 */
function When<WorldType = IWorld>(pattern: string | RegExp, options: IDefineStepOptions, code: TestStepFunction<WorldType>): void;
```

**Usage Examples:**

```typescript
import { When } from "@cucumber/cucumber";

// Simple When step
When('I eat {int} cucumbers', function (count: number) {
  this.cucumberCount -= count;
});

// When step with async operation
When('I submit the form', async function () {
  this.response = await this.browser.submitForm('#user-form');
});

// When step with string parameter
When('I search for {string}', function (searchTerm: string) {
  this.searchResults = this.searchEngine.search(searchTerm);
});
```

### Then Step Definition

Defines expected outcomes and assertions for verification.

```typescript { .api }
/**
 * Define a Then step for verifying outcomes
 * @param pattern - String or RegExp pattern to match Gherkin steps
 * @param code - Function to execute when step matches
 */
function Then<WorldType = IWorld>(pattern: string | RegExp, code: TestStepFunction<WorldType>): void;

/**
 * Define a Then step with options
 * @param pattern - String or RegExp pattern to match Gherkin steps
 * @param options - Step definition options
 * @param code - Function to execute when step matches  
 */
function Then<WorldType = IWorld>(pattern: string | RegExp, options: IDefineStepOptions, code: TestStepFunction<WorldType>): void;
```

**Usage Examples:**

```typescript
import { Then } from "@cucumber/cucumber";

// Simple Then step with assertion
Then('I should have {int} cucumbers', function (expected: number) {
  if (this.cucumberCount !== expected) {
    throw new Error(`Expected ${expected}, but got ${this.cucumberCount}`);
  }
});

// Then step verifying response
Then('the response should be successful', function () {
  if (this.response.status !== 200) {
    throw new Error(`Expected status 200, got ${this.response.status}`);
  }
});

// Then step with table verification
Then('the search results should contain:', function (dataTable: DataTable) {
  const expectedResults = dataTable.hashes();
  expectedResults.forEach(expected => {
    const found = this.searchResults.find(result => 
      result.title === expected.title && result.url === expected.url
    );
    if (!found) {
      throw new Error(`Expected result not found: ${JSON.stringify(expected)}`);
    }
  });
});
```

### Generic Step Definition

Defines a step that can be used with any Gherkin keyword (Given/When/Then).

```typescript { .api }
/**
 * Define a generic step for any Gherkin keyword
 * @param pattern - String or RegExp pattern to match Gherkin steps
 * @param code - Function to execute when step matches
 */
function defineStep<WorldType = IWorld>(pattern: string | RegExp, code: TestStepFunction<WorldType>): void;

/**
 * Define a generic step with options
 * @param pattern - String or RegExp pattern to match Gherkin steps
 * @param options - Step definition options
 * @param code - Function to execute when step matches
 */
function defineStep<WorldType = IWorld>(pattern: string | RegExp, options: IDefineStepOptions, code: TestStepFunction<WorldType>): void;
```

**Usage Examples:**

```typescript
import { defineStep } from "@cucumber/cucumber";

// Generic step usable with any keyword
defineStep('the system is ready', function () {
  this.systemReady = true;
});

// Can be used as:
// Given the system is ready
// When the system is ready  
// Then the system is ready
```

### Configuration Functions

Functions to configure step definition behavior globally.

```typescript { .api }
/**
 * Set default timeout for all step definitions
 * @param milliseconds - Timeout in milliseconds
 */
function setDefaultTimeout(milliseconds: number): void;

/**
 * Set a wrapper function for all step/hook definitions
 * @param fn - Wrapper function that receives the original function
 */
function setDefinitionFunctionWrapper(fn: Function): void;
```

**Usage Examples:**

```typescript
import { setDefaultTimeout, setDefinitionFunctionWrapper } from "@cucumber/cucumber";

// Set 30 second default timeout
setDefaultTimeout(30000);

// Add error handling wrapper
setDefinitionFunctionWrapper(function (originalFunction) {
  return function (...args) {
    try {
      return originalFunction.apply(this, args);
    } catch (error) {
      // Log error details
      console.error('Step failed:', error);
      throw error;
    }
  };
});
```

## Types

```typescript { .api }
type TestStepFunction<WorldType> = (this: WorldType, ...args: any[]) => any | Promise<any>;

interface IDefineStepOptions {
  /** Timeout in milliseconds for this step */
  timeout?: number;
  /** Additional options passed to wrapper functions */
  wrapperOptions?: any;
}
```