@T09a
Feature: Memory Retrieval Filtering
  As an AI coding agent
  I want retrieval to respect memory status and project scope
  So that only relevant and active memories are surfaced

  Scenario: Active memories are returned for a matching query
    Given an index database with an active memory about "sqlite database"
    When active memories are retrieved for query "sqlite database"
    Then the active memory id is in the results

  Scenario: Superseded memories are excluded from retrieval
    Given an index database with a superseded memory about "sqlite"
    When active memories are retrieved for query "sqlite"
    Then the superseded memory id is not in the results

  Scenario: Project-scoped memory is excluded for a different project
    Given an index database with a memory scoped to "project-alpha"
    When filtered memories are retrieved with project filter "project-beta"
    Then the project-alpha memory id is not in the results

  Scenario: Project-scoped memory is included for the matching project
    Given an index database with a memory scoped to "project-alpha"
    When filtered memories are retrieved with project filter "project-alpha"
    Then the project-alpha memory id is in the results
