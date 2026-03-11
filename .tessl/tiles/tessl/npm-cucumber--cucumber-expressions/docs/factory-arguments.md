# Factory and Arguments

Factory pattern for creating expression instances and argument handling for parameter extraction and transformation.

## Capabilities

### Expression Factory

Factory class that creates appropriate expression instances (Cucumber or Regular) based on input type.

```typescript { .api }
/**
 * Factory for creating Expression instances
 * Automatically chooses between CucumberExpression and RegularExpression
 */
class ExpressionFactory {
  /**
   * Create factory with parameter type registry
   * @param parameterTypeRegistry - Registry containing parameter type definitions
   */
  constructor(parameterTypeRegistry: ParameterTypeRegistry);
  
  /**
   * Create appropriate expression instance based on input type
   * @param expression - String creates CucumberExpression, RegExp creates RegularExpression
   * @returns Expression instance ready for matching
   */
  createExpression(expression: string | RegExp): Expression;
}
```

**Usage Examples:**

```typescript
import { ExpressionFactory, ParameterTypeRegistry } from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();
const factory = new ExpressionFactory(registry);

// Create Cucumber Expression from string
const cucumberExpr = factory.createExpression("I have {int} cucumbers");
// Returns: CucumberExpression instance

// Create Regular Expression from RegExp
const regexExpr = factory.createExpression(/I have (\d+) cucumbers/);
// Returns: RegularExpression instance

// Use both expressions identically
const text = "I have 42 cucumbers";
const cucumberArgs = cucumberExpr.match(text);
const regexArgs = regexExpr.match(text);

// Both return Argument arrays with same interface
if (cucumberArgs && regexArgs) {
  const cucumberValue = cucumberArgs[0].getValue<number>(null); // 42 (Number)
  const regexValue = regexArgs[0].getValue<string>(null);      // "42" (String)
}
```

### Argument

Represents a matched parameter with its value and type information, providing access to transformed values.

```typescript { .api }
/**
 * Represents a matched parameter argument
 * Contains the matched text group and parameter type for transformation
 */
class Argument {
  /**
   * Build array of arguments from matched groups and parameter types
   * @param group - Root group containing all matches
   * @param parameterTypes - Array of parameter types for transformation
   * @returns Array of Argument instances
   */
  static build(
    group: Group,
    parameterTypes: readonly ParameterType<unknown>[]
  ): readonly Argument[];
  
  /**
   * Create argument with group and parameter type
   * @param group - Matched text group
   * @param parameterType - Parameter type for transformation
   */
  constructor(group: Group, parameterType: ParameterType<unknown>);
  
  /**
   * Get transformed value using parameter type's transformation function
   * @param thisObj - Context object for transformation (usually null)
   * @returns Transformed value of the appropriate type
   */
  getValue<T>(thisObj: unknown): T | null;
  
  /**
   * Get the parameter type used for this argument
   * @returns Parameter type instance
   */
  getParameterType(): ParameterType<unknown>;
  
  /** Matched text group containing the raw match data */
  readonly group: Group;
  
  /** Parameter type used for transformation */
  readonly parameterType: ParameterType<unknown>;
}
```

**Usage Examples:**

```typescript
import { CucumberExpression, ParameterTypeRegistry } from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();
const expression = new CucumberExpression("User {string} has {int} points", registry);

const args = expression.match('User "Alice" has 100 points');
if (args) {
  // First argument: string parameter
  const username = args[0].getValue<string>(null);
  console.log(`Username: ${username}`); // "Alice"
  console.log(`Type: ${args[0].getParameterType().name}`); // "string"
  
  // Second argument: int parameter  
  const points = args[1].getValue<number>(null);
  console.log(`Points: ${points}`); // 100
  console.log(`Type: ${args[1].getParameterType().name}`); // "int"
  
  // Access raw matched groups
  console.log(`Raw username match: ${args[0].group.value}`); // "Alice"
  console.log(`Raw points match: ${args[1].group.value}`);   // "100"
}
```

### Group

Represents a matched text group with position information and child groups for nested matches.

```typescript { .api }
/**
 * Represents a matched text group
 * Contains the matched text, position, and child groups for complex patterns
 */
class Group {
  /**
   * Create a group with match information
   * @param value - The matched text content
   * @param start - Start position in original text (undefined if not tracked)
   * @param end - End position in original text (undefined if not tracked)
   * @param children - Array of child groups for nested matches
   */
  constructor(
    value: string,
    start: number | undefined,
    end: number | undefined,
    children: readonly Group[]
  );
  
  /**
   * Get values from this group and its children
   * @returns Array of string values or null if no matches
   */
  get values(): string[] | null;
  
  /** The matched text content */
  readonly value: string;
  
  /** Start position in original text */
  readonly start: number | undefined;
  
  /** End position in original text */
  readonly end: number | undefined;
  
  /** Child groups for nested matches */
  readonly children: readonly Group[];
}
```

