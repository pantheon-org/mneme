# Configuration

Cucumber.js provides a flexible configuration system supporting profiles, CLI options, configuration files, and programmatic settings for customizing test execution behavior.

## Capabilities

### Configuration Interface

Main configuration interface defining all available options.

```typescript { .api }
/**
 * Main configuration interface for Cucumber.js
 */
interface IConfiguration {
  /** Paths to where your feature files are */
  paths: string[];
  /** Show the full backtrace for errors */
  backtrace: boolean;
  /** Perform a dry run, where a test run is prepared but nothing is executed */
  dryRun: boolean;
  /** Explicitly call process.exit() after the test run */
  forceExit: boolean;
  /** Stop running tests when a test fails */
  failFast: boolean;
  /** Name/path and (optionally) output file path of each formatter to use */
  format: Array<string | [string, string?]>;
  /** Options to be provided to formatters */
  formatOptions: JsonObject;
  /** Paths to where your support code is, for ES modules */
  import: string[];
  /** Default language for your feature files */
  language: string;
  /** Module specifier(s) for loaders to be registered ahead of loading support code */
  loader: string[];
  /** Regular expressions of which scenario names should match one of to be run */
  name: string[];
  /** Run in the order defined, or in a random order */
  order: IPickleOrder;
  /** Run tests in parallel with the given number of worker processes */
  parallel: number;
  /** Shard tests and execute only the selected shard, format `<index>/<total>` */
  shard: string;
  /** Publish a report of your test run to https://reports.cucumber.io/ */
  publish: boolean;
  /** Paths to where your support code is, for CommonJS */
  require: string[];
  /** Names of transpilation modules to load, via require() */
  requireModule: string[];
  /** Retry failing tests up to the given number of times */
  retry: number;
  /** Tag expression to filter which scenarios can be retried */
  retryTagFilter: string;
  /** Fail the test run if there are pending steps */
  strict: boolean;
  /** Tag expression to filter which scenarios should be run */
  tags: string;
  /** Parameters to be passed to your World */
  worldParameters: JsonObject;
}
```

**Configuration Examples:**

```javascript
// cucumber.js configuration file
module.exports = {
  // Feature file locations
  paths: ['features/**/*.feature'],
  
  // Require TypeScript support
  requireModule: ['ts-node/register'],
  require: ['features/support/**/*.ts'],
  
  // Output formats
  format: [
    'progress',                           // Console progress
    'json:reports/cucumber-report.json',  // JSON report
    'html:reports/cucumber-report.html'   // HTML report
  ],
  
  // Formatter options
  formatOptions: {
    snippetInterface: 'async-await',
    snippetSyntax: 'typescript'
  },
  
  // Execution options
  parallel: 2,
  failFast: false,
  retry: 1,
  retryTagFilter: '@flaky',
  
  // Tag filtering
  tags: '@smoke and not @skip',
  
  // World parameters
  worldParameters: {
    apiUrl: 'https://api.staging.example.com',
    timeout: 30000,
    browser: 'chrome'
  },
  
  // Profile definitions
  profiles: {
    default: {
      parallel: 1,
      format: ['progress']
    },
    ci: {
      parallel: 4,
      format: ['json:reports/results.json'],
      tags: '@smoke',
      retry: 2
    },
    local: {
      parallel: 1,
      format: ['progress', 'html:reports/local.html'],
      tags: 'not @skip'
    }
  }
};
```

### Profiles System

Named configuration sets for different environments and scenarios.

```typescript { .api }
/**
 * Named configuration profiles
 */
type IProfiles = Record<string, Partial<IConfiguration>>;
```

**Profile Usage Examples:**

```javascript
// cucumber.js with multiple profiles
module.exports = {
  default: {
    require: ['features/support/**/*.js'],
    format: ['progress']
  },
  
  profiles: {
    // Development profile
    dev: {
      worldParameters: {
        apiUrl: 'http://localhost:3000',
        debugMode: true
      },
      format: ['progress'],
      tags: 'not @production-only'
    },
    
    // Staging environment
    staging: {
      worldParameters: {
        apiUrl: 'https://staging-api.example.com',
        timeout: 10000
      },
      parallel: 2,
      retry: 1,
      format: ['json:staging-results.json']
    },
    
    // Production smoke tests
    production: {
      worldParameters: {
        apiUrl: 'https://api.example.com',
        timeout: 5000
      },
      tags: '@smoke and @production-safe',
      failFast: true,
      format: ['json:production-smoke.json']
    },
    
    // Performance testing
    performance: {
      parallel: 8,
      tags: '@performance',
      worldParameters: {
        loadTestMode: true,
        concurrentUsers: 100
      },
      format: ['json:performance-results.json']
    },
    
    // Debug profile for troubleshooting
    debug: {
      parallel: 1,
      backtrace: true,
      format: ['progress'],
      worldParameters: {
        debugMode: true,
        logLevel: 'debug'
      }
    }
  }
};

// Usage:
// npx cucumber-js --profile staging
// npx cucumber-js --profile dev --profile debug
```

### Configuration Loading

Load configuration from files, environment, and command line.

**File-based Configuration:**

