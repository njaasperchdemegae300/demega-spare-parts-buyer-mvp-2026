# DECISION REGISTER

## Decision 1 — Manual Review First
The system must support admin work, not replace admin judgment.

## Decision 2 — No Auto-Send
The system must not send WhatsApp messages automatically.

## Decision 3 — No Private Scraping
The system must not scrape private messages, hidden data, or personal information.

## Decision 4 — No Quote Before Gates
No quote should be prepared with price until stock confirmation, compatibility confirmation, and final quote eligibility pass.

## Decision 5 — Review Gates Are Record-Only
Deal outcome, stock movement, accounting, and final business review gates record admin decisions only. They must not execute sale closing, stock updates, payment verification, accounting entries, or pipeline movement automatically.

## Decision 6 — Admin Hub Is Read-Only Navigation
The Admin Hub can display metrics and links, but must not mutate data by itself.

## Decision 7 — Source-of-Truth Files Required
Every new chat or new coding phase must check the source-of-truth files before continuing.

## Decision 8 — Version Gate Required
No version can be called approved unless a smoke test report returns APPROVED and a commit is created.

## Decision 9 — Test Sales Agents Before Live Buyer Gate
Before opening real buyer traffic, the project must internally test Assistant Sales Agent behavior using simulated buyer scenarios. The agent must prove safe replies, correct next actions, and no auto-send behavior before live buyer gate activation.
