@T07
Feature: Token Budget
  As an AI coding agent
  I want the injector to respect token budgets
  So that context windows are never exceeded

  Scenario: Token estimate does not exceed budget by more than 20%
    Given 20 ranked memories each with 600 characters of content
    When the injector formats memories with a budget of 500 tokens
    Then at least 1 memory is included
    And the token estimate is at most 600

  Scenario: Injector excludes memories that exceed the token budget
    Given a single memory with 2000 characters of content and score 1.0
    When the injector formats memories with a budget of 100 tokens
    Then 0 memories are included
    And the token estimate is 0

  Scenario: Injector returns empty block for empty input
    Given no ranked memories
    When the injector formats memories with a budget of 500 tokens
    Then the markdown output is empty
    And 0 memories are included

  Scenario: Injector does not truncate mid-note
    Given 5 ranked memories each containing a unique sentinel phrase
    When the injector formats sentinel memories with a budget of 300 tokens
    Then included sentinels appear in the markdown output
    And excluded sentinels do not appear in the markdown output
