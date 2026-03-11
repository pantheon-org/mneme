@T03
Feature: Human Edit Immunity
  As an AI coding agent
  I want memories modified by a human in the vault to be flagged as human-edited
  So that automated reconsolidation never overwrites manual user annotations

  Scenario: Detects external file modification and sets humanEditedAt on next read
    Given a memory written to the vault with an old modification time
    When the vault file is modified externally with a new modification time
    Then reading the memory sets humanEditedAt to a non-null value

  Scenario: Preserves humanEditedAt across subsequent reads once set
    Given a memory written to the vault
    When the vault file is modified externally
    And the memory is read once to detect the edit
    Then reading the memory again returns the same humanEditedAt value
