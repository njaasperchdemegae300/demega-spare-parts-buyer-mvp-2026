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

## Decision 10 — Buyer Gate Must Stay Closed Until Guardian Approval
The system must not open real buyer traffic until the Internal Buyer-Gate Readiness Guardian confirms source-of-truth readiness, Assistant Sales Agent readiness, zero failed agent tests, and all core safety locks.

## Decision 11 — Manual Approval Does Not Equal Activation
The Controlled Buyer-Gate Manual Activation Approval Gate records approval for controlled 15-lead test preparation only. It must not open buyer gate, activate live traffic, contact buyers, send/read WhatsApp, scrape data, update inventory, create accounting entries, close sales, or move pipeline. A separate activation execution gate is required later.

## Decision 12 — Activation Execution Means Manual Inbound Only
Controlled Buyer-Gate Activation Execution opens only a controlled 15-lead manual inbound gate. It must not start outbound traffic, paid ads, lead form publishing, automatic buyer contact, WhatsApp auto-send/read, scraping, quote sending, inventory mutation, accounting entry, sale closing, or pipeline movement. Lead-slot enforcement is required next.

## Decision 13 — 15-Lead Slot Enforcement Before Real Lead Counting
Controlled Buyer-Gate Lead-Slot Enforcement accepts only buyer-initiated WhatsApp click-to-chat inbound lead slots up to the 15-lead limit. The 16th slot must be blocked. Slot acceptance does not contact buyers, send/read WhatsApp, scrape data, quote, update inventory, create accounting entries, close sales, or move pipeline. Manual review is required before any buyer contact.
