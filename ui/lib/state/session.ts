import { create } from "zustand";
import { persist } from "zustand/middleware";

type SessionState = {
  activePhase: string;
  activeStage: string;
  phaseStages: Record<string, string>;
  developmentUserId: string;
  reducedMotion: boolean;
  setActivePhase: (phaseId: string) => void;
  setActiveStage: (stage: string) => void;
  setDevelopmentUserId: (userId: string) => void;
  setReducedMotion: (enabled: boolean) => void;
};

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      activePhase: "relocation",
      activeStage: "arrived",
      developmentUserId: "local-dev-user",
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
