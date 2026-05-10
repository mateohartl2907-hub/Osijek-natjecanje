"use client";

import { useVoting } from "@/components/providers/voting-context";
import { PollCard } from "./poll-card";
import { Loader2 } from "lucide-react";

export function PollsList() {
  const { polls, isLoading } = useVoting();

  if (isLoading && polls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="mt-4 text-muted-foreground">Ucitavam glasanja...</p>
      </div>
    );
  }

  if (polls.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
          <span className="text-2xl">🗳️</span>
        </div>
        <h3 className="text-lg font-medium text-foreground">
          Nema aktivnih glasanja
        </h3>
        <p className="mt-2 text-muted-foreground max-w-sm">
          Budi prvi koji ce kreirati glasanje i zapoceti decentraliziranu
          demokraciju!
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {polls.map((poll) => (
        <PollCard key={poll.id} poll={poll} />
      ))}
    </div>
  );
}
