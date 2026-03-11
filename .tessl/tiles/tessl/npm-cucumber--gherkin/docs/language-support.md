# Language Support

Comprehensive internationalization support with built-in dialects for 70+ languages and configurable language-specific keywords. Enables writing Gherkin features in many natural languages while maintaining the same parsing and processing capabilities.

## Capabilities

### Dialects Constant

Dictionary containing all supported Gherkin language dialects with their respective keywords and metadata.

```typescript { .api }
/**
 * Dictionary of all supported Gherkin language dialects
 * Each key is a language code (e.g., 'en', 'fr', 'de') and the value is a Dialect object
 */
const dialects: Readonly<{ [key: string]: Dialect }>;
```

**Usage Examples:**

```typescript
import { dialects } from "@cucumber/gherkin";

// Access English dialect
const english = dialects.en;
console.log('English "Given" keywords:', english.given);
// Output: ["* ", "Given "]

// Access French dialect
const french = dialects.fr;
console.log('French "Given" keywords:', french.given);
// Output: ["* ", "Soit ", "Etant donné ", "Etant donnée ", "Etant donnés ", "Etant données ", "Étant donné ", "Étant donnée ", "Étant donnés ", "Étant données "]

// Access German dialect
const german = dialects.de;
console.log('German feature keywords:', german.feature);
console.log('German scenario keywords:', german.scenario);

// List all available languages
const availableLanguages = Object.keys(dialects);
console.log('Supported languages:', availableLanguages);
// Output: ['af', 'am', 'an', 'ar', 'ast', 'az', 'be', 'bg', 'bm', 'bs', 'ca', 'cs', 'cy', 'da', 'de', 'el', 'em', 'en', 'eo', 'es', 'et', 'eu', 'fa', 'fi', 'fr', 'ga', 'gj', 'gl', 'he', 'hi', 'hr', 'ht', 'hu', 'id', 'is', 'it', 'ja', 'jv', 'ka', 'kn', 'ko', 'lt', 'lu', 'lv', 'mk', 'mn', 'nl', 'no', 'pa', 'pl', 'pt', 'ro', 'ru', 'sk', 'sl', 'sr-Cyrl', 'sr-Latn', 'sv', 'ta', 'th', 'tl', 'tlh', 'tr', 'tt', 'uk', 'ur', 'uz', 'vi', 'zh-CN', 'zh-TW']

// Check if language exists
if ('es' in dialects) {
  console.log('Spanish is supported');
  console.log('Spanish "When" keywords:', dialects.es.when);
}

// Dynamic language selection
function getDialect(languageCode: string): Dialect | undefined {
  return dialects[languageCode];
}

const spanish = getDialect('es');
if (spanish) {
  console.log('Spanish feature keyword:', spanish.feature[0]);
}
```

### Dialect Interface

Defines the structure of language-specific keywords and metadata for each supported language.

```typescript { .api }
/**
 * Language dialect definition containing keywords for all Gherkin elements
 */
interface Dialect {
  /** English name of the language */
  readonly name: string;
  
  /** Native name of the language */
  readonly native: string;
  
  /** Keywords for "Feature" declarations */
  readonly feature: readonly string[];
  
  /** Keywords for "Background" sections */
  readonly background: readonly string[];
  
  /** Keywords for "Rule" declarations */
  readonly rule: readonly string[];
  
  /** Keywords for "Scenario" declarations */
  readonly scenario: readonly string[];
  
  /** Keywords for "Scenario Outline" declarations */
  readonly scenarioOutline: readonly string[];
  
  /** Keywords for "Examples" tables */
  readonly examples: readonly string[];
  
  /** Keywords for "Given" steps (context/precondition) */
  readonly given: readonly string[];
  
  /** Keywords for "When" steps (action/event) */
  readonly when: readonly string[];
  
  /** Keywords for "Then" steps (outcome/assertion) */
  readonly then: readonly string[];
  
  /** Keywords for "And" steps (continuation) */
  readonly and: readonly string[];
  
  /** Keywords for "But" steps (exception/contrast) */
  readonly but: readonly string[];
}
```

**Usage Examples:**

