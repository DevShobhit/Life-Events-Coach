# Relocation Corpus Research Findings

**Date:** 2026-07-22
**Status:** Complete
**Source families:** GOV.UK, WHO, IRCC, USCIS, WhereNext, EveryCity, CoastalMoving

## Executive Summary

The current 41-concern relocation bank is structurally valid but content-light:
all bullets, why-now text, and card body are generic placeholders. The bank
covers ~15 content categories but lacks several high-impact concern areas
identified by authoritative relocation guidance.

**Research objective:** Identify specific enrichment needs for existing concerns
and new concerns to add for comprehensive coverage.

## Current State Audit

### Concern count and validation

- **41 concerns** (passes 40-60 gate)
- **14 content categories:** Documents (5), Immigration (3), Travel (2),
  Logistics (1), Housing (4), Administration (3), Money (3), Tax (2),
  Health (5), Family (2), Work (4), Community (2), Daily life (3),
  Transport (1), Safety (2), Planning (1)
- **All URLs are real** (gov.uk, canada.ca, who.int, fca.org.uk, uscis.gov)
- **All IDs are unique**
- **Publication validation passes**

### Content quality gaps

| Concern | Bullets | Why-now | Card body | Hidden factor | Visual URL |
|---------|---------|---------|-----------|---------------|------------|
| identity-documents | Generic | Generic | Generic | No | None |
| entry-permission | Generic | Generic | Generic | No | None |
| All 41 concerns | Generic | Generic | Generic | No | None |

**Generic bullets:** "Use the destination authority's current instructions"
(identical for all 41 concerns)

**Generic why-now:** "Requirements and timelines vary by destination and
personal circumstances." (identical for all 41 concerns)

**Generic card body:** "Write down the next verified step for: {title.lower()}."
(template, not actionable)

### Missing content elements

1. **No hidden factors flagged** - All 41 concerns have `hidden_factor: False`
2. **No curated Q&A bank** - `qa_bank` is empty in production bank
3. **No visual URLs** - All `card.visual_url` are None
4. **No onboarding field metadata** - `onboarding_field_metadata` is empty
5. **No available_stages** - All concerns have empty `available_stages`

## Research Findings: Authoritative Source Analysis

### Source families and coverage

| Source | Coverage | Relevance |
|--------|----------|-----------|
| GOV.UK moving abroad | Visas, tax, healthcare, driving, documents | High (UK-centric) |
| GOV.UK living abroad | Country-specific guidance | High |
| WHO travel health | Vaccinations, insurance, emergency care | High |
| IRCC newcomer services | Canada immigration, settlement | Medium |
| USCIS work authorization | USA work permits | Medium |
| WhereNext checklist | Complete 5-phase relocation guide | High |
| EveryCity 124-step | Detailed 90-day timeline | High |
| CoastalMoving address | 40+ address change notifications | High |

### Key findings from research

#### 1. Pre-departure phase (6-12 months before)

**Official guidance identifies these critical tasks:**

- Passport validity check (minimum 6 months beyond stay)
- Visa application submission (2-6 month processing times)
- Apostille certification for documents (4-8 weeks)
- Criminal background check (12-18 weeks for FBI check)
- Power of attorney setup
- Estate document updates (will, beneficiaries)
- Health check and vaccination updates
- School research for children
- Moving company quotes (3+ recommended)

**Current bank coverage:** Partial. Has identity-documents, entry-permission,
residence-permit, document-copies, official-translations.

**Missing concerns:**
- Power of attorney
- Estate planning updates
- Criminal background check
- Vaccination schedule (specific to destination)

#### 2. Financial preparation (3-6 months before)

**Official guidance identifies these critical tasks:**

- Tax residency consultation
- Double-taxation treaty research
- Emergency fund setup (3-6 months expenses)
- International bank account opening
- Credit history transfer
- Money transfer service selection
- Pension/retirement account transfer

**Current bank coverage:** Partial. Has banking, money-transfer, tax-residency,
tax-filing, payments.

**Missing concerns:**
- Emergency fund setup
- Credit history transfer
- Pension/retirement account management

#### 3. Documents and records (3-6 months before)

**Official guidance identifies these critical tasks:**

