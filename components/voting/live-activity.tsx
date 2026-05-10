"use client";

import { useEffect, useMemo, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, Vote, Plus } from "lucide-react";
import { useVoting } from "@/components/providers/voting-context";
import { useConnection } from "@solana/wallet-adapter-react";
import {
  getReadonlyProgram,
  type VotingProgram,
} from "@/lib/solana/voting-program";

interface ActivityItem {
  id: string;
  type: "vote" | "create";
  wallet: string;
  pollQuestion: string;
  option?: string;
  timestamp: Date;
}

const MAX_ITEMS = 25;

function shortAddress(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function LiveActivity() {
  const { connection } = useConnection();
  const { polls, refreshPolls } = useVoting();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [isLive, setIsLive] = useState(true);

  // We always want a program just for events, regardless of wallet state.
  const program = useMemo<VotingProgram>(
    () => getReadonlyProgram(connection),
    [connection]
  );

  const pollLookup = useMemo(() => {
    const map = new Map<bigint, { question: string; options: string[] }>();
    for (const p of polls) {
      map.set(p.pollId, { question: p.question, options: p.options });
    }
    return map;
  }, [polls]);

  useEffect(() => {
    if (!isLive) return;

    const onCreate = program.addEventListener(
      "pollCreated",
      (event: {
        pollId: { toString: () => string };
        creator: PublicKey;
        question: string;
      }) => {
        const item: ActivityItem = {
          id: `c-${Date.now()}-${Math.random()}`,
          type: "create",
          wallet: shortAddress(event.creator.toBase58()),
          pollQuestion: event.question,
          timestamp: new Date(),
        };
        setActivities((prev) => [item, ...prev].slice(0, MAX_ITEMS));
        void refreshPolls();
      }
    );

    const onVote = program.addEventListener(
      "voteCast",
      (event: {
        pollId: { toString: () => string };
        voter: PublicKey;
        optionIndex: number;
      }) => {
        const pollIdBig = BigInt(event.pollId.toString());
        const meta = pollLookup.get(pollIdBig);
        const item: ActivityItem = {
          id: `v-${Date.now()}-${Math.random()}`,
          type: "vote",
          wallet: shortAddress(event.voter.toBase58()),
          pollQuestion: meta?.question ?? `Poll #${pollIdBig.toString()}`,
          option: meta?.options[event.optionIndex],
          timestamp: new Date(),
        };
        setActivities((prev) => [item, ...prev].slice(0, MAX_ITEMS));
        void refreshPolls();
      }
    );

    return () => {
      void program.removeEventListener(onCreate);
      void program.removeEventListener(onVote);
    };
  }, [program, isLive, pollLookup, refreshPolls]);

  const formatTime = (date: Date) => {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h`;
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-foreground text-lg flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Aktivnost uzivo
        </CardTitle>
        <button
          onClick={() => setIsLive(!isLive)}
          className="flex items-center gap-2"
        >
          <div
            className={`w-2 h-2 rounded-full ${
              isLive ? "bg-green-500 animate-pulse" : "bg-muted-foreground"
            }`}
          />
          <span className="text-xs text-muted-foreground">
            {isLive ? "UZIVO" : "PAUZIRANO"}
          </span>
        </button>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            Cekam dogadaje na chainu...
          </p>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 rounded-lg bg-secondary/30 border border-border"
              >
                <div
                  className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    activity.type === "vote"
                      ? "bg-teal-100 text-teal-600"
                      : "bg-amber-100 text-amber-600"
                  }`}
                >
                  {activity.type === "vote" ? (
                    <Vote className="w-4 h-4" />
                  ) : (
                    <Plus className="w-4 h-4" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm text-foreground">
                      {activity.wallet}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-xs border-border text-muted-foreground"
                    >
                      {activity.type === "vote" ? "glasao" : "kreirao"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground truncate mt-1">
                    {activity.type === "vote" && activity.option && (
                      <span className="text-primary font-medium">
                        {activity.option}
                      </span>
                    )}
                    {activity.type === "vote" && " na "}
                    {activity.pollQuestion.slice(0, 40)}
                    {activity.pollQuestion.length > 40 ? "..." : ""}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatTime(activity.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
