import {
  Check,
  ExternalLink,
  Eye,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import type { RefObject } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type RoadmapCardData = {
  concernId: string;
  title: string;
  bullets: string[];
  whyNow: string;
  hiddenFactor: boolean;
  source?: { title: string; url: string };
  visualUrl?: string;
  citationStale?: boolean;
};

export type RoadmapCardAction = "done" | "skip" | "already_handled";

type RoadmapCardProps = {
  card: RoadmapCardData;
  pendingAction?: RoadmapCardAction;
  onAction?: (action: RoadmapCardAction) => void;
  onDetail?: () => void;
  detailTriggerRef?: RefObject<HTMLButtonElement | null>;
  onMore?: () => void;
};

export function RoadmapCardView({
  card,
  onAction,
  onDetail,
  detailTriggerRef,
  onMore,
  pendingAction,
}: RoadmapCardProps) {
  const bullets = card.bullets.slice(0, 5);

  return (
    <Card className="overflow-hidden">
      {card.visualUrl ? (
        <div className="aspect-[16/8] bg-muted">
          <Image
            alt={card.title}
            className="size-full object-cover"
            height={400}
            src={card.visualUrl}
            unoptimized
            width={800}
          />
        </div>
      ) : (
        <div className="flex aspect-[16/8] items-center justify-center bg-muted text-muted-foreground">
          <Sparkles aria-hidden="true" className="size-8" />
          <span className="sr-only">No visual available</span>
        </div>
      )}
      <CardHeader className="gap-3">
        <div className="flex items-start justify-between gap-4">
          <h2 className="text-xl font-medium leading-7 tracking-tight">
            {card.title}
          </h2>
          {card.citationStale ? (
            <Badge variant="outline">Source review due</Badge>
          ) : null}
          {card.hiddenFactor ? (
            <Badge className="shrink-0 gap-1" variant="secondary">
              <Eye aria-hidden="true" className="size-3" />
              Hidden factor
            </Badge>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">Why now: {card.whyNow}</p>
        {onDetail ? (
          <Button
            className="min-h-11 w-fit"
            disabled={Boolean(pendingAction)}
            onClick={onDetail}
            ref={detailTriggerRef}
            variant="link"
          >
            Go deeper
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        <ul className="space-y-2 text-sm leading-6">
          {bullets.map((bullet) => (
            <li className="flex gap-2" key={bullet}>
              <Check
                aria-hidden="true"
                className="mt-1 size-4 shrink-0 text-success"
              />
              <span>{bullet}</span>
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex flex-wrap items-center justify-between gap-3 border-t bg-muted/30">
        {card.source ? (
          <a
            className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            href={card.source.url}
            rel="noreferrer"
            target="_blank"
          >
            {card.source.title}
            <ExternalLink aria-hidden="true" className="size-3" />
            <span className="sr-only">(opens in a new tab)</span>
          </a>
        ) : (
          <span className="text-sm text-muted-foreground">
            Approved phase guidance
          </span>
        )}
        <div className="flex items-center gap-2">
          <Button
            className={cn("min-h-11", pendingAction === "skip" && "opacity-60")}
            disabled={Boolean(pendingAction)}
            onClick={() => onAction?.("skip")}
            variant="ghost"
          >
            Skip
          </Button>
          <Button
            className="min-h-11"
            disabled={Boolean(pendingAction)}
            onClick={() => onAction?.("done")}
          >
            {pendingAction === "done" ? "Saving…" : "Done"}
          </Button>
          <Button
            className="min-h-11"
            disabled={Boolean(pendingAction)}
            onClick={() => onMore?.()}
            variant="outline"
          >
            Already handled
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
