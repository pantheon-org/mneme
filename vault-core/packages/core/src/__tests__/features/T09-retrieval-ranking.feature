@T09
Feature: Memory Retrieval Ranking
  As an AI coding agent
  I want human-edited memories to rank higher in retrieval results
  So that manually curated knowledge is prioritised in context

  Scenario: Human-edited memories receive a ranking boost
    Given an index database with a human-edited memory and a normal memory
    When memories are retrieved for query "memory"
    Then the human-edited memory ranks before the normal memory if both are returned

  Scenario: Injector respects token budget during formatting
    Given 50 ranked memories
    When the injector formats 50 memories with a budget of 200 tokens
    Then the token estimate is at most 250
    And fewer than 50 memories are included

  Scenario: Empty input returns empty formatted output
    Given no ranked memories for retrieval ranking
    When the injector formats 0 memories with a budget of 200 tokens
    Then the markdown output for retrieval ranking is empty
    And the token estimate is 0

  Scenario: topK limits the number of returned results
    Given an index database with several memories
    When memories are retrieved with topK of 3
    Then at most 3 results are returned
