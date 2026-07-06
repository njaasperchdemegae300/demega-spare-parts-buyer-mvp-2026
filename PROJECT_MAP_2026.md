# PROJECT MAP 2026

## Version 0 — Recovery and Project Control
Goal: Create the project source-of-truth files and stop chat confusion.

## Version 1 — Backend and Database Foundation
Goal: Create server, routes, and data structure.

## Version 2 — Buyer Intake System
Goal: Capture buyer requests safely.

## Version 3 — Admin Dashboard
Goal: View, filter, and manage buyer leads.

## Version 4 — Buyer Scoring Engine
Goal: Rank hot, warm, and cold buyers.

## Version 5 — Inventory Command Center
Goal: Store and search spare-parts stock.

## Version 6 — Smart Quote and WhatsApp Reply
Goal: Match stock and prepare manual WhatsApp-ready quote.

## Version 7 — Follow-up Engine
Goal: Track old buyers and recover warm leads.

## Version 8 — Project Health Agent
Goal: Test server, routes, files, logs, and screenshots.

## Version 9 — Version Guardian and Controlled Test
Goal: Approve, block, or mark needs-fix before live testing.

# Version 1D — Traffic Source Registry + Source TrustGate

## Status
ADDED TO PROJECT MAP

## Purpose
Keep the MVP aligned with Spare-parts-bulk-buyer_Engine_2026 Ai Morden.

## Traffic Source Registry
docs/TRAFFIC_SOURCE_REGISTRY.md

## TrustGate Rule
Only buyer-intent sources are approved.

## Approved Buyer-Intent Source Types
- RFQ
- opt-in form
- inbound WhatsApp click-to-chat
- public business inquiry
- approved API
- approved partnership
- manual buyer intake after real buyer conversation

## Market Intelligence Only
Seller-heavy marketplaces and catalog platforms are not buyer-lead sources by default.

## Next Phase After Approval
Version 2A — Buyer Intake API Foundation

# Version 4B — Buyer Scoring Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Show buyer scoring intelligence inside the admin dashboard.

## Features
- Lead Score display
- Hot / Warm / Cold dashboard cards
- Temperature column
- Buyer Type column
- Source Quality column
- Scoring Reasons column

## Safety Rules
- No auto-send WhatsApp
- No quote before stock confirmation
- No quote before compatibility confirmation
- Manual review remains required

## Next Phase After Approval
Version 5A — Inventory Command Center Foundation

# Version 5B — Inventory Matching Foundation

## Status
ADDED TO PROJECT MAP

## Purpose
Match buyer requests to inventory while keeping quote gates blocked until manual stock and compatibility confirmation.

## Routes
- POST /api/inventory/match
- GET /api/inventory/match-preview

## Matching Fields
- partName
- partCategory
- vehicleBrand
- vehicleModel
- vehicleYear
- engineCode
- stockStatus

## Safety Rules
- No automatic quote creation
- No quote before stock confirmation
- No quote before compatibility confirmation
- Manual review remains required
- safeToQuoteNow remains false unless all gates pass

## Next Phase After Approval
Version 6A — Safe Auto Quote Draft Foundation

# Version 6B — Quote Draft Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Show safe quote drafts in a read-only dashboard with copy-only manual review workflow.

## Routes
- GET /quotes
- GET /quote-drafts
- GET /api/quotes
- GET /api/quotes/summary

## Features
- Quote draft table
- Draft message display
- Copy Draft button
- Draft-only metrics
- Manual review metrics
- Auto-send safety metrics

## Safety Rules
- No WhatsApp auto-send
- Copy Draft only copies text
- sentToBuyer remains false
- Manual review before sending

## Next Phase After Approval
Version 7A — Buyer Pipeline Foundation

# Version 7B — Buyer Pipeline Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Show buyer pipeline leads and pipeline events in a read-only admin dashboard.

## Routes
- GET /pipeline
- GET /buyer-pipeline
- GET /api/pipeline/summary
- GET /api/pipeline/events
- GET /api/leads

