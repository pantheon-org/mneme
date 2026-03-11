# Pickle Compilation

Transforms parsed Gherkin documents into executable test scenarios (pickles). The compilation process handles scenario outlines, background steps, variable interpolation, and rule hierarchies to create concrete test cases ready for execution.

## Capabilities

### Compile Function

Main function that transforms a parsed Gherkin document into executable pickles (test scenarios).

```typescript { .api }
/**
 * Compile a parsed Gherkin document into executable pickles
 * @param gherkinDocument - Parsed AST from the parser
 * @param uri - Source file URI for reference
 * @param newId - ID generator function for creating unique identifiers
 * @returns Array of pickles (executable test scenarios)
 */
function compile(
  gherkinDocument: GherkinDocument,
  uri: string,
  newId: IdGenerator.NewId
): readonly Pickle[];
```

**Usage Examples:**

```typescript
import { compile, generateMessages, IGherkinOptions } from "@cucumber/gherkin";
import { SourceMediaType, IdGenerator } from "@cucumber/messages";

// Parse a Gherkin document first
const gherkinSource = `
Feature: Calculator
  Background:
    Given I have a calculator
    
  Scenario: Addition
    When I add 2 and 3
    Then the result should be 5
    
  Scenario: Subtraction  
    When I subtract 2 from 5
    Then the result should be 3
    
  Scenario Outline: Multiple operations
    When I <operation> <a> and <b>
    Then the result should be <result>
    
    Examples:
      | operation | a | b | result |
      | add       | 1 | 2 | 3      |
      | multiply  | 3 | 4 | 12     |
      | divide    | 8 | 2 | 4      |
`;

const options: IGherkinOptions = {
  includeGherkinDocument: true,
  newId: IdGenerator.uuid()
};

const envelopes = generateMessages(
  gherkinSource,
  'calculator.feature',
  SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
  options
);

// Find the parsed document
const gherkinDocument = envelopes.find(e => e.gherkinDocument)?.gherkinDocument;
if (gherkinDocument) {
  // Compile to pickles
  const pickles = compile(gherkinDocument, 'calculator.feature', IdGenerator.uuid());
  
  console.log(`Generated ${pickles.length} executable scenarios:`);
  pickles.forEach((pickle, index) => {
    console.log(`\n${index + 1}. ${pickle.name}`);
    console.log(`   ID: ${pickle.id}`);
    console.log(`   URI: ${pickle.uri}`);
    console.log(`   Tags: ${pickle.tags.map(tag => tag.name).join(', ')}`);
    console.log(`   Steps: ${pickle.steps.length}`);
    
    pickle.steps.forEach((step, stepIndex) => {
      console.log(`     ${stepIndex + 1}. ${step.text}`);
      if (step.argument?.dataTable) {
        console.log(`        Data table: ${step.argument.dataTable.rows.length} rows`);
      }
      if (step.argument?.docString) {
        console.log(`        Doc string: ${step.argument.docString.content?.substring(0, 50)}...`);
      }
    });
  });
}

// Direct compilation from parsed document
const directPickles = compile(gherkinDocument!, 'calculator.feature', IdGenerator.uuid());
console.log(`Direct compilation produced ${directPickles.length} pickles`);
```

## Compilation Process

The compilation process transforms abstract Gherkin scenarios into concrete executable test cases through several steps:

### 1. Background Integration

Background steps are automatically prepended to each scenario:

```typescript
import { compile } from "@cucumber/gherkin";

// Example showing background integration
const featureWithBackground = `
Feature: User Management
  Background:
    Given the system is initialized
    And the database is clean
    
  Scenario: Create user
    When I create a user "Alice"
    Then the user should exist
    
  Scenario: Delete user
    Given a user "Bob" exists
    When I delete the user "Bob"
    Then the user should not exist
`;

// After compilation, each scenario will include:
// 1. Given the system is initialized
// 2. And the database is clean
// 3. [original scenario steps...]
```

### 2. Scenario Outline Expansion

Scenario outlines are expanded into multiple concrete scenarios using the examples table:

