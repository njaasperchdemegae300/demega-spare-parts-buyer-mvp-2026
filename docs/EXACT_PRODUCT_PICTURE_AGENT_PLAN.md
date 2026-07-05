# Exact Product Picture Agent Plan

## Status
PLANNED FOR FUTURE VERSION

## Why This Feature Matters
Spare parts buyers need exact product pictures to avoid confusion and wrong purchase decisions.

The system must not show random related images. It must show images that match the buyer's exact selected details.

## Future Agent Goal
When a buyer submits a request, the system should identify the exact part and display verified product pictures linked to:
- part name
- engine code
- vehicle brand
- vehicle model
- year
- part category
- stock record
- approved image source

## Allowed Image Sources
- seller uploaded product photos
- verified internal image library
- supplier-approved images
- manually approved product images

## Blocked Image Sources
- random Google image results
- misleading related-category images
- private image scraping
- unverified images
- copyrighted images without permission

## Safety Rule
No image should be displayed to a buyer unless it passes exact-part confidence and manual approval rules.

## MVP Placement
This feature is not part of Version 1 backend foundation.
It should be added after buyer intake, inventory, and quote engine are stable.
