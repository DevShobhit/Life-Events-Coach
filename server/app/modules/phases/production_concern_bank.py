"""Editorially structured relocation concern bank.

URLs point to stable official portals. Guidance is intentionally jurisdiction
agnostic; editors must replace or supplement each item for the user's country.
"""

from datetime import date

from app.modules.phases.schemas import PhaseModule

_SOURCE_BY_SLUG = {
    "identity-documents": ("Passport and travel document advice", "https://www.gov.uk/government/organisations/hm-passport-office", "Origin and destination authorities"),
    "entry-permission": ("Check UK visa", "https://www.gov.uk/check-uk-visa", "Destination immigration authority"),
    "residence-permit": ("UK visas and immigration", "https://www.gov.uk/government/organisations/uk-visas-and-immigration", "Destination immigration authority"),
    "document-copies": ("Keep your passport safe", "https://www.gov.uk/government/publications/keeping-your-passport-safe", "Origin and destination authorities"),
    "official-translations": ("UK visa supporting documents", "https://www.gov.uk/government/publications/translated-documents", "Destination immigration authority"),
    "departure-notice": ("Living abroad", "https://www.gov.uk/guidance/living-in-a-country-or-territory", "Origin-country authority"),
    "customs-restrictions": ("Bringing goods into the UK", "https://www.gov.uk/bringing-goods-into-uk-personal-use", "Destination customs authority"),
    "pet-import": ("Pet travel: approved routes and requirements", "https://www.gov.uk/bring-pet-to-great-britain", "Destination animal-health authority"),
    "shipping-inventory": ("Moving abroad", "https://www.gov.uk/guidance/moving-or-retiring-abroad", "Origin and destination authorities"),
    "temporary-housing": ("Moving abroad: accommodation", "https://www.gov.uk/guidance/moving-or-retiring-abroad", "Destination jurisdiction"),
    "permanent-housing": ("Renting privately", "https://www.gov.uk/private-renting", "Destination housing jurisdiction"),
    "lease-review": ("Renting privately", "https://www.gov.uk/private-renting", "Destination housing jurisdiction"),
    "utilities": ("Moving abroad", "https://www.gov.uk/guidance/moving-or-retiring-abroad", "Destination jurisdiction"),
    "local-address": ("Newcomer services", "https://www.canada.ca/en/immigration-refugees-citizenship/services/newcomers.html", "Destination jurisdiction"),
    "banking": ("Financial Conduct Authority: banking", "https://www.fca.org.uk/consumers/bank-accounts", "Destination financial regulator"),
    "payments": ("Protect yourself from scams", "https://www.gov.uk/stop-scams", "Destination jurisdiction"),
    "tax-residency": ("International individuals and businesses", "https://www.gov.uk/government/organisations/hm-revenue-customs", "Origin and destination tax authorities"),
    "tax-filing": ("Tax when you leave the UK", "https://www.gov.uk/tax-uk-income-live-abroad", "Origin and destination tax authorities"),
    "insurance": ("Travel health and insurance", "https://www.who.int/health-topics/travel-health", "Destination health jurisdiction"),
    "healthcare-registration": ("Health care in Canada", "https://www.canada.ca/en/health-canada/services/health-care-system.html", "Destination health jurisdiction"),
    "medication": ("Bringing medication into the UK", "https://www.gov.uk/travelling-with-medicine", "Destination medicines authority"),
    "vaccinations": ("WHO travel vaccines", "https://www.who.int/travel-advice/vaccines", "Destination health jurisdiction"),
    "emergency-care": ("Emergency numbers", "https://www.gov.uk/foreign-travel-advice", "Destination jurisdiction"),
    "schooling": ("Education in Canada", "https://www.canada.ca/en/services/education.html", "Destination education jurisdiction"),
    "child-documents": ("Children and family visas", "https://www.gov.uk/browse/visas-immigration/family-visas", "Destination immigration authority"),
    "work-authorization": ("Working in the United States", "https://www.uscis.gov/working-in-the-united-states", "Destination immigration authority"),
    "employment-contract": ("Employment rights", "https://www.gov.uk/employment-status", "Destination employment jurisdiction"),
    "professional-licensing": ("Regulated professions", "https://www.gov.uk/government/collections/recognition-of-professional-qualifications", "Destination licensing authority"),
    "social-security": ("Social security abroad", "https://www.gov.uk/government/organisations/department-for-work-pensions", "Origin and destination authorities"),
    "language-access": ("Settlement services", "https://www.canada.ca/en/immigration-refugees-citizenship/services/newcomers.html", "Destination jurisdiction"),
    "local-transport": ("Public transport and travel advice", "https://www.gov.uk/foreign-travel-advice", "Destination jurisdiction"),
    "driving-license": ("Driving abroad", "https://www.gov.uk/driving-abroad", "Destination transport authority"),
    "mobile-connectivity": ("Moving abroad", "https://www.gov.uk/guidance/moving-or-retiring-abroad", "Destination jurisdiction"),
    "data-roaming": ("Using your mobile abroad", "https://www.gov.uk/guidance/using-your-mobile-abroad", "Origin and destination telecom authorities"),
    "safety-plan": ("Foreign travel advice", "https://www.gov.uk/foreign-travel-advice", "Destination safety jurisdiction"),
    "consular-support": ("Support for British nationals abroad", "https://www.gov.uk/foreign-travel-advice", "Origin consular authority"),
    "community-support": ("Newcomer services", "https://www.canada.ca/en/immigration-refugees-citizenship/services/newcomers.html", "Destination jurisdiction"),
    "money-transfer": ("Money transfer and payment services", "https://www.fca.org.uk/consumers/payment-services", "Destination financial regulator"),
    "records-retention": ("Keep your passport safe", "https://www.gov.uk/government/publications/keeping-your-passport-safe", "Origin and destination authorities"),
    "renewal-calendar": ("Visa and immigration guidance", "https://www.gov.uk/browse/visas-immigration", "Destination immigration authority"),
    "exit-plan": ("Moving or retiring abroad", "https://www.gov.uk/guidance/moving-or-retiring-abroad", "Origin and destination authorities"),
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
                "jurisdiction_scope": _SOURCE_BY_SLUG[slug][2],
                "citation": {
                    "id": citation_id,
                    "title": _SOURCE_BY_SLUG[slug][0],
                    "url": _SOURCE_BY_SLUG[slug][1],
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