- Certified copies of vital records
- Document apostille
- Records retention planning
- Renewal calendar creation
- Exit planning documentation

**Current bank coverage:** Good. Has records-retention, renewal-calendar,
exit-plan.

**Missing concerns:**
- Document apostille (specific process)
- Records retention timeline

#### 4. Housing and logistics (1-3 months before)

**Official guidance identifies these critical tasks:**

- Temporary accommodation booking
- Permanent housing search
- Lease review and signing
- Utilities setup and deposits
- Address registration
- Shipping inventory and customs
- Pet import requirements

**Current bank coverage:** Good. Has temporary-housing, permanent-housing,
lease-review, utilities, local-address, shipping-inventory, customs-restrictions,
pet-import.

**Missing concerns:**
- Moving company selection and booking
- Customs documentation (ToR relief)

#### 5. Health and insurance (1-3 months before)

**Official guidance identifies these critical tasks:**

- Health insurance research and purchase
- Healthcare registration process
- Medication import rules
- Vaccination requirements
- Emergency care contacts

**Current bank coverage:** Good. Has insurance, healthcare-registration,
medication, vaccinations, emergency-care.

**Missing concerns:**
- Prescription transfer process
- Dental/vision coverage (separate from health)

#### 6. Employment and work (1-3 months before)

**Official guidance identifies these critical tasks:**

- Work authorization confirmation
- Employment contract review
- Professional licensing recognition
- Social security registration
- Qualification recognition

**Current bank coverage:** Good. Has work-authorization, employment-contract,
professional-licensing, social-security.

**Missing concerns:**
- Qualification apostille
- Professional membership transfer

#### 7. Daily life and community (arrival phase)

**Official guidance identifies these critical tasks:**

- Local transport learning
- Driving license exchange
- Mobile connectivity setup
- Data roaming check
- Community support identification
- Language access planning

**Current bank coverage:** Good. Has local-transport, driving-license,
mobile-connectivity, data-roaming, community-support, language-access.

**Missing concerns:**
- Banking setup (first week)
- Grocery/essential shopping orientation

#### 8. Safety and planning (ongoing)

**Official guidance identifies these critical tasks:**

- Safety plan creation
- Consular support contacts
- Exit plan documentation

**Current bank coverage:** Good. Has safety-plan, consular-support, exit-plan.

**Missing concerns:**
- Emergency contact list (beyond consular)
- Insurance claim process

## Missing Concern Categories (to add)

Based on research, these high-impact concerns are missing from the bank:

### Pre-departure concerns (new)

1. **power-of-attorney** - Set up legal authority for home-country matters
   - Category: Administration
   - Urgency: 85, Horizon: 0
   - Hidden factor: Yes (non-obvious to first-time movers)
   - Source: GOV.UK, legal aid organizations

2. **estate-planning** - Update will, beneficiaries, and trust documents
   - Category: Administration
   - Urgency: 80, Horizon: 0
   - Hidden factor: Yes (often deferred)
   - Source: Legal aid organizations, tax authorities

3. **criminal-background-check** - Obtain police clearance certificate
   - Category: Documents
   - Urgency: 90, Horizon: 0
   - Hidden factor: No (visa requirement)
   - Source: FBI, police services, immigration authorities

4. **vaccination-schedule** - Complete destination-specific vaccinations
   - Category: Health
   - Urgency: 75, Horizon: 30
   - Hidden factor: No
   - Source: WHO, CDC, destination health authorities

### Financial concerns (new)

5. **emergency-fund** - Set up accessible emergency fund (3-6 months)
   - Category: Money
   - Urgency: 85, Horizon: 0
   - Hidden factor: Yes (often underestimated)
   - Source: Financial planning authorities, expat guides

6. **credit-history-transfer** - Research credit history portability
   - Category: Money
   - Urgency: 60, Horizon: 30
   - Hidden factor: Yes (not available in all countries)
   - Source: Credit bureaus, financial regulators

7. **pension-transfer** - Understand pension portability options
   - Category: Money
   - Urgency: 55, Horizon: 90
   - Hidden factor: Yes (complex international rules)
   - Source: Pension authorities, tax authorities

### Document concerns (new)

8. **document-apostille** - Get apostille certification for documents
   - Category: Documents
   - Urgency: 85, Horizon: 0
   - Hidden factor: No (visa requirement)
   - Source: Hague Convention authorities, foreign ministries

