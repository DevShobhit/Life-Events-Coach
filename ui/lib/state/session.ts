import { create } from "zustand";

type SessionState = {
  activePhase: string;
  developmentUserId: string;
  reducedMotion: boolean;
  setActivePhase: (phaseId: string) => void;
  setDevelopmentUserId: (userId: string) => void;
  setReducedMotion: (enabled: boolean) => void;
};

export const useSessionStore = create<SessionState>((set) => ({
  activePhase: "relocation",
  developmentUserId: "local-dev-user",
  reducedMotion: false,
  setActivePhase: (activePhase) => set({ activePhase }),
  setDevelopmentUserId: (developmentUserId) => set({ developmentUserId }),
  setReducedMotion: (reducedMotion) => set({ reducedMotion }),
}));
