"use client";

import { use } from "react";
import { useVoting, type VoterRecord } from "@/components/providers/voting-context";
import { Header } from "@/components/voting/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft,
  Clock,
  Users,
  CheckCircle2,
  ExternalLink,
  Copy,
  Vote,
  User,
  Calendar,
} from "lucide-react";
import Link from "next/link";
import { useWallet } from "@solana/wallet-adapter-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export default function PollDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { getPollById, getPollVoters, castVote, hasUserVoted, isLoading } =
    useVoting();
  const { publicKey, connected } = useWallet();
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [voteSuccess, setVoteSuccess] = useState(false);
  const [txSignature, setTxSignature] = useState<string | null>(null);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);

  const poll = getPollById(id);
  const voters = getPollVoters(id);

  if (!poll) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-12">
          <Card className="text-center py-12">
            <CardContent>
              <h2 className="text-xl font-semibold text-foreground mb-2">
                Glasanje nije pronadeno
              </h2>
              <p className="text-muted-foreground mb-4">
                Glasanje koje trazite ne postoji ili je uklonjeno.
              </p>
              <Link href="/">
                <Button variant="outline">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Povratak na pocetnu
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const walletAddress = publicKey?.toBase58() || "";
  const userHasVoted = walletAddress
    ? hasUserVoted(poll.id, walletAddress)
    : false;
  const isExpired = new Date() > poll.endsAt;
  const showResults = userHasVoted || voteSuccess || isExpired;

  const timeRemaining = () => {
    const now = new Date();
    const diff = poll.endsAt.getTime() - now.getTime();
    if (diff <= 0) return "Zavrseno";
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const handleVote = async () => {
    if (selectedOption === null || !walletAddress) return;
    setIsVoting(true);
    try {
      const result = await castVote(poll.id, selectedOption);
      setVoteSuccess(true);
      setTxSignature(result.txSignature);
    } catch (error) {
      console.error("Vote failed:", error);
    } finally {
      setIsVoting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedAddress(text);
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("hr-HR", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Group voters by option
  const votersByOption = poll.options.map((_, index) =>
    voters.filter((v) => v.optionIndex === index)
  );

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Back button */}
        <Link href="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Povratak na sva glasanja
        </Link>

        {/* Poll Header */}
        <Card className="mb-6 border shadow-sm">
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge
                    variant={poll.isActive && !isExpired ? "default" : "secondary"}
                    className={
                      poll.isActive && !isExpired
                        ? "bg-teal-100 text-teal-700 hover:bg-teal-100"
                        : ""
                    }
                  >
                    {poll.isActive && !isExpired ? "Aktivno" : "Zavrseno"}
                  </Badge>
                  {(userHasVoted || voteSuccess) && (
                    <Badge className="bg-teal-100 text-teal-700">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Glasano
                    </Badge>
                  )}
                </div>
                <CardTitle className="text-2xl">{poll.question}</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <span>Kreator: {formatAddress(poll.creator)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-4 h-4" />
                <span>Preostalo: {timeRemaining()}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Users className="w-4 h-4" />
                <span>{poll.totalVotes} glasova</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                <span>Kreirano: {formatDate(poll.createdAt)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Voting Options */}
        <Card className="mb-6 border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Vote className="w-5 h-5 text-teal-600" />
              Opcije glasanja
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {poll.options.map((option, index) => {
              const voteCount = poll.voteCounts[index];
              const percentage =
                poll.totalVotes > 0
                  ? Math.round((voteCount / poll.totalVotes) * 100)
                  : 0;
              const isSelected = selectedOption === index;
              const isWinner =
                showResults &&
                voteCount === Math.max(...poll.voteCounts) &&
                voteCount > 0;

              return (
                <button
                  key={index}
                  onClick={() =>
                    !userHasVoted &&
                    !voteSuccess &&
                    !isExpired &&
                    setSelectedOption(index)
                  }
                  disabled={userHasVoted || voteSuccess || isExpired || !connected}
                  className={cn(
                    "w-full text-left p-4 rounded-lg border transition-all",
                    "disabled:cursor-not-allowed",
                    isSelected
                      ? "border-teal-500 bg-teal-50"
                      : "border-border bg-slate-50 hover:border-teal-300",
                    (userHasVoted || voteSuccess || isExpired) &&
                      "hover:border-border",
                    isWinner && "border-teal-500 bg-teal-50"
                  )}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-foreground">{option}</span>
                    <div className="flex items-center gap-2">
                      {showResults && (
                        <span className="text-sm text-muted-foreground">
                          {voteCount} glasova
                        </span>
                      )}
                      {showResults && (
                        <span className="text-sm font-semibold text-teal-600">
                          {percentage}%
                        </span>
                      )}
                    </div>
                  </div>
                  {showResults && (
                    <Progress
                      value={percentage}
                      className="h-2 bg-slate-200"
                    />
                  )}
                </button>
              );
            })}

            {/* Vote button */}
            {!userHasVoted && !voteSuccess && !isExpired && (
              <div className="pt-4">
                {connected ? (
                  <Button
                    onClick={handleVote}
                    disabled={selectedOption === null || isVoting || isLoading}
                    className="w-full bg-teal-600 hover:bg-teal-700 text-white"
                  >
                    {isVoting ? (
                      <>
                        <span className="animate-spin mr-2">&#9696;</span>
                        Glasanje u tijeku...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Potvrdi glas
                      </>
                    )}
                  </Button>
                ) : (
                  <p className="text-center text-muted-foreground text-sm">
                    Povezi Phantom wallet za glasanje
                  </p>
                )}
              </div>
            )}

            {/* Transaction link */}
            {txSignature && (
              <div className="pt-2">
                <a
                  href={`https://explorer.solana.com/tx/${txSignature}?cluster=devnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 text-sm text-teal-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Pogledaj transakciju na Solana Exploreru
                </a>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Voters List */}
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-600" />
              Glasaci ({voters.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {poll.options.map((option, optionIndex) => {
              const optionVoters = votersByOption[optionIndex];
              if (optionVoters.length === 0) return null;

              return (
                <div key={optionIndex} className="mb-6 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <Badge variant="outline" className="font-medium">
                      {option}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      ({optionVoters.length} glasova)
                    </span>
                  </div>
                  <div className="space-y-2">
                    {optionVoters.slice(0, 10).map((voter, idx) => (
                      <VoterRow
                        key={idx}
                        voter={voter}
                        formatAddress={formatAddress}
                        formatDate={formatDate}
                        copyToClipboard={copyToClipboard}
                        copiedAddress={copiedAddress}
                      />
                    ))}
                    {optionVoters.length > 10 && (
                      <p className="text-sm text-muted-foreground text-center py-2">
                        + jos {optionVoters.length - 10} glasaca
                      </p>
                    )}
                  </div>
                </div>
              );
            })}

            {voters.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>Nema glasova za ovu anketu</p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function VoterRow({
  voter,
  formatAddress,
  formatDate,
  copyToClipboard,
  copiedAddress,
}: {
  voter: VoterRecord;
  formatAddress: (address: string) => string;
  formatDate: (date: Date) => string;
  copyToClipboard: (text: string) => void;
  copiedAddress: string | null;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-border">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
          <User className="w-4 h-4 text-teal-600" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-foreground">
              {formatAddress(voter.walletAddress)}
            </span>
            <button
              onClick={() => copyToClipboard(voter.walletAddress)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              title="Kopiraj adresu"
            >
              {copiedAddress === voter.walletAddress ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            {formatDate(voter.votedAt)}
          </p>
        </div>
      </div>
      <a
        href={`https://explorer.solana.com/tx/${voter.txSignature}?cluster=devnet`}
        target="_blank"
        rel="noopener noreferrer"
        className="text-teal-600 hover:text-teal-700 transition-colors"
        title="Pogledaj transakciju"
      >
        <ExternalLink className="w-4 h-4" />
      </a>
    </div>
  );
}
