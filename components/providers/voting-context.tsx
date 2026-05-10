"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { BN } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import {
  useAnchorWallet,
  useConnection,
  useWallet,
} from "@solana/wallet-adapter-react";
import {
  castVote as castVoteIx,
  closePoll as closePollIx,
  createPoll as createPollIx,
  fetchAllPolls,
  getProgram,
  getProvider,
  getReadonlyProgram,
  hasUserVoted as hasUserVotedRpc,
  type PollAccount,
  type PollWithKey,
  type VotingProgram,
  voteRecordPda,
  VOTING_PROGRAM_ID,
} from "@/lib/solana/voting-program";

export interface Poll {
  id: string;
  pollId: bigint;
  pubkey: PublicKey;
  creator: string;
  question: string;
  options: string[];
  voteCounts: number[];
  totalVotes: number;
  createdAt: Date;
  endsAt: Date;
  isActive: boolean;
}

export interface VoterRecord {
  walletAddress: string;
  optionIndex: number;
  votedAt: Date;
  txSignature: string;
}

export interface UserVote {
  pollId: string;
  optionIndex: number;
  votedAt: Date;
  txSignature: string;
}

interface VotingContextType {
  polls: Poll[];
  programId: PublicKey;
  isLoading: boolean;
  error: string | null;
  createPoll: (
    question: string,
    options: string[],
    durationHours: number
  ) => Promise<Poll>;
  castVote: (pollId: string, optionIndex: number) => Promise<UserVote>;
  closePoll: (pollId: string) => Promise<void>;
  hasUserVoted: (pollId: string, walletAddress: string) => boolean;
  getPollById: (pollId: string) => Poll | undefined;
  getPollVoters: (pollId: string) => VoterRecord[];
  refreshPolls: () => Promise<void>;
}

const VotingContext = createContext<VotingContextType | undefined>(undefined);

function mapPoll({ publicKey, account }: PollWithKey): Poll {
  return {
    id: publicKey.toBase58(),
    pollId: BigInt(account.pollId.toString()),
    pubkey: publicKey,
    creator: account.creator.toBase58(),
    question: account.question,
    options: account.options,
    voteCounts: account.voteCounts.map((v) => Number(v.toString())),
    totalVotes: Number(account.totalVotes.toString()),
    createdAt: new Date(Number(account.createdAt.toString()) * 1000),
    endsAt: new Date(Number(account.endsAt.toString()) * 1000),
    isActive: account.isActive,
  };
}

