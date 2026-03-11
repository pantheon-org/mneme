# Expression Generation

Automatic generation of Cucumber Expressions from example text, with support for multiple parameter type combinations.

## Capabilities

### Cucumber Expression Generator

Analyzes example text and generates possible Cucumber Expressions by identifying patterns that match registered parameter types.

```typescript { .api }
/**
 * Generates Cucumber Expressions from example text
 * Analyzes text to identify patterns matching parameter types
 */
class CucumberExpressionGenerator {
  /**
   * Create a generator with access to parameter types
   * @param parameterTypes - Function returning iterable of available parameter types
   */
  constructor(parameterTypes: () => Iterable<ParameterType<unknown>>);
  
  /**
   * Generate possible Cucumber Expressions from example text
   * @param text - Example text to analyze for patterns
   * @returns Array of generated expressions with parameter combinations
   */
  generateExpressions(text: string): readonly GeneratedExpression[];
}
```

**Usage Examples:**

```typescript
import { 
  CucumberExpressionGenerator, 
  ParameterTypeRegistry 
} from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();
const generator = new CucumberExpressionGenerator(() => registry.parameterTypes);

// Generate expressions from text with numbers
const expressions1 = generator.generateExpressions("I have 42 cucumbers");
// Generates: "I have {int} cucumbers"

// Generate expressions with multiple parameters
const expressions2 = generator.generateExpressions('User "Alice" has 100 points');
// Generates: 'User {string} has {int} points'

// Text with multiple possible parameter types
const expressions3 = generator.generateExpressions("Price is 19.99 dollars");
// Generates multiple options:
// - "Price is {float} dollars"  
// - "Price is {double} dollars"
// - "Price is {bigdecimal} dollars"

// Examine generated expressions
expressions3.forEach((expr, index) => {
  console.log(`Option ${index + 1}: ${expr.source}`);
  console.log(`Parameter names: ${expr.parameterNames.join(', ')}`);
  console.log(`Parameter types: ${expr.parameterTypes.map(t => t.name).join(', ')}`);
});
```

### Generated Expression

Represents a generated Cucumber Expression with detailed parameter information for code generation.

```typescript { .api }
/**
 * Represents a generated Cucumber Expression with parameter metadata
 * Contains the expression template and information about parameters
 */
class GeneratedExpression {
  /**
   * Create a generated expression
   * @param expressionTemplate - Template string with parameter placeholders
   * @param parameterTypes - Array of parameter types used in the expression
   */
  constructor(
    expressionTemplate: string,
    parameterTypes: readonly ParameterType<unknown>[]
  );
  
  /**
   * Get the final Cucumber Expression string
   * Replaces parameter placeholders with parameter type names
   */
  get source(): string;
  
  /**
   * Get parameter names for function/method signatures
   * Names are disambiguated with numbers if duplicates exist
   * @returns Array of parameter names like ["count", "name", "count2"]
   */
  get parameterNames(): readonly string[];
  
  /**
   * Get detailed parameter information for code generation
   * @returns Array of parameter info with type, name, and usage count
   */
  get parameterInfos(): readonly ParameterInfo[];
  
  /**
   * Parameter types used in this generated expression
   */
  readonly parameterTypes: readonly ParameterType<unknown>[];
}
```

**Usage Examples:**

```typescript
import { 
  CucumberExpressionGenerator, 
  ParameterTypeRegistry 
} from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();
const generator = new CucumberExpressionGenerator(() => registry.parameterTypes);

// Generate and examine expression details
const expressions = generator.generateExpressions(
  'User "Alice" has 100 points and "Bob" has 200 points'
);

const expr = expressions[0];
console.log("Generated expression:", expr.source);
// "User {string} has {int} points and {string} has {int} points"

console.log("Parameter names:", expr.parameterNames);
// ["string", "int", "string2", "int2"]

console.log("Parameter info:");
expr.parameterInfos.forEach((info, index) => {
  console.log(`  ${index}: name="${info.name}", type="${info.type}", count=${info.count}`);
});
// 0: name="string", type="String", count=1
// 1: name="int", type="Number", count=1  
// 2: name="string", type="String", count=2
// 3: name="int", type="Number", count=2
```

## Generation Process

### Parameter Type Matching

The generator works by:

