@T04
Feature: Conflict Detection
  As an AI coding agent
  I want the system to degrade gracefully when vector search is unavailable
  So that BM25 fallback still detects similar content

  Scenario: knnSearch returns empty array gracefully when vec extension unavailable
    Given an index database with a memory that has an embedding
    When knnSearch is called for that memory
    Then the result is an array

  Scenario: upsertVector stores without throwing
    Given an empty index database
    When I upsert a memory with a vector embedding
    Then no error is thrown

  Scenario: BM25 fallback detects highly similar content as low-novelty
    Given an index database with a memory about "bun sqlite"
    When BM25 search is performed for "bun sqlite index database storage"
    Then at least 1 result is returned
