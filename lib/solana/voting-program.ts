import {
  AnchorProvider,
  BN,
  Program,
  type Idl,
  type Wallet,
} from "@coral-xyz/anchor";
import {
  Connection,
  PublicKey,
  Transaction,
  VersionedTransaction,
  type Commitment,
  type ConfirmOptions,
} from "@solana/web3.js";
import idl from "@/lib/idl/voting.json";
import type { Voting } from "@/lib/idl/voting";

export type VotingProgram = Program<Voting>;
export const VOTING_PROGRAM_ID = new PublicKey(
  (idl as Voting).address
);

// Subset of @solana/wallet-adapter-react's AnchorWallet that Anchor accepts.
export interface BrowserWallet {
  publicKey: PublicKey;
  signTransaction<T extends Transaction | VersionedTransaction>(tx: T): Promise<T>;
  signAllTransactions<T extends Transaction | VersionedTransaction>(
    txs: T[]
  ): Promise<T[]>;
}

const CONFIRM_OPTS: ConfirmOptions = {
  commitment: "confirmed",
  preflightCommitment: "confirmed",
};

export function getProvider(
  connection: Connection,
  wallet: BrowserWallet,
  commitment: Commitment = "confirmed"
): AnchorProvider {
  return new AnchorProvider(connection, wallet as unknown as Wallet, {
    ...CONFIRM_OPTS,
    commitment,
  });
}

export function getProgram(provider: AnchorProvider): VotingProgram {
  return new Program<Voting>(idl as Idl as Voting, provider);
}

export function getReadonlyProgram(connection: Connection): VotingProgram {
  // Read-only callers (event listeners, account fetches) don't sign. Anchor
  // still requires a wallet-shaped object on the provider, so we hand it a
  // sentinel that throws if anyone tries to sign through it.
  const dummy: BrowserWallet = {
    publicKey: PublicKey.default,
    signTransaction: async () => {
      throw new Error("Read-only provider cannot sign");
    },
    signAllTransactions: async () => {
      throw new Error("Read-only provider cannot sign");
    },
  };
  return getProgram(getProvider(connection, dummy));
}

export function pollPda(programId: PublicKey, pollId: BN): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("poll"), pollId.toArrayLike(Buffer, "le", 8)],
    programId
  );
}

export function voteRecordPda(
  programId: PublicKey,
  pollId: BN,
  voter: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), pollId.toArrayLike(Buffer, "le", 8), voter.toBuffer()],
    programId
  );
}

export interface PollAccount {
  pollId: BN;
  creator: PublicKey;
  question: string;
  optionCount: number;
  options: string[];
  voteCounts: BN[];
  totalVotes: BN;
  createdAt: BN;
  endsAt: BN;
  isActive: boolean;
  bump: number;
}

export interface PollWithKey {
  publicKey: PublicKey;
  account: PollAccount;
}

export async function fetchAllPolls(
  program: VotingProgram
): Promise<PollWithKey[]> {
  const accounts = await program.account.poll.all();
  return accounts.map((a) => ({
    publicKey: a.publicKey,
    account: a.account as unknown as PollAccount,
  }));
}

export async function fetchPoll(
  program: VotingProgram,
  pollId: BN
): Promise<PollWithKey | null> {
  const [pda] = pollPda(program.programId, pollId);
  try {
    const account = await program.account.poll.fetch(pda);
    return { publicKey: pda, account: account as unknown as PollAccount };
  } catch {
    return null;
  }
}

export async function hasUserVoted(
  program: VotingProgram,
  pollId: BN,
  voter: PublicKey
): Promise<boolean> {
  const [pda] = voteRecordPda(program.programId, pollId, voter);
  const info = await program.provider.connection.getAccountInfo(pda);
  return info !== null;
}

export async function createPoll(
  program: VotingProgram,
  args: {
    pollId: BN;
    question: string;
    options: string[];
    endsAt: BN;
    creator: PublicKey;
  }
): Promise<string> {
  return program.methods
    .createPoll(args.pollId, args.question, args.options, args.endsAt)
    .accounts({ creator: args.creator })
    .rpc();
}

export async function castVote(
  program: VotingProgram,
  args: { pollId: BN; optionIndex: number; voter: PublicKey }
): Promise<string> {
  return program.methods
    .castVote(args.pollId, args.optionIndex)
    .accounts({ voter: args.voter })
    .rpc();
}

export async function closePoll(
  program: VotingProgram,
  args: { pollId: BN; creator: PublicKey }
): Promise<string> {
  return program.methods
    .closePoll(args.pollId)
    .accounts({ creator: args.creator })
    .rpc();
}
