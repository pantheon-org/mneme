# @cucumber/gherkin

@cucumber/gherkin is a comprehensive Gherkin language parser and compiler for JavaScript/TypeScript environments. It parses Cucumber feature files written in Gherkin syntax and converts them to various output formats including Abstract Syntax Tree (AST) generation and Cucumber Messages format. The library supports multiple languages through dialect configurations and offers both classic Gherkin parsing and Gherkin-in-Markdown parsing capabilities.

## Package Information

- **Package Name**: @cucumber/gherkin
- **Package Type**: npm
- **Language**: TypeScript
- **Installation**: `npm install @cucumber/gherkin`

## Core Imports

```typescript
import { 
  generateMessages, 
  IGherkinOptions, 
  dialects, 
  Parser,
  makeSourceEnvelope,
  AstBuilder,
  TokenScanner,
  Errors,
  GherkinClassicTokenMatcher,
  GherkinInMarkdownTokenMatcher,
  compile
} from "@cucumber/gherkin";
import { SourceMediaType } from "@cucumber/messages";
```

CommonJS:

```javascript
const { 
  generateMessages, 
  IGherkinOptions, 
  dialects, 
  Parser,
  makeSourceEnvelope,
  AstBuilder,
  TokenScanner,
  Errors,
  GherkinClassicTokenMatcher,
  GherkinInMarkdownTokenMatcher,
  compile
} = require("@cucumber/gherkin");
```

## Basic Usage

```typescript
import { generateMessages, IGherkinOptions } from "@cucumber/gherkin";
import { SourceMediaType, IdGenerator } from "@cucumber/messages";

// Parse a feature file
const gherkinSource = `
Feature: Calculator
  Scenario: Addition
    Given I have a calculator
    When I add 2 and 3
    Then the result should be 5
`;

const options: IGherkinOptions = {
  includeSource: false,
  includeGherkinDocument: true,
  includePickles: true,
  newId: IdGenerator.uuid()
};

const envelopes = generateMessages(
  gherkinSource,
  'calculator.feature',
  SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
  options
);

// Process the results
envelopes.forEach(envelope => {
  if (envelope.gherkinDocument) {
    console.log('Parsed feature:', envelope.gherkinDocument.feature?.name);
  }
  if (envelope.pickle) {
    console.log('Executable scenario:', envelope.pickle.name);
  }
});
```

## Architecture

@cucumber/gherkin is built around several key components:

- **Message Generation**: High-level `generateMessages` function for most use cases
- **Parser Engine**: Core `Parser` class with configurable token matchers and AST builders
- **Token Matching**: Separate matchers for classic Gherkin (.feature) and Markdown formats
- **Language Support**: Comprehensive dialect system supporting 70+ languages
- **Compilation Pipeline**: AST to executable pickles transformation
- **Type Safety**: Full TypeScript integration with Cucumber Messages format

## Capabilities

### Core Parsing

High-level parsing functionality for converting Gherkin source text into structured data formats. Handles both classic .feature files and Gherkin-in-Markdown formats.

```typescript { .api }
function generateMessages(
  data: string,
  uri: string,
  mediaType: SourceMediaType,
  options: IGherkinOptions
): readonly Envelope[];

function makeSourceEnvelope(data: string, uri: string): Envelope;

interface IGherkinOptions {
  defaultDialect?: string;
  includeSource?: boolean;
  includeGherkinDocument?: boolean;
  includePickles?: boolean;
  newId?: IdGenerator.NewId;
}
```

[Core Parsing](./core-parsing.md)

### Parser Components

Low-level parser components for building custom parsing workflows. Includes the main Parser class, AST builder, and token scanner.

```typescript { .api }
class Parser<AstNode, TokenType, RuleType> {
  constructor(
    builder: IAstBuilder<AstNode, TokenType, RuleType>,
    tokenMatcher: ITokenMatcher<TokenType>
  );
  stopAtFirstError: boolean;
  parse(gherkinSource: string): GherkinDocument;
}

class AstBuilder implements IAstBuilder<AstNode, TokenType, RuleType> {
  constructor(newId: IdGenerator.NewId);
  stack: AstNode[];
  comments: Comment[];
  newId: IdGenerator.NewId;
  getResult(): GherkinDocument;
}

class TokenScanner {
  constructor(
    source: string,
    makeToken: (line: string, location: Location) => IToken<TokenType>
  );
  read(): IToken<TokenType>;
}
```

[Parser Components](./parser-components.md)

### Token Matching

Token matchers that recognize different Gherkin syntax formats. Includes matchers for classic .feature files and Gherkin-in-Markdown.