```typescript
import { dialects, Dialect } from "@cucumber/gherkin";

// Examine dialect structure
const french: Dialect = dialects.fr;

console.log('Language info:');
console.log('- English name:', french.name);        // "French"
console.log('- Native name:', french.native);       // "français"

console.log('\nStructural keywords:');
console.log('- Feature:', french.feature);          // ["Fonctionnalité"]
console.log('- Background:', french.background);    // ["Contexte"]
console.log('- Scenario:', french.scenario);        // ["Scénario"]
console.log('- Rule:', french.rule);               // ["Règle"]
console.log('- Examples:', french.examples);        // ["Exemples"]

console.log('\nStep keywords:');
console.log('- Given:', french.given);             // ["* ", "Soit ", "Etant donné ", ...]
console.log('- When:', french.when);               // ["* ", "Quand ", "Lorsque ", "Lorsqu'"]
console.log('- Then:', french.then);               // ["* ", "Alors "]
console.log('- And:', french.and);                 // ["* ", "Et que ", "Et qu'", "Et "]
console.log('- But:', french.but);                 // ["* ", "Mais que ", "Mais qu'", "Mais "]

// Helper function to create language-aware content
function createFeatureInLanguage(lang: string, featureName: string): string {
  const dialect = dialects[lang];
  if (!dialect) {
    throw new Error(`Language ${lang} not supported`);
  }
  
  const featureKeyword = dialect.feature[0];
  const scenarioKeyword = dialect.scenario[0];
  const givenKeyword = dialect.given.find(k => k !== '* ') || dialect.given[0];
  const whenKeyword = dialect.when.find(k => k !== '* ') || dialect.when[0];
  const thenKeyword = dialect.then.find(k => k !== '* ') || dialect.then[0];
  
  return `${featureKeyword}: ${featureName}
  ${scenarioKeyword}: Test scenario
    ${givenKeyword}something exists
    ${whenKeyword}an action occurs  
    ${thenKeyword}a result is observed`;
}

// Generate features in different languages
console.log('\nEnglish:');
console.log(createFeatureInLanguage('en', 'Calculator'));

console.log('\nFrench:');
console.log(createFeatureInLanguage('fr', 'Calculatrice'));

console.log('\nGerman:');
console.log(createFeatureInLanguage('de', 'Rechner'));
```

## Language Detection and Switching

Gherkin supports dynamic language switching within a single document using language directives:

```typescript
import { generateMessages, IGherkinOptions } from "@cucumber/gherkin";
import { SourceMediaType, IdGenerator } from "@cucumber/messages";

// Multi-language feature file
const multiLanguageContent = `
Feature: Multi-language Example
  Scenario: English scenario
    Given something in English
    When action happens
    Then result is observed

# language: fr
Fonctionnalité: Exemple multilingue
  Scénario: Scénario français
    Soit quelque chose en français
    Quand une action se produit
    Alors un résultat est observé

# language: de  
Funktionalität: Mehrsprachiges Beispiel
  Szenario: Deutsches Szenario
    Gegeben sei etwas auf Deutsch
    Wenn eine Aktion passiert
    Dann wird ein Ergebnis beobachtet
`;

const options: IGherkinOptions = {
  defaultDialect: 'en',
  includeGherkinDocument: true,
  newId: IdGenerator.uuid()
};

const envelopes = generateMessages(
  multiLanguageContent,
  'multilang.feature',
  SourceMediaType.TEXT_X_CUCUMBER_GHERKIN_PLAIN,
  options
);

// The parser automatically switches languages as it encounters language directives
envelopes.forEach(envelope => {
  if (envelope.gherkinDocument?.feature) {
    console.log('Feature parsed:', envelope.gherkinDocument.feature.name);
  }
});
```

## Common Language Examples

### European Languages

```typescript
import { dialects } from "@cucumber/gherkin";

// Spanish
const spanish = dialects.es;
console.log('Spanish Example:');
console.log(`${spanish.feature[0]}: Calculadora`);
console.log(`  ${spanish.scenario[0]}: Suma`);
console.log(`    ${spanish.given[1]}tengo una calculadora`);
console.log(`    ${spanish.when[1]}sumo 2 y 3`);
console.log(`    ${spanish.then[1]}el resultado debe ser 5`);

// Italian  
const italian = dialects.it;
console.log('\nItalian Example:');
console.log(`${italian.feature[0]}: Calcolatrice`);
console.log(`  ${italian.scenario[0]}: Addizione`);
console.log(`    ${italian.given[1]}ho una calcolatrice`);
console.log(`    ${italian.when[1]}aggiungo 2 e 3`);
console.log(`    ${italian.then[1]}il risultato dovrebbe essere 5`);

// Portuguese
const portuguese = dialects.pt;
console.log('\nPortuguese Example:');
console.log(`${portuguese.feature[0]}: Calculadora`);
console.log(`  ${portuguese.scenario[0]}: Adição`);
console.log(`    ${portuguese.given[1]}eu tenho uma calculadora`);
console.log(`    ${portuguese.when[1]}eu somo 2 e 3`);
console.log(`    ${portuguese.then[1]}o resultado deve ser 5`);
```

### Asian Languages