## Features
- Pipeline metric cards
- Buyer pipeline lead table
- Pipeline stage filter
- Pipeline event table
- Manual-action safety labels

## Safety Rules
- No WhatsApp auto-send
- No automatic quote creation
- No automatic stage movement from dashboard
- sentToBuyer remains false
- Manual review remains required

## Next Phase After Approval
Version 8A — Follow-Up Reminder Foundation

# Version 8B — Follow-Up Reminder Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Show manual follow-up reminders in a read-only dashboard.

## Routes
- GET /followups
- GET /follow-up-reminders
- GET /api/followups
- GET /api/followups/summary

## Features
- Follow-up metric cards
- Follow-up reminder table
- Status filter
- Type filter
- Due time display
- Manual-action safety labels

## Safety Rules
- No WhatsApp auto-send
- No automatic buyer message
- No automatic quote creation
- sentToBuyer remains false
- Manual action remains required

## Next Phase After Approval
Version 9A — Admin Navigation Hub Foundation

# Version 9B — Admin Navigation Hub Dashboard Polish

## Status
ADDED TO PROJECT MAP

## Purpose
Polish the admin navigation hub with read-only live MVP metrics and safety-lock visibility.

## Routes
- GET /admin-navigation-hub
- GET /admin-hub
- GET /api/admin-navigation/summary
- GET /api/admin-navigation/dashboard-metrics

## Features
- Live Business Snapshot
- Buyer lead metrics
- Inventory metrics
- Quote draft metrics
- Pipeline metrics
- Follow-up metrics
- Admin Safety Locks panel

## Safety Rules
- Navigation and visibility only
- Metrics API is read-only
- No WhatsApp auto-send
- No automatic quote creation
- No automatic pipeline movement
- Manual review remains required

## Next Phase After Approval
Version 10A — Buyer Action Queue Foundation

# Version 10B — Buyer Action Queue Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Show safe manual buyer actions in a read-only dashboard.

## Routes
- GET /action-queue
- GET /buyer-action-queue
- GET /api/action-queue
- GET /api/action-queue/summary

## Features
- Action queue metric cards
- Buyer action table
- Status filter
- Priority filter
- Action type filter
- Due time display
- Manual-action safety labels

## Safety Rules
- No WhatsApp auto-send
- No automatic buyer message
- No automatic quote creation
- No automatic pipeline movement
- sentToBuyer remains false
- Manual action remains required

## Next Phase After Approval
Version 10C — Admin Hub Link Action Queue

# Version 11A — Hot Buyer Command Center Foundation

## Status
ADDED TO PROJECT MAP

## Purpose
Create a read-only Hot Buyer Command Center API that ranks serious buyer opportunities using buyer lead signals, urgency, source quality, action queue signals, follow-up signals, and pipeline signals.

## Routes
- GET /api/hot-buyers/preview
- GET /api/hot-buyers
- GET /api/hot-buyers/summary

## Features
- Hot buyer ranking
- Hot buyer score
- Hot / warm / cold classification
- Recommended manual actions
- Pending action count
- Pending follow-up count
- Urgent action count
- Safe hot buyer metrics

## Safety Rules
- Read-only ranking
- No WhatsApp auto-send
- No automatic buyer message
- No automatic quote creation
- No automatic pipeline movement
- sentToBuyer remains false
- Manual review remains required

## Next Phase After Approval
Version 11B — Hot Buyer Command Center Dashboard Display

# Version 11C — Admin Hub Link Hot Buyer Command Center

## Status
ADDED TO PROJECT MAP

## Purpose
Connect the Hot Buyer Command Center into the polished Admin Navigation Hub and Live Business Snapshot.

## Routes
- GET /admin-navigation-hub
- GET /admin-hub
- GET /hot-buyers
- GET /api/admin-navigation/summary
- GET /api/admin-navigation/dashboard-metrics
- GET /api/hot-buyers/summary