```typescript { .api }
class GherkinClassicTokenMatcher implements ITokenMatcher<TokenType> {
  constructor(defaultDialectName?: string);
  changeDialect(newDialectName: string, location?: Location): void;
  reset(): void;
}

class GherkinInMarkdownTokenMatcher implements ITokenMatcher<TokenType> {
  constructor(defaultDialectName?: string);
  changeDialect(newDialectName: string, location?: Location): void;
  reset(): void;
}
```

[Token Matching](./token-matching.md)

### Language Support

Comprehensive internationalization support with built-in dialects for 70+ languages and configurable language-specific keywords.

```typescript { .api }
const dialects: Readonly<{ [key: string]: Dialect }>;

interface Dialect {
  readonly name: string;
  readonly native: string;
  readonly feature: readonly string[];
  readonly background: readonly string[];
  readonly rule: readonly string[];
  readonly scenario: readonly string[];
  readonly scenarioOutline: readonly string[];
  readonly examples: readonly string[];
  readonly given: readonly string[];
  readonly when: readonly string[];
  readonly then: readonly string[];
  readonly and: readonly string[];
  readonly but: readonly string[];
}
```

[Language Support](./language-support.md)

### Pickle Compilation

Transforms parsed Gherkin documents into executable test scenarios (pickles), handling scenario outlines, background steps, and variable interpolation.

```typescript { .api }
function compile(
  gherkinDocument: GherkinDocument,
  uri: string,
  newId: IdGenerator.NewId
): readonly Pickle[];
```

[Pickle Compilation](./pickle-compilation.md)

### Error Handling

Comprehensive error handling with specific exception types for different parsing and validation scenarios.

```typescript { .api }
namespace Errors {
  class GherkinException extends Error {
    errors: Error[];
    location: Location;
  }
  
  class ParserException extends GherkinException {
    static create(message: string, line: number, column: number): ParserException;
  }
  
  class CompositeParserException extends GherkinException {
    static create(errors: Error[]): CompositeParserException;
  }
  
  class AstBuilderException extends GherkinException {
    static create(message: string, location: Location): AstBuilderException;
  }
  
  class NoSuchLanguageException extends GherkinException {
    static create(language: string, location?: Location): NoSuchLanguageException;
  }
}
```

[Error Handling](./error-handling.md)

## Types

### Core Types

```typescript { .api }
enum TokenType {
  None,
  EOF,
  Empty,
  Comment,
  TagLine,
  FeatureLine,
  RuleLine,
  BackgroundLine,
  ScenarioLine,
  ExamplesLine,
  StepLine,
  DocStringSeparator,
  TableRow,
  Language,
  Other
}

enum RuleType {
  None,
  _EOF,
  _Empty,
  _Comment,
  _TagLine,
  _FeatureLine,
  _RuleLine,
  _BackgroundLine,
  _ScenarioLine,
  _ExamplesLine,
  _StepLine,
  _DocStringSeparator,
  _TableRow,
  _Language,
  _Other,
  GherkinDocument,
  Feature,
  FeatureHeader,
  Rule,
  RuleHeader,
  Background,
  ScenarioDefinition,
  Scenario,
  ExamplesDefinition,
  Examples,
  ExamplesTable,
  Step,
  StepArg,
  DataTable,
  DocString,
  Tags,
  DescriptionHelper,
  Description
}

class AstNode {
  constructor(ruleType: RuleType);
  add(type: any, obj: any): void;
  getSingle(ruleType: RuleType): any;
  getItems(ruleType: RuleType): any[];
  getToken(tokenType: TokenType): IToken<TokenType>;
  getTokens(tokenType: TokenType): IToken<TokenType>[];
}

interface IToken<TokenType> {
  location: Location;
  line: IGherkinLine;
  isEof: boolean;
  matchedText?: string;
  matchedType: TokenType;
  matchedItems: readonly Item[];
  matchedKeyword: string;
  matchedKeywordType: StepKeywordType;
  matchedIndent: number;
  matchedGherkinDialect: string;
  getTokenValue(): string;
  detach(): void;
}

interface IGherkinLine {
  readonly lineNumber: number;
  readonly isEmpty: boolean;
  readonly indent?: number;
  readonly trimmedLineText: string;
  getTableCells(): readonly Item[];
  startsWith(prefix: string): boolean;
  getRestTrimmed(length: number): string;
  getLineText(number: number): string;
  startsWithTitleKeyword(keyword: string): boolean;
}

type Item = {
  column: number;
  text: string;
};

// From @cucumber/messages
interface Location {
  line: number;
  column?: number;
}

interface StepKeywordType {
  UNKNOWN: 'unknown';
  CONTEXT: 'context';
  ACTION: 'action';
  OUTCOME: 'outcome';
  CONJUNCTION: 'conjunction';
}
```