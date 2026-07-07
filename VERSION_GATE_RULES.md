# VERSION GATE RULES

## Approval Rule
A version is approved only when all are true:

1. Syntax checks pass.
2. Smoke test runs.
3. Smoke test report verdict is APPROVED.
4. Required safety rules are confirmed.
5. Latest git commit is created.
6. Final output says the version is complete.
7. Full output is sent back to Master.

## Block Rule
A version is blocked when any test fails.

## Blocked Version Response
If a version is blocked:
- Do not move to the next version.
- Explain the failed test.
- Give only a fix command.
- Re-run the same version test after the fix.

## Read-Only Dashboard Rule
Any dashboard marked read-only must not:
- use POST requests
- auto-send WhatsApp
- open WhatsApp automatically
- scrape messages
- read buyer messages
- create accounting entries
- update inventory
- move pipeline
- close sales

## Smoke Test Rule
Every smoke test should check:
- GET /api/health
- target API routes
- target dashboard routes if any
- safety flags
- blocked unsafe automation
- latest summary metrics
- read-only behavior where relevant

## Commit Rule
Every approved version must create a git commit with a clear version message.
