# Business Stage 1F — Fitment Intelligence + Cross-Reference Engine

## Purpose
Build the professional fitment brain required before serious buyer traffic is opened.

## Why This Stage Exists
Part decoder, inventory, smart match, and auto quote are not enough unless the system can reason about:

- VIN
- YMM: year / make / model
- engine code
- part number
- cross-reference numbers
- alternative compatible parts
- fitment restrictions
- manual confirmation status

## Grand-Master Rule
No buyer quote should be trusted until the system has:

1. part request decoded
2. YMM or VIN captured
3. part number searched when available
4. cross-reference checked when available
5. alternative compatible parts suggested only as possible matches
6. admin manually confirms fitment
7. admin manually confirms stock

## Safety
This engine does not:
- contact buyers
- send WhatsApp
- auto-quote
- mutate inventory from buyer flow
- scrape private data
- harvest hidden data
- open traffic
- close sale
- move pipeline

## Professional Fitment Statuses
- NEEDS_MORE_INFO
- POSSIBLE_MATCH_REQUIRES_CONFIRMATION
- CROSS_REFERENCE_FOUND_REQUIRES_CONFIRMATION
- ALTERNATIVE_FOUND_REQUIRES_CONFIRMATION
- MANUALLY_CONFIRMED_FITMENT
- BLOCKED_NOT_ENOUGH_DATA

## Main Routes
- /fitment
- /fitment-search
- /vin-search
- /ymm-search
- /part-number-search
- /cross-reference
- /alternative-compatible-parts

## APIs
- POST /api/fitment/decode
- POST /api/fitment/search
- POST /api/fitment/manual-record
- POST /api/part-number/search
- POST /api/cross-reference/search
- POST /api/compatible-alternatives/search

## Business Value
This is what prevents wrong quotes and protects buyer trust.
