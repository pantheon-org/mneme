# Parser Components

Low-level parser components for building custom parsing workflows. These components provide fine-grained control over the parsing process and are used internally by the high-level `generateMessages` function.

## Capabilities

### Parser Class

The core parser that processes tokens and builds an Abstract Syntax Tree (AST) using configurable token matchers and AST builders.

```typescript { .api }
/**
 * Core Gherkin parser that processes tokens into an AST
 */
class Parser<AstNode, TokenType, RuleType> {
  constructor(
    builder: IAstBuilder<AstNode, TokenType, RuleType>,
    tokenMatcher: ITokenMatcher<TokenType>
  );
  
  /** Whether to stop parsing on the first error encountered. Defaults to true */
  stopAtFirstError: boolean;
  
  /**
   * Parse Gherkin source text into a GherkinDocument
   * @param gherkinSource - The Gherkin source text to parse
   * @returns Parsed GherkinDocument AST
   * @throws ParserException if parsing fails and stopAtFirstError is true
   */
  parse(gherkinSource: string): GherkinDocument;
}
```

**Usage Examples:**

```typescript
import { 
  Parser, 
  AstBuilder, 
  GherkinClassicTokenMatcher,
  TokenType,
  RuleType,
  AstNode
} from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

// Create parser components
const tokenMatcher = new GherkinClassicTokenMatcher('en');
const astBuilder = new AstBuilder(IdGenerator.uuid());
const parser = new Parser(astBuilder, tokenMatcher);

// Configure parser behavior
parser.stopAtFirstError = false; // Continue parsing after errors

// Parse Gherkin source
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
`;

try {
  const document = parser.parse(gherkinSource);
  console.log('Feature name:', document.feature?.name);
  console.log('Scenarios:', document.feature?.children?.length);
} catch (error) {
  console.error('Parsing failed:', error.message);
}

// Custom parser with French language support
const frenchMatcher = new GherkinClassicTokenMatcher('fr');
const frenchBuilder = new AstBuilder(IdGenerator.uuid());
const frenchParser = new Parser(frenchBuilder, frenchMatcher);

const frenchSource = `
Fonctionnalité: Calculatrice
  Scénario: Addition
    Soit j'ai une calculatrice
    Quand j'additionne 2 et 3
    Alors le résultat devrait être 5
`;

const frenchDocument = frenchParser.parse(frenchSource);
```

### AST Builder

Builds Abstract Syntax Tree (AST) from parser events and transforms it into Cucumber Messages format. Manages the parsing state and constructs the final document structure.

```typescript { .api }
/**
 * Builds AST from parser events and transforms to Cucumber Messages format
 */
class AstBuilder implements IAstBuilder<AstNode, TokenType, RuleType> {
  constructor(newId: IdGenerator.NewId);
  
  /** Parser state stack for tracking nested elements */
  stack: AstNode[];
  
  /** Collected comments during parsing */
  comments: Comment[];
  
  /** ID generator function for creating unique identifiers */
  newId: IdGenerator.NewId;
  
  /** Reset the builder state for reuse */
  reset(): void;
  
  /** Start processing a new grammar rule */
  startRule(ruleType: RuleType): void;
  
  /** End processing the current grammar rule */
  endRule(): void;
  
  /** Build AST node from a token */
  build(token: IToken<TokenType>): void;
  
  /** Get the final parsed GherkinDocument */
  getResult(): GherkinDocument;
  
  /** Get the current AST node being built */
  currentNode(): AstNode;
  
  /** Get location information from a token */
  getLocation(token: IToken<TokenType>, column?: number): Location;
  
  /** Extract tags from an AST node */
  getTags(node: AstNode): readonly Tag[];
  
  /** Extract table cells from a table row token */
  getCells(tableRowToken: IToken<TokenType>): readonly TableCell[];
  
  /** Extract description text from an AST node */
  getDescription(node: AstNode): string;
  
  /** Extract steps from an AST node */
  getSteps(node: AstNode): Step[];
  
  /** Extract table rows from an AST node */
  getTableRows(node: AstNode): readonly TableRow[];
  
  /** Ensure all table rows have the same number of cells */  
  ensureCellCount(rows: TableRow[]): void;
  
  /** Transform an AST node to its final format */
  transformNode(node: AstNode): any;
}
```

**Usage Examples:**

```typescript
import { AstBuilder, AstNode, RuleType, TokenType } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

// Create AST builder
const builder = new AstBuilder(IdGenerator.uuid());

// Monitor parsing progress
builder.startRule(RuleType.Feature);
console.log('Current stack depth:', builder.stack.length);

// Access collected comments
console.log('Comments found:', builder.comments.length);

