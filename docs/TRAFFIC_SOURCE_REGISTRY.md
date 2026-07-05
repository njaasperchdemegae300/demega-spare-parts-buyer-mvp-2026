# Traffic Source Registry

## Project
Demega Spare Parts Buyer MVP 2026

## Original Big Target
Spare-parts-bulk-buyer_Engine_2026 Ai Morden

## Registry Rule
This project must capture buyer intent only.

Allowed source types:
- RFQ
- opt-in form
- inbound WhatsApp click-to-chat
- public business inquiry
- approved API
- approved partnership
- manual lead entered after real buyer conversation

Blocked source types:
- private-data scraping
- hidden personal data harvesting
- unsolicited WhatsApp blasting
- spam
- fake RFQ
- treating seller listings as buyers
- quote before stock confirmation
- quote before compatibility confirmation

## Nigeria Buyer-Intent Sources

APPROVED:
- Owned landing page forms
- Google Search buyer-intent landing pages
- Meta / Facebook / Instagram Lead Ads with opt-in form
- WhatsApp click-to-chat initiated by buyer
- Google Business Profile inbound calls/messages
- Manual shop visitor intake
- Mechanic/dealer/referral buyer inquiry entered manually
- Public procurement/RFQ pages where buyer intent is explicit

CONDITIONAL:
- Jiji-like marketplaces only when buyer intent is explicit and public
- Facebook groups only when buyer publicly requests a part and platform rules allow response
- WhatsApp groups only when buyer asks publicly and no spam is used

BLOCKED:
- scraping private phone numbers
- mass messaging sellers
- treating seller ads as buyer leads
- unsolicited WhatsApp campaigns

## Africa Buyer-Intent Sources

APPROVED:
- Country-specific Google Search landing pages
- Country-specific Meta Lead Ads
- Public RFQ/procurement platforms
- B2B directories only when inquiry/RFQ is explicit
- LinkedIn company/procurement targeting with compliant outreach

CONDITIONAL:
- Africa marketplace listings are market intelligence only unless buyer intent is explicit
- Dealer directories are company intelligence only unless they opt in or request supply

BLOCKED:
- hidden personal data harvesting
- unsolicited bulk messaging
- scraping personal contact details from private pages

## Worldwide Buyer-Intent Sources

APPROVED:
- Alibaba RFQ / buyer inquiry workflow
- Global Sources RFQ / buyer inquiry workflow
- Go4WorldBusiness RFQ workflow
- TradeWheel RFQ workflow
- ExportHub RFQ workflow
- Europages company inquiry workflow
- Kompass company/procurement targeting workflow
- LinkedIn Sales Navigator company/procurement targeting with compliant outreach
- Owned SEO landing pages for international buyers
- Google Search Ads for buyer-intent keywords

CONDITIONAL / MARKET INTELLIGENCE ONLY:
- eBay Motors
- OEC Marketplace / RepairLink
- PartsTech
- RockAuto
- AutoZone
- RevolutionParts
- Car-Part.com
- Marketparts
- Jiji-like platforms
- seller-heavy marketplaces

These sources are not automatically buyer-lead sources. They can be used for market intelligence, part demand research, competitor pricing, catalog structure, and partnership research. They become buyer-lead sources only if there is approved API access, partnership access, RFQ access, opt-in form, or explicit public buyer inquiry.

## Exact Product Picture Alignment

Traffic source leads must later connect to:
- part name
- vehicle brand
- vehicle model
- year
- engine code
- buyer urgency
- stock availability
- compatibility confirmation
- approved product photos

## Current Traffic Source Verdict

APPROVED NOW:
- owned landing page
- manual buyer intake
- WhatsApp buyer-initiated click-to-chat
- Google Search landing page forms
- Meta Lead Ads opt-in forms
- public RFQ/buyer inquiry sources

PLANNED LATER:
- Alibaba RFQ
- Global Sources RFQ
- Go4WorldBusiness
- TradeWheel
- ExportHub
- Europages
- Kompass
- LinkedIn Sales Navigator
- Google Ads buyer-intent campaigns

MARKET INTELLIGENCE ONLY UNTIL APPROVED:
- eBay Motors
- OEC Marketplace / RepairLink
- PartsTech
- RockAuto
- AutoZone
- RevolutionParts
- Car-Part.com
- Marketparts
- Jiji-like marketplaces

## Quote Safety Rules
- No quote before stock confirmation
- No quote before compatibility confirmation
- Manual review before buyer reply
