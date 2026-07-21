"""Editorially structured relocation concern bank.

URLs point to stable official portals. Guidance is intentionally jurisdiction
agnostic; editors must replace or supplement each item for the user's country.
"""

from datetime import date

from app.modules.phases.schemas import PhaseModule

_OFFICIAL_BY_CATEGORY = {
    "Documents": "https://www.gov.uk/browse/abroad",
    "Immigration": "https://www.gov.uk/browse/visas-immigration",
    "Travel": "https://www.gov.uk/foreign-travel-advice",
    "Logistics": "https://www.gov.uk/browse/abroad",
    "Housing": "https://www.gov.uk/private-renting",
    "Administration": "https://www.gov.uk/browse/abroad",
    "Money": "https://www.gov.uk/government/organisations/financial-conduct-authority",
    "Tax": "https://www.gov.uk/government/organisations/hm-revenue-customs",
    "Health": "https://www.who.int/health-topics/travel-health",
    "Family": "https://www.canada.ca/en/services/immigration-citizenship.html",
    "Work": "https://www.usa.gov/work-in-us",
    "Community": "https://www.usa.gov/state-local-governments",
    "Transport": "https://www.gov.uk/browse/driving",
    "Safety": "https://www.gov.uk/foreign-travel-advice",
    "Planning": "https://www.gov.uk/browse/abroad",
    "Daily life": "https://www.usa.gov/state-local-governments",
}
_TOPICS = [
    ("identity-documents", "Check passport and identity-document validity", 95, 0, "Documents"),
    ("entry-permission", "Confirm entry permission and visa requirements", 95, 0, "Immigration"),
    ("residence-permit", "Identify the residence-permit application path", 90, 0, "Immigration"),
    ("document-copies", "Create secure copies of essential documents", 85, 0, "Documents"),
    ("official-translations", "Check whether certified translations are required", 75, 0, "Documents"),
    ("departure-notice", "Record departure and address-change obligations", 70, 0, "Administration"),
    ("customs-restrictions", "Review customs and restricted-goods rules", 65, 0, "Travel"),
    ("pet-import", "Check pet import and vaccination requirements", 55, 30, "Travel"),
    ("shipping-inventory", "Inventory items for shipping or storage", 50, 30, "Logistics"),
    ("temporary-housing", "Confirm temporary accommodation for arrival", 80, 0, "Housing"),
    ("permanent-housing", "Define criteria for permanent housing", 70, 30, "Housing"),
    ("lease-review", "Review lease terms and tenant protections", 65, 30, "Housing"),
    ("utilities", "Plan utility setup and deposits", 55, 30, "Housing"),
    ("local-address", "Determine how to register a local address", 75, 30, "Administration"),
    ("banking", "Check banking access and account requirements", 75, 30, "Money"),
    ("payments", "Plan a safe first-week payment method", 70, 0, "Money"),
    ("tax-residency", "Identify tax-residency questions to ask an adviser", 80, 30, "Tax"),
    ("tax-filing", "Find the official tax filing obligations", 65, 90, "Tax"),
    ("insurance", "Review health and liability insurance needs", 80, 30, "Health"),
    ("healthcare-registration", "Find how to register for local healthcare", 75, 30, "Health"),
    ("medication", "Check medicine import and prescription rules", 85, 0, "Health"),
    ("vaccinations", "Review destination vaccination guidance", 60, 30, "Health"),
    ("emergency-care", "Save local emergency and urgent-care contacts", 65, 0, "Health"),
    ("schooling", "Map school or education enrollment requirements", 60, 30, "Family"),
    ("child-documents", "Check documents required for accompanying children", 80, 0, "Family"),
    ("work-authorization", "Confirm whether work authorization is needed", 90, 0, "Work"),
    ("employment-contract", "Review local employment contract expectations", 65, 30, "Work"),
    ("professional-licensing", "Check recognition of regulated qualifications", 75, 90, "Work"),
    ("social-security", "Understand social-security registration questions", 55, 90, "Work"),
    ("language-access", "Plan translation and language support", 50, 30, "Community"),
    ("local-transport", "Learn the first-mile local transport options", 55, 0, "Daily life"),
    ("driving-license", "Check driving licence validity and exchange rules", 65, 90, "Transport"),
    ("mobile-connectivity", "Arrange reliable mobile connectivity", 55, 0, "Daily life"),
    ("data-roaming", "Check roaming, SIM, and device compatibility", 60, 0, "Daily life"),
    ("safety-plan", "Create a personal safety and contact plan", 75, 0, "Safety"),
    ("consular-support", "Save consular or diplomatic support contacts", 60, 0, "Safety"),
    ("community-support", "Identify trusted local community resources", 45, 30, "Community"),
    ("money-transfer", "Choose a regulated money-transfer method", 65, 0, "Money"),
    ("records-retention", "Store records for future applications and renewals", 55, 90, "Documents"),
    ("renewal-calendar", "Create a calendar for permits and document renewals", 70, 90, "Administration"),
    ("exit-plan", "Record conditions for changing or ending the move", 35, 90, "Planning"),
]


def build_production_relocation_bank(*, reviewed_on: date | None = None) -> PhaseModule:
    reviewed = reviewed_on or date.today()
    concerns = []
    for index, (slug, title, urgency, horizon, category) in enumerate(_TOPICS, 1):
        citation_id = f"relocation-official-{index:02d}"
        concerns.append(
            {
                "id": f"relocation-{slug}",
                "title": title,
                "content_category": category,
                "urgency": urgency,
                "horizon_days": horizon,
                "bullets": ["Use the destination authority's current instructions"],
                "why_now": "Requirements and timelines vary by destination and personal circumstances.",
                "jurisdiction_scope": "Destination jurisdiction; confirm current official requirements",
                "citation": {
                    "id": citation_id,
                    "title": f"Official {category.lower()} guidance portal",
                    "url": _OFFICIAL_BY_CATEGORY[category],
                    "source_type": "government_portal",
                    "reviewed_on": reviewed,
                },
                "card": {"body": f"Write down the next verified step for: {title.lower()}."},
            }
        )
    return PhaseModule.model_validate(
        {
            "schema_version": "1.0",
            "phase_id": "relocation",
            "display_name": "Relocation",
            "description": "A reviewed starting bank for planning an international move.",
            "source_policy": ["government_portal"],
            "onboarding_fields": ["origin_country", "destination_country", "relocation_stage"],
            "concerns": concerns,
        }
    )


PRODUCTION_RELOCATION = build_production_relocation_bank(reviewed_on=date(2026, 7, 1))
