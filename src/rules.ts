import type { Finding } from "./model.js";

export interface RuleDefinition {
  id: string;
  title: string;
  description: string;
  remediation: string;
  defaultSeverity: Finding["severity"];
}

export const ruleDefinitions: Record<string, RuleDefinition> = {
  "N0-TEST-001": {
    id: "N0-TEST-001",
    title: "Test file deleted",
    description: "A test file present on the trusted base was removed by the candidate change.",
    remediation: "Restore the test or document an approved waiver from the trusted base policy.",
    defaultSeverity: "blocking",
  },
  "N0-TEST-002": {
    id: "N0-TEST-002",
    title: "Skipped test added",
    description: "The candidate introduced a skipped or todo test.",
    remediation: "Enable the test and make it pass, or use an approved waiver.",
    defaultSeverity: "blocking",
  },
  "N0-TEST-003": {
    id: "N0-TEST-003",
    title: "Focused test added",
    description: "A focused .only test can prevent the remainder of the suite from running.",
    remediation: "Remove .only before submitting the change.",
    defaultSeverity: "blocking",
  },
  "N0-TEST-004": {
    id: "N0-TEST-004",
    title: "Test case removed",
    description: "A test declaration was removed from an existing test file.",
    remediation: "Confirm the removal is intentional and preserve equivalent regression coverage.",
    defaultSeverity: "warning",
  },
  "N0-TEST-005": {
    id: "N0-TEST-005",
    title: "Assertion removed",
    description: "An assertion was removed from a test.",
    remediation: "Restore the assertion or replace it with equally strong evidence.",
    defaultSeverity: "warning",
  },
  "N0-TEST-006": {
    id: "N0-TEST-006",
    title: "Empty suite allowed",
    description: "The test configuration was changed so a repository with no discovered tests can pass.",
    remediation: "Remove passWithNoTests or explicitly constrain it in trusted policy.",
    defaultSeverity: "warning",
  },
  "N0-TEST-007": {
    id: "N0-TEST-007",
    title: "Assertion weakened",
    description: "A precise assertion appears to have been replaced by a weaker existence or truthiness check.",
    remediation: "Use an assertion that directly checks the claimed behavior.",
    defaultSeverity: "blocking",
  },
  "N0-CMD-001": {
    id: "N0-CMD-001",
    title: "Test failure masked",
    description: "The test command forces a successful exit after a failure.",
    remediation: "Preserve and propagate the test runner exit status.",
    defaultSeverity: "blocking",
  },
  "N0-EVIDENCE-001": {
    id: "N0-EVIDENCE-001",
    title: "Non-discriminating test",
    description: "Changed tests pass against both base and candidate code.",
    remediation: "Add an assertion that fails when the claimed implementation is absent.",
    defaultSeverity: "blocking",
  },
};

export function explainRule(ruleId: string): RuleDefinition | undefined {
  return ruleDefinitions[ruleId.toUpperCase()];
}