## Features
- Hot Buyer Command Center card in Admin Hub
- Hot Buyer Candidates metric
- Hot Buyers metric
- Urgent Hot Buyers metric
- Hot buyer metrics inside admin metrics API
- Hot buyer safety locks inside admin summary

## Safety Rules
- Navigation and visibility only
- Metrics API is read-only
- Hot buyer ranking is read-only
- No WhatsApp auto-send
- No automatic buyer message
- No automatic quote creation
- No automatic pipeline movement
- No automatic buyer contact
- Manual review remains required

## Next Phase After Approval
Version 12A — WhatsApp Manual Open Link Foundation

# Version 12B — WhatsApp Manual Open Link Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Display safe WhatsApp manual open links in a read-only dashboard.

## Routes
- GET /whatsapp-manual
- GET /whatsapp-manual-links
- GET /api/whatsapp-manual/links
- GET /api/whatsapp-manual/summary

## Features
- WhatsApp manual link dashboard
- Manual link metric cards
- Manual WhatsApp open link display
- Search filter
- Safe message preview
- Manual-open safety labels

## Safety Rules
- Manual open only
- No WhatsApp auto-send
- No automatic browser opening
- No automatic buyer message
- sentToBuyer remains false
- No price included
- No automatic quote creation
- Manual review remains required

## Next Phase After Approval
Version 12C — Admin Hub Link WhatsApp Manual Open Dashboard

# Version 13A — Stock Confirmation Gate Foundation

## Status
ADDED TO PROJECT MAP

## Purpose
Create a manual stock confirmation gate that records whether a requested part is physically available while keeping quote creation blocked until compatibility confirmation is completed.

## Routes
- GET /api/stock-confirmation/preview
- GET /api/stock-confirmations
- GET /api/stock-confirmation/summary
- POST /api/stock-confirmation/confirm

## Features
- Manual stock confirmation
- Stock status validation
- Confirmation method validation
- Quote/price blocking
- WhatsApp auto-send blocking
- Automatic buyer message blocking
- Automatic pipeline movement blocking
- Safe stock gate metrics

## Safety Rules
- Manual stock confirmation only
- No quote at stock confirmation stage
- Compatibility confirmation is still required before quote
- No WhatsApp auto-send
- No automatic buyer message
- No automatic pipeline movement
- sentToBuyer remains false
- Price is not included
- Manual review remains required

## Next Phase After Approval
Version 13B — Stock Confirmation Gate Dashboard Display

# Version 13C — Admin Hub Link Stock Confirmation Gate

## Status
ADDED TO PROJECT MAP

## Purpose
Connect the Stock Confirmation Gate into the polished Admin Navigation Hub and Live Business Snapshot.

## Routes
- GET /admin-navigation-hub
- GET /admin-hub
- GET /stock-confirmation
- GET /api/admin-navigation/summary
- GET /api/admin-navigation/dashboard-metrics
- GET /api/stock-confirmation/summary

## Features
- Stock Confirmation Gate card in Admin Hub
- Stock Confirmations metric
- Confirmed In Stock metric
- Quote Allowed At Stock Gate metric
- Stock confirmation metrics inside admin metrics API
- Stock confirmation safety locks inside admin summary

## Safety Rules
- Navigation and visibility only
- Metrics API is read-only
- Stock confirmation is manual-only
- Quote remains blocked at stock confirmation stage
- Compatibility confirmation is still required before quote
- No WhatsApp auto-send
- No automatic buyer message
- No automatic quote creation
- No automatic pipeline movement
- sentToBuyer remains false
- Price is not included
- Manual review remains required

## Next Phase After Approval
Version 14A — Compatibility Confirmation Gate Foundation

# Version 14B — Compatibility Confirmation Gate Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Display manual compatibility confirmations in a read-only dashboard while allowing manual quote draft only after stock and compatibility are both confirmed.

## Routes
- GET /compatibility-confirmation
- GET /compatibility-confirmation-gate
- GET /api/compatibility-confirmations
- GET /api/compatibility-confirmation/summary