1. **Scanning Text**: Analyzes input text character by character
2. **Pattern Matching**: Identifies substrings that match parameter type patterns
3. **Preference Handling**: Prioritizes preferred parameter types and resolves conflicts
4. **Combination Generation**: Creates all valid combinations of parameter types
5. **Template Creation**: Builds expression templates with parameter placeholders

### Multiple Type Combinations

When multiple parameter types can match the same text pattern, the generator creates multiple expressions:

```typescript
const registry = new ParameterTypeRegistry();
const generator = new CucumberExpressionGenerator(() => registry.parameterTypes);

// Number can match int, float, double, bigdecimal, etc.
const expressions = generator.generateExpressions("The value is 42");

expressions.forEach(expr => {
  console.log(expr.source);
});
// Output:
// "The value is {int}"
// "The value is {float}" 
// "The value is {double}"
// "The value is {bigdecimal}"
// "The value is {byte}"
// "The value is {short}"
// "The value is {long}"
// "The value is {biginteger}"
```

### Custom Parameter Types in Generation

Custom parameter types participate in generation when marked with `useForSnippets: true`:

```typescript
import { ParameterType, ParameterTypeRegistry, CucumberExpressionGenerator } from "@cucumber/cucumber-expressions";

// Custom parameter type that participates in generation
const colorType = new ParameterType(
  'color',
  /red|blue|green|yellow/,
  String,
  (color) => color,
  true,  // useForSnippets: true - include in generation
  false  // preferForRegexpMatch: false
);

const registry = new ParameterTypeRegistry();
registry.defineParameterType(colorType);

const generator = new CucumberExpressionGenerator(() => registry.parameterTypes);

// Generate expression using custom type
const expressions = generator.generateExpressions("The car is red");
// Includes: "The car is {color}"

// Custom type with preference
const priorityColorType = new ParameterType(
  'priority-color',
  /red|blue/,
  String,
  (color) => color,
  true,  // useForSnippets
  true   // preferForRegexpMatch: true - preferred over other types
);

registry.defineParameterType(priorityColorType);

const preferredExpressions = generator.generateExpressions("The car is red");
// "priority-color" type will be preferred over "color" type for "red"
```

## Parameter Information

### Parameter Info Type

```typescript { .api }
/**
 * Information about a parameter for code generation
 * Used to create function signatures and parameter names
 */
type ParameterInfo = {
  /** String representation of the parameter type (e.g., "String", "Number") */
  type: string | null;
  /** Parameter type name used in expressions (e.g., "string", "int") */
  name: string;
  /** Number of times this parameter name has been used (for disambiguation) */
  count: number;
};
```

### Parameter Name Generation

The generator creates meaningful parameter names for code generation:

```typescript
const expressions = generator.generateExpressions(
  "Transfer 100 from account 12345 to account 67890"
);

const expr = expressions[0];
console.log("Expression:", expr.source);
// "Transfer {int} from account {int} to account {int}"

console.log("Parameter names:", expr.parameterNames);  
// ["int", "int2", "int3"]

// Use in function generation
const functionSignature = `function transferMoney(${expr.parameterNames.join(', ')}) {`;
// "function transferMoney(int, int2, int3) {"
```

## Advanced Generation Scenarios

### Complex Text Patterns

```typescript
const complexExamples = [
  "Process order #12345 for customer@example.com with 3 items totaling $99.99",
  "User logged in at 2023-12-25 14:30:00 from IP 192.168.1.1",
  "File upload: document.pdf (2.5MB) completed successfully"
];

complexExamples.forEach(text => {
  const expressions = generator.generateExpressions(text);
  console.log(`Input: ${text}`);
  expressions.slice(0, 3).forEach((expr, i) => {
    console.log(`  Option ${i + 1}: ${expr.source}`);
  });
  console.log('');
});
```

### Generation with Regular Expressions

The generator also works with `RegularExpression` objects to suggest Cucumber Expression equivalents:

```typescript
import { RegularExpression } from "@cucumber/cucumber-expressions";

// Convert regex patterns to suggested Cucumber Expressions
const regex = new RegularExpression(/I have (\d+) cucumbers/, registry);
const text = "I have 42 cucumbers";

// Generate Cucumber Expression alternatives
const alternatives = generator.generateExpressions(text);
// Suggests: "I have {int} cucumbers"
```