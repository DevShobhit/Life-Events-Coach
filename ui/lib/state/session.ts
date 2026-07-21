import { create } from "zustand";
import { persist } from "zustand/middleware";
import { browserRoadmapOfflineStore } from "@/lib/offline/roadmap-cache";

type SessionState = {
  activePhase: string;
  activeStage: string;
  phaseStages: Record<string, string>;
  developmentUserId: string;
  authenticatedUserId: string | null;
  accessToken: string | null;
  reducedMotion: boolean;
  setActivePhase: (phaseId: string) => void;
  setActiveStage: (stage: string) => void;
  setDevelopmentUserId: (userId: string) => void;
  setAuthenticatedSession: (session: {
    userId: string;
    accessToken: string;
  }) => void;
  clearAuthenticatedSession: () => void;
  setReducedMotion: (enabled: boolean) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activePhase: "relocation",
      activeStage: "arrived",
      developmentUserId: "local-dev-user",
      authenticatedUserId: null,
      accessToken: null,
      reducedMotion: false,
      phaseStages: { relocation: "arrived" },
      setActivePhase: (activePhase) =>
        set((state) => ({
          activePhase,
          activeStage: state.phaseStages[activePhase] ?? "arrived",
        })),
      setActiveStage: (activeStage) =>
        set((state) => ({
          activeStage,
          phaseStages: {
            ...state.phaseStages,
            [state.activePhase]: activeStage,
          },
        })),
      setDevelopmentUserId: (developmentUserId) => set({ developmentUserId }),
      setAuthenticatedSession: ({ userId, accessToken }) =>
        set((state) => {
          if (
            state.authenticatedUserId &&
            state.authenticatedUserId !== userId
          ) {
            browserRoadmapOfflineStore()?.clearUser(state.authenticatedUserId);
          }
          return { authenticatedUserId: userId, accessToken };
        }),
      clearAuthenticatedSession: () =>
        set((state) => {
          if (state.authenticatedUserId) {
            browserRoadmapOfflineStore()?.clearUser(state.authenticatedUserId);
          }
          return { authenticatedUserId: null, accessToken: null };
        }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: "livecoach-session",
      partialize: (state) => ({
        activePhase: state.activePhase,
        activeStage: state.activeStage,
        phaseStages: state.phaseStages,
        reducedMotion: state.reducedMotion,
      }),
    },
  ),
);
