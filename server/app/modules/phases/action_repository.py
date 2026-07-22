from dataclasses import dataclass
from datetime import date

from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.phases.lifecycle import CardAction, CardState, apply_action
from app.modules.phases.orm_models import CardActionRecord, CardProgressRecord
from app.modules.phases.repository import session_transaction


@dataclass(frozen=True)
class ActionResult:
    status: str
    skip_count: int
    idempotent: bool


class CardActionRepository:
    def __init__(self, session: AsyncSession) -> None:
        self._session = session

    async def apply(
        self,
        *,
        user_id: str,
        phase_id: str,
        concern_id: str,
        action: CardAction,
        skip_threshold: int,
        idempotency_key: str,
    ) -> ActionResult:
        async with session_transaction(self._session):
            action_key = (user_id, phase_id, concern_id, idempotency_key)
            prior = await self._session.get(CardActionRecord, action_key)
            if prior is not None:
                if prior.action != action.value:
                    raise ValueError(
                        "idempotency key already used with different payload"
                    )
                return ActionResult(prior.resulting_status, prior.skip_count, True)

            progress_key = (user_id, phase_id, concern_id)
            # Serialize transitions for a card. PostgreSQL row locks ensure two
            # devices cannot both read the same skip_count and overwrite it.
            progress = await self._session.get(
                CardProgressRecord, progress_key, with_for_update=True
            )
            state = CardState(
                status=progress.status if progress else "pending",
                skip_count=progress.skip_count if progress else 0,
            )
            next_state = apply_action(state, action, skip_threshold=skip_threshold)
            if progress is None:
                self._session.add(
                    CardProgressRecord(
                        user_id=user_id,
                        phase_id=phase_id,
                        concern_id=concern_id,
                        status=next_state.status,
                        skip_count=next_state.skip_count,
                        completed_on=(
                            date.today()
                            if next_state.status in {"done", "already_handled"}
                            else None
                        ),
                    )
                )
            else:
                progress.status = next_state.status
                progress.skip_count = next_state.skip_count
                if next_state.status in {"done", "already_handled"}:
                    progress.completed_on = date.today()
            self._session.add(
                CardActionRecord(
                    user_id=user_id,
                    phase_id=phase_id,
                    concern_id=concern_id,
                    idempotency_key=idempotency_key,
                    action=action.value,
                    resulting_status=next_state.status,
                    skip_count=next_state.skip_count,
                )
            )
            return ActionResult(next_state.status, next_state.skip_count, False)
