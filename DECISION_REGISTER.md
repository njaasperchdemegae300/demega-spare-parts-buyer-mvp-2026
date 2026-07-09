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

## Decision 14 — Manual Lead Review Before Buyer Contact
Controlled Buyer-Gate Manual Lead Review records only admin review decisions for accepted inbound lead slots. It must not contact buyers, send/read WhatsApp, scrape data, prepare quotes, update inventory, create accounting entries, close sales, or move pipeline. Accepted reviews move only toward manual stock check next.

## Decision 15 — Manual Stock Check Before Compatibility And Quote
Controlled Buyer-Gate Manual Stock Check records stock status only after an accepted manual lead review. It must not contact buyers, send/read WhatsApp, scrape data, prepare quotes, update inventory, reserve/reduce stock, create accounting entries, close sales, or move pipeline. If stock is available, the next gate is manual compatibility check before any quote.

## Decision 16 — Manual Compatibility Check Before Final Quote Eligibility
Controlled Buyer-Gate Manual Compatibility Check records compatibility status only after available stock confirmation. It must not contact buyers, send/read WhatsApp, scrape data, prepare quotes, include price, update inventory, reserve/reduce stock, create accounting entries, close sales, or move pipeline. If compatibility is confirmed, the next gate is final quote eligibility before any quote.

## Decision 16 — Manual Compatibility Check Before Final Quote Eligibility
Controlled Buyer-Gate Manual Compatibility Check records compatibility status only after available stock confirmation. It must not contact buyers, send/read WhatsApp, scrape data, prepare quotes, include price, update inventory, reserve/reduce stock, create accounting entries, close sales, or move pipeline. If compatibility is confirmed, the next gate is final quote eligibility before any quote.

## Decision 17 — Final Quote Eligibility Before Manual Quote Draft
Controlled Buyer-Gate Final Quote Eligibility records quote readiness only after stock and compatibility confirmation. It must not contact buyers, send/read WhatsApp, scrape data, prepare quotes, include price, send quote, update inventory, reserve/reduce stock, create accounting entries, close sales, or move pipeline. If eligible, the next gate is controlled manual quote draft.

## Decision 18 — Manual Quote Draft Before Any Buyer Sending
Controlled Buyer-Gate Manual Quote Draft prepares an internal draft only after final quote eligibility is ELIGIBLE_FOR_MANUAL_QUOTE_DRAFT. Price may appear inside the internal draft, but the system must not send the quote or price to the buyer. Manual review before sending and manual send confirmation are required next.

## Decision 19 — Manual Send Confirmation Records Human Sending Only
Controlled Buyer-Gate Manual Send Confirmation records that admin manually sent the prepared quote outside the system. The system must not send WhatsApp, send quote, send price, read buyer messages, scrape data, update inventory, reserve/reduce stock, create accounting records, create receipts/invoices, close sales, move pipeline, or auto-start follow-up. Buyer reply tracking is required next.

## Decision 20 — Buyer Reply Tracking Records Manual Observation Only
Controlled Buyer-Gate Buyer Reply Tracking records buyer replies manually observed by admin outside the system after manual send confirmation. The system must not read WhatsApp, scrape buyer messages, auto-reply, auto-send, auto-follow-up, update inventory, reserve/reduce stock, create accounting records, create receipts/invoices, close sales, or move pipeline. Follow-up decision gate is required next.

## Decision 21 — Follow-Up Decision Records Manual Decision Only
Controlled Buyer-Gate Follow-Up Decision records admin manual follow-up decisions after buyer reply tracking. The system must not execute follow-up, auto-schedule, auto-send WhatsApp, auto-reply, auto-read WhatsApp, scrape buyer messages, mutate inventory, reserve/reduce stock, create accounting records, create receipts/invoices, close sales, or move pipeline.

## Decision 21 — Follow-Up Decision Records Manual Decision Only
Controlled Buyer-Gate Follow-Up Decision records admin manual follow-up decisions after buyer reply tracking. The system must not execute follow-up, auto-schedule, auto-send WhatsApp, auto-reply, auto-read WhatsApp, scrape buyer messages, mutate inventory, reserve/reduce stock, create accounting records, create receipts/invoices, close sales, or move pipeline.

## Decision 22 — Follow-Up Decision Visible In Admin Hub Only
Controlled Buyer-Gate Follow-Up Decision is visible inside Admin Hub as read-only navigation and metrics. The Admin Hub must not execute follow-up, schedule follow-up, send WhatsApp, auto-reply, read WhatsApp, scrape buyer messages, mutate inventory, create accounting records, close sales, or move pipeline.

## Decision 23 — Final Readiness Lock Does Not Open Live Traffic
Controlled Buyer-Gate Final Readiness Lock records technical readiness only. It must not open live buyer traffic, activate real buyer gate, start ads, publish lead forms, contact buyers, send WhatsApp, auto-reply, auto-follow-up, auto-schedule, read WhatsApp, scrape buyer messages, mutate inventory, create accounting records, close sales, or move pipeline. Live gate requires a separate manual approval phase.

## Decision 24 — Final Readiness Lock Dashboard Is Read-Only
Controlled Buyer-Gate Final Readiness Lock Dashboard displays final readiness only. It must not open live traffic, activate real buyer gate, start ads, publish lead forms, contact buyers, send WhatsApp, auto-reply, auto-follow-up, auto-schedule, read WhatsApp, scrape messages, mutate inventory, create accounting records, close sales, or move pipeline.

## Decision 25 — Version 40A Is Preparation Only
Controlled Real-Buyer Gate Opening Preparation records the final go/no-go decision for the controlled 15-lead proof test. It must not open live traffic, activate buyer gate, start ads, publish forms, contact buyers, send WhatsApp, auto-reply, auto-follow-up, auto-schedule, read WhatsApp, scrape messages, mutate inventory, create accounting, close sales, or move pipeline. A separate manual launch decision is required.

## Decision 26 — Controlled 15-Lead Proof Test Is Manual Inbound Only
The first proof test is limited to 15 real inbound buyer requests. The system may record buyer requests manually but must not contact buyers, send WhatsApp, auto-reply, auto-follow-up, scrape private data, quote before stock confirmation, quote before compatibility confirmation, mutate inventory, create accounting records, close sale, or move pipeline.

## Decision 27 — WhatsApp Is Not Primary Traffic Source
WhatsApp Status and old Ladipo WhatsApp contacts must not be used as the primary traffic source. WhatsApp is a communication, manual reply, and closing-support tool. Approved internet buyer-intent sources are required for the traffic-growth stage.

## Decision 28 — Public URL Verification Required Before Traffic Gate
The project must be deployed online and verified from Android phone and laptop before any approved buyer traffic gate is opened.
