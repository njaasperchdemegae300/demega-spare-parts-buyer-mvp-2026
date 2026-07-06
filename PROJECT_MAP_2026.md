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
