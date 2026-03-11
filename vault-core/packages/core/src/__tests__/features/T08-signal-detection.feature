@T08
Feature: Capture Signal Detection
  As an AI coding agent
  I want the system to detect meaningful signals in tool output
  So that only high-value information is captured to memory

  Scenario: Agent expresses an architectural decision
    Given content containing the phrase "we decided to use"
    When the content is scanned for signals
    Then at least 1 candidate is produced
    And the candidate content matches the original content

  Scenario: Agent records a hard constraint
    Given content containing the phrase "never do"
    When the content is scanned for signals
    Then at least 1 candidate is produced
    And the candidate content contains a constraint keyword

  Scenario: Agent documents a bug fix
    Given content containing the phrase "fixed the bug"
    When the content is scanned for signals
    Then at least 1 candidate is produced

  Scenario: Noise content below threshold is rejected
    Given content "okay sounds good"
    When the content is scanned for signals
    Then 0 candidates are produced

  Scenario: Single-word affirmative is rejected
    Given content "yes"
    When the content is scanned for signals
    Then 0 candidates are produced

  Scenario: Force-capture hint bypasses threshold
    Given content with a force-capture hint
    When the content is scanned for signals
    Then exactly 1 candidate is produced
    And the candidate has a confidence of 1.0

  Scenario: Enumerated list with 3+ items triggers structural signal
    Given content containing 3 or more bullet points
    When the content is scanned for signals
    Then at least 1 candidate is produced

  Scenario: Enumerated list with fewer than 3 items does not trigger
    Given content containing 2 bullet points
    When the content is scanned for signals
    Then 0 candidates are produced

  Scenario: Tool error output is captured
    Given content containing the phrase "ENOENT: no such file or directory"
    When the content is scanned for signals
    Then at least 1 candidate is produced

  Scenario: Agent corrects a previous statement
    Given content containing the phrase "actually, I was wrong"
    When the content is scanned for signals
    Then at least 1 candidate is produced
