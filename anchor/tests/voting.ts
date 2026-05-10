import * as anchor from "@coral-xyz/anchor";
import { Program, BN } from "@coral-xyz/anchor";
import { Voting } from "../target/types/voting";
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from "@solana/web3.js";
import { assert, expect } from "chai";

describe("voting", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Voting as Program<Voting>;
  const creator = (provider.wallet as anchor.Wallet).payer;

  const pollPda = (pollId: BN) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("poll"), pollId.toArrayLike(Buffer, "le", 8)],
      program.programId
    )[0];

  const voteRecordPda = (pollId: BN, voter: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), pollId.toArrayLike(Buffer, "le", 8), voter.toBuffer()],
      program.programId
    )[0];

  const fundWallet = async (pubkey: PublicKey, sol = 2) => {
    const sig = await provider.connection.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(sig);
  };

  const futureTimestamp = (seconds = 3600) =>
    new BN(Math.floor(Date.now() / 1000) + seconds);

  it("creates a poll", async () => {
    const pollId = new BN(Date.now());
    const question = "What's your favorite Solana feature?";
    const options = ["Speed", "Low fees", "Tooling"];
    const endsAt = futureTimestamp();

    await program.methods
      .createPoll(pollId, question, options, endsAt)
      .accounts({ creator: creator.publicKey })
      .rpc();

    const poll = await program.account.poll.fetch(pollPda(pollId));
    expect(poll.question).to.equal(question);
    expect(poll.options).to.deep.equal(options);
    expect(poll.optionCount).to.equal(options.length);
    expect(poll.totalVotes.toNumber()).to.equal(0);
    expect(poll.voteCounts.map((v) => v.toNumber())).to.deep.equal([0, 0, 0]);
    expect(poll.isActive).to.be.true;
    expect(poll.creator.toBase58()).to.equal(creator.publicKey.toBase58());
  });

  it("rejects empty question", async () => {
    const pollId = new BN(Date.now() + 1);
    try {
      await program.methods
        .createPoll(pollId, "", ["A", "B"], futureTimestamp())
        .accounts({ creator: creator.publicKey })
        .rpc();
      assert.fail("expected EmptyQuestion");
    } catch (err: any) {
      expect(err.error?.errorCode?.code).to.equal("EmptyQuestion");
    }
  });

  it("rejects fewer than 2 options", async () => {
    const pollId = new BN(Date.now() + 2);
    try {
      await program.methods
        .createPoll(pollId, "Q?", ["only-one"], futureTimestamp())
        .accounts({ creator: creator.publicKey })
        .rpc();
      assert.fail("expected InvalidOptionsCount");
    } catch (err: any) {
      expect(err.error?.errorCode?.code).to.equal("InvalidOptionsCount");
    }
  });

  it("rejects past end time", async () => {
    const pollId = new BN(Date.now() + 3);
    try {
      await program.methods
        .createPoll(pollId, "Q?", ["A", "B"], new BN(0))
        .accounts({ creator: creator.publicKey })
        .rpc();
      assert.fail("expected InvalidEndTime");
    } catch (err: any) {
      expect(err.error?.errorCode?.code).to.equal("InvalidEndTime");
    }
  });

  it("casts a vote and updates counts", async () => {
    const pollId = new BN(Date.now() + 10);
    await program.methods
      .createPoll(pollId, "Pick one", ["Red", "Blue"], futureTimestamp())
      .accounts({ creator: creator.publicKey })
      .rpc();

    await program.methods
      .castVote(pollId, 1)
      .accounts({ voter: creator.publicKey })
      .rpc();

    const poll = await program.account.poll.fetch(pollPda(pollId));
    expect(poll.totalVotes.toNumber()).to.equal(1);
    expect(poll.voteCounts.map((v) => v.toNumber())).to.deep.equal([0, 1]);

    const record = await program.account.voteRecord.fetch(
      voteRecordPda(pollId, creator.publicKey)
    );
    expect(record.optionIndex).to.equal(1);
    expect(record.voter.toBase58()).to.equal(creator.publicKey.toBase58());
  });

  it("blocks double voting from same wallet", async () => {
    const pollId = new BN(Date.now() + 11);
    await program.methods
      .createPoll(pollId, "Pick one", ["A", "B"], futureTimestamp())
      .accounts({ creator: creator.publicKey })
      .rpc();

    await program.methods
      .castVote(pollId, 0)
      .accounts({ voter: creator.publicKey })
      .rpc();

    try {
      await program.methods
        .castVote(pollId, 1)
        .accounts({ voter: creator.publicKey })
        .rpc();
      assert.fail("expected duplicate-vote failure");
    } catch (err: any) {
      // PDA already exists -> System program account-already-in-use error
      expect(err.toString()).to.match(/already in use|0x0/i);
    }
  });

  it("rejects invalid option index", async () => {
    const pollId = new BN(Date.now() + 12);
    await program.methods
      .createPoll(pollId, "Q?", ["A", "B"], futureTimestamp())
      .accounts({ creator: creator.publicKey })
      .rpc();

    const voter = Keypair.generate();
    await fundWallet(voter.publicKey);

    try {
      await program.methods
        .castVote(pollId, 99)
        .accounts({ voter: voter.publicKey })
        .signers([voter])
        .rpc();
      assert.fail("expected InvalidOption");
    } catch (err: any) {
      expect(err.error?.errorCode?.code).to.equal("InvalidOption");
    }
  });

  it("allows different wallets to vote independently", async () => {
    const pollId = new BN(Date.now() + 13);
    await program.methods
      .createPoll(pollId, "Q?", ["A", "B", "C"], futureTimestamp())
      .accounts({ creator: creator.publicKey })
      .rpc();

    const voters = [Keypair.generate(), Keypair.generate(), Keypair.generate()];
    await Promise.all(voters.map((v) => fundWallet(v.publicKey)));

    await Promise.all(
      voters.map((v, i) =>
        program.methods
          .castVote(pollId, i % 3)
          .accounts({ voter: v.publicKey })
          .signers([v])
          .rpc()
      )
    );

    const poll = await program.account.poll.fetch(pollPda(pollId));
    expect(poll.totalVotes.toNumber()).to.equal(3);
    expect(poll.voteCounts.map((v) => v.toNumber())).to.deep.equal([1, 1, 1]);
  });

  it("only creator can close a poll", async () => {
    const pollId = new BN(Date.now() + 20);
    await program.methods
      .createPoll(pollId, "Q?", ["A", "B"], futureTimestamp())
      .accounts({ creator: creator.publicKey })
      .rpc();

    const intruder = Keypair.generate();
    await fundWallet(intruder.publicKey);

    try {
      await program.methods
        .closePoll(pollId)
        .accounts({ creator: intruder.publicKey })
        .signers([intruder])
        .rpc();
      assert.fail("expected unauthorized close to fail");
    } catch (err: any) {
      // has_one constraint -> ConstraintHasOne (anchor) or our custom Unauthorized
      const msg = err.toString();
      expect(msg).to.match(/Unauthorized|HasOne|ConstraintHasOne|2001/i);
    }

    await program.methods
      .closePoll(pollId)
      .accounts({ creator: creator.publicKey })
      .rpc();

    const poll = await program.account.poll.fetch(pollPda(pollId));
    expect(poll.isActive).to.be.false;
  });

  it("rejects voting on a closed poll", async () => {
    const pollId = new BN(Date.now() + 21);
    await program.methods
      .createPoll(pollId, "Q?", ["A", "B"], futureTimestamp())
      .accounts({ creator: creator.publicKey })
      .rpc();

    await program.methods
      .closePoll(pollId)
      .accounts({ creator: creator.publicKey })
      .rpc();

    const voter = Keypair.generate();
    await fundWallet(voter.publicKey);

    try {
      await program.methods
        .castVote(pollId, 0)
        .accounts({ voter: voter.publicKey })
        .signers([voter])
        .rpc();
      assert.fail("expected PollNotActive");
    } catch (err: any) {
      expect(err.error?.errorCode?.code).to.equal("PollNotActive");
    }
  });

  it("rejects double-close", async () => {
    const pollId = new BN(Date.now() + 22);
    await program.methods
      .createPoll(pollId, "Q?", ["A", "B"], futureTimestamp())
      .accounts({ creator: creator.publicKey })
      .rpc();
    await program.methods
      .closePoll(pollId)
      .accounts({ creator: creator.publicKey })
      .rpc();
    try {
      await program.methods
        .closePoll(pollId)
        .accounts({ creator: creator.publicKey })
        .rpc();
      assert.fail("expected PollAlreadyClosed");
    } catch (err: any) {
      expect(err.error?.errorCode?.code).to.equal("PollAlreadyClosed");
    }
  });
});
