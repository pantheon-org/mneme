# Expression Matching

Core expression parsing and matching functionality for both Cucumber Expressions and Regular Expressions, with argument extraction and type conversion.

## Capabilities

### Cucumber Expression

Main expression class for parsing and matching human-readable Cucumber Expressions with parameter extraction.

```typescript { .api }
/**
 * Main expression class for parsing Cucumber Expressions
 * Parses expressions like "I have {int} cucumbers" and matches against text
 */
class CucumberExpression implements Expression {
  /**
   * Create a new Cucumber Expression
   * @param expression - The Cucumber Expression string (e.g., "I have {int} cucumbers")
   * @param parameterTypeRegistry - Registry containing parameter type definitions
   */
  constructor(expression: string, parameterTypeRegistry: ParameterTypeRegistry);
  
  /**
   * Match text against the expression and extract arguments
   * @param text - Text to match against the expression
   * @returns Array of arguments if match succeeds, null if no match
   */
  match(text: string): readonly Argument[] | null;
  
  /**
   * Get the underlying regular expression generated from the Cucumber Expression
   */
  get regexp(): RegExp;
  
  /**
   * Get the original source expression string
   */
  get source(): string;
  
  /**
   * Abstract syntax tree of the parsed expression
   */
  readonly ast: Node;
}
```

**Usage Examples:**

```typescript
import { CucumberExpression, ParameterTypeRegistry } from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();

// Basic parameter extraction
const expr1 = new CucumberExpression("I have {int} cucumbers", registry);
const args1 = expr1.match("I have 42 cucumbers");
if (args1) {
  const count = args1[0].getValue<number>(null); // 42
}

// Multiple parameters
const expr2 = new CucumberExpression("User {string} has {int} points", registry);
const args2 = expr2.match('User "Alice" has 100 points');
if (args2) {
  const name = args2[0].getValue<string>(null); // "Alice"
  const points = args2[1].getValue<number>(null); // 100
}

// Optional text with parentheses
const expr3 = new CucumberExpression("I have {int} cucumber(s)", registry);
const args3a = expr3.match("I have 1 cucumber");   // matches
const args3b = expr3.match("I have 5 cucumbers");  // matches

// Alternative text with forward slashes
const expr4 = new CucumberExpression("I {love/hate} cucumbers", registry);
const args4a = expr4.match("I love cucumbers");    // matches
const args4b = expr4.match("I hate cucumbers");    // matches
```

### Regular Expression

Expression implementation that works with traditional regular expressions while providing the same interface as Cucumber Expressions.

```typescript { .api }
/**
 * Expression implementation for regular expressions
 * Provides the same interface as CucumberExpression but uses RegExp for matching
 */
class RegularExpression implements Expression {
  /**
   * Create a regular expression wrapper
   * @param regexp - The regular expression to use for matching
   * @param parameterTypeRegistry - Registry for parameter type lookup
   */
  constructor(regexp: RegExp, parameterTypeRegistry: ParameterTypeRegistry);
  
  /**
   * Match text against the regular expression and extract arguments
   * @param text - Text to match against the regexp
   * @returns Array of arguments if match succeeds, null if no match
   */
  match(text: string): readonly Argument[] | null;
  
  /**
   * Get the regexp source string
   */
  get source(): string;
  
  /**
   * The regular expression used for matching
   */
  readonly regexp: RegExp;
}
```

**Usage Examples:**

```typescript
import { RegularExpression, ParameterTypeRegistry } from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();

// Basic regex matching with parameter extraction
const regexExpr = new RegularExpression(/I have (\d+) cucumbers/, registry);
const args = regexExpr.match("I have 42 cucumbers");
if (args) {
  const count = args[0].getValue<string>(null); // "42" (as string)
}

// Complex regex with multiple capture groups
const complexRegex = new RegularExpression(
  /User "([^"]+)" has (\d+) points/,
  registry
);
const complexArgs = complexRegex.match('User "Alice" has 100 points');
if (complexArgs) {
  const name = complexArgs[0].getValue<string>(null);   // "Alice"
  const points = complexArgs[1].getValue<string>(null); // "100"
}
```

### Expression Interface

Common interface implemented by both Cucumber Expressions and Regular Expressions.

```typescript { .api }
/**
 * Common interface for all expression types
 * Provides unified API for matching text and extracting arguments
 */
interface Expression {
  /** The source expression string or pattern */
  readonly source: string;
  
  /**
   * Match text against the expression
   * @param text - Text to match
   * @returns Array of extracted arguments or null if no match
   */
  match(text: string): readonly Argument[] | null;
}
```

## Expression Syntax

### Cucumber Expression Syntax

Cucumber Expressions support several special syntaxes:

- **Parameters**: `{type}` where type is a parameter type name (e.g., `{int}`, `{string}`)
- **Anonymous Parameters**: `{}` matches anything
- **Optional Text**: `(optional text)` where parentheses indicate optional parts
- **Alternative Text**: `alternative1/alternative2` where forward slash separates alternatives
- **Escaping**: Use backslash `\` to escape special characters

### Parameter Types

Built-in parameter types include:

- `{int}` - Matches integers like 42, -19
- `{float}` - Matches floating point numbers like 3.14, -2.5
- `{word}` - Matches single words without whitespace
- `{string}` - Matches quoted strings like "hello world"
- `{}` - Anonymous type, matches anything
- `{double}`, `{bigdecimal}`, `{byte}`, `{short}`, `{long}`, `{biginteger}` - Numeric type variants

### Error Handling

The library provides comprehensive error handling for invalid expressions:

- Parameter type not found
- Invalid parameter names (containing special characters)
- Invalid optional text (empty optionals, nested optionals)
- Invalid alternation patterns (empty alternatives)

```typescript
// This will throw CucumberExpressionError
try {
  new CucumberExpression("I have {unknown-type} items", registry);
} catch (error) {
  console.log(error.message); // "Undefined parameter type {unknown-type}"
}
```