// Get final result after parsing
const document = builder.getResult();

// Custom ID generation
const customBuilder = new AstBuilder(() => `ast-${Date.now()}`);

// Reset for reuse
builder.reset();
console.log('Builder reset, stack cleared:', builder.stack.length === 0);
```

### Token Scanner

Converts Gherkin source text into a stream of tokens for parsing. Handles line-by-line scanning and token creation.

```typescript { .api }
/**
 * Scans Gherkin source text and produces tokens for parsing
 */
class TokenScanner {
  constructor(
    source: string,
    makeToken: (line: string, location: Location) => IToken<TokenType>
  );
  
  /**
   * Read the next token from the source
   * @returns Next token or EOF token when source is exhausted
   */
  read(): IToken<TokenType>;
}
```

**Usage Examples:**

```typescript
import { TokenScanner, Token, TokenType } from "@cucumber/gherkin";

// Create token factory
const makeToken = (line: string, location: Location) => 
  new Token(undefined, location);

// Create scanner
const source = `
Feature: Example
  Scenario: Test
    Given something
`;

const scanner = new TokenScanner(source, makeToken);

// Read tokens
let token = scanner.read();
while (!token.isEof) {
  console.log('Token at line', token.location.line, ':', token.line?.trimmedLineText);
  token = scanner.read();
}
```

### Token Class

Represents a single token in the Gherkin source with associated metadata and matching information.

```typescript { .api }
/**
 * Represents a token in the Gherkin source with matching metadata
 */
class Token implements IToken<TokenType> {
  /** Whether this is the end-of-file token */
  isEof: boolean;
  
  /** The matched text content for this token */
  matchedText?: string;
  
  /** The type of token that was matched */
  matchedType: TokenType;
  
  /** Items extracted from the token (e.g., table cells) */
  matchedItems: readonly Item[];
  
  /** The matched keyword (e.g., "Given", "When", "Then") */
  matchedKeyword: string;
  
  /** The indentation level of this token */
  matchedIndent: number;
  
  /** The Gherkin dialect/language for this token */
  matchedGherkinDialect: string;
  
  /** The type of step keyword (Context, Action, Outcome, Conjunction) */
  matchedKeywordType: StepKeywordType;
  
  /** The line information for this token */
  readonly line: GherkinLine;
  
  /** The location (line/column) of this token */
  readonly location: Location;
  
  /**
   * Get the token's text value
   * @returns The text content of the token
   */
  getTokenValue(): string;
  
  /** Detach the token from its line (for memory management) */
  detach(): void;
}
```

## AST Node Structure

The AST builder creates a hierarchical structure of nodes representing the parsed Gherkin document:

```typescript { .api }
/**
 * Node in the Abstract Syntax Tree representing parsed Gherkin elements
 */
class AstNode {
  constructor(ruleType: RuleType);
  
  /**
   * Add a child element to this node
   * @param type - The type/rule of the child element
   * @param obj - The child object to add
   */
  add(type: any, obj: any): void;
  
  /**
   * Get a single child element of the specified type
   * @param ruleType - The rule type to search for
   * @returns The first matching child or undefined
   */
  getSingle(ruleType: RuleType): any;
  
  /**
   * Get all child elements of the specified type
   * @param ruleType - The rule type to search for
   * @returns Array of matching children
   */
  getItems(ruleType: RuleType): any[];
  
  /**
   * Get a single token of the specified type
   * @param tokenType - The token type to search for
   * @returns The first matching token or undefined
   */
  getToken(tokenType: TokenType): IToken<TokenType>;
  
  /**
   * Get all tokens of the specified type
   * @param tokenType - The token type to search for
   * @returns Array of matching tokens
   */
  getTokens(tokenType: TokenType): IToken<TokenType>[];
}
```

## Parser State Machine

The parser uses a state machine based on grammar rules defined in the `RuleType` enum:

```typescript { .api }
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
```

## Custom Parser Example

Building a custom parser with specific configuration:

```typescript
import { 
  Parser, 
  AstBuilder, 
  GherkinClassicTokenMatcher,
  TokenScanner,
  Token
} from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

// Custom token creation
const makeToken = (line: string, location: Location) => {
  return new Token(undefined, location);
};

// Create custom parser pipeline
const source = `Feature: Custom Parser Example`;
const scanner = new TokenScanner(source, makeToken);
const matcher = new GherkinClassicTokenMatcher('en');
const builder = new AstBuilder(IdGenerator.uuid());
const parser = new Parser(builder, matcher);

// Configure for error collection
parser.stopAtFirstError = false;

// Parse with custom pipeline
const document = parser.parse(source);
console.log('Parsed with custom pipeline:', document.feature?.name);
```