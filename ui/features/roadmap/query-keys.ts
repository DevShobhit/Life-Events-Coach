export const roadmapQueryKeys = {
  all: ["roadmap"] as const,
  detail: (userId: string, phaseId: string, stage = "arrived") =>
    ["roadmap", "detail", userId, phaseId, stage] as const,
};
