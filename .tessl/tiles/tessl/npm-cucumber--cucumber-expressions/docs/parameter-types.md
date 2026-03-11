# Parameter Types

Comprehensive parameter type system with built-in types and support for custom parameter types with transformation functions.

## Capabilities

### Parameter Type

Defines a parameter type with matching patterns and transformation function for converting matched text to typed values.

```typescript { .api }
/**
 * Defines a parameter type with regex patterns and transformation logic
 * Used to match text patterns and convert them to typed values
 */
class ParameterType<T> {
  /**
   * Create a new parameter type
   * @param name - The name used in expressions (e.g., "int" for {int})
   * @param regexps - Regular expression patterns that match this type
   * @param type - Constructor or factory function for the target type
   * @param transform - Function to transform matched strings to the target type
   * @param useForSnippets - Whether to include in code snippet generation
   * @param preferForRegexpMatch - Whether this type is preferred for regexp matching
   * @param builtin - Whether this is a built-in parameter type
   */
  constructor(
    name: string | undefined,
    regexps: RegExps,
    type: Constructor<T> | Factory<T> | null,
    transform?: (...match: string[]) => T | PromiseLike<T>,
    useForSnippets?: boolean,
    preferForRegexpMatch?: boolean,
    builtin?: boolean
  );
  
  /**
   * Transform matched text using the parameter type's transformation function
   * @param thisObj - Context object for the transformation
   * @param groupValues - Array of matched strings from regex groups
   * @returns Transformed value of type T
   */
  transform(thisObj: unknown, groupValues: string[] | null): T | PromiseLike<T>;
  
  /**
   * Compare two parameter types for sorting/preference
   */
  static compare(pt1: ParameterType<unknown>, pt2: ParameterType<unknown>): number;
  
  /**
   * Validate parameter type name for illegal characters
   */
  static checkParameterTypeName(typeName: string): void;
  
  /**
   * Check if parameter type name is valid
   */
  static isValidParameterTypeName(typeName: string): boolean;
  
  /** Parameter type name used in expressions */
  readonly name: string | undefined;
  
  /** Regular expression patterns as strings */
  readonly regexpStrings: readonly string[];
  
  /** Type constructor or factory function */
  readonly type: Constructor<T> | Factory<T> | null;
  
  /** Whether to use this type for code snippet generation */
  readonly useForSnippets?: boolean;
  
  /** Whether this type is preferred for regexp matching */
  readonly preferForRegexpMatch?: boolean;
  
  /** Whether this is a built-in parameter type */
  readonly builtin?: boolean;
}
```

**Usage Examples:**

```typescript
import { ParameterType, ParameterTypeRegistry } from "@cucumber/cucumber-expressions";

// Custom color parameter type
class Color {
  constructor(public readonly name: string) {}
}

const colorType = new ParameterType(
  'color',
  /red|blue|green|yellow/,
  Color,
  (colorName) => new Color(colorName),
  true,   // useForSnippets
  false   // preferForRegexpMatch
);

// Custom coordinate parameter with multiple capture groups
class Coordinate {
  constructor(public x: number, public y: number, public z: number) {}
}

const coordinateType = new ParameterType(
  'coordinate',
  /(-?\d+),(-?\d+),(-?\d+)/,
  Coordinate,
  (x, y, z) => new Coordinate(parseInt(x), parseInt(y), parseInt(z))
);

// Register and use
const registry = new ParameterTypeRegistry();
registry.defineParameterType(colorType);
registry.defineParameterType(coordinateType);
```

### Parameter Type Registry

Registry for managing parameter types, providing lookup and registration functionality.

```typescript { .api }
/**
 * Registry for managing parameter types
 * Handles registration, lookup, and conflict resolution for parameter types
 */
class ParameterTypeRegistry implements DefinesParameterType {
  /**
   * Create a new registry with built-in parameter types
   */
  constructor();
  
  /**
   * Get iterator over all registered parameter types
   */
  get parameterTypes(): IterableIterator<ParameterType<unknown>>;
  
  /**
   * Look up parameter type by name
   * @param typeName - Name of the parameter type (e.g., "int", "string")
   * @returns Parameter type if found, undefined otherwise
   */
  lookupByTypeName(typeName: string): ParameterType<unknown> | undefined;
  
  /**
   * Look up parameter type by regular expression pattern
   * @param parameterTypeRegexp - Regular expression pattern
   * @param expressionRegexp - Full expression regexp for error reporting
   * @param text - Original text for error context
   * @returns Parameter type if found, undefined otherwise
   * @throws AmbiguousParameterTypeError if multiple types match
   */
  lookupByRegexp(
    parameterTypeRegexp: string,
    expressionRegexp: RegExp,
    text: string
  ): ParameterType<unknown> | undefined;
  
  /**
   * Register a new parameter type
   * @param parameterType - Parameter type to register
   * @throws CucumberExpressionError if type name already exists
   */
  defineParameterType(parameterType: ParameterType<unknown>): void;
}
```

**Usage Examples:**

