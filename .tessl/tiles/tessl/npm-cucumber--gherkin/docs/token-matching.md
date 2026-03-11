# Token Matching

Token matchers recognize different Gherkin syntax formats and determine what type of content each line represents. The library includes specialized matchers for classic .feature files and Gherkin-in-Markdown formats.

## Capabilities

### Gherkin Classic Token Matcher

Token matcher for traditional .feature files with standard Gherkin syntax. Recognizes standard Gherkin keywords and structures.

```typescript { .api }
/**
 * Token matcher for classic Gherkin (.feature) files
 */
class GherkinClassicTokenMatcher implements ITokenMatcher<TokenType> {
  constructor(defaultDialectName?: string);
  
  /**
   * Change the current language dialect
   * @param newDialectName - Language code (e.g., 'en', 'fr', 'de')
   * @param location - Optional location for error reporting
   */
  changeDialect(newDialectName: string, location?: Location): void;
  
  /** Reset the matcher state */
  reset(): void;
  
  // Token matching methods
  match_TagLine(token: IToken<TokenType>): boolean;
  match_FeatureLine(token: IToken<TokenType>): boolean;
  match_ScenarioLine(token: IToken<TokenType>): boolean;
  match_BackgroundLine(token: IToken<TokenType>): boolean;
  match_ExamplesLine(token: IToken<TokenType>): boolean;
  match_RuleLine(token: IToken<TokenType>): boolean;
  match_TableRow(token: IToken<TokenType>): boolean;
  match_Empty(token: IToken<TokenType>): boolean;
  match_Comment(token: IToken<TokenType>): boolean;
  match_Language(token: IToken<TokenType>): boolean;
  match_DocStringSeparator(token: IToken<TokenType>): boolean;
  match_EOF(token: IToken<TokenType>): boolean;
  match_StepLine(token: IToken<TokenType>): boolean;
  match_Other(token: IToken<TokenType>): boolean;
}
```

**Usage Examples:**

```typescript
import { GherkinClassicTokenMatcher, TokenScanner, Token } from "@cucumber/gherkin";

// Create matcher with default English
const matcher = new GherkinClassicTokenMatcher();

// Create matcher with specific language
const frenchMatcher = new GherkinClassicTokenMatcher('fr');

// Change language during parsing
matcher.changeDialect('de');

// Test token matching
const makeToken = (line: string, location: Location) => new Token(undefined, location);
const scanner = new TokenScanner(`Feature: Example`, makeToken);
const token = scanner.read();

if (matcher.match_FeatureLine(token)) {
  console.log('Matched feature line:', token.matchedKeyword);
  console.log('Feature name:', token.matchedText);
}

// Reset for reuse
matcher.reset();

// Language detection example
const multiLanguageSource = `
# language: fr
Fonctionnalité: Exemple
  Scénario: Test
    Soit quelque chose se passe
`;

const multiScanner = new TokenScanner(multiLanguageSource, makeToken);
let currentToken = multiScanner.read();

while (!currentToken.isEof) {
  if (matcher.match_Language(currentToken)) {
    console.log('Language directive found:', currentToken.matchedText);
    matcher.changeDialect(currentToken.matchedText);
  } else if (matcher.match_FeatureLine(currentToken)) {
    console.log('Feature in', currentToken.matchedGherkinDialect, ':', currentToken.matchedText);
  }
  currentToken = multiScanner.read();
}
```

### Gherkin in Markdown Token Matcher

Token matcher for Gherkin-in-Markdown syntax (.md files). Recognizes Markdown-style headers and formatting conventions for Gherkin content.

```typescript { .api }
/**
 * Token matcher for Gherkin-in-Markdown (.md) files
 */
class GherkinInMarkdownTokenMatcher implements ITokenMatcher<TokenType> {
  constructor(defaultDialectName?: string);
  
  /**
   * Change the current language dialect
   * @param newDialectName - Language code (e.g., 'en', 'fr', 'de')
   * @param location - Optional location for error reporting
   */
  changeDialect(newDialectName: string, location?: Location): void;
  
  /** Reset the matcher state */
  reset(): void;
  
  // Token matching methods (same interface as GherkinClassicTokenMatcher)
  match_TagLine(token: IToken<TokenType>): boolean;
  match_FeatureLine(token: IToken<TokenType>): boolean;
  match_ScenarioLine(token: IToken<TokenType>): boolean;
  match_BackgroundLine(token: IToken<TokenType>): boolean;
  match_ExamplesLine(token: IToken<TokenType>): boolean;
  match_RuleLine(token: IToken<TokenType>): boolean;
  match_TableRow(token: IToken<TokenType>): boolean;
  match_Empty(token: IToken<TokenType>): boolean;
  match_Comment(token: IToken<TokenType>): boolean;
  match_Language(token: IToken<TokenType>): boolean;
  match_DocStringSeparator(token: IToken<TokenType>): boolean;
  match_EOF(token: IToken<TokenType>): boolean;
  match_StepLine(token: IToken<TokenType>): boolean;
  match_Other(token: IToken<TokenType>): boolean;
}
```

**Usage Examples:**

```typescript
import { GherkinInMarkdownTokenMatcher, TokenScanner, Token } from "@cucumber/gherkin";

// Create Markdown matcher
const markdownMatcher = new GherkinInMarkdownTokenMatcher('en');

// Example Markdown Gherkin content
const markdownSource = `
# Feature: Shopping Cart

