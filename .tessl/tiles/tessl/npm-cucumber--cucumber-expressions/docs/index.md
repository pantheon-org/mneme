# Cucumber Expressions

Cucumber Expressions is a sophisticated expression parsing library that offers a more intuitive alternative to regular expressions for matching and extracting parameters from text patterns. It enables developers to write human-readable expressions like 'I have {int} cucumbers in my belly' that automatically extract typed parameters, supporting built-in parameter types (int, float, string, word) and custom parameter types with transformation functions.

## Package Information

- **Package Name**: @cucumber/cucumber-expressions
- **Package Type**: npm
- **Language**: TypeScript
- **Installation**: `npm install @cucumber/cucumber-expressions`

## Core Imports

```typescript
import {
  CucumberExpression,
  RegularExpression,
  ExpressionFactory,
  ParameterType,
  ParameterTypeRegistry,
  CucumberExpressionGenerator
} from "@cucumber/cucumber-expressions";
```

For CommonJS:

```javascript
const {
  CucumberExpression,
  RegularExpression,
  ExpressionFactory,
  ParameterType,
  ParameterTypeRegistry,
  CucumberExpressionGenerator
} = require("@cucumber/cucumber-expressions");
```

## Basic Usage

```typescript
import { 
  CucumberExpression, 
  ParameterTypeRegistry 
} from "@cucumber/cucumber-expressions";

// Create a registry with built-in parameter types
const registry = new ParameterTypeRegistry();

// Create and use a Cucumber Expression
const expression = new CucumberExpression(
  "I have {int} cucumbers in my belly", 
  registry
);

// Match text and extract arguments
const args = expression.match("I have 42 cucumbers in my belly");
if (args) {
  const count = args[0].getValue(null); // 42 (as Number)
  console.log(`Found ${count} cucumbers`);
}
```

## Architecture

Cucumber Expressions is built around several key components:

- **Expression System**: Core classes (`CucumberExpression`, `RegularExpression`) that parse and match text patterns
- **Parameter System**: Parameter types (`ParameterType`) with transformation functions and a registry (`ParameterTypeRegistry`) for management
- **AST Processing**: Abstract syntax tree parsing with `Node`, `Token`, and related utilities for expression structure
- **Generation**: Expression generation (`CucumberExpressionGenerator`) for creating expressions from example text
- **Factory Pattern**: `ExpressionFactory` for creating appropriate expression instances from strings or RegExp
- **Built-in Types**: Comprehensive set of built-in parameter types (int, float, string, word, etc.)

## Capabilities

### Expression Matching

Core expression parsing and matching functionality for both Cucumber Expressions and Regular Expressions, with argument extraction and type conversion.

```typescript { .api }
interface Expression {
  readonly source: string;
  match(text: string): readonly Argument[] | null;
}

class CucumberExpression implements Expression {
  constructor(expression: string, parameterTypeRegistry: ParameterTypeRegistry);
  match(text: string): readonly Argument[] | null;
  get regexp(): RegExp;
  get source(): string;
  readonly ast: Node;
}

class RegularExpression implements Expression {
  constructor(regexp: RegExp, parameterTypeRegistry: ParameterTypeRegistry);
  match(text: string): readonly Argument[] | null;
  get source(): string;
  readonly regexp: RegExp;
}
```

[Expression Matching](./expression-matching.md)

### Parameter Type System

Comprehensive parameter type system with built-in types and support for custom parameter types with transformation functions.

```typescript { .api }
class ParameterType<T> {
  constructor(
    name: string | undefined,
    regexps: RegExps,
    type: Constructor<T> | Factory<T> | null,
    transform?: (...match: string[]) => T | PromiseLike<T>,
    useForSnippets?: boolean,
    preferForRegexpMatch?: boolean,
    builtin?: boolean
  );
  transform(thisObj: unknown, groupValues: string[] | null): T | PromiseLike<T>;
  readonly name: string | undefined;
  readonly regexpStrings: readonly string[];
  readonly type: Constructor<T> | Factory<T> | null;
}

class ParameterTypeRegistry implements DefinesParameterType {
  constructor();
  get parameterTypes(): IterableIterator<ParameterType<unknown>>;
  lookupByTypeName(typeName: string): ParameterType<unknown> | undefined;
  defineParameterType(parameterType: ParameterType<unknown>): void;
}
```

