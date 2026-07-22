export const phaseQueryKeys = {
  all: ["phases"] as const,
  catalog: () => ["phases", "catalog"] as const,
};
