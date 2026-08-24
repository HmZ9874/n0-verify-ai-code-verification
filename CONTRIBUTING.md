# Contributing

N0 Verify favors deterministic, evidence-backed rules with explicit boundaries.

Every detector contribution must include:

1. a positive fixture that must be detected;
2. a negative fixture that must not be detected;
3. an edge case such as a pre-existing skip or legitimate test refactor;
4. a stable rule id and actionable remediation;
5. benchmark expectations.

Run before submitting:

```bash
npm test
npm run check
npm run bench
```

High-confidence rules may block by default. Heuristic rules must default to a
warning until benchmark evidence justifies stronger enforcement.
