@T06
Feature: Queue Durability
  As an AI coding agent
  I want the capture queue to survive process restarts
  So that no captured memories are lost between sessions

  Scenario: pending.jsonl survives process restart and all entries are recoverable
    Given a pending.jsonl file with 10 capture entries
    When the file is read back as JSONL
    Then all 10 entries are parsed with matching content and sourceSession
    And the file can be cleared

  Scenario: Malformed lines in pending.jsonl are skipped gracefully
    Given a pending.jsonl file with 1 valid entry, 1 malformed entry, and 1 valid entry
    When the file is parsed skipping malformed lines
    Then exactly 2 entries are successfully parsed

  Scenario: Crash mid-replay is recovered on next startup
    Given a pending.jsonl.recovering file with 5 capture entries
    When replayPending is called with no pending.jsonl present
    Then all 5 entries are in the queue
    And the recovering file is removed
