# AST and Parsing

Abstract syntax tree components for expression parsing, including nodes, tokens, and utility functions for working with parsed expression structures.

## Capabilities

### AST Node

Represents a node in the abstract syntax tree of a parsed Cucumber Expression.

```typescript { .api }
/**
 * AST node for parsed Cucumber Expressions
 * Represents different parts of the expression structure (text, parameters, optionals, etc.)
 */
class Node implements Located {
  /**
   * Create an AST node
   * @param type - Type of node (text, parameter, optional, etc.)
   * @param nodes - Child nodes for compound structures
   * @param token - Token string for leaf nodes
   * @param start - Start position in source expression
   * @param end - End position in source expression
   */
  constructor(
    type: NodeType,
    nodes: readonly Node[] | undefined,
    token: string | undefined,
    start: number,
    end: number
  );
  
  /**
   * Get text content of this node and all children
   * @returns Combined text content
   */
  text(): string;
  
  /** Type of AST node */
  readonly type: NodeType;
  
  /** Child nodes for compound structures */
  readonly nodes: readonly Node[] | undefined;
  
  /** Start position in source expression */
  readonly start: number;
  
  /** End position in source expression */
  readonly end: number;
}
```

**Usage Examples:**

```typescript
import { CucumberExpression, ParameterTypeRegistry, NodeType } from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();
const expression = new CucumberExpression("I have {int} cucumber(s)", registry);

// Access the AST
const ast = expression.ast;
console.log(`Root node type: ${ast.type}`); // "EXPRESSION_NODE"
console.log(`Full text: "${ast.text()}"`);  // "I have {int} cucumber(s)"

// Traverse AST nodes
function traverseAST(node: Node, depth = 0) {
  const indent = "  ".repeat(depth);
  console.log(`${indent}${node.type}: "${node.text()}" [${node.start}-${node.end}]`);
  
  if (node.nodes) {
    node.nodes.forEach(child => traverseAST(child, depth + 1));
  }
}

traverseAST(ast);
// Output shows the hierarchical structure:
// EXPRESSION_NODE: "I have {int} cucumber(s)" [0-23]
//   TEXT_NODE: "I have " [0-7]
//   PARAMETER_NODE: "int" [8-11]
//   TEXT_NODE: " cucumber" [12-21]
//   OPTIONAL_NODE: "s" [22-23]
```

### Token

Represents a token from the tokenization phase of expression parsing.

```typescript { .api }
/**
 * Token from Cucumber Expression parsing
 * Represents atomic elements like text, parameters, special characters
 */
class Token implements Located {
  /**
   * Create a token
   * @param type - Type of token (text, parameter, special character, etc.)
   * @param text - Token text content
   * @param start - Start position in source expression
   * @param end - End position in source expression
   */
  constructor(type: TokenType, text: string, start: number, end: number);
  
  /**
   * Check if character is an escape character (\)
   * @param codePoint - Character to check
   * @returns True if character is escape character
   */
  static isEscapeCharacter(codePoint: string): boolean;
  
  /**
   * Check if character can be escaped
   * @param codePoint - Character to check
   * @returns True if character can be escaped with backslash
   */
  static canEscape(codePoint: string): boolean;
  
  /**
   * Get token type for a character
   * @param codePoint - Character to analyze
   * @returns Token type for the character
   */
  static typeOf(codePoint: string): TokenType;
  
  /** Type of token */
  readonly type: TokenType;
  
  /** Token text content */
  readonly text: string;
  
  /** Start position in source expression */
  readonly start: number;
  
  /** End position in source expression */
  readonly end: number;
}
```

**Usage Examples:**

