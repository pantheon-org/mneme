@T10
Feature: Crash Recovery — vault is ground truth
  As an AI coding agent
  I want vault files to be re-indexed on startup after a crash
  So that state never diverges between vault and SQLite

  Scenario: Memory written to vault but missing from SQLite is recovered by reconcile
    Given a vault with one memory file and an empty SQLite index
    When reconcile is called with the vault path
    Then the memory is present in the SQLite index
    And reconcile returns a count of 1

  Scenario: reconcile is a no-op when vault and index are already in sync
    Given a vault with one memory file and an SQLite index containing that memory
    When reconcile is called with the vault path
    Then reconcile returns a count of 0

  Scenario: vault-cli index recovers a memory after a simulated crash between vault write and DB upsert
    Given a vault containing one written memory
    And the SQLite index is empty, simulating a crash after vault write but before DB upsert
    When vault-cli index rebuild is simulated via reconcile
    Then the memory is searchable in the SQLite index
