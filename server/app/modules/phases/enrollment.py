from datetime import date

from app.modules.phases.schemas import Enrollment, PhaseModule


def validate_enrollment(
    module: PhaseModule,
    *,
    user_id: str,
    phase_id: str,
    context: dict[str, str],
    progress_anchor: date,
) -> Enrollment:
    if module.phase_id != phase_id:
        raise ValueError("phase not found")
    allowed = set(module.onboarding_fields)
    # Preserve the pre-authoritative API's generic stage field during migration.
    if "stage" in context and any("stage" in key for key in allowed):
        allowed.add("stage")
    unknown = set(context) - allowed
    if unknown:
        raise ValueError(f"unknown enrollment field: {sorted(unknown)[0]}")
    required = {
        field.key for field in module.onboarding_field_metadata if field.required
    }
    missing = {
        field
        for field in required
        if field not in context
        and not (field == "relocation_stage" and "stage" in context)
    }
    if missing:
        raise ValueError(f"missing required enrollment field: {sorted(missing)[0]}")
    for key, value in context.items():
        if not value.strip() or len(value) > 200:
            raise ValueError(f"invalid value for enrollment field: {key}")
    stage_keys = [key for key in allowed if "stage" in key]
    known_stages = {
        stage for concern in module.concerns for stage in concern.available_stages
    }
    if stage_keys and not known_stages:
        known_stages = {"pre_departure", "preparing", "arrived", "settling"}
    for key in stage_keys:
        stage_value = context.get(key)
        if stage_value is not None and known_stages and stage_value not in known_stages:
            raise ValueError(f"invalid stage value: {stage_value}")
    return Enrollment(
        user_id=user_id,
        phase_id=phase_id,
        context=context,
        progress_anchor=progress_anchor,
    )
