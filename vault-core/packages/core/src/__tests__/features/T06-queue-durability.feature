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

  Scenario: Both pending.jsonl and pending.jsonl.recovering exist on startup
    Given a recovering file with 3 entries and a pending file with 2 entries
    When replayPending runs with both files present
    Then the queue contains all 5 entries without duplicates
    And both files are cleaned up after replay

  Scenario: Malformed lines in pending.jsonl.recovering are skipped gracefully
    Given a recovering file containing 1 valid, 1 malformed, and 1 valid entry
    When replayPending runs with only the recovering file present
    Then exactly 2 entries are replayed from the recovering file
