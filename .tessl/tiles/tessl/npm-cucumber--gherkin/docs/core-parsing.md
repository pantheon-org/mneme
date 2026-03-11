# Core Parsing

High-level parsing functionality for converting Gherkin source text into structured data formats. This is the main entry point for most use cases, supporting both classic .feature files and Gherkin-in-Markdown formats.

## Capabilities

### Generate Messages

The primary function for parsing Gherkin content and generating Cucumber Messages envelopes. Handles the complete parsing pipeline from raw text to structured output.

```typescript { .api }
/**
 * Parse Gherkin content and generate Cucumber Messages envelopes
 * @param data - The Gherkin source content as a string
 * @param uri - URI/path of the source file
 * @param mediaType - Either TEXT_X_CUCUMBER_GHERKIN_PLAIN (.feature) or TEXT_X_CUCUMBER_GHERKIN_MARKDOWN (.md)
 * @param options - Configuration options for parsing behavior
 * @returns Array of Cucumber Messages envelopes containing parsed data
 */
function generateMessages(
  data: string,
  uri: string,
  mediaType: SourceMediaType,
  options: IGherkinOptions
): readonly Envelope[];
```

**Usage Examples:**

```typescript
import { generateMessages, IGherkinOptions } from "@cucumber/gherkin";
import { SourceMediaType, IdGenerator, Envelope } from "@cucumber/messages";

// Basic feature file parsing
const featureContent = `
Feature: User Authentication
  Scenario: Valid login
    Given a user exists with email "user@example.com"
    When I login with valid credentials
    Then I should be logged in
`;

const options: IGherkinOptions = {
  includeGherkinDocument: true,
  includePickles: true,
  newId: IdGenerator.uuid()
};

const envelopes = generateMessages(
  featureContent,
  'auth.feature',
  SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
  options
);

// Process parsed results
envelopes.forEach(envelope => {
  if (envelope.gherkinDocument) {
    console.log('Feature:', envelope.gherkinDocument.feature?.name);
    envelope.gherkinDocument.feature?.children?.forEach(child => {
      if (child.scenario) {
        console.log('Scenario:', child.scenario.name);
      }
    });
  }
  if (envelope.pickle) {
    console.log('Executable scenario:', envelope.pickle.name);
    envelope.pickle.steps.forEach(step => {
      console.log('Step:', step.text);
    });
  }
});

// Markdown format parsing
const markdownContent = `
# Feature: Shopping Cart

## Scenario: Add items to cart
* Given I have an empty shopping cart
* When I add a "laptop" to the cart
* Then the cart should contain 1 item
`;

const markdownEnvelopes = generateMessages(
  markdownContent,
  'shopping.md',
  SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_MARKDOWN,
  options
);
```

### Make Source Envelope

Creates a source envelope containing the raw Gherkin content. Useful when you need to include the original source in your processing pipeline.

```typescript { .api }
/**
 * Create a source envelope containing raw Gherkin content
 * @param data - The Gherkin source content
 * @param uri - File URI (must end with .feature or .md)
 * @returns Envelope with source information
 */
function makeSourceEnvelope(data: string, uri: string): Envelope;
```

**Usage Examples:**

```typescript
import { makeSourceEnvelope } from "@cucumber/gherkin";

const sourceContent = `
Feature: Example
  Scenario: Test scenario
    Given something happens
`;

// Create source envelope
const sourceEnvelope = makeSourceEnvelope(sourceContent, 'example.feature');

console.log('Source URI:', sourceEnvelope.source?.uri);
console.log('Media type:', sourceEnvelope.source?.mediaType);
console.log('Source data length:', sourceEnvelope.source?.data.length);
```

### Gherkin Options

Configuration interface for controlling parsing behavior and output format.

```typescript { .api }
interface IGherkinOptions {
  /** Default language dialect (e.g., 'en', 'fr', 'de'). Defaults to 'en' if not specified */
  defaultDialect?: string;
  /** Whether to include source envelope in output. Defaults to false */
  includeSource?: boolean;
  /** Whether to include parsed AST document in output. Defaults to false */
  includeGherkinDocument?: boolean;
  /** Whether to include executable pickles in output. Defaults to false */
  includePickles?: boolean;
  /** ID generator function for creating unique identifiers. Required if includeGherkinDocument or includePickles is true */
  newId?: IdGenerator.NewId;
}
```

**Usage Examples:**

```typescript
import { generateMessages, IGherkinOptions } from "@cucumber/gherkin";
import { IdGenerator } from "@cucumber/messages";

// Minimal options - only parse, no output
const minimalOptions: IGherkinOptions = {};

// Full options - include all outputs
const fullOptions: IGherkinOptions = {
  defaultDialect: 'en',
  includeSource: true,
  includeGherkinDocument: true,
  includePickles: true,
  newId: IdGenerator.uuid()
};

// Custom ID generator
const customOptions: IGherkinOptions = {
  includeGherkinDocument: true,
  includePickles: true,
  newId: () => `custom-${Date.now()}-${Math.random()}`
};

// French language support
const frenchOptions: IGherkinOptions = {
  defaultDialect: 'fr',
  includeGherkinDocument: true,
  newId: IdGenerator.uuid()
};
```

## Processing Pipeline

The `generateMessages` function follows this processing pipeline:

1. **Token Matching**: Selects appropriate token matcher based on media type
   - `.feature` files use `GherkinClassicTokenMatcher`
   - `.md` files use `GherkinInMarkdownTokenMatcher`

2. **Source Envelope**: Optionally creates source envelope if `includeSource` is true

3. **Parsing**: Parses Gherkin document if `includeGherkinDocument` is true
   - Creates AST (Abstract Syntax Tree) representation
   - Handles language detection and dialect switching
   - Reports parsing errors as envelopes if parsing fails

4. **Compilation**: Compiles pickles if `includePickles` is true
   - Expands scenario outlines with examples
   - Combines background steps with scenario steps
   - Handles rule hierarchies
   - Interpolates variables in scenario outlines

5. **Output**: Returns array of envelopes containing requested data formats

## Error Handling

Parsing errors are returned as envelopes rather than thrown exceptions, allowing you to handle them gracefully:

```typescript
import { generateMessages } from "@cucumber/gherkin";

const invalidGherkin = `
Feature: Broken
  Scenario:
    Given something
    Invalid line here
`;

const envelopes = generateMessages(
  invalidGherkin,
  'broken.feature',
  SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
  { includeGherkinDocument: true }
);

envelopes.forEach(envelope => {
  if (envelope.parseError) {
    console.error('Parse error:', envelope.parseError.message);
    console.error('Location:', envelope.parseError.source?.location);
  }
});
```

## Media Type Support

The library supports two main Gherkin formats:

### Classic Gherkin (.feature files)
- Uses `SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN`
- Standard Gherkin syntax with keywords like `Feature:`, `Scenario:`, `Given`, etc.
- Supports all Gherkin language dialects

### Gherkin-in-Markdown (.md files)
- Uses `SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_MARKDOWN`
- Markdown-style headers (`# Feature:`, `## Scenario:`)
- Bullet points for steps (`* Given`, `- When`, `+ Then`)
- Inline tags with backticks (`@tag`)
- Different table detection rules