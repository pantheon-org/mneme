# Formatters

Formatters control how Cucumber test results are output and reported. Cucumber.js provides built-in formatters for various output formats and supports custom formatter development.

## Capabilities

### Base Formatter Class

Abstract base class for creating custom formatters.

```typescript { .api }
/**
 * Base class for all formatters
 */
class Formatter {
  /**
   * Create a formatter instance
   * @param options - Formatter configuration options
   */
  constructor(options: IFormatterOptions);
  
  /**
   * Called when formatter should clean up and finalize output
   */
  async finished(): Promise<void>;
  
  /** Color functions for output styling */
  protected readonly colorFns: IColorFns;
  /** Current working directory */
  protected readonly cwd: string;
  /** Event data collector for tracking test state */
  protected readonly eventDataCollector: EventDataCollector;
  /** Log function for output */
  protected readonly log: IFormatterLogFn;
  /** Snippet builder for generating step snippets */
  protected readonly snippetBuilder: StepDefinitionSnippetBuilder;
  /** Output stream */
  protected readonly stream: Writable;
  /** Support code library */
  protected readonly supportCodeLibrary: SupportCodeLibrary;
  /** Whether to print attachments */
  protected readonly printAttachments: boolean;
}
```

**Custom Formatter Example:**

```typescript
import { Formatter, IFormatterOptions } from "@cucumber/cucumber";

class CustomFormatter extends Formatter {
  constructor(options: IFormatterOptions) {
    super(options);
    this.testResults = [];
  }
  
  handleMessage(message) {
    switch (message.type) {
      case 'testCaseStarted':
        this.log(`Starting: ${message.testCaseStarted.pickleId}`);
        break;
      case 'testCaseFinished':
        this.testResults.push({
          id: message.testCaseFinished.testCaseStartedId,
          status: message.testCaseFinished.result.status
        });
        break;
      case 'testRunFinished':
        this.outputResults();
        break;
    }
  }
  
  outputResults() {
    const summary = this.testResults.reduce((acc, result) => {
      acc[result.status] = (acc[result.status] || 0) + 1;
      return acc;
    }, {});
    
    this.log('\n=== Test Summary ===');
    Object.entries(summary).forEach(([status, count]) => {
      this.log(`${status}: ${count}`);
    });
  }
}
```

### Built-in Formatters

Pre-built formatters for common output needs.

```typescript { .api }
/**
 * JSON formatter - outputs detailed test results as JSON
 */
class JsonFormatter extends Formatter {
  constructor(options: IFormatterOptions);
}

/**
 * Progress formatter - shows test progress with dots/F/P indicators
 */
class ProgressFormatter extends Formatter {
  constructor(options: IFormatterOptions);
}

/**
 * Rerun formatter - outputs commands to rerun failed scenarios
 */
class RerunFormatter extends Formatter {
  constructor(options: IFormatterOptions);
}

/**
 * Snippets formatter - outputs code snippets for undefined steps
 */
class SnippetsFormatter extends Formatter {
  constructor(options: IFormatterOptions);
}

/**
 * Summary formatter - outputs test execution summary
 */
class SummaryFormatter extends Formatter {
  constructor(options: IFormatterOptions);
}

/**
 * Usage formatter - shows step definition usage statistics
 */
class UsageFormatter extends Formatter {
  constructor(options: IFormatterOptions);
}

/**
 * Usage JSON formatter - outputs usage statistics as JSON
 */
class UsageJsonFormatter extends Formatter {
  constructor(options: IFormatterOptions);
}
```

**Usage Examples:**

```javascript
// Command line usage
npx cucumber-js --format json --format progress --format summary

// Programmatic usage
import { runCucumber } from "@cucumber/cucumber/api";

const result = await runCucumber({
  sources: { paths: ['features/**/*.feature'] },
  support: { requireModules: ['ts-node/register'] },
  format: [
    'json:reports/results.json',
    'html:reports/results.html',
    'progress'
  ]
});
```

### Formatter Builder

Utility for building and registering formatters.

```typescript { .api }
/**
 * Builder for creating and registering formatters
 */
class FormatterBuilder {
  /**
   * Create a formatter builder
   * @param options - Builder configuration options
   */
  constructor(options: IFormatterBuilderOptions);
  
  /**
   * Build formatters based on configuration
   * @returns Array of formatter instances
   */
  build(): Formatter[];
}

interface IFormatterBuilderOptions {
  cwd: string;
  stdout: WriteStream;
  stderr: WriteStream;
  env: { [key: string]: string };
  eventBroadcaster: EventEmitter;
  eventDataCollector: EventDataCollector;
  supportCodeLibrary: ISupportCodeLibrary;
  onStreamError: () => void;
}
```

### Formatter Helpers

Collection of utility functions for formatter development.

