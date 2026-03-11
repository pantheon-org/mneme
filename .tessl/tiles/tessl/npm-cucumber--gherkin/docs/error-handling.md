# Error Handling

Comprehensive error handling with specific exception types for different parsing and validation scenarios. The library provides detailed error information with location context and recovery mechanisms for robust Gherkin processing.

## Capabilities

### Error Types

The Errors module provides a hierarchy of exception classes for different error scenarios:

```typescript { .api }
namespace Errors {
  /**
   * Base exception class for all Gherkin-related errors
   */
  class GherkinException extends Error {
    /** Array of underlying errors that caused this exception */
    errors: Error[];
    
    /** Location in source where the error occurred */
    location: Location;
    
    /**
     * Create a new GherkinException
     * @param message - Error message
     * @param location - Optional location where error occurred
     */
    protected static _create(message: string, location?: Location): GherkinException;
  }
  
  /**
   * Exception thrown during parsing when syntax is invalid
   */
  class ParserException extends GherkinException {
    /**
     * Create a parser exception with location information
     * @param message - Error description
     * @param line - Line number where error occurred (1-based)
     * @param column - Column number where error occurred (1-based)
     */
    static create(message: string, line: number, column: number): ParserException;
  }
  
  /**
   * Exception containing multiple parsing errors
   */
  class CompositeParserException extends GherkinException {
    /**
     * Create an exception from multiple errors
     * @param errors - Array of errors that occurred during parsing
     */
    static create(errors: Error[]): CompositeParserException;
  }
  
  /**
   * Exception thrown during AST building when structure is invalid
   */
  class AstBuilderException extends GherkinException {
    /**
     * Create an AST builder exception
     * @param message - Error description
     * @param location - Location where error occurred
     */
    static create(message: string, location: Location): AstBuilderException;
  }
  
  /**
   * Exception thrown when an unsupported language is specified
   */
  class NoSuchLanguageException extends GherkinException {
    /**
     * Create a language exception
     * @param language - The unsupported language code
     * @param location - Optional location where language was specified
     */
    static create(language: string, location?: Location): NoSuchLanguageException;
  }
}
```

**Usage Examples:**

```typescript
import { generateMessages, Errors } from "@cucumber/gherkin";
import { SourceMediaType } from "@cucumber/messages";

// Handle parsing errors
const invalidGherkin = `
Feature: Broken Example
  Scenario:
    Given something
    Invalid syntax here
    Then something else
`;

try {
  const envelopes = generateMessages(
    invalidGherkin,
    'broken.feature',
    SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
    { includeGherkinDocument: true }
  );
  
  // Check for parse error envelopes (preferred approach)
  const parseErrors = envelopes.filter(e => e.parseError);
  if (parseErrors.length > 0) {
    parseErrors.forEach(errorEnvelope => {
      const error = errorEnvelope.parseError!;
      console.error('Parse error:', error.message);
      if (error.source?.location) {
        console.error(`  at line ${error.source.location.line}, column ${error.source.location.column}`);
      }
    });
  }
} catch (error) {
  // Handle exceptions (alternative approach)
  if (error instanceof Errors.ParserException) {
    console.error('Parser error:', error.message);
    console.error(`Location: line ${error.location.line}, column ${error.location.column}`);
  } else if (error instanceof Errors.CompositeParserException) {
    console.error('Multiple parsing errors:');
    error.errors.forEach((err, index) => {
      console.error(`  ${index + 1}. ${err.message}`);
    });
  } else if (error instanceof Errors.NoSuchLanguageException) {
    console.error('Unsupported language:', error.message);
  } else {
    console.error('Unexpected error:', error);
  }
}

// Handle language errors
const unsupportedLanguage = `
# language: xyz
Feature: Unsupported Language
  Scenario: Test
    Given something
`;

try {
  generateMessages(
    unsupportedLanguage,
    'unsupported.feature',
    SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
    { includeGherkinDocument: true }
  );
} catch (error) {
  if (error instanceof Errors.NoSuchLanguageException) {
    console.error('Language "xyz" is not supported');
    console.error('Available languages:', Object.keys(dialects).join(', '));
  }
}
```

### Token Exceptions

Additional exceptions for token-level parsing errors:

```typescript { .api }
/**
 * Exception thrown when an unexpected token is encountered
 */
class UnexpectedTokenException extends GherkinException {
  /**
   * Create an unexpected token exception
   * @param token - The unexpected token
   * @param expectedTokenTypes - Array of expected token type names
   */
  static create<TokenType>(
    token: IToken<TokenType>, 
    expectedTokenTypes: string[]
  ): UnexpectedTokenException;
}

/**
 * Exception thrown when end of file is reached unexpectedly
 */
class UnexpectedEOFException extends GherkinException {
  /**
   * Create an unexpected EOF exception
   * @param token - The EOF token
   * @param expectedTokenTypes - Array of expected token type names
   */
  static create<TokenType>(
    token: IToken<TokenType>, 
    expectedTokenTypes: string[]
  ): UnexpectedEOFException;
}
```

