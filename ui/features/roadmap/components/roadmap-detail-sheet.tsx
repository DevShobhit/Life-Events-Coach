"use client";

import { useEffect } from "react";
import type { RefObject } from "react";
import { ExternalLink } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type { RoadmapCardData } from "@/components/roadmap-card";

export function RoadmapDetailSheet({
  card,
  triggerRef,
  onOpenChange,
  open,
}: {
  card: RoadmapCardData | null;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
}) {
  useEffect(() => {
    if (!open) triggerRef.current?.focus();
  }, [open, triggerRef]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        aria-describedby="roadmap-detail-description"
        aria-labelledby="roadmap-detail-title"
        className="overflow-y-auto overscroll-contain"
        side="bottom"
      >
        <SheetHeader>
          <SheetTitle id="roadmap-detail-title">
            {card?.title ?? "Card details"}
          </SheetTitle>
          <SheetDescription id="roadmap-detail-description">
            {card?.whyNow}
          </SheetDescription>
        </SheetHeader>
        {card ? (
          <div className="space-y-4 px-4">
            <ul className="space-y-2 text-sm leading-6">
              {card.bullets.map((bullet) => (
                <li className="flex gap-2" key={bullet}>
                  <span aria-hidden="true">•</span>
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            {card.source ? (
              <a
                className="inline-flex min-h-11 items-center gap-1 text-sm underline underline-offset-4"
                href={card.source.url}
                rel="noreferrer"
                target="_blank"
              >
                {card.source.title}
                <ExternalLink aria-hidden="true" className="size-3" />
                <span className="sr-only">(opens in a new tab)</span>
              </a>
            ) : null}
          </div>
        ) : null}
        <SheetFooter />
      </SheetContent>
    </Sheet>
  );
}
