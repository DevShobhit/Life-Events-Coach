"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { CardAction } from "../types";

export function RoadmapActionDialogs({
  moreCard,
  onAction,
  onMoreChange,
  onRelevanceChange,
  relevanceCard,
}: {
  moreCard: string | null;
  relevanceCard: string | null;
  onAction: (concernId: string, action: CardAction) => void;
  onMoreChange: (open: boolean) => void;
  onRelevanceChange: (open: boolean) => void;
}) {
  return (
    <>
      <AlertDialog
        open={Boolean(relevanceCard)}
        onOpenChange={onRelevanceChange}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Is this relevant to you?</AlertDialogTitle>
            <AlertDialogDescription>
              You have skipped this twice. Keep it in your roadmap, or remove it
              as not relevant?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep deciding</AlertDialogCancel>
            <AlertDialogAction
              onClick={() =>
                relevanceCard && onAction(relevanceCard, "not_relevant")
              }
            >
              Not relevant
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog open={Boolean(moreCard)} onOpenChange={onMoreChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Have you already handled this?</AlertDialogTitle>
            <AlertDialogDescription>
              Marking it as handled removes it from your active roadmap.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => moreCard && onAction(moreCard, "already_handled")}
            >
              Already handled
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
