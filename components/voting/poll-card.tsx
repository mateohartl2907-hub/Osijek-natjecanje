"use client";

import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Clock, Users, CheckCircle2, ExternalLink, Loader2, Eye } from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useVoting, type Poll } from "@/components/providers/voting-context";
import { cn } from "@/lib/utils";

interface PollCardProps {
  poll: Poll;
}

export function PollCard({ poll }: PollCardProps) {
  const { connected, publicKey } = useWallet();
  const { castVote, hasUserVoted, isLoading } = useVoting();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [voteError, setVoteError] = useState<string | null>(null);

  const walletAddress = publicKey?.toBase58() || "";
  const userHasVoted = hasUserVoted(poll.id, walletAddress);
  const timeRemaining = getTimeRemaining(poll.endsAt);
  const isExpired = new Date() > poll.endsAt;

  async function handleVote() {
    if (!connected || !publicKey || selectedOption === null) return;

    setIsVoting(true);
    setVoteError(null);
    try {
      const vote = await castVote(poll.id, selectedOption);
      setTxSignature(vote.txSignature);
      setVoteSuccess(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Vote failed";
      setVoteError(message);
      console.error("Vote failed:", error);
    } finally {
      setIsVoting(false);
    }
  }

  return (
    <Card className="bg-card border border-border hover:border-teal-300 transition-colors shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-medium text-foreground leading-tight">
              {poll.question}
            </h3>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{poll.totalVotes} glasova</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>{isExpired ? "Zavrseno" : timeRemaining}</span>
              </div>
            </div>
          </div>
          {(userHasVoted || voteSuccess) && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-teal-100 text-teal-700 text-xs font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Glasano</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Options */}
        <div className="space-y-2">
          {poll.options.map((option, index) => {
            const percentage =
              poll.totalVotes > 0
                ? Math.round((poll.voteCounts[index] / poll.totalVotes) * 100)
                : 0;
            const isSelected = selectedOption === index;
            const showResults = userHasVoted || voteSuccess || isExpired;

            return (
              <button
                key={index}
                onClick={() => {
                  if (!userHasVoted && !voteSuccess && !isExpired && connected) {
                    setSelectedOption(index);
                  }
                }}
                disabled={userHasVoted || voteSuccess || isExpired || !connected}
                className={cn(
                  "w-full text-left p-3 rounded-lg border transition-all",
                  "disabled:cursor-not-allowed",
                  isSelected
                    ? "border-teal-500 bg-teal-50"
                    : "border-border bg-slate-50 hover:border-teal-300",
                  (userHasVoted || voteSuccess || isExpired) &&
                    "hover:border-border"
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">
                    {option}
                  </span>
                  {showResults && (
                    <span className="text-sm font-semibold text-teal-600">
                      {percentage}%
                    </span>
                  )}
                </div>
                {showResults && (
                  <Progress
                    value={percentage}
                    className="h-1.5 bg-secondary"
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Vote Button */}
        {!userHasVoted && !voteSuccess && !isExpired && (
          <div className="pt-2">
            {!connected ? (
              <p className="text-sm text-center text-muted-foreground">
                Povezi Phantom wallet za glasanje
              </p>
            ) : (
              <Button
                onClick={handleVote}
                disabled={selectedOption === null || isVoting || isLoading}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                {isVoting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Potpisivanje transakcije...
                  </>
                ) : (
                  "Glasaj"
                )}
              </Button>
            )}
          </div>
        )}

        {voteError && (
          <p className="text-xs text-destructive text-center">{voteError}</p>
        )}

        {/* Transaction Link */}
        {txSignature && (
          <div className="pt-2 border-t border-border">
            <a
              href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 text-xs text-teal-600 hover:underline"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Pogledaj transakciju na Solana Explorer
            </a>
          </div>
        )}

        {/* Creator Info & Details Link */}
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            Kreator:{" "}
            <span className="font-mono">
              {poll.creator.slice(0, 6)}...{poll.creator.slice(-4)}
            </span>
          </p>
          <Link
            href={`/poll/${poll.id}`}
            className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-700 hover:underline transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            Detalji
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}

function getTimeRemaining(endDate: Date): string {
  const now = new Date();
  const diff = endDate.getTime() - now.getTime();

  if (diff <= 0) return "Zavrseno";

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  return `${hours}h ${minutes}m`;
}
