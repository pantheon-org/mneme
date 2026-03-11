# World and Context

The World object provides test context and state management, allowing data sharing between steps within a scenario. It also provides utilities for attaching files, logging, and accessing test parameters.

## Capabilities

### World Class

The default World implementation providing basic context and utility methods.

```typescript { .api }
/**
 * Default World class providing test context and utilities
 */
class World<ParametersType = any> implements IWorld<ParametersType> {
  /** 
   * Create a new World instance
   * @param options - World configuration options
   */
  constructor({ attach, log, link, parameters }: IWorldOptions<ParametersType>);
  
  /** Attach data to the test report (files, screenshots, logs) */
  readonly attach: ICreateAttachment;
  
  /** Log text to the test report */
  readonly log: ICreateLog;
  
  /** Add a link to the test report */
  readonly link: ICreateLink;
  
  /** Test parameters passed from configuration */
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
```

**Usage Examples:**

```typescript
import { Given, When, Then, World } from "@cucumber/cucumber";

// Using the default World in steps
Given('I have a test context', function () {
  // 'this' refers to the World instance
  this.testData = { started: true };
  this.log('Test context initialized');
});

When('I perform an action', function () {
  this.actionResult = 'success';
  this.log(`Action performed: ${this.actionResult}`);
});

Then('I can access the shared state', function () {
  if (!this.testData.started) {
    throw new Error('Test context not initialized');
  }
  
  if (this.actionResult !== 'success') {
    throw new Error('Action was not successful');
  }
  
  // Attach evidence to report
  this.attach(JSON.stringify(this.testData), 'application/json');
});
```

### Custom World Constructor

Define a custom World class with additional properties and methods.

```typescript { .api }
/**
 * Set a custom World constructor
 * @param fn - Constructor function for custom World class
 */
function setWorldConstructor(fn: any): void;
```

**Usage Examples:**

```typescript
import { setWorldConstructor, World } from "@cucumber/cucumber";

// Define custom World class
class CustomWorld extends World {
  constructor(options) {
    super(options);
    this.browser = null;
    this.database = null;
    this.apiClient = new ApiClient(this.parameters.apiUrl);
  }
  
  async openBrowser() {
    this.browser = await launchBrowser();
    this.log('Browser opened');
  }
  
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.log('Browser closed');
    }
  }
  
  async connectDatabase() {
    this.database = new Database(this.parameters.dbUrl);
    await this.database.connect();
    this.log('Database connected');
  }
}

// Set the custom World constructor
setWorldConstructor(CustomWorld);

// Now all steps have access to custom methods
Given('I open a browser', async function () {
  await this.openBrowser();
});

Given('I connect to the database', async function () {
  await this.connectDatabase();
});
```

### World Proxy

Global proxy to access the current World instance.

```typescript { .api }
/** Proxy to current World instance (worldProxy) */
const world: IWorld;
```

**Usage Examples:**

```typescript
import { world } from "@cucumber/cucumber";

// Access World from outside step definitions
function helperFunction() {
  world.log('Helper function called');
  return world.parameters.testConfig;
}
```

### Context Proxy

Global proxy to access the current test context.

```typescript { .api }
/** Proxy to current context (contextProxy) */
const context: IContext;
```

**Usage Examples:**

```typescript
import { context } from "@cucumber/cucumber";

// Access context information
function getCurrentScenario() {
  return context.currentScenario;
}
```

### Attachment and Logging

Methods for adding evidence and information to test reports.

**Attachment Examples:**

```typescript
import { Given, After } from "@cucumber/cucumber";

Given('I take a screenshot', async function () {
  if (this.browser) {
    const screenshot = await this.browser.screenshot();
    this.attach(screenshot, 'image/png');
  }
});

Given('I save test data', function () {
  const testData = {
    timestamp: new Date().toISOString(),
    scenario: 'User login test',
    data: this.userData
  };
  
  this.attach(JSON.stringify(testData, null, 2), 'application/json');
});

After(function (testCase) {
  // Attach logs on failure
  if (testCase.result?.status === 'FAILED') {
    this.attach('Test failed - see details above', 'text/plain');
    
    // Attach browser logs if available
    if (this.browser && this.browser.logs) {
      this.attach(JSON.stringify(this.browser.logs), 'application/json');
    }
  }
});
```

**Logging Examples:**

```typescript
import { Given, When, Then } from "@cucumber/cucumber";

Given('I start the user registration process', function () {
  this.log('=== Starting User Registration Test ===');
  this.log(`Test parameters: ${JSON.stringify(this.parameters)}`);
});

When('I fill in the registration form', function () {
  this.userData = {
    name: 'John Doe',
    email: 'john@example.com'
  };
  
  this.log(`Filling registration form with: ${JSON.stringify(this.userData)}`);
});

Then('the registration should be successful', function () {
  this.log('Verifying registration success...');
  
  if (this.registrationResult.success) {
    this.log('✓ Registration completed successfully');
  } else {
    this.log('✗ Registration failed');
    throw new Error('Registration was not successful');
  }
});
```

**Link Examples:**

```typescript
import { Then } from "@cucumber/cucumber";

Then('I should see the user profile', function () {
  const profileUrl = `${this.parameters.baseUrl}/profile/${this.userId}`;
  this.link(profileUrl, 'User Profile');
  
  // Add multiple related links
  this.link(`${this.parameters.baseUrl}/settings`, 'User Settings');
  this.link(`${this.parameters.baseUrl}/history`, 'Activity History');
});
```

## Types

```typescript { .api }
interface IWorld {
  attach(data: string | Buffer, mediaType?: string): void;
  log(text: string): void;
  link(url: string, text?: string): void;
  parameters: { [key: string]: any };
}

interface IWorldOptions {
  attach: (data: string | Buffer, mediaType?: string) => void;
  log: (text: string) => void;
  link: (url: string, text?: string) => void;
  parameters: { [key: string]: any };
}

interface IContext {
  [key: string]: any;
}
```