## Features
- Compatibility confirmation dashboard
- Compatibility gate metric cards
- Compatibility confirmation table
- Compatibility status filter
- Confirmation method filter
- Stock gate display
- Quote gate readiness display
- Safety labels

## Safety Rules
- Read-only dashboard
- No WhatsApp auto-send
- No automatic buyer message
- No automatic quote creation
- No automatic pipeline movement
- Manual quote draft allowed only after stock and compatibility are both confirmed
- sentToBuyer remains false
- Price is not included
- Manual review remains required

## Next Phase After Approval
Version 14C — Admin Hub Link Compatibility Confirmation Gate

# Version 15A — Safe Final Quote Eligibility Gate Foundation

## Status
ADDED TO PROJECT MAP

## Purpose
Create a safe final quote eligibility gate that checks whether a lead is eligible for manual quote draft only after stock and compatibility are both confirmed.

## Routes
- GET /api/quote-eligibility/preview
- GET /api/quote-eligibilities
- GET /api/quote-eligibility/summary
- POST /api/quote-eligibility/check

## Features
- Final quote eligibility check
- Stock confirmation linkage
- Compatibility confirmation linkage
- Gate blocking before both confirmations
- Manual quote draft eligibility after both confirmations
- Price/quote payload blocking
- Automatic quote creation blocking
- WhatsApp auto-send blocking
- Automatic buyer message blocking
- Automatic browser opening blocking
- Automatic pipeline movement blocking
- Safe quote eligibility metrics

## Safety Rules
- Eligibility-check only
- Manual quote draft allowed only after stock and compatibility are both confirmed
- No automatic quote creation
- No price or quote amount included
- No WhatsApp auto-send
- No automatic buyer message
- No automatic browser opening
- No automatic pipeline movement
- sentToBuyer remains false
- Manual review remains required

## Next Phase After Approval
Version 15B — Safe Final Quote Eligibility Dashboard Display

# Version 15C — Admin Hub Link Safe Final Quote Eligibility Gate

## Status
ADDED TO PROJECT MAP

## Purpose
Connect the Safe Final Quote Eligibility Gate into the polished Admin Navigation Hub and Live Business Snapshot.

## Routes
- GET /admin-navigation-hub
- GET /admin-hub
- GET /quote-eligibility
- GET /api/admin-navigation/summary
- GET /api/admin-navigation/dashboard-metrics
- GET /api/quote-eligibility/summary

## Features
- Safe Final Quote Eligibility Gate card in Admin Hub
- Quote Eligibility Checks metric
- Eligible For Manual Quote Draft metric
- Final Quote Gate Passed metric
- Blocked Quote Gate metric
- Quote eligibility metrics inside admin metrics API
- Quote eligibility safety locks inside admin summary

## Safety Rules
- Navigation and visibility only
- Metrics API is read-only
- Quote eligibility gate is check-only
- Manual quote draft allowed only after stock and compatibility are both confirmed
- No automatic quote creation
- No price or quote amount included
- No WhatsApp auto-send
- No automatic buyer message
- No automatic browser opening
- No automatic pipeline movement
- sentToBuyer remains false
- Manual review remains required

## Next Phase After Approval
Version 16A — Safe Manual Quote Draft Builder Foundation

# Version 16B — Safe Manual Quote Draft Builder Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Display safe manual quote drafts in a read-only dashboard. Price is visible only inside draft after eligibility, and nothing is sent to the buyer automatically.

## Routes
- GET /manual-quote-draft
- GET /manual-quote-drafts
- GET /api/manual-quote-drafts
- GET /api/manual-quote-draft/summary

## Features
- Safe Manual Quote Draft Builder dashboard
- Manual quote draft metric cards
- Manual quote draft table
- Draft-only filter
- Eligibility filter
- Draft message display
- Safety labels