**Usage Examples:**

```typescript
import { Parser, AstBuilder, GherkinClassicTokenMatcher, Errors } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

// Custom parser with detailed error handling
const incompleteGherkin = `
Feature: Incomplete Example
  Scenario: Unfinished
    Given something
    When
`;

const matcher = new GherkinClassicTokenMatcher('en');
const builder = new AstBuilder(IdGenerator.uuid());
const parser = new Parser(builder, matcher);

try {
  const document = parser.parse(incompleteGherkin);
} catch (error) {
  if (error instanceof Errors.UnexpectedTokenException) {
    console.error('Unexpected token encountered:');
    console.error('Token:', error.token?.getTokenValue());
    console.error('Expected one of:', error.expectedTokenTypes.join(', '));
    console.error(`At line ${error.location.line}, column ${error.location.column}`);
  } else if (error instanceof Errors.UnexpectedEOFException) {
    console.error('Unexpected end of file');
    console.error('Expected one of:', error.expectedTokenTypes.join(', '));
  }
}
```

## Error Recovery Strategies

### Graceful Error Handling

The library provides multiple approaches for handling errors gracefully:

#### 1. Error Envelopes (Recommended)

```typescript
import { generateMessages } from "@cucumber/gherkin";

const problematicGherkin = `
Feature: Error Recovery Example
  Scenario: Good scenario
    Given this works fine
    
  Scenario: Broken scenario
    Given this has
    invalid syntax
    
  Scenario: Another good scenario  
    Given this also works
`;

// Generate messages returns errors as envelopes, not exceptions
const envelopes = generateMessages(
  problematicGherkin,
  'mixed.feature',
  SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
  { 
    includeGherkinDocument: true,
    includePickles: true,
    newId: IdGenerator.uuid()
  }
);

// Process results and errors separately
const documents = envelopes.filter(e => e.gherkinDocument);
const pickles = envelopes.filter(e => e.pickle);
const errors = envelopes.filter(e => e.parseError);

console.log(`Processed: ${documents.length} documents, ${pickles.length} pickles`);
console.log(`Errors: ${errors.length}`);

errors.forEach(errorEnvelope => {
  const error = errorEnvelope.parseError!;
  console.error(`Error: ${error.message}`);
  if (error.source?.location) {
    const loc = error.source.location;
    console.error(`  at ${error.source.uri}:${loc.line}:${loc.column}`);
  }
});
```

#### 2. Parser Error Tolerance

```typescript
import { Parser, AstBuilder, GherkinClassicTokenMatcher } from "@cucumber/gherkin";

// Configure parser to continue after errors
const tolerantParser = new Parser(
  new AstBuilder(IdGenerator.uuid()),
  new GherkinClassicTokenMatcher('en')
);

// Set to false to collect multiple errors instead of stopping at first
tolerantParser.stopAtFirstError = false;

try {
  const document = tolerantParser.parse(problematicGherkin);
  // May still throw CompositeParserException with multiple errors
} catch (error) {
  if (error instanceof Errors.CompositeParserException) {
    console.log(`Collected ${error.errors.length} errors:`);
    error.errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err.message}`);
    });
  }
}
```

### Error Context and Location Information

All exceptions include detailed location information:

```typescript
import { Location } from "@cucumber/messages";

function handleGherkinError(error: Errors.GherkinException) {
  console.error('Gherkin Error:', error.message);
  
  if (error.location) {
    const loc: Location = error.location;
    console.error(`Location: line ${loc.line}, column ${loc.column}`);
  }
  
  // Handle composite errors
  if (error.errors && error.errors.length > 0) {
    console.error('Related errors:');
    error.errors.forEach((relatedError, index) => {
      console.error(`  ${index + 1}. ${relatedError.message}`);
    });
  }
  
  // Log stack trace for debugging
  if (process.env.NODE_ENV === 'development') {
    console.error('Stack trace:', error.stack);
  }
}
```

## Common Error Scenarios

### 1. Syntax Errors

```typescript
// Missing scenario name
const missingScenarionalName = `
Feature: Syntax Errors
  Scenario:
    Given something
`;

// Invalid table formatting  
const invalidTable = `
Feature: Table Errors
  Scenario: Bad table
    Given this table is malformed:
      | column1 | column2
      | value1  | value2 |
      | value3
`;

// Mismatched doc string delimiters
const mismatchedDocString = `
Feature: Doc String Errors
  Scenario: Mismatched delimiters
    Given this doc string is broken:
      \"\"\"
      Some content
      '''
`;
```

### 2. Semantic Errors

```typescript
// Scenario outline without examples
const outlineWithoutExamples = `
Feature: Semantic Errors
  Scenario Outline: Missing examples
    Given I have <value>
    When I do <action>
    Then <result> happens
`;

