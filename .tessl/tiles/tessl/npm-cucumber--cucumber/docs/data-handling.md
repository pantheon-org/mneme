# Data Handling

Cucumber.js provides utilities for working with structured test data, including Gherkin data tables and custom parameter types for step pattern matching.

## Capabilities

### DataTable Class

Handles tabular data from Gherkin feature files, providing multiple access patterns for different use cases.

```typescript { .api }
/**
 * Represents tabular data from Gherkin tables
 */
class DataTable {
  /**
   * Create a DataTable from PickleTable or raw string data
   * @param sourceTable - PickleTable from messages or array of arrays
   */
  constructor(sourceTable: messages.PickleTable | string[][]);
  
  /**
   * Convert table to array of objects using first row as keys
   * @returns Array of objects with column headers as keys
   */
  hashes(): Record<string, string>[];
  
  /**
   * Get raw table data as 2D array
   * @returns Array of arrays representing all rows including headers
   */
  raw(): string[][];
  
  /**
   * Get table data excluding header row
   * @returns Array of arrays with header row removed
   */
  rows(): string[][];
  
  /**
   * Convert two-column table to key-value object
   * @returns Object with first column as keys, second column as values
   */
  rowsHash(): Record<string, string>;
  
  /**
   * Transpose the table (swap rows and columns)
   * @returns New DataTable with transposed data
   */
  transpose(): DataTable;
}
```

**Usage Examples:**

```typescript
import { Given, DataTable } from "@cucumber/cucumber";

// Using hashes() for structured data
Given('I have the following users:', function (dataTable: DataTable) {
  const users = dataTable.hashes();
  // users = [
  //   { name: 'Alice', email: 'alice@example.com', role: 'admin' },
  //   { name: 'Bob', email: 'bob@example.com', role: 'user' }
  // ]
  
  this.users = users;
  this.log(`Loaded ${users.length} users`);
});

// Using raw() for complete table access
Given('I have a data matrix:', function (dataTable: DataTable) {
  const matrix = dataTable.raw();
  // matrix = [
  //   ['Name', 'Email', 'Role'],           // Header row
  //   ['Alice', 'alice@example.com', 'admin'],
  //   ['Bob', 'bob@example.com', 'user']
  // ]
  
  const headers = matrix[0];
  const data = matrix.slice(1);
  this.log(`Table has ${headers.length} columns and ${data.length} rows`);
});

// Using rows() for data without headers
Given('I have test scores:', function (dataTable: DataTable) {
  const scores = dataTable.rows();
  // scores = [
  //   ['85', '92', '78'],  // First data row (no headers)
  //   ['91', '88', '95']
  // ]
  
  this.testScores = scores.map(row => row.map(Number));
});

// Using rowsHash() for configuration data
Given('I have the following configuration:', function (dataTable: DataTable) {
  const config = dataTable.rowsHash();
  // config = {
  //   'api_url': 'https://api.example.com',
  //   'timeout': '5000',
  //   'retries': '3'
  // }
  
  this.config = {
    apiUrl: config.api_url,
    timeout: parseInt(config.timeout),
    retries: parseInt(config.retries)
  };
});

// Using transpose() for different data orientation
Given('I have monthly sales data:', function (dataTable: DataTable) {
  const transposed = dataTable.transpose();
  const data = transposed.hashes();
  // Original:  Jan | Feb | Mar
  //           100 | 150 | 200
  // 
  // Transposed becomes:
  // [{ Month: 'Jan', Sales: '100' },
  //  { Month: 'Feb', Sales: '150' },
  //  { Month: 'Mar', Sales: '200' }]
  
  this.salesData = data;
});
```

### Parameter Types

Define custom parameter types for matching and transforming step parameters.

```typescript { .api }
/**
 * Define a custom parameter type for step pattern matching
 * @param options - Parameter type definition options
 */
function defineParameterType<T>(options: IParameterTypeDefinition<T>): void;
```

**Usage Examples:**