```typescript { .api }
/**
 * Formatter helper utilities
 */
const formatterHelpers: {
  /**
   * Event data collector for tracking test execution state
   */
  EventDataCollector: typeof EventDataCollector;
  
  /**
   * Parse test case attempt from messages
   */
  parseTestCaseAttempt: (messages: Envelope[]) => TestCaseAttempt;
  
  /**
   * Format location information for display
   */
  formatLocation: (location: Location) => string;
  
  /**
   * Format test summary for display
   */
  formatSummary: (summary: TestSummary) => string;
  
  /**
   * Format duration for display
   */
  formatDuration: (duration: Duration) => string;
  
  /**
   * Format issue information
   */
  formatIssue: (issue: TestIssue) => string;
};
```

**Helper Usage Examples:**

```typescript
import { Formatter, formatterHelpers } from "@cucumber/cucumber";

class DetailedFormatter extends Formatter {
  constructor(options) {
    super(options);
    this.eventDataCollector = new formatterHelpers.EventDataCollector();
  }
  
  handleMessage(message) {
    this.eventDataCollector.parseEnvelope(message);
    
    if (message.testCaseFinished) {
      const testCaseAttempt = this.eventDataCollector.getTestCaseAttempt(
        message.testCaseFinished.testCaseStartedId
      );
      
      const location = formatterHelpers.formatLocation(testCaseAttempt.pickle.location);
      const duration = formatterHelpers.formatDuration(message.testCaseFinished.result.duration);
      
      this.log(`${testCaseAttempt.pickle.name} at ${location} (${duration})`);
      
      if (message.testCaseFinished.result.status === 'FAILED') {
        const issue = formatterHelpers.formatIssue({
          exception: message.testCaseFinished.result.exception,
          location: testCaseAttempt.pickle.location
        });
        this.log(`  FAILED: ${issue}`);
      }
    }
  }
}
```

### Message Types

Key message types that formatters receive during test execution.

**Message Handling Examples:**

```typescript
import { Formatter } from "@cucumber/cucumber";

class MessageHandlingFormatter extends Formatter {
  handleMessage(message) {
    switch (message.type) {
      case 'testRunStarted':
        this.log('=== Test Run Started ===');
        break;
        
      case 'testCaseStarted':
        const scenario = this.getScenarioName(message.testCaseStarted.pickleId);
        this.log(`Starting: ${scenario}`);
        break;
        
      case 'testStepStarted':
        // Track individual step execution
        break;
        
      case 'testStepFinished':
        const step = this.getStepText(message.testStepFinished.testStepId);
        const status = message.testStepFinished.result.status;
        this.log(`  ${status}: ${step}`);
        
        if (status === 'FAILED' && message.testStepFinished.result.exception) {
          this.log(`    Error: ${message.testStepFinished.result.exception.message}`);
        }
        break;
        
      case 'testCaseFinished':
        const result = message.testCaseFinished.result;
        this.log(`Finished: ${result.status} (${this.formatDuration(result.duration)})`);
        break;
        
      case 'testRunFinished':
        this.log('=== Test Run Finished ===');
        this.outputSummary();
        break;
        
      case 'attachment':
        // Handle file attachments from World.attach()
        this.handleAttachment(message.attachment);
        break;
    }
  }
  
  handleAttachment(attachment) {
    if (attachment.mediaType === 'image/png') {
      this.log(`📷 Screenshot attached: ${attachment.data.length} bytes`);
    } else if (attachment.mediaType === 'text/plain') {
      this.log(`📝 Log: ${attachment.data}`);
    }
  }
}
```

### Configuration Options

Options for configuring formatter behavior.

**Configuration Examples:**

```typescript
// Via configuration file (cucumber.js)
module.exports = {
  format: [
    'json:reports/cucumber-report.json',
    'html:reports/cucumber-report.html',
    ['progress', { theme: 'minimal' }],
    ['@cucumber/pretty-formatter', { theme: 'minimal' }]
  ],
  formatOptions: {
    snippetInterface: 'async-await',
    snippetSyntax: 'typescript'
  }
};

// Via CLI
// npx cucumber-js --format json:report.json --format-options '{"theme":"dark"}'

// Programmatically
import { runCucumber } from "@cucumber/cucumber/api";

await runCucumber({
  format: ['json:report.json', 'progress'],
  formatOptions: {
    colorsEnabled: true,
    theme: 'minimal'
  }
});
```

## Types

```typescript { .api }
interface IFormatterOptions {
  /** Event bus for receiving test messages */
  eventBroadcaster: EventEmitter;
  /** Output stream for formatter output */
  log: (text: string) => void;
  /** Options passed to formatter */
  parsedArgvOptions: any;
  /** Support code library information */
  supportCodeLibrary: ISupportCodeLibrary;
  /** Color support configuration */
  colorFns: ColorFns;
  /** Snippet generation interface */
  snippetBuilder: SnippetBuilder;
  /** Stream for formatter output */
  stream: WriteStream;
}

interface ColorFns {
  forStatus(status: string): (text: string) => string;
  location: (text: string) => string;
  tag: (text: string) => string;
}

interface TestSummary {
  passed: number;
  failed: number;
  skipped: number;
  pending: number;
  ambiguous: number;
  undefined: number;
  duration: Duration;
}
```