```typescript
import { ParameterTypeRegistry, ParameterType } from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();

// Look up built-in types
const intType = registry.lookupByTypeName('int');
const stringType = registry.lookupByTypeName('string');

// Define and register custom type
const emailType = new ParameterType(
  'email',
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
  String,
  (email) => email.toLowerCase()
);

registry.defineParameterType(emailType);

// Use in expressions
const expr = new CucumberExpression("Send email to {email}", registry);
const args = expr.match("Send email to USER@EXAMPLE.COM");
if (args) {
  const email = args[0].getValue<string>(null); // "user@example.com"
}
```

## Built-in Parameter Types

The library includes comprehensive built-in parameter types:

### Numeric Types

```typescript { .api }
// Integer types
{int}        // Matches: 42, -19    → Number
{byte}       // Matches: 42, -19    → Number (8-bit)
{short}      // Matches: 42, -19    → Number (16-bit)
{long}       // Matches: 42, -19    → Number (64-bit)
{biginteger} // Matches: 42, -19    → BigInt

// Floating point types
{float}      // Matches: 3.14, -.5  → Number
{double}     // Matches: 3.14, -.5  → Number (64-bit)
{bigdecimal} // Matches: 3.14, -.5  → String (for precision)
```

### Text Types

```typescript { .api }
{word}   // Matches: hello, world123     → String (no whitespace)
{string} // Matches: "hello world", 'hi' → String (quoted, quotes removed)
{}       // Matches: anything            → String (anonymous type)
```

### Built-in Type Examples

```typescript
import { CucumberExpression, ParameterTypeRegistry } from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();

// Integer type
const intExpr = new CucumberExpression("I have {int} items", registry);
const intArgs = intExpr.match("I have 42 items");
// intArgs[0].getValue(null) === 42 (Number)

// Float type
const floatExpr = new CucumberExpression("Price is {float} dollars", registry);
const floatArgs = floatExpr.match("Price is 19.99 dollars");
// floatArgs[0].getValue(null) === 19.99 (Number)

// String type (removes quotes)
const stringExpr = new CucumberExpression("User name is {string}", registry);
const stringArgs = stringExpr.match('User name is "John Doe"');
// stringArgs[0].getValue(null) === "John Doe" (quotes removed)

// Word type
const wordExpr = new CucumberExpression("Select {word} option", registry);
const wordArgs = wordExpr.match("Select advanced option");
// wordArgs[0].getValue(null) === "advanced"

// BigInt type
const bigintExpr = new CucumberExpression("Large number {biginteger}", registry);
const bigintArgs = bigintExpr.match("Large number 12345678901234567890");
// bigintArgs[0].getValue(null) === 12345678901234567890n (BigInt)
```

## Custom Parameter Types

### Advanced Custom Types

```typescript
// Custom date parameter type
class CustomDate {
  constructor(public date: Date) {}
}

const dateType = new ParameterType(
  'date',
  /(\d{4})-(\d{2})-(\d{2})/,
  CustomDate,
  (year, month, day) => new CustomDate(
    new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  )
);

// Enum parameter type
enum Status { ACTIVE = 'active', INACTIVE = 'inactive' }

const statusType = new ParameterType(
  'status',
  /active|inactive/,
  String,
  (status) => status as Status
);

// Complex object type with validation
class User {
  constructor(public name: string, public age: number) {}
}

const userType = new ParameterType(
  'user',
  /([a-zA-Z]+):(\d+)/,
  User,
  (name, age) => {
    const ageNum = parseInt(age);
    if (ageNum < 0 || ageNum > 150) {
      throw new Error(`Invalid age: ${age}`);
    }
    return new User(name, ageNum);
  }
);
```

### Type Definition Helpers

```typescript { .api }
// Type aliases for parameter type construction
type RegExps = StringOrRegExp | readonly StringOrRegExp[];
type StringOrRegExp = string | RegExp;

// Interface for objects that can define parameter types
interface DefinesParameterType {
  defineParameterType<T>(parameterType: ParameterType<T>): void;
}

// Constructor and factory type definitions
interface Constructor<T> {
  new (...args: unknown[]): T;
  prototype: T;
}

type Factory<T> = (...args: unknown[]) => T;
```

## Error Handling

The parameter type system includes comprehensive error handling:

```typescript
// Invalid parameter type name
try {
  new ParameterType('[invalid]', /pattern/, String);
} catch (error) {
  // CucumberExpressionError: Illegal character in parameter name
}

// Duplicate parameter type registration
try {
  const registry = new ParameterTypeRegistry();
  const type1 = new ParameterType('custom', /pattern1/, String);
  const type2 = new ParameterType('custom', /pattern2/, String);
  registry.defineParameterType(type1);
  registry.defineParameterType(type2); // Throws error
} catch (error) {
  // CucumberExpressionError: There is already a parameter type with name custom
}

// Ambiguous parameter types
try {
  const registry = new ParameterTypeRegistry();
  const type1 = new ParameterType('type1', /\d+/, Number, undefined, true, true);
  const type2 = new ParameterType('type2', /\d+/, String, undefined, true, true);
  registry.defineParameterType(type1);
  registry.defineParameterType(type2); // Throws error
} catch (error) {
  // CucumberExpressionError: Multiple preferential parameter types
}
```