```typescript
import { Token, TokenType } from "@cucumber/cucumber-expressions";

// Check character properties
console.log(Token.isEscapeCharacter('\\')); // true
console.log(Token.isEscapeCharacter('a'));  // false

console.log(Token.canEscape('{')); // true
console.log(Token.canEscape('a')); // false

// Get token types
console.log(Token.typeOf('{')); // TokenType.beginParameter
console.log(Token.typeOf('}')); // TokenType.endParameter
console.log(Token.typeOf('(')); // TokenType.beginOptional
console.log(Token.typeOf(')')); // TokenType.endOptional
console.log(Token.typeOf('/')); // TokenType.alternation
console.log(Token.typeOf(' ')); // TokenType.whiteSpace
console.log(Token.typeOf('a')); // TokenType.text

// Create tokens manually
const textToken = new Token(TokenType.text, "hello", 0, 5);
const paramToken = new Token(TokenType.beginParameter, "{", 5, 6);

console.log(`Text token: "${textToken.text}" at ${textToken.start}-${textToken.end}`);
```

## AST Node Types

### Node Type Enum

```typescript { .api }
/**
 * Types of nodes in the abstract syntax tree
 * Each type represents a different syntactic element
 */
enum NodeType {
  /** Plain text content */
  text = 'TEXT_NODE',
  
  /** Optional text enclosed in parentheses */
  optional = 'OPTIONAL_NODE',
  
  /** Alternation group containing alternatives */
  alternation = 'ALTERNATION_NODE',
  
  /** Single alternative within an alternation */
  alternative = 'ALTERNATIVE_NODE',
  
  /** Parameter reference like {int} or {string} */
  parameter = 'PARAMETER_NODE',
  
  /** Root node of the expression */
  expression = 'EXPRESSION_NODE'
}
```

### Token Type Enum

```typescript { .api }
/**
 * Types of tokens in Cucumber Expression parsing
 * Each type represents a different lexical element
 */
enum TokenType {
  /** Start of input */
  startOfLine = 'START_OF_LINE',
  
  /** End of input */
  endOfLine = 'END_OF_LINE',
  
  /** Whitespace characters */
  whiteSpace = 'WHITE_SPACE',
  
  /** Opening parenthesis ( for optional text */
  beginOptional = 'BEGIN_OPTIONAL',
  
  /** Closing parenthesis ) for optional text */
  endOptional = 'END_OPTIONAL',
  
  /** Opening brace { for parameters */
  beginParameter = 'BEGIN_PARAMETER',
  
  /** Closing brace } for parameters */
  endParameter = 'END_PARAMETER',
  
  /** Forward slash / for alternation */
  alternation = 'ALTERNATION',
  
  /** Regular text content */
  text = 'TEXT'
}
```

## AST Utility Functions

### Symbol and Purpose Functions

```typescript { .api }
/**
 * Get the symbol character for a token type
 * @param token - Token type to get symbol for
 * @returns Symbol character or empty string
 */
function symbolOf(token: TokenType): string;

/**
 * Get human-readable purpose description for a token type
 * @param token - Token type to describe
 * @returns Purpose description
 */
function purposeOf(token: TokenType): string;
```

**Usage Examples:**

```typescript
import { symbolOf, purposeOf, TokenType } from "@cucumber/cucumber-expressions";

// Get symbols for token types
console.log(symbolOf(TokenType.beginParameter));  // "{"
console.log(symbolOf(TokenType.endParameter));    // "}"
console.log(symbolOf(TokenType.beginOptional));   // "("
console.log(symbolOf(TokenType.endOptional));     // ")"
console.log(symbolOf(TokenType.alternation));     // "/"

// Get purpose descriptions
console.log(purposeOf(TokenType.beginParameter)); // "a parameter"
console.log(purposeOf(TokenType.beginOptional));  // "optional text"
console.log(purposeOf(TokenType.alternation));    // "alternation"
```

## Location Interface

### Located Interface

```typescript { .api }
/**
 * Interface for objects with position information
 * Used by nodes and tokens to track location in source text
 */
interface Located {
  /** Start position in source expression */
  readonly start: number;
  
  /** End position in source expression */
  readonly end: number;
}
```

## Advanced AST Usage

### AST Analysis