## Background:
* Given I have an empty shopping cart

## Scenario: Add item to cart
* When I add a "laptop" to the cart
* Then the cart should contain 1 item

### Examples:
| item | quantity |
| book | 2 |
| pen  | 5 |
`;

const makeToken = (line: string, location: Location) => new Token(undefined, location);
const scanner = new TokenScanner(markdownSource, makeToken);

let token = scanner.read();
while (!token.isEof) {
  if (markdownMatcher.match_FeatureLine(token)) {
    console.log('Markdown feature:', token.matchedKeyword, token.matchedText);
  } else if (markdownMatcher.match_ScenarioLine(token)) {
    console.log('Markdown scenario:', token.matchedKeyword, token.matchedText);
  } else if (markdownMatcher.match_StepLine(token)) {
    console.log('Markdown step:', token.matchedKeyword, token.matchedText);
  } else if (markdownMatcher.match_TableRow(token)) {
    console.log('Markdown table row:', token.matchedItems.map(item => item.text));
  }
  token = scanner.read();
}
```

## Key Differences Between Matchers

### Classic Gherkin Format (.feature files)

- **Headers**: Plain keywords (`Feature:`, `Scenario:`, `Background:`)
- **Steps**: Keywords followed by text (`Given I have a calculator`)
- **Tags**: Separate lines with @ symbols (`@smoke @regression`)  
- **Tables**: Pipe-separated values (`| column1 | column2 |`)
- **Comments**: Lines starting with `#`

### Gherkin-in-Markdown Format (.md files)

- **Headers**: Markdown headers (`# Feature:`, `## Scenario:`, `### Examples:`)
- **Steps**: Bullet points (`* Given`, `- When`, `+ Then`)
- **Tags**: Inline with backticks (`` `@smoke` `@regression` ``)
- **Tables**: Standard Markdown tables with header separators
- **Comments**: Standard Markdown comments (`<!-- comment -->`)

## Token Matcher Interface

Both matchers implement the same interface for consistent usage:

```typescript { .api }
interface ITokenMatcher<TokenType> {
  /**
   * Change the current language dialect
   * @param newDialectName - Language code for the new dialect
   * @param location - Optional location for error reporting
   */
  changeDialect(newDialectName: string, location?: Location): void;
  
  /** Reset the matcher state for reuse */
  reset(): void;
  
  // Token matching methods - return true if token matches the type
  match_TagLine(token: IToken<TokenType>): boolean;
  match_FeatureLine(token: IToken<TokenType>): boolean;
  match_ScenarioLine(token: IToken<TokenType>): boolean;
  match_BackgroundLine(token: IToken<TokenType>): boolean;
  match_ExamplesLine(token: IToken<TokenType>): boolean;
  match_RuleLine(token: IToken<TokenType>): boolean;
  match_TableRow(token: IToken<TokenType>): boolean;
  match_Empty(token: IToken<TokenType>): boolean;
  match_Comment(token: IToken<TokenType>): boolean;
  match_Language(token: IToken<TokenType>): boolean;
  match_DocStringSeparator(token: IToken<TokenType>): boolean;
  match_EOF(token: IToken<TokenType>): boolean;
  match_StepLine(token: IToken<TokenType>): boolean;
  match_Other(token: IToken<TokenType>): boolean;
}
```

## Custom Token Matching

You can implement custom token matchers for specialized formats:

```typescript
import { ITokenMatcher, TokenType } from "@cucumber/gherkin";

class CustomTokenMatcher implements ITokenMatcher<TokenType> {
  constructor(private dialectName: string = 'en') {}
  
  changeDialect(newDialectName: string, location?: Location): void {
    this.dialectName = newDialectName;
    // Implement dialect change logic
  }
  
  reset(): void {
    // Reset any internal state
  }
  
  match_FeatureLine(token: IToken<TokenType>): boolean {
    // Custom feature line matching logic
    const line = token.line?.trimmedLineText || '';
    if (line.startsWith('CUSTOM_FEATURE:')) {
      token.matchedKeyword = 'CUSTOM_FEATURE:';
      token.matchedText = line.substring(15).trim();
      token.matchedType = TokenType.FeatureLine;
      return true;
    }
    return false;
  }
  
  // Implement other match methods...
}

// Use custom matcher
const customMatcher = new CustomTokenMatcher('en');
const parser = new Parser(new AstBuilder(IdGenerator.uuid()), customMatcher);
```

## Token Matching Process

The token matching process follows these steps:

1. **Line Processing**: Each line of source text is converted to a token
2. **Pattern Recognition**: Matchers test various patterns against the line
3. **Keyword Extraction**: When a match is found, keywords and content are extracted
4. **Metadata Assignment**: Additional metadata (dialect, indent, type) is assigned
5. **Parser Integration**: Matched tokens are passed to the parser for AST construction

## Language Support in Token Matching

Token matchers support dynamic language switching:

```typescript
import { GherkinClassicTokenMatcher } from "@cucumber/gherkin";

const matcher = new GherkinClassicTokenMatcher('en');

// Process multi-language content
const multiLanguageContent = `
Feature: English Feature
  Scenario: English Scenario
    Given something in English

# language: fr
Fonctionnalité: French Feature
  Scénario: French Scenario
    Soit quelque chose en français
`;

// The matcher will automatically switch dialects when it encounters
// language directives in the content
```