## Safety Rules
- Read-only dashboard
- Draft-only
- Requires final quote eligibility
- Price may appear inside draft only after eligibility
- Price is not sent to buyer
- No WhatsApp auto-send
- No automatic buyer message
- No automatic browser opening
- No automatic pipeline movement
- sentToBuyer remains false
- Manual review remains required

## Next Phase After Approval
Version 16C — Admin Hub Link Safe Manual Quote Draft Builder

# Version 17A — Manual Quote Copy Button Foundation

## Status
ADDED TO PROJECT MAP

## Purpose
Create the safe backend foundation for manual quote copy. It prepares copy text from a safe manual quote draft only after final quote eligibility has passed. It does not send WhatsApp, does not access clipboard, does not auto-copy, and does not mark any quote as sent.

## Routes
- GET /api/manual-quote-copy/preview
- GET /api/manual-quote-copies
- GET /api/manual-quote-copy/summary
- POST /api/manual-quote-copy/prepare

## Features
- Manual quote copy preparation
- Draft existence check
- Final quote eligibility safety check
- Draft-only safety check
- Copy text preparation
- Copy action audit log
- Missing draft blocking
- Unsafe send/browser/pipeline/sent request blocking
- Safe manual quote copy metrics

## Safety Rules
- Prepare copy text only
- Server does not access clipboard
- Browser auto-copy is not used in this foundation
- Copy text comes only from safe draft after final quote eligibility
- Price may appear inside copy text after eligibility
- Price is not sent to buyer
- No WhatsApp auto-send
- No automatic buyer message
- No automatic browser opening
- No automatic pipeline movement
- No quote marked as sent
- sentToBuyer remains false
- Manual review remains required

## Next Phase After Approval
Version 17B — Manual Quote Copy Button Dashboard Display

# Version 17C — Admin Hub Link Manual Quote Copy Button

## Status
ADDED TO PROJECT MAP

## Purpose
Connect the Manual Quote Copy Button into the polished Admin Navigation Hub and Live Business Snapshot.

## Routes
- GET /admin-navigation-hub
- GET /admin-hub
- GET /manual-quote-copy
- GET /api/admin-navigation/summary
- GET /api/admin-navigation/dashboard-metrics
- GET /api/manual-quote-copy/summary

## Features
- Manual Quote Copy Button card in Admin Hub
- Manual Quote Copy Actions metric
- Copy Prepared metric
- Manual Copy Only metric
- Clipboard Access metric
- Manual quote copy metrics inside admin metrics API
- Manual quote copy safety locks inside admin summary

## Safety Rules
- Navigation and visibility only
- Metrics API is read-only
- Manual Quote Copy Button is prepare-text-only
- No server clipboard access
- No browser auto-copy
- No WhatsApp auto-send
- No automatic buyer message
- No automatic browser opening
- No automatic pipeline movement
- No quote marked as sent
- sentToBuyer remains false
- Manual review remains required

## Next Phase After Approval
Version 18A — Manual Quote Sent Confirmation Gate Foundation

# Version 18B — Manual Quote Sent Confirmation Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Display manual quote sent confirmations in a read-only dashboard. The dashboard shows that admin manually sent the copied quote outside the system after review. It does not send, auto-copy, access clipboard, open browser, or move pipeline.

## Routes
- GET /manual-quote-sent-confirmation
- GET /manual-quote-sent-confirmations
- GET /api/manual-quote-sent-confirmations
- GET /api/manual-quote-sent-confirmation/summary

## Features
- Manual Quote Sent Confirmation dashboard
- Sent confirmation metric cards
- Sent confirmation table
- Manual channel filter
- Safety status filter
- Copy text snapshot display
- Safety labels

## Safety Rules
- Read-only dashboard
- Confirmation record only
- Admin manual sent confirmation display only
- No WhatsApp auto-send
- No automatic buyer message
- No automatic browser opening
- No server clipboard access
- No browser auto-copy
- No automatic pipeline movement
- No quote marked as sent by system
- Price may exist in manually sent copy text, but price is not sent by the system