### Logistics concerns (new)

9. **moving-company-selection** - Book international removal company
   - Category: Logistics
   - Urgency: 70, Horizon: 30
   - Hidden factor: No
   - Source: International moving associations, consumer protection

10. **customs-documentation** - Prepare customs declaration and ToR relief
    - Category: Travel
    - Urgency: 65, Horizon: 30
    - Hidden factor: Yes (often overlooked)
    - Source: HMRC, customs authorities

### Health concerns (new)

11. **prescription-transfer** - Transfer prescriptions to destination country
    - Category: Health
    - Urgency: 80, Horizon: 0
    - Hidden factor: Yes (controlled substances require special handling)
    - Source: Medicines authorities, healthcare providers

12. **dental-vision-coverage** - Arrange dental and vision insurance
    - Category: Health
    - Urgency: 55, Horizon: 30
    - Hidden factor: Yes (often not included in basic health insurance)
    - Source: Insurance regulators, healthcare providers

### Employment concerns (new)

13. **qualification-apostille** - Get qualifications apostilled
    - Category: Work
    - Urgency: 80, Horizon: 0
    - Hidden factor: No (visa/employment requirement)
    - Source: Education authorities, foreign ministries

14. **professional-membership-transfer** - Transfer professional memberships
    - Category: Work
    - Urgency: 50, Horizon: 90
    - Hidden factor: Yes (often forgotten)
    - Source: Professional bodies, licensing authorities

### Daily life concerns (new)

15. **banking-first-week** - Open local bank account in first week
    - Category: Money
    - Urgency: 80, Horizon: 0
    - Hidden factor: No
    - Source: Financial regulators, banking authorities

16. **grocery-orientation** - Find essential shopping locations
    - Category: Daily life
    - Urgency: 60, Horizon: 0
    - Hidden factor: No
    - Source: Local government, community services

### Safety concerns (new)

17. **emergency-contact-list** - Create comprehensive emergency contact list
    - Category: Safety
    - Urgency: 85, Horizon: 0
    - Hidden factor: No
    - Source: Emergency services, consular authorities

18. **insurance-claim-process** - Understand insurance claim procedures
    - Category: Health
    - Urgency: 50, Horizon: 30
    - Hidden factor: Yes (complex cross-border claims)
    - Source: Insurance regulators, healthcare providers

## Total Concern Count

- **Current:** 41 concerns
- **To add:** 18 concerns
- **Projected total:** 59 concerns
- **Gate requirement:** 40-60 concerns ✓

## Enrichment Plan

### Phase 1: Enrich existing 41 concerns

For each of the 41 existing concerns:
1. Replace generic bullets with 3-5 specific, actionable steps
2. Replace generic why-now with stage-specific urgency text
3. Replace generic card body with concise, actionable summary
4. Flag hidden factors where appropriate
5. Add visual URLs where available

### Phase 2: Add 18 new concerns

Add the 18 new concerns identified above with:
1. Specific bullets (3-5 per concern)
2. Meaningful why-now text
3. Concise card body
4. Hidden factor flags
5. Visual URLs where available

### Phase 3: Create Q&A bank

Add 15-20 curated question/answer pairs covering:
1. Top 5 pre-departure questions
2. Top 5 financial questions
3. Top 5 health questions
4. Top 5 daily life questions

### Phase 4: Add visual URLs

Add primary visual URLs to all 59 concerns using:
1. Official government diagrams/checklists
2. WHO/CDC infographics
3. Reputable expat guides
4. Placeholder URLs for custom diagrams (if needed)

## Validation Requirements

All changes must pass:
1. `uv run pytest tests/modules/phases/test_production_concern_bank.py`
2. Publication validation (`validate_launch_content()`)
3. Unique concern and citation IDs
4. Real official URLs (no example.gov)
5. 40-60 concerns (target: 59)
6. All concerns have 3-5 specific bullets
7. All concerns have unique why-now text
8. All concerns have concise card body (≤200 chars)
9. ≥20% of concerns flagged as hidden factor (target: 12+)
10. All concerns have visual URLs (for production)
11. Q&A bank has 15-20 entries with valid citations
