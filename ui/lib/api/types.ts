export type CardAction =
  | "done"
  | "skip"
  | "already_handled"
  | "relevant"
  | "not_relevant";

export type PhaseModule = {
  schema_version: string;
  phase_id: string;
  display_name?: string | null;
  description?: string | null;
  onboarding_fields: string[];
  onboarding_field_metadata?: {
    key: string;
    label: string;
    description?: string;
    required?: boolean;
  }[];
  thresholds?: {
    skip_count_for_relevance_check?: number;
    freshness_days?: number;
  };
};

export type PublishedPhaseModule = {
  version: number;
  module: PhaseModule;
};

export type RoadmapCard = {
  concern_id: string;
  title: string;
  view: string;
  horizon_days: number;
  hidden_factor: boolean;
  bullets: string[];
  why_now: string;
  citation_id: string;
  citation_title: string;
  citation_url: string;
  visual_url: string | null;
  reason: string;
};

export type RoadmapResponse = {
  phase_id: string;
  version: number;
  now: RoadmapCard[];
  current: RoadmapCard | null;
  horizon: { horizon_days: number; cards: RoadmapCard[] }[];
};

export function isRoadmapResponse(value: unknown): value is RoadmapResponse {
  if (!value || typeof value !== "object") return false;
  const response = value as Record<string, unknown>;
  return (
    typeof response.phase_id === "string" &&
    typeof response.version === "number" &&
    Array.isArray(response.now) &&
    response.now.every(isRoadmapCard) &&
    (response.current === null || isRoadmapCard(response.current)) &&
    Array.isArray(response.horizon) &&
    response.horizon.every(isHorizonGroup)
  );
}

function isHorizonGroup(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  const group = value as Record<string, unknown>;
  return (
    typeof group.horizon_days === "number" &&
    Array.isArray(group.cards) &&
    group.cards.every(isRoadmapCard)
  );
}

function isRoadmapCard(value: unknown): value is RoadmapCard {
  if (!value || typeof value !== "object") return false;
  const card = value as Record<string, unknown>;
  return (
    typeof card.concern_id === "string" &&
    typeof card.title === "string" &&
    Array.isArray(card.bullets) &&
    typeof card.why_now === "string" &&
    typeof card.citation_id === "string" &&
    typeof card.citation_title === "string" &&
    typeof card.citation_url === "string" &&
    (typeof card.visual_url === "string" || card.visual_url === null)
  );
}

export type Citation = {
  id: string;
  title: string;
  url: string;
  source_type: string;
  reviewed_on: string;
};

export type AskResponse = {
  mode: string;
  phase_id: string;
  version: number;
  answer: string;
  citations: Citation[];
  answer_id: string | null;
  roadmap_proposal: {
    concern_id: string;
    title: string;
    status: string;
  } | null;
};

export type Enrollment = {
  user_id: string;
  phase_id: string;
  context: Record<string, string>;
  progress_anchor: string;
};