```javascript
// cucumber.json (JSON format)
{
  "default": {
    "require": ["features/support/**/*.js"],
    "format": ["progress", "json:reports/results.json"],
    "parallel": 2
  },
  "profiles": {
    "ci": {
      "tags": "@smoke",
      "format": ["json:ci-results.json"]
    }
  }
}

// cucumber.yaml (YAML format)
default:
  require:
    - 'features/support/**/*.js'
  format:
    - progress
    - 'json:reports/results.json'
  parallel: 2

profiles:
  ci:
    tags: '@smoke'
    format:
      - 'json:ci-results.json'

// cucumber.config.js (Advanced JavaScript)
const baseConfig = {
  require: ['features/support/**/*.ts'],
  requireModule: ['ts-node/register']
};

module.exports = {
  default: {
    ...baseConfig,
    format: ['progress']
  },
  
  profiles: {
    ci: {
      ...baseConfig,
      parallel: process.env.CI_PARALLEL_JOBS || 4,
      format: [`json:${process.env.CI_REPORTS_DIR}/results.json`],
      tags: process.env.CUCUMBER_TAGS || '@smoke',
      worldParameters: {
        apiUrl: process.env.API_URL,
        timeout: parseInt(process.env.API_TIMEOUT) || 30000
      }
    }
  }
};
```

### Command Line Options

Override configuration through CLI arguments.

**CLI Usage Examples:**

```bash
# Basic execution
npx cucumber-js

# Specify features and profiles
npx cucumber-js features/authentication.feature --profile staging

# Override specific options
npx cucumber-js \
  --require features/support/**/*.ts \
  --require-module ts-node/register \
  --format progress \
  --format json:results.json \
  --parallel 4 \
  --tags "@smoke and not @skip" \
  --retry 2 \
  --fail-fast

# Environment-specific execution
NODE_ENV=test npx cucumber-js --profile ci

# Debug mode
npx cucumber-js --backtrace --format progress --parallel 1

# Dry run for validation
npx cucumber-js --dry-run --format snippets
```

### World Parameters

Pass configuration data to test execution context.

**World Parameters Examples:**

```javascript
// In configuration
module.exports = {
  default: {
    worldParameters: {
      // API configuration
      apiUrl: process.env.API_URL || 'http://localhost:3000',
      apiKey: process.env.API_KEY,
      timeout: 30000,
      
      // Browser configuration
      browserOptions: {
        headless: process.env.HEADLESS !== 'false',
        viewport: { width: 1280, height: 720 },
        slowMo: process.env.SLOW_MO ? parseInt(process.env.SLOW_MO) : 0
      },
      
      // Database configuration
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        name: process.env.DB_NAME || 'test_db'
      },
      
      // Test data configuration
      testData: {
        defaultUser: {
          email: 'test@example.com',
          password: 'testpassword123'
        },
        dataPath: 'test-data/'
      }
    }
  }
};

// Access in World/step definitions
import { Given, setWorldConstructor } from "@cucumber/cucumber";

class CustomWorld {
  constructor({ parameters }) {
    this.apiUrl = parameters.apiUrl;
    this.apiKey = parameters.apiKey;
    this.timeout = parameters.timeout;
    this.browserOptions = parameters.browserOptions;
    this.database = parameters.database;
    this.testData = parameters.testData;
  }
  
  async initializeApiClient() {
    this.apiClient = new ApiClient({
      baseURL: this.apiUrl,
      timeout: this.timeout,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
  }
}

setWorldConstructor(CustomWorld);

// Use parameters in steps
Given('I connect to the API', async function () {
  await this.initializeApiClient();
  this.log(`Connected to API at ${this.apiUrl}`);
});
```

### Format Configuration

Configure output formatters and their options.

**Format Configuration Examples:**

```javascript
module.exports = {
  default: {
    format: [
      // Built-in formatters
      'progress',                                    // Console progress dots
      'summary',                                     // Test summary
      'snippets',                                    // Missing step snippets
      
      // File output
      'json:reports/cucumber-report.json',           // JSON report
      'html:reports/cucumber-report.html',           // HTML report
      'junit:reports/cucumber-junit.xml',            // JUnit XML
      'rerun:reports/rerun.txt',                     // Rerun commands
      
      // Custom formatters
      '@cucumber/pretty-formatter',                  // Pretty console output
      './custom-formatters/slack-formatter.js'      // Custom formatter
    ],
    
    formatOptions: {
      // Snippet generation options
      snippetInterface: 'async-await',
      snippetSyntax: 'typescript',
      
      // Color output
      colorsEnabled: true,
      
      // Custom formatter options
      theme: 'dark',
      includeSource: true,
      
      // Report customization
      reportTitle: 'Cucumber Test Results',
      metadata: {
        'Test Environment': 'Staging',
        'Browser': 'Chrome 91',
        'Platform': 'Ubuntu 20.04'
      }
    }
  }
};
```

### Publishing Configuration

Configure integration with Cucumber Reports service.

```typescript { .api }
/**
 * Configuration for Cucumber Reports publishing
 */
interface IPublishConfig {
  /** Reports service URL */
  url?: string;
  /** Authentication token */
  token?: string;
}
```

**Publishing Examples:**

```javascript
module.exports = {
  default: {
    // Simple publishing
    publish: true,  // Uses default Cucumber Reports service
    
    // Custom publishing configuration
    publish: {
      url: 'https://reports.cucumber.io',
      token: process.env.CUCUMBER_PUBLISH_TOKEN
    },
    
    profiles: {
      ci: {
        publish: process.env.CI === 'true',  // Only publish in CI
        format: ['json:reports/results.json']
      }
    }
  }
};

// Environment variable method
// CUCUMBER_PUBLISH_ENABLED=true npx cucumber-js
```

## Types

```typescript { .api }
interface IFormatConfiguration {
  /** Formatter type or module path */
  type: string;
  /** Output file path (optional) */
  outputTo?: string;
  /** Formatter-specific options */
  options?: { [key: string]: any };
}

interface IPickleOrder {
  /** Execution order type */
  order: 'defined' | 'random' | string;
  /** Random seed for reproducible random order */
  seed?: string;
}
```