```typescript
import { dialects } from "@cucumber/gherkin";

// Japanese
const japanese = dialects.ja;
console.log('Japanese Example:');
console.log(`${japanese.feature[0]}: 計算機`);
console.log(`  ${japanese.scenario[0]}: 足し算`);
console.log(`    ${japanese.given[1]}計算機がある`);
console.log(`    ${japanese.when[1]}2と3を足す`);
console.log(`    ${japanese.then[1]}結果は5になる`);

// Chinese Simplified
const chineseSimplified = dialects['zh-CN'];
console.log('\nChinese Simplified Example:');
console.log(`${chineseSimplified.feature[0]}: 计算器`);
console.log(`  ${chineseSimplified.scenario[0]}: 加法`);
console.log(`    ${chineseSimplified.given[1]}我有一个计算器`);
console.log(`    ${chineseSimplified.when[1]}我计算2加3`);
console.log(`    ${chineseSimplified.then[1]}结果应该是5`);

// Korean
const korean = dialects.ko;
console.log('\nKorean Example:');
console.log(`${korean.feature[0]}: 계산기`);
console.log(`  ${korean.scenario[0]}: 덧셈`);
console.log(`    ${korean.given[1]}계산기가 있다`);
console.log(`    ${korean.when[1]}2와 3을 더한다`);
console.log(`    ${korean.then[1]}결과는 5이다`);
```

## Language Configuration

### Setting Default Language

```typescript
import { generateMessages, IGherkinOptions, GherkinClassicTokenMatcher } from "@cucumber/gherkin";

// Set default language in options
const spanishOptions: IGherkinOptions = {
  defaultDialect: 'es',
  includeGherkinDocument: true,
  newId: IdGenerator.uuid()
};

// Or configure token matcher directly
const spanishMatcher = new GherkinClassicTokenMatcher('es');
```

### Language Validation

```typescript
import { dialects } from "@cucumber/gherkin";

function validateLanguage(languageCode: string): boolean {
  return languageCode in dialects;
}

function getAvailableLanguages(): string[] {
  return Object.keys(dialects).sort();
}

function getLanguageInfo(languageCode: string): { name: string; native: string } | null {
  const dialect = dialects[languageCode];
  return dialect ? { name: dialect.name, native: dialect.native } : null;
}

// Usage
console.log('Is "fr" supported?', validateLanguage('fr'));  // true
console.log('Is "xyz" supported?', validateLanguage('xyz')); // false

const languages = getAvailableLanguages();
console.log('Total languages supported:', languages.length);

const info = getLanguageInfo('de');
if (info) {
  console.log(`German: ${info.name} (${info.native})`);
}
```

## Step Keyword Types

Each step keyword is categorized by its semantic meaning:

```typescript
import { dialects } from "@cucumber/gherkin";

// Keywords are categorized by their semantic meaning:
// - Given: Context/Precondition (StepKeywordType.CONTEXT)
// - When: Action/Event (StepKeywordType.ACTION)  
// - Then: Outcome/Assertion (StepKeywordType.OUTCOME)
// - And/But: Continuation (StepKeywordType.CONJUNCTION)

function analyzeStepKeywords(languageCode: string) {
  const dialect = dialects[languageCode];
  if (!dialect) return;
  
  console.log(`\n${dialect.name} (${dialect.native}) step keywords:`);
  console.log('Context (Given):', dialect.given.filter(k => k !== '* '));
  console.log('Action (When):', dialect.when.filter(k => k !== '* '));
  console.log('Outcome (Then):', dialect.then.filter(k => k !== '* '));
  console.log('Conjunction (And):', dialect.and.filter(k => k !== '* '));
  console.log('Contrast (But):', dialect.but.filter(k => k !== '* '));
}

// Analyze several languages
['en', 'fr', 'de', 'es', 'ja'].forEach(analyzeStepKeywords);
```

## Special Language Features

### Emoji Language (em)

Gherkin includes a fun emoji-based language for testing:

```typescript
import { dialects } from "@cucumber/gherkin";

const emoji = dialects.em;
console.log('Emoji Language:');
console.log('Feature:', emoji.feature);      // ["📚"]
console.log('Scenario:', emoji.scenario);    // ["📕"]  
console.log('Given:', emoji.given);          // ["😐"]
console.log('When:', emoji.when);            // ["🎬"]
console.log('Then:', emoji.then);            // ["🙏"]

// Example emoji feature
const emojiFeature = `
📚: Calculator
  📕: Addition
    😐 I have a calculator
    🎬 I add 2 and 3
    🙏 the result should be 5
`;
```

### Language Code Variations

Some languages have regional or script variations:

```typescript
import { dialects } from "@cucumber/gherkin";

// Serbian has both Cyrillic and Latin scripts
const serbianCyrillic = dialects['sr-Cyrl'];
const serbianLatin = dialects['sr-Latn'];

console.log('Serbian Cyrillic feature:', serbianCyrillic.feature[0]);
console.log('Serbian Latin feature:', serbianLatin.feature[0]);

// Chinese has simplified and traditional variants  
const chineseSimplified = dialects['zh-CN'];
const chineseTraditional = dialects['zh-TW'];

console.log('Chinese Simplified scenario:', chineseSimplified.scenario[0]);
console.log('Chinese Traditional scenario:', chineseTraditional.scenario[0]);
```