```typescript
// Original scenario outline
const scenarioOutline = `
Feature: Mathematical Operations
  Scenario Outline: Basic arithmetic
    Given I have a calculator
    When I <operation> <a> and <b>
    Then the result should be <result>
    
    Examples:
      | operation | a | b | result |
      | add       | 2 | 3 | 5      |
      | subtract  | 5 | 2 | 3      |
      | multiply  | 4 | 3 | 12     |
`;

// Compilation produces 3 separate pickles:
// 1. "Basic arithmetic" with steps:
//    - Given I have a calculator
//    - When I add 2 and 3  
//    - Then the result should be 5
//
// 2. "Basic arithmetic" with steps:
//    - Given I have a calculator
//    - When I subtract 5 and 2
//    - Then the result should be 3
//
// 3. "Basic arithmetic" with steps:
//    - Given I have a calculator
//    - When I multiply 4 and 3
//    - Then the result should be 12
```

### 3. Variable Interpolation

Variables in scenario outlines are replaced with actual values from the examples table:

```typescript
// Variable interpolation example
const interpolationExample = `
Feature: User Profiles
  Scenario Outline: User registration
    Given I am on the registration page
    When I enter "<username>" as username
    And I enter "<email>" as email
    And I enter "<age>" as age
    Then I should see "Welcome <username>!"
    
    Examples:
      | username | email              | age |
      | alice    | alice@example.com  | 25  |
      | bob      | bob@example.com    | 30  |
`;

// Variables like <username>, <email>, <age> are replaced with:
// alice, alice@example.com, 25 for first pickle
// bob, bob@example.com, 30 for second pickle
```

### 4. Tag Inheritance

Tags are properly inherited from features, rules, and scenarios:

```typescript
const taggedFeature = `
@smoke @regression
Feature: Tagged Feature
  
  @positive
  Scenario: Happy path
    Given something works
    
  @negative @edge-case
  Scenario: Error handling  
    Given something fails
    
  Rule: Business Logic
    @business
    Scenario: Business rule test
      Given business conditions
`;

// Compiled pickles inherit tags:
// 1. Happy path: @smoke, @regression, @positive
// 2. Error handling: @smoke, @regression, @negative, @edge-case  
// 3. Business rule test: @smoke, @regression, @business
```

### 5. Rule Hierarchy Processing

Rules create logical groupings that are flattened during compilation:

```typescript
const ruleExample = `
Feature: E-commerce
  Background:
    Given the store is open
    
  Rule: Shopping Cart
    Background:
      Given I have an empty cart
      
    Scenario: Add item to cart
      When I add a product
      Then the cart should contain 1 item
      
  Rule: Checkout Process
    Background:
      Given I have items in my cart
      
    Scenario: Complete purchase
      When I proceed to checkout
      Then the order should be created
`;

// Each rule's background is combined with feature background:
// Cart scenario gets: store is open + empty cart + scenario steps
// Checkout scenario gets: store is open + items in cart + scenario steps
```

## Pickle Structure

Compiled pickles contain all information needed for test execution:

```typescript { .api }
interface Pickle {
  /** Unique identifier for this pickle */
  id: string;
  
  /** Source file URI */
  uri: string;
  
  /** Name of the scenario (from Scenario or Scenario Outline) */
  name: string;
  
  /** Language/dialect used in the source */
  language: string;
  
  /** All executable steps including background steps */
  steps: PickleStep[];
  
  /** All tags applied to this scenario (inherited from feature/rule/scenario) */
  tags: PickleTag[];
  
  /** AST node IDs for traceability back to source */
  astNodeIds: string[];
}

interface PickleStep {
  /** Unique identifier for this step */
  id: string;
  
  /** Complete step text with variables interpolated */
  text: string;
  
  /** Step argument (data table or doc string) if present */
  argument?: PickleStepArgument;
  
  /** AST node IDs for traceability back to source */
  astNodeIds: string[];
}

interface PickleTag {
  /** Tag name including @ symbol */
  name: string;
  
  /** AST node ID for traceability back to source */
  astNodeId: string;
}
```

