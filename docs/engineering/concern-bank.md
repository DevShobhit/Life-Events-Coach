# Relocation concern bank

The production relocation bank contains 59 reviewed starter concerns. Each
concern has a stable ID, category, urgency, horizon, citation, and
`jurisdiction_scope`. The bank is a planning aid, not legal, immigration,
financial, or medical advice.

## Content structure

Each concern includes:

- **Bullets:** 3-5 specific, actionable steps (not generic advice)
- **Why-now:** Stage-specific urgency text explaining timing
- **Card body:** Concise, actionable summary (≤200 chars)
- **Hidden factor:** Flag for non-obvious concerns (26 of 59 concerns)
- **Citation:** Official government portal URL with review date

The bank also includes 18 curated Q&A pairs covering common relocation
questions with authoritative source citations.

## Source policy

Content uses official pages only (`government_portal`). Current source
families include:

- [WHO travel health](https://www.who.int/health-topics/travel-health)
- [UK foreign travel advice](https://www.gov.uk/foreign-travel-advice)
- [UK visas and immigration](https://www.gov.uk/browse/visas-immigration)
- [UK private renting](https://www.gov.uk/private-renting)
- [UK driving](https://www.gov.uk/browse/driving)
- [HM Revenue & Customs](https://www.gov.uk/government/organisations/hm-revenue-customs)
- [Financial Conduct Authority](https://www.gov.uk/government/organisations/financial-conduct-authority)
- [Canada immigration and citizenship](https://www.canada.ca/en/services/immigration-citizenship.html)
- [USA work guidance](https://www.usa.gov/work-in-us)
- [USA state and local government](https://www.usa.gov/state-local-governments)

Each concern points to an exact page within one of these source families.
These pages are not universal rules. Editors must select the
destination authority and jurisdiction before publishing a personalized
version. Requirements can vary by country, state/province, city, immigration
status, and date.

## Content categories

Concerns cover 14 content categories:

- **Documents:** Passports, translations, copies, apostille, background checks
- **Immigration:** Visas, residence permits, work authorization
- **Travel:** Customs, pet import, shipping, moving companies
- **Logistics:** Shipping inventory, moving company selection
- **Housing:** Temporary, permanent, lease review, utilities
- **Administration:** Address registration, departure notice, renewal calendar
- **Money:** Banking, payments, emergency fund, money transfer, credit, pension
- **Tax:** Residency, filing obligations
- **Health:** Insurance, healthcare registration, medication, vaccinations, dental/vision
- **Family:** Schooling, child documents
- **Work:** Employment contract, professional licensing, qualification apostille, social security
- **Community:** Language access, community support
- **Daily life:** Local transport, mobile connectivity, grocery orientation
- **Transport:** Driving license
- **Safety:** Safety plan, consular support, emergency contacts

## Validation and tests

`PRODUCTION_RELOCATION` in
`server/app/modules/phases/production_concern_bank.py` is validated by
`server/tests/modules/phases/test_production_concern_bank.py` for:

- 40–60 concerns (currently 59);
- unique concern and citation IDs;
- jurisdiction metadata;
- non-fabricated URLs; and
- publication-gate compatibility.

## Seed file

`server/seed_relocation.json` is the JSON representation of
`PRODUCTION_RELOCATION` consumed by the Docker entrypoint and manual seed
commands. It is **not** the source of truth — edit
`production_concern_bank.py`, then regenerate the seed file:

```powershell
cd server
\.venv\Scripts\Activate.ps1
python -c "import json; from app.modules.phases.fixtures import LAUNCH_RELOCATION, LAUNCH_RELOCATION_VERSION as V; json.dump({'phase_id': LAUNCH_RELOCATION.phase_id, 'version': V, 'status': 'published', 'content': LAUNCH_RELOCATION.model_dump(mode='json')}, open('seed_relocation.json', 'w'), indent=2, ensure_ascii=False)"
```

The Docker container applies the seed automatically on startup. For local
development without Docker, run `seed-launch` manually:

```powershell
python -m app.core.migrations seed-launch --seed-file seed_relocation.json
```

The seed is idempotent: it skips if the version already exists. Bump
`LAUNCH_RELOCATION_VERSION` in `fixtures.py` to publish an updated corpus.

Before launch, confirm each exact page still applies to the selected
destination, record the jurisdiction, and obtain editorial/legal/clinical
review where the card concerns regulated requirements.

## Content quality rules

1. **Bullets** must be actionable steps, not advice. Good: "Apply for
   apostille at least 4 weeks before departure." Bad: "Make sure your
   documents are in order."
2. **Why-now** must explain stage-specific urgency. Good: "Passport
   renewal takes 6-10 weeks; starting now prevents departure delays."
   Bad: "Requirements vary by destination."
3. **Card body** must be a concise summary (≤200 chars). Good: "Check
   passport validity and renew if expiry is within 6 months."
   Bad: "Write down the next verified step for: check passport validity."
4. **Hidden factors** are non-obvious concerns that surprise people.
   Examples: tax residency crossover, insurance coverage gaps, driving
   license exchange deadlines.