[Parameter Types](./parameter-types.md)

### Expression Generation

Automatic generation of Cucumber Expressions from example text, with support for multiple parameter type combinations.

```typescript { .api }
class CucumberExpressionGenerator {
  constructor(parameterTypes: () => Iterable<ParameterType<unknown>>);
  generateExpressions(text: string): readonly GeneratedExpression[];
}

class GeneratedExpression {
  constructor(
    expressionTemplate: string,
    parameterTypes: readonly ParameterType<unknown>[]
  );
  get source(): string;
  get parameterNames(): readonly string[];
  get parameterInfos(): readonly ParameterInfo[];
  readonly parameterTypes: readonly ParameterType<unknown>[];
}
```

[Expression Generation](./expression-generation.md)

### Factory and Arguments

Factory pattern for creating expression instances and argument handling for parameter extraction and transformation.

```typescript { .api }
class ExpressionFactory {
  constructor(parameterTypeRegistry: ParameterTypeRegistry);
  createExpression(expression: string | RegExp): Expression;
}

class Argument {
  static build(
    group: Group,
    parameterTypes: readonly ParameterType<unknown>[]
  ): readonly Argument[];
  constructor(group: Group, parameterType: ParameterType<unknown>);
  getValue<T>(thisObj: unknown): T | null;
  getParameterType(): ParameterType<unknown>;
  readonly group: Group;
  readonly parameterType: ParameterType<unknown>;
}
```

[Factory and Arguments](./factory-arguments.md)

### AST and Parsing

Abstract syntax tree components for expression parsing, including nodes, tokens, and utility functions for working with parsed expression structures.

```typescript { .api }
class Node implements Located {
  constructor(
    type: NodeType,
    nodes: readonly Node[] | undefined,
    token: string | undefined,
    start: number,
    end: number
  );
  text(): string;
  readonly type: NodeType;
  readonly nodes: readonly Node[] | undefined;
  readonly start: number;
  readonly end: number;
}

class Token implements Located {
  constructor(type: TokenType, text: string, start: number, end: number);
  static isEscapeCharacter(codePoint: string): boolean;
  static canEscape(codePoint: string): boolean;
  static typeOf(codePoint: string): TokenType;
  readonly type: TokenType;
  readonly text: string;
  readonly start: number;
  readonly end: number;
}
```

[AST and Parsing](./ast-parsing.md)

## Common Types

### Core Interfaces

```typescript { .api }
interface DefinesParameterType {
  defineParameterType<T>(parameterType: ParameterType<T>): void;
}

interface Located {
  readonly start: number;
  readonly end: number;
}
```

### Parameter Information

```typescript { .api }
type ParameterInfo = {
  type: string | null;
  name: string;
  count: number;
};

type RegExps = StringOrRegExp | readonly StringOrRegExp[];
type StringOrRegExp = string | RegExp;
```

### Enums

```typescript { .api }
enum NodeType {
  text = 'TEXT_NODE',
  optional = 'OPTIONAL_NODE',
  alternation = 'ALTERNATION_NODE',
  alternative = 'ALTERNATIVE_NODE',
  parameter = 'PARAMETER_NODE',
  expression = 'EXPRESSION_NODE'
}

enum TokenType {
  startOfLine = 'START_OF_LINE',
  endOfLine = 'END_OF_LINE',
  whiteSpace = 'WHITE_SPACE',
  beginOptional = 'BEGIN_OPTIONAL',
  endOptional = 'END_OPTIONAL',
  beginParameter = 'BEGIN_PARAMETER',
  endParameter = 'END_PARAMETER',
  alternation = 'ALTERNATION',
  text = 'TEXT'
}
```

### Group and Matching

```typescript { .api }
class Group {
  constructor(
    value: string,
    start: number | undefined,
    end: number | undefined,
    children: readonly Group[]
  );
  get values(): string[] | null;
  readonly value: string;
  readonly start: number | undefined;
  readonly end: number | undefined;
  readonly children: readonly Group[];
}
```