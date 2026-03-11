@T01
Feature: Capture and Retrieve Roundtrip
  As an AI coding agent
  I want memories to be written and retrieved correctly
  So that captured knowledge is persistently accessible

  Scenario: BM25 search returns results after writing memories
    Given an empty vault and index database
    When I write 20 memories of which 3 are about databases
    Then BM25 search for "database SQLite Postgres" returns at least 1 result
    And each result id matches the pattern "mem_"

  Scenario: Memory roundtrips through VaultWriter and VaultReader identically
    Given an empty vault and index database
    When I write a memory with specific summary, content, tags, tier, scope, and projectId
    Then reading that memory from the vault returns the exact same fields
