@T05
Feature: Consolidation Proposal
  As an AI coding agent
  I want related episodic memories to be clustered into consolidation proposals
  So that important patterns are promoted to semantic memory

  Scenario: Proposer clusters 3+ related episodic memories and returns proposals
    Given an empty vault and index database with 5 episodic memories
    When the Proposer generates consolidation proposals
    Then each proposal references at least 3 source memory ids
    And each proposal has non-empty proposed content

  Scenario: ApprovalInterface renders proposals to vault inbox file
    Given a consolidation proposal
    When the ApprovalInterface renders the proposal
    Then a "consolidation-proposals.md" file exists in the vault inbox

  Scenario: renderProposals preserves existing proposals when called again
    Given a vault inbox with an existing consolidation proposal
    When the ApprovalInterface renders a second proposal
    Then the vault inbox file contains 2 proposal blocks
    And the first proposal block has id "prop_existing_001"
    And the second proposal block has id "prop_new_002"
