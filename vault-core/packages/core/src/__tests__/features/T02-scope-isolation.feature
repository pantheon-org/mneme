@T02
Feature: Scope Isolation
  As an AI coding agent
  I want project-scoped memories to be isolated per project
  So that one project's memories never leak into another project's context

  Scenario: Project-alpha memories never appear when filtering for project-beta
    Given an empty vault and index database
    When I write 10 memories scoped to "project-alpha"
    And I write 10 memories scoped to "project-beta"
    Then BM25 search for "authentication" filtered to "project-beta" returns no "project-alpha" memories

  Scenario: User-scope memories appear regardless of project filter
    Given an empty vault and index database
    When I write a user-scoped memory about "naming convention"
    Then BM25 search for "naming convention" returns that memory