export function VotingProvider({ children }: { children: ReactNode }) {
  const { connection } = useConnection();
  const anchorWallet = useAnchorWallet();
  const { publicKey } = useWallet();

  const [polls, setPolls] = useState<Poll[]>([]);
  const [pollVoters, setPollVoters] = useState<Map<string, VoterRecord[]>>(
    new Map()
  );
  const [userVotes, setUserVotes] = useState<Map<string, UserVote>>(new Map());
  const [votedFlags, setVotedFlags] = useState<Set<string>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const program: VotingProgram | null = useMemo(() => {
    if (!anchorWallet) {
      return getReadonlyProgram(connection);
    }
    return getProgram(getProvider(connection, anchorWallet));
  }, [connection, anchorWallet]);

  const eventListenersRef = useRef<number[]>([]);

  const refreshPolls = useCallback(async () => {
    if (!program) return;
    setIsLoading(true);
    setError(null);
    try {
      const onChain = await fetchAllPolls(program);
      const mapped = onChain
        .map(mapPoll)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setPolls(mapped);

      // Pull voter records for each poll in parallel
      const allRecords = await program.account.voteRecord.all();
      const byPoll = new Map<string, VoterRecord[]>();
      for (const poll of mapped) {
        byPoll.set(poll.id, []);
      }
      for (const r of allRecords) {
        const acc = r.account as unknown as {
          voter: PublicKey;
          pollId: BN;
          optionIndex: number;
          votedAt: BN;
        };
        const pollIdBig = BigInt(acc.pollId.toString());
        const targetPoll = mapped.find((p) => p.pollId === pollIdBig);
        if (!targetPoll) continue;
        const list = byPoll.get(targetPoll.id) ?? [];
        list.push({
          walletAddress: acc.voter.toBase58(),
          optionIndex: acc.optionIndex,
          votedAt: new Date(Number(acc.votedAt.toString()) * 1000),
          txSignature: r.publicKey.toBase58(),
        });
        byPoll.set(targetPoll.id, list);
      }
      for (const [k, v] of byPoll) {
        v.sort((a, b) => b.votedAt.getTime() - a.votedAt.getTime());
        byPoll.set(k, v);
      }
      setPollVoters(byPoll);

      // Reconcile votedFlags for current user
      if (publicKey) {
        const flags = new Set<string>();
        for (const r of allRecords) {
          const acc = r.account as unknown as {
            voter: PublicKey;
            pollId: BN;
          };
          if (acc.voter.equals(publicKey)) {
            const pollIdBig = BigInt(acc.pollId.toString());
            const targetPoll = mapped.find((p) => p.pollId === pollIdBig);
            if (targetPoll) {
              flags.add(`${targetPoll.id}-${publicKey.toBase58()}`);
            }
          }
        }
        setVotedFlags(flags);
      } else {
        setVotedFlags(new Set());
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [program, publicKey]);

  // Initial load + reload when wallet/cluster changes
  useEffect(() => {
    void refreshPolls();
  }, [refreshPolls]);

  // Live updates via on-chain events
  useEffect(() => {
    if (!program) return;
    // Cleanup any prior listeners
    for (const id of eventListenersRef.current) {
      void program.removeEventListener(id);
    }
    eventListenersRef.current = [];

    const onCreated = program.addEventListener("pollCreated", () => {
      void refreshPolls();
    });
    const onVote = program.addEventListener("voteCast", () => {
      void refreshPolls();
    });
    const onClosed = program.addEventListener("pollClosed", () => {
      void refreshPolls();
    });
    eventListenersRef.current = [onCreated, onVote, onClosed];

    return () => {
      for (const id of eventListenersRef.current) {
        void program.removeEventListener(id);
      }
      eventListenersRef.current = [];
    };
  }, [program, refreshPolls]);

  const createPoll = useCallback(
    async (
      question: string,
      options: string[],
      durationHours: number
    ): Promise<Poll> => {
      if (!program || !publicKey || !anchorWallet) {
        throw new Error("Wallet must be connected to create a poll");
      }
      const pollId = new BN(Date.now());
      const endsAt = new BN(
        Math.floor(Date.now() / 1000) + durationHours * 3600
      );
      await createPollIx(program, {
        pollId,
        question,
        options,
        endsAt,
        creator: publicKey,
      });
      await refreshPolls();
      const created = polls.find(
        (p) => p.pollId === BigInt(pollId.toString())
      );
      // Best-effort fetch immediately after refresh
      if (created) return created;
      const fallback = await fetchAllPolls(program);
      const mapped = fallback
        .map(mapPoll)
        .find((p) => p.pollId === BigInt(pollId.toString()));
      if (!mapped) throw new Error("Poll created but not found on-chain");
      return mapped;
    },
    [program, publicKey, anchorWallet, polls, refreshPolls]
  );

  const castVote = useCallback(
    async (pollId: string, optionIndex: number): Promise<UserVote> => {
      if (!program || !publicKey || !anchorWallet) {
        throw new Error("Wallet must be connected to vote");
      }
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) throw new Error("Poll not found");

      const sig = await castVoteIx(program, {
        pollId: new BN(poll.pollId.toString()),
        optionIndex,
        voter: publicKey,
      });

      const vote: UserVote = {
        pollId,
        optionIndex,
        votedAt: new Date(),
        txSignature: sig,
      };
      setUserVotes((prev) => new Map(prev).set(pollId, vote));
      setVotedFlags((prev) => {
        const next = new Set(prev);
        next.add(`${pollId}-${publicKey.toBase58()}`);
        return next;
      });
      // Optimistic update; refreshPolls will reconcile.
      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          const counts = [...p.voteCounts];
          counts[optionIndex] = (counts[optionIndex] ?? 0) + 1;
          return { ...p, voteCounts: counts, totalVotes: p.totalVotes + 1 };
        })
      );
      void refreshPolls();
      return vote;
    },
    [program, publicKey, anchorWallet, polls, refreshPolls]
  );

  const closePoll = useCallback(
    async (pollId: string): Promise<void> => {
      if (!program || !publicKey || !anchorWallet) {
        throw new Error("Wallet must be connected to close a poll");
      }
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) throw new Error("Poll not found");
      await closePollIx(program, {
        pollId: new BN(poll.pollId.toString()),
        creator: publicKey,
      });
      await refreshPolls();
    },
    [program, publicKey, anchorWallet, polls, refreshPolls]
  );

  const hasUserVoted = useCallback(
    (pollId: string, walletAddress: string): boolean => {
      return votedFlags.has(`${pollId}-${walletAddress}`);
    },
    [votedFlags]
  );

  const getPollById = useCallback(
    (pollId: string): Poll | undefined => polls.find((p) => p.id === pollId),
    [polls]
  );

  const getPollVoters = useCallback(
    (pollId: string): VoterRecord[] => pollVoters.get(pollId) ?? [],
    [pollVoters]
  );

  const value = useMemo<VotingContextType>(
    () => ({
      polls,
      programId: VOTING_PROGRAM_ID,
      isLoading,
      error,
      createPoll,
      castVote,
      closePoll,
      hasUserVoted,
      getPollById,
      getPollVoters,
      refreshPolls,
    }),
    [
      polls,
      isLoading,
      error,
      createPoll,
      castVote,
      closePoll,
      hasUserVoted,
      getPollById,
      getPollVoters,
      refreshPolls,
    ]
  );

  return (
    <VotingContext.Provider value={value}>{children}</VotingContext.Provider>
  );
}

export function useVoting() {
  const context = useContext(VotingContext);
  if (!context) {
    throw new Error("useVoting must be used within a VotingProvider");
  }
  return context;
}

// Helper exposed for components that need to compute the vote-record PDA without
// importing the lower-level module directly.
export function userVoteKey(pollId: string, wallet: string): string {
  return `${pollId}-${wallet}`;
}

export { voteRecordPda };
export type { PollAccount };