```typescript
import { defineParameterType, Given } from "@cucumber/cucumber";

// Define a custom parameter type for users
defineParameterType({
  name: 'user',
  regexp: /Alice|Bob|Charlie/,
  transformer: function (name: string) {
    return {
      name: name,
      email: `${name.toLowerCase()}@example.com`
    };
  }
});

// Define parameter type with multiple regexes
defineParameterType({
  name: 'color',
  regexp: [/red|green|blue/, /\#[0-9a-fA-F]{6}/],
  transformer: function (colorString: string) {
    if (colorString.startsWith('#')) {
      return { type: 'hex', value: colorString };
    } else {
      return { type: 'name', value: colorString };
    }
  },
  useForSnippets: true,
  preferForRegexpMatch: true
});

// Define numeric parameter type with validation
defineParameterType({
  name: 'positiveInt',
  regexp: /\d+/,
  transformer: function (numString: string) {
    const num = parseInt(numString);
    if (num <= 0) {
      throw new Error(`Expected positive integer, got ${num}`);
    }
    return num;
  }
});

// Use custom parameter types in steps
Given('{user} logs into the system', function (user) {
  // user = { name: 'Alice', email: 'alice@example.com' }
  this.currentUser = user;
  this.log(`User ${user.name} (${user.email}) logging in`);
});

Given('I set the background color to {color}', function (color) {
  // color = { type: 'name', value: 'red' } or { type: 'hex', value: '#ff0000' }
  this.backgroundColor = color;
});

Given('I create {positiveInt} test records', function (count) {
  // count = 5 (validated to be positive)
  this.records = Array(count).fill(null).map(() => createTestRecord());
});
```

### Built-in Parameter Types

Cucumber.js includes several built-in parameter types for common data patterns.

**Usage Examples:**

```typescript
import { Given } from "@cucumber/cucumber";

// {int} - matches integers
Given('I have {int} items', function (count: number) {
  this.itemCount = count; // count is already a number
});

// {float} - matches decimal numbers  
Given('the price is {float} dollars', function (price: number) {
  this.price = price; // price is already a number
});

// {string} - matches quoted strings
Given('I search for {string}', function (searchTerm: string) {
  this.searchTerm = searchTerm; // quotes removed
});

// {word} - matches single words
Given('I select the {word} option', function (option: string) {
  this.selectedOption = option;
});

// Multiple parameters in one step
Given('I create {int} users with {string} role earning {float} salary', 
  function (count: number, role: string, salary: number) {
    this.users = Array(count).fill(null).map(() => ({
      role: role,
      salary: salary
    }));
  }
);
```

### Data Transformation Utilities

Helper functions for working with test data.

**Usage Examples:**

```typescript
import { Given, DataTable } from "@cucumber/cucumber";

// Transform table data with custom logic
Given('I have product inventory:', function (dataTable: DataTable) {
  const products = dataTable.hashes().map(row => ({
    id: parseInt(row.id),
    name: row.name,
    price: parseFloat(row.price),
    inStock: row.in_stock.toLowerCase() === 'true',
    tags: row.tags ? row.tags.split(',').map(tag => tag.trim()) : []
  }));
  
  this.inventory = products;
  this.log(`Loaded ${products.length} products`);
});

// Validate table structure
Given('I validate the user data table:', function (dataTable: DataTable) {
  const raw = dataTable.raw();
  const headers = raw[0];
  
  const requiredColumns = ['name', 'email', 'role'];
  const missingColumns = requiredColumns.filter(col => !headers.includes(col));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  const users = dataTable.hashes();
  users.forEach((user, index) => {
    if (!user.email.includes('@')) {
      throw new Error(`Invalid email at row ${index + 1}: ${user.email}`);
    }
  });
  
  this.validatedUsers = users;
});
```

## Types

```typescript { .api }
interface IParameterTypeDefinition<T> {
  /** Name of the parameter type for use in step patterns */
  name: string;
  /** Regular expression(s) to match parameter values */
  regexp: readonly RegExp[] | readonly string[] | RegExp | string;
  /** Function to transform matched string to desired type */
  transformer?: (...match: string[]) => T;
  /** Whether to use this type when generating step snippets */
  useForSnippets?: boolean;
  /** Whether to prefer this type when multiple regexps match */
  preferForRegexpMatch?: boolean;
}
```