**Usage Examples:**

```typescript
import { CucumberExpression, ParameterTypeRegistry, ParameterType } from "@cucumber/cucumber-expressions";

// Custom parameter type with multiple capture groups
class Coordinate {
  constructor(public x: number, public y: number) {}
}

const coordinateType = new ParameterType(
  'coordinate',
  /(-?\d+),(-?\d+)/,
  Coordinate,
  (x, y) => new Coordinate(parseInt(x), parseInt(y))
);

const registry = new ParameterTypeRegistry();
registry.defineParameterType(coordinateType);

const expression = new CucumberExpression("Move to {coordinate}", registry);
const args = expression.match("Move to 10,-5");

if (args) {
  const arg = args[0];
  const coordinate = arg.getValue<Coordinate>(null);
  console.log(`Coordinate: (${coordinate.x}, ${coordinate.y})`); // (10, -5)
  
  // Access group details
  const group = arg.group;
  console.log(`Full match: "${group.value}"`);     // "10,-5"
  console.log(`Child groups: ${group.children.length}`); // 2
  console.log(`Child values:`, group.values);      // ["10", "-5"]
}
```

## Advanced Usage Patterns

### Custom Context Objects

Arguments can use custom context objects for transformation:

```typescript
class MathContext {
  constructor(public multiplier: number) {}
}

const scaledNumberType = new ParameterType(
  'scaled',
  /\d+/,
  Number,
  function(this: MathContext, value: string) {
    return parseInt(value) * this.multiplier;
  }
);

const registry = new ParameterTypeRegistry();
registry.defineParameterType(scaledNumberType);

const expression = new CucumberExpression("Scale {scaled}", registry);
const args = expression.match("Scale 5");

if (args) {
  const context = new MathContext(10);
  const scaledValue = args[0].getValue<number>(context); // 50
}
```

### Error Handling in Arguments

Arguments handle transformation errors gracefully:

```typescript
const strictNumberType = new ParameterType(
  'strict-number',
  /\d+/,
  Number,
  (value: string) => {
    const num = parseInt(value);
    if (num < 0) {
      throw new Error(`Negative numbers not allowed: ${num}`);
    }
    return num;
  }
);

const registry = new ParameterTypeRegistry();
registry.defineParameterType(strictNumberType);

const expression = new CucumberExpression("Process {strict-number}", registry);

try {
  const args = expression.match("Process -5");
  if (args) {
    const value = args[0].getValue<number>(null); // Throws error
  }
} catch (error) {
  console.log(error.message); // "Negative numbers not allowed: -5"
}
```

### Argument Building Process

The `Argument.build` method coordinates between matched groups and parameter types:

```typescript
import { Group, ParameterType } from "@cucumber/cucumber-expressions";

// Manual argument building (usually done internally)
const mockGroup = new Group("42", 0, 2, []);
const intType = new ParameterType('int', /\d+/, Number, (s) => parseInt(s));

const args = Argument.build(mockGroup, [intType]);
console.log(args[0].getValue<number>(null)); // 42
```

### Factory with Custom Registry

```typescript
import { ExpressionFactory, ParameterTypeRegistry, ParameterType } from "@cucumber/cucumber-expressions";

// Create registry with custom types
const registry = new ParameterTypeRegistry();
registry.defineParameterType(new ParameterType(
  'email',
  /[^@]+@[^.]+\..+/,
  String,
  (email) => email.toLowerCase()
));

// Factory uses custom registry
const factory = new ExpressionFactory(registry);

// Custom types available in both expression types
const cucumberExpr = factory.createExpression("Send to {email}");
const regexExpr = factory.createExpression(/Send to ([^@]+@[^.]+\..+)/);

const text = "Send to USER@EXAMPLE.COM";
const cucumberArgs = cucumberExpr.match(text);
const regexArgs = regexExpr.match(text);

if (cucumberArgs && regexArgs) {
  // Cucumber expression uses custom transformation
  const cucumberEmail = cucumberArgs[0].getValue<string>(null); // "user@example.com"
  
  // Regular expression uses default string transformation  
  const regexEmail = regexArgs[0].getValue<string>(null);      // "USER@EXAMPLE.COM"
}
```

## Argument Type Safety

The library provides strong typing for argument values:

```typescript
import { CucumberExpression, ParameterTypeRegistry } from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();
const expression = new CucumberExpression("Transfer {int} to {string}", registry);

const args = expression.match('Transfer 100 to "savings"');
if (args) {
  // TypeScript enforces correct types
  const amount: number = args[0].getValue<number>(null);   // ✓ Correct
  const account: string = args[1].getValue<string>(null);  // ✓ Correct
  
  // TypeScript catches type mismatches
  // const wrongType: string = args[0].getValue<string>(null);  // ✗ Type error
}
```