## Next Phase After Approval
Version 18C — Admin Hub Link Manual Quote Sent Confirmation Gate

# Version 19A — Buyer Reply Tracking Foundation

## Status
ADDED TO PROJECT MAP

## Purpose
Create safe buyer reply tracking after manual quote sent confirmation. This records replies manually observed by admin outside the system. It does not read WhatsApp, scrape messages, harvest hidden data, auto-reply, auto-send, open browser, or move pipeline automatically.

## Routes
- GET /api/buyer-reply/preview
- GET /api/buyer-replies
- GET /api/buyer-reply/summary
- POST /api/buyer-reply/record

## Features
- Manual buyer reply recording
- Manual sent confirmation requirement
- Admin observed reply requirement
- Reply channel validation
- Reply type validation
- Buyer temperature after reply
- Missing sent confirmation blocking
- Unsafe auto-read/scrape/reply/send/browser/pipeline request blocking
- Safe buyer reply metrics

## Safety Rules
- Manual-entry only
- Manual sent confirmation is required
- Admin manually observes reply outside system
- No WhatsApp reading
- No private message scraping
- No hidden data harvesting
- No auto-reply
- No WhatsApp auto-send
- No automatic browser opening
- No automatic pipeline movement
- Manual review required before next action

## Next Phase After Approval
Version 19B — Buyer Reply Tracking Dashboard Display

# Version 19C — Admin Hub Link Buyer Reply Tracking

## Status
ADDED TO PROJECT MAP

## Purpose
Connect Buyer Reply Tracking into the polished Admin Navigation Hub and Live Business Snapshot.

## Routes
- GET /admin-navigation-hub
- GET /admin-hub
- GET /buyer-reply
- GET /api/admin-navigation/summary
- GET /api/admin-navigation/dashboard-metrics
- GET /api/buyer-reply/summary

## Features
- Buyer Reply Tracking card in Admin Hub
- Buyer Replies metric
- Hot Replies metric
- Manual Entry Replies metric
- System Read Count metric
- Scraping Count metric
- Auto Reply Count metric
- Buyer reply metrics inside admin metrics API
- Buyer reply safety locks inside admin summary

## Safety Rules
- Navigation and visibility only
- Metrics API is read-only
- Buyer Reply Tracking is manual-entry only
- Manual sent confirmation is required
- Admin observed reply is required
- No WhatsApp message reading
- No private message scraping
- No hidden data harvesting
- No auto-reply
- No WhatsApp auto-send
- No automatic browser opening
- No automatic pipeline movement
- Manual review remains required

## Next Phase After Approval
Version 20A — Buyer Reply Follow-Up Action Gate Foundation

# Version 20B — Buyer Reply Follow-Up Action Dashboard Display

## Status
ADDED TO PROJECT MAP

## Purpose
Display buyer reply follow-up action plans in a read-only dashboard. The dashboard shows manual next-action plans only. It does not execute actions, send WhatsApp, auto-reply, open browser, move pipeline, close sale, read buyer messages, scrape private messages, or harvest hidden data.

## Routes
- GET /buyer-reply-followup
- GET /buyer-reply-followups
- GET /api/buyer-reply-followups
- GET /api/buyer-reply-followup/summary

## Features
- Buyer Reply Follow-Up Action dashboard
- Follow-up action metric cards
- Follow-up action table
- Priority filter
- Action type filter
- Safety status filter
- Manual action instruction display
- Safety labels

## Safety Rules
- Read-only dashboard
- Manual action only
- Action prepared only
- Buyer reply required
- Admin review required
- Manual action approval required
- No system action execution
- No WhatsApp auto-send
- No auto-reply
- No automatic browser opening
- No automatic pipeline movement
- No automatic closing
- No buyer message reading
- No private message scraping
- No hidden data harvesting
- Manual review required before execution

## Next Phase After Approval
Version 20C — Admin Hub Link Buyer Reply Follow-Up Action Gate