## Advanced Compilation Features

### Multiple Examples Tables

Scenario outlines can have multiple examples tables:

```typescript
const multipleExamples = `
Feature: Login Validation
  Scenario Outline: Invalid credentials
    Given I am on the login page
    When I enter "<username>" and "<password>"
    Then I should see "<message>"
    
    @invalid-username
    Examples: Bad usernames
      | username | password | message           |
      | ""       | secret   | Username required |
      | space    | secret   | Invalid username  |
      
    @invalid-password  
    Examples: Bad passwords
      | username | password | message           |
      | alice    | ""       | Password required |
      | alice    | 123      | Password too short|
`;

// Creates separate pickles for each examples table
// with appropriate tags (@invalid-username or @invalid-password)
```

### Data Tables and Doc Strings

Step arguments are preserved and transformed appropriately:

```typescript
const stepArguments = `
Feature: Data Processing
  Scenario: Process user data
    Given the following users exist:
      | name  | email              | age |
      | Alice | alice@example.com  | 25  |
      | Bob   | bob@example.com    | 30  |
    When I process the users
    Then I should receive this response:
      \"\"\"
      {
        "status": "success",
        "processed": 2,
        "users": ["Alice", "Bob"]
      }
      \"\"\"
`;

// Data tables and doc strings are preserved in the compiled pickle
// and available as step.argument.dataTable or step.argument.docString
```

## Error Handling During Compilation

Compilation can fail for various reasons, but errors are typically caught during parsing rather than compilation:

```typescript
import { compile, generateMessages } from "@cucumber/gherkin";

// Malformed scenario outline (missing examples)
const malformedOutline = `
Feature: Broken Feature
  Scenario Outline: Missing examples
    Given I have <something>
    When I do <action>
    Then <result> happens
`;

try {
  const envelopes = generateMessages(
    malformedOutline,
    'broken.feature',
    SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
    { includeGherkinDocument: true, newId: IdGenerator.uuid() }
  );
  
  // Check for parse errors first
  const parseErrors = envelopes.filter(e => e.parseError);
  if (parseErrors.length > 0) {
    console.log('Parse errors found:', parseErrors);
    return;
  }
  
  // Compilation should succeed if parsing succeeded
  const document = envelopes.find(e => e.gherkinDocument)?.gherkinDocument;
  if (document) {
    const pickles = compile(document, 'broken.feature', IdGenerator.uuid());
    console.log('Compiled pickles:', pickles.length);
  }
} catch (error) {
  console.error('Compilation error:', error);
}
```

## Performance Considerations

For large feature files with many scenario outlines, consider the compilation impact:

```typescript
// Large scenario outline example
const largeOutline = `
Feature: Performance Test
  Scenario Outline: Test many combinations
    Given input <a> and <b>
    When operation <op> is performed
    Then result <expected> is produced
    
    Examples:
      | a | b | op  | expected |
      | 1 | 1 | add | 2        |
      | 1 | 2 | add | 3        |
      | 2 | 1 | add | 3        |
      # ... 1000 more rows
`;

// This would generate 1000+ individual pickles
// Consider breaking into smaller feature files or using tags
// to filter scenarios during execution
```

## Integration with Test Runners

Compiled pickles are designed to integrate with test execution frameworks:

```typescript
import { compile } from "@cucumber/gherkin";

// Example integration pattern
function executePickles(pickles: Pickle[]) {
  pickles.forEach(pickle => {
    console.log(`\nExecuting: ${pickle.name}`);
    console.log(`Tags: ${pickle.tags.map(t => t.name).join(', ')}`);
    
    pickle.steps.forEach(step => {
      console.log(`  Executing step: ${step.text}`);
      
      // Test runner would match step text to step definitions
      // and execute the corresponding code
      
      if (step.argument?.dataTable) {
        console.log(`    With data table (${step.argument.dataTable.rows.length} rows)`);
      }
      
      if (step.argument?.docString) {
        console.log(`    With doc string (${step.argument.docString.content?.length} chars)`);
      }
    });
  });
}
```