```typescript
import { CucumberExpression, ParameterTypeRegistry, NodeType } from "@cucumber/cucumber-expressions";

const registry = new ParameterTypeRegistry();
const expression = new CucumberExpression(
  "I have {int} cucumber(s) and {float} dollar(s)", 
  registry
);

// Analyze AST structure
function analyzeAST(node: Node): any {
  const result: any = {
    type: node.type,
    text: node.text(),
    position: `${node.start}-${node.end}`
  };
  
  if (node.nodes && node.nodes.length > 0) {
    result.children = node.nodes.map(child => analyzeAST(child));
  }
  
  return result;
}

const analysis = analyzeAST(expression.ast);
console.log(JSON.stringify(analysis, null, 2));

// Count different node types
function countNodeTypes(node: Node, counts: Record<string, number> = {}): Record<string, number> {
  counts[node.type] = (counts[node.type] || 0) + 1;
  
  if (node.nodes) {
    node.nodes.forEach(child => countNodeTypes(child, counts));
  }
  
  return counts;
}

const nodeCounts = countNodeTypes(expression.ast);
console.log("Node type counts:", nodeCounts);
// { EXPRESSION_NODE: 1, TEXT_NODE: 4, PARAMETER_NODE: 2, OPTIONAL_NODE: 2 }
```

### Parameter Extraction from AST

```typescript
import { Node, NodeType } from "@cucumber/cucumber-expressions";

function extractParameters(node: Node): string[] {
  const parameters: string[] = [];
  
  if (node.type === NodeType.parameter) {
    parameters.push(node.text());
  }
  
  if (node.nodes) {
    node.nodes.forEach(child => {
      parameters.push(...extractParameters(child));
    });
  }
  
  return parameters;
}

const registry = new ParameterTypeRegistry();
const expression = new CucumberExpression(
  "Transfer {int} from {string} to {string}",
  registry
);

const parameters = extractParameters(expression.ast);
console.log("Parameters found:", parameters); // ["int", "string", "string"]
```

### AST Validation

```typescript
import { Node, NodeType } from "@cucumber/cucumber-expressions";

function validateAST(node: Node): string[] {
  const errors: string[] = [];
  
  // Check for empty optional nodes
  if (node.type === NodeType.optional && node.text().trim() === '') {
    errors.push(`Empty optional node at ${node.start}-${node.end}`);
  }
  
  // Check for nested optionals (not allowed)
  if (node.type === NodeType.optional && node.nodes) {
    const hasNestedOptional = node.nodes.some(child => 
      child.type === NodeType.optional
    );
    if (hasNestedOptional) {
      errors.push(`Nested optional not allowed at ${node.start}-${node.end}`);
    }
  }
  
  // Recursively validate children
  if (node.nodes) {
    node.nodes.forEach(child => {
      errors.push(...validateAST(child));
    });
  }
  
  return errors;
}

// Validate expression AST
const validationErrors = validateAST(expression.ast);
if (validationErrors.length > 0) {
  console.log("Validation errors:", validationErrors);
} else {
  console.log("AST is valid");
}
```

## Token Character Analysis

### Special Characters

The parser recognizes these special characters:

```typescript
// Special characters and their meanings
const specialChars = {
  '\\': 'Escape character',
  '/':  'Alternation separator', 
  '{':  'Parameter start',
  '}':  'Parameter end',
  '(':  'Optional text start',
  ')':  'Optional text end',
  ' ':  'Whitespace'
};

// Characters that can be escaped
const escapableChars = ['\\', '/', '{', '}', '(', ')', ' '];

// Check if character needs escaping
function needsEscaping(char: string): boolean {
  return Token.canEscape(char);
}

console.log(needsEscaping('{')); // true
console.log(needsEscaping('a')); // false
```

### Custom Token Processing

```typescript
import { Token, TokenType } from "@cucumber/cucumber-expressions";

function tokenizeExpression(expression: string): Token[] {
  const tokens: Token[] = [];
  
  for (let i = 0; i < expression.length; i++) {
    const char = expression[i];
    const tokenType = Token.typeOf(char);
    
    tokens.push(new Token(tokenType, char, i, i + 1));
  }
  
  return tokens;
}

const tokens = tokenizeExpression("I have {int} cucumber(s)");
tokens.forEach(token => {
  console.log(`${token.type}: "${token.text}" [${token.start}-${token.end}]`);
});
```