// Undefined variables in examples
const undefinedVariables = `
Feature: Variable Errors
  Scenario Outline: Undefined variables
    Given I have <value>
    When I do <action>
    Then <result> happens
    
    Examples:
      | value | action |
      | 1     | test   |
`;
```

### 3. Language Errors

```typescript
// Unsupported language code
const unsupportedLang = `
# language: xyz
Feature: Language Error
  Scenario: Test
`;

// Invalid language directive syntax
const invalidLangDirective = `
#language en
Feature: Invalid Directive
  Scenario: Test
`;
```

## Error Prevention Best Practices

### 1. Input Validation

```typescript
import { dialects } from "@cucumber/gherkin";

function validateGherkinInput(content: string, language?: string): string[] {
  const errors: string[] = [];
  
  // Check for basic syntax issues
  if (!content.trim()) {
    errors.push('Empty content provided');
    return errors;
  }
  
  if (!content.includes('Feature:') && !content.includes('#')) {
    errors.push('No Feature declaration found');
  }
  
  // Validate language if specified
  if (language && !(language in dialects)) {
    errors.push(`Unsupported language: ${language}`);
    const available = Object.keys(dialects).slice(0, 10).join(', ');
    errors.push(`Available languages include: ${available}`);
  }
  
  // Check for common formatting issues
  const lines = content.split('\n');
  lines.forEach((line, index) => {
    const lineNum = index + 1;
    
    // Check for tabs (should use spaces)
    if (line.includes('\t')) {
      errors.push(`Line ${lineNum}: Use spaces instead of tabs for indentation`);
    }
    
    // Check for mismatched doc string delimiters
    if (line.trim().startsWith('"""') || line.trim().startsWith("'''")) {
      // Additional validation could be added here
    }
  });
  
  return errors;
}

// Usage
const validationErrors = validateGherkinInput(gherkinContent, 'en');
if (validationErrors.length > 0) {
  console.log('Validation errors found:');
  validationErrors.forEach(err => console.log('- ' + err));
}
```

### 2. Defensive Parsing

```typescript
import { generateMessages, IGherkinOptions } from "@cucumber/gherkin";

function safeParseGherkin(
  content: string, 
  uri: string, 
  options: IGherkinOptions = {}
): { 
  envelopes: Envelope[], 
  errors: string[], 
  successful: boolean 
} {
  try {
    // Set safe defaults
    const safeOptions: IGherkinOptions = {
      defaultDialect: 'en',
      includeSource: false,
      includeGherkinDocument: true,
      includePickles: false,
      newId: options.newId || IdGenerator.uuid(),
      ...options
    };
    
    const envelopes = generateMessages(
      content,
      uri,
      SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
      safeOptions
    );
    
    // Extract errors from envelopes
    const errorEnvelopes = envelopes.filter(e => e.parseError);
    const errors = errorEnvelopes.map(e => e.parseError!.message);
    
    return {
      envelopes,
      errors,
      successful: errors.length === 0
    };
    
  } catch (error) {
    return {
      envelopes: [],
      errors: [error instanceof Error ? error.message : String(error)],
      successful: false
    };
  }
}

// Usage
const result = safeParseGherkin(gherkinContent, 'test.feature');
if (result.successful) {
  console.log('Parsing successful');
  // Process envelopes
} else {
  console.log('Parsing failed:');
  result.errors.forEach(err => console.log('- ' + err));
}
```

### 3. Error Reporting

```typescript
interface ErrorReport {
  file: string;
  line?: number;
  column?: number;
  message: string;
  type: 'syntax' | 'semantic' | 'language';
  severity: 'error' | 'warning';
}

function createErrorReport(
  uri: string, 
  error: Errors.GherkinException
): ErrorReport {
  return {
    file: uri,
    line: error.location?.line,
    column: error.location?.column,
    message: error.message,
    type: getErrorType(error),
    severity: 'error'
  };
}

function getErrorType(error: Errors.GherkinException): 'syntax' | 'semantic' | 'language' {
  if (error instanceof Errors.NoSuchLanguageException) return 'language';
  if (error instanceof Errors.ParserException) return 'syntax';
  if (error instanceof Errors.AstBuilderException) return 'semantic';
  return 'syntax';
}

// Generate comprehensive error reports
function generateErrorReports(envelopes: Envelope[], uri: string): ErrorReport[] {
  return envelopes
    .filter(e => e.parseError)
    .map(e => ({
      file: uri,
      line: e.parseError!.source?.location?.line,
      column: e.parseError!.source?.location?.column,  
      message: e.parseError!.message,
      type: 'syntax' as const,
      severity: 'error' as const
    }));
}
```