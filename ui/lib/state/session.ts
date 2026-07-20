import { create } from "zustand";
import { persist } from "zustand/middleware";

type SessionState = {
  activePhase: string;
  activeStage: string;
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
      setActivePhase: (activePhase) => set({ activePhase }),
      setActiveStage: (activeStage) => set({ activeStage }),
      setDevelopmentUserId: (developmentUserId) => set({ developmentUserId }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
    }),
    {
      name: "livecoach-session",
      partialize: (state) => ({
        activePhase: state.activePhase,
        activeStage: state.activeStage,
        reducedMotion: state.reducedMotion,
      }),
    },
  ),
);
