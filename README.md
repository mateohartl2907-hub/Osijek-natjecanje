# SolanaVote

Decentralizirano glasanje na Solana blockchainu. Anchor smart contract + Next.js frontend.

## Struktura

```
.
├── anchor/                  # Anchor program (Rust) + integracijski testovi
│   ├── programs/voting/     # smart contract
│   ├── tests/voting.ts      # ts-mocha testovi
│   └── target/deploy/       # voting-keypair.json (program ID)
├── app/                     # Next.js App Router stranice
├── components/              # React komponente i provideri
├── lib/
│   ├── idl/                 # IDL i TS tipovi (kopirano iz anchor/target/)
│   └── solana/              # tanki klijent oko Anchor Program API-ja
└── public/
```

## Preduvjeti

- Node 20+
- pnpm 11+
- Solana CLI (`solana --version`)
- Anchor CLI (`anchor --version`)
- Rust toolchain (Anchor build dolazi s `cargo`)

## Instalacija

```bash
pnpm install
```

## Frontend (dev)

```bash
pnpm dev
```

Aplikacija se po defaultu spaja na **Solana Devnet**. Endpoint se konfigurira preko env varijabli:

```bash
# .env.local
NEXT_PUBLIC_SOLANA_CLUSTER=devnet            # devnet | testnet | mainnet-beta
# ili eksplicitno
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
```

## Smart Contract

### Build

```bash
cd anchor
anchor build
```

Generira:
- `target/deploy/voting.so` — program binary
- `target/idl/voting.json` — IDL
- `target/types/voting.ts` — TS tipovi

Kad mijenjas program, ponovi build i kopiraj artefakte u `lib/idl/`:

```bash
cp anchor/target/idl/voting.json lib/idl/voting.json
cp anchor/target/types/voting.ts lib/idl/voting.ts
```

### Program ID

Program ID je **`FeWSegnZmmk3kJHnAKaDZjMS7iBD7UEzzvcRnWQnqXNq`**. Keypair se nalazi u `anchor/target/deploy/voting-keypair.json` i jedini je commitan artefakt iz `target/` direktorija.

> Ako zelis svoj ID: `solana-keygen new -o anchor/target/deploy/voting-keypair.json --force`, zatim `anchor keys sync` da se sinkronizira `declare_id!` i `Anchor.toml`. Nakon toga rebuild + kopiraj IDL u `lib/idl/`.

### Testovi

Pokrece se na lokalnom `solana-test-validator`-u (Anchor sam upali validator):

```bash
cd anchor
pnpm install              # instalira ts-mocha, chai itd.
anchor test
```

### Deploy na Devnet

```bash
# 1. Imati funded wallet na devnetu (~2 SOL je dovoljno)
solana airdrop 2 --url devnet

# 2. Configure cluster
solana config set --url devnet

# 3. Build i deploy
cd anchor
anchor build
anchor deploy --provider.cluster devnet
```

Nakon deploya provjeri program na exploreru:
https://explorer.solana.com/address/FeWSegnZmmk3kJHnAKaDZjMS7iBD7UEzzvcRnWQnqXNq?cluster=devnet

### Upload IDL on-chain (opcionalno)

```bash
anchor idl init -f target/idl/voting.json FeWSegnZmmk3kJHnAKaDZjMS7iBD7UEzzvcRnWQnqXNq --provider.cluster devnet
```

## Instrukcije programa

| Instrukcija   | Opis                                                            | Auth                |
|---------------|------------------------------------------------------------------|---------------------|
| `create_poll` | Kreira novu anketu (PDA `["poll", poll_id]`)                     | bilo koji wallet    |
| `cast_vote`   | Glasaj. Jedan glas po walletu po anketi (PDA na `vote_record`).  | voter (Signer)      |
| `close_poll`  | Zatvori anketu prije isteka.                                     | samo `creator`      |

PDA seedovi:
- Poll: `[b"poll", poll_id.to_le_bytes()]`
- VoteRecord: `[b"vote", poll_id.to_le_bytes(), voter.key().as_ref()]`

## Frontend stack

- Next.js 16 (App Router, Turbopack)
- @coral-xyz/anchor 0.32 (klijent + IDL)
- @solana/wallet-adapter-react (Phantom)
- recharts (vizualizacija glasova)
- tailwindcss 4 + shadcn/ui

## Ogranicenja

- Maks. 280 znakova po pitanju, 64 znaka po opciji, 2-10 opcija
- `Poll` racun alocira fiksno `INIT_SPACE` za max-velicinu (kratke ankete trose nesto vise rente nego sto im treba)
