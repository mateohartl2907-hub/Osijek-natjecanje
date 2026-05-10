"use client";

import { SolanaProvider } from "@/components/providers/solana-provider";
import { VotingProvider } from "@/components/providers/voting-context";
import { Header } from "@/components/voting/header";
import { StatsBanner } from "@/components/voting/stats-banner";
import { PollsList } from "@/components/voting/polls-list";
import { CreatePollModal } from "@/components/voting/create-poll-modal";
import { ResultsChart } from "@/components/voting/results-chart";
import { LiveActivity } from "@/components/voting/live-activity";
import { useWallet } from "@solana/wallet-adapter-react";
import { Shield, Lock, Eye, Github, ExternalLink } from "lucide-react";
import { useVoting } from "@/components/providers/voting-context";

function VotingDashboard() {
  const { connected } = useWallet();
  const { programId } = useVoting();
  const programIdStr = programId.toBase58();
  const explorerUrl = `https://explorer.solana.com/address/${programIdStr}?cluster=devnet`;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <section className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4 text-balance">
            Decentralizirano glasanje na Solani
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto text-pretty">
            Transparentno, nepromjenjivo i kriptografski sigurno glasanje.
            Svaki glas je trajno zapisan na blockchain.
          </p>
        </section>

        {/* Features */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-teal-100 flex items-center justify-center mb-4">
              <Shield className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Identitet je kljuc
            </h3>
            <p className="text-sm text-muted-foreground">
              Svaki korisnik pristupa putem Phantom walleta. Nema laznih
              profila, samo kriptografski potvrdene adrese.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-amber-100 flex items-center justify-center mb-4">
              <Eye className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Transparentnost je zakon
            </h3>
            <p className="text-sm text-muted-foreground">
              Svako pitanje i glas zapisuju se na Devnet mrezu. Rezultati su
              javno dostupni svima na uvid.
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-6 rounded-xl bg-card border border-border shadow-sm">
            <div className="w-12 h-12 rounded-lg bg-violet-100 flex items-center justify-center mb-4">
              <Lock className="w-6 h-6 text-violet-600" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Integritet je neupitan
            </h3>
            <p className="text-sm text-muted-foreground">
              Jednom predan glas je uklesan u digitalni kamen. Nitko ne moze
              promijeniti rezultat ili glasati dva puta.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="mb-8">
          <StatsBanner />
        </section>

        {/* Actions */}
        <section className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              Aktivna glasanja
            </h2>
            <p className="text-muted-foreground">
              {connected
                ? "Odaberi glasanje i predaj svoj glas"
                : "Povezi wallet za sudjelovanje"}
            </p>
          </div>
          <CreatePollModal />
        </section>

        {/* Polls List */}
        <section>
          <PollsList />
        </section>

        {/* Real-time Dashboard */}
        <section className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-6">
            Dashboard rezultata
          </h2>
          <div className="space-y-6">
            <ResultsChart />
            <LiveActivity />
          </div>
        </section>

        {/* Smart Contract Info */}
        <section className="mt-16 p-6 rounded-xl bg-card border border-border">
          <h3 className="text-lg font-semibold text-foreground mb-4">
            Anchor Smart Contract
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Program ID
              </h4>
              <a
                href={explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="block p-3 rounded-lg bg-secondary text-sm font-mono text-foreground break-all hover:underline"
              >
                {programIdStr}
              </a>
            </div>
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Mreza
              </h4>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-teal-500" />
                <span className="text-foreground">Solana Devnet</span>
              </div>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-border">
            <h4 className="text-sm font-medium text-muted-foreground mb-3">
              Instrukcije
            </h4>
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-sm font-mono">
                create_poll
              </span>
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-sm font-mono">
                cast_vote
              </span>
              <span className="px-3 py-1 rounded-full bg-teal-100 text-teal-700 text-sm font-mono">
                close_poll
              </span>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              Hackathon projekt - Decentralizirano glasanje na Solana blockchainu
            </p>
            <div className="flex items-center gap-4">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Github className="w-4 h-4" />
                <span>GitHub</span>
              </a>
              <a
                href="https://explorer.solana.com/?cluster=devnet"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                <span>Solana Explorer</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function Home() {
  return (
    <SolanaProvider>
      <VotingProvider>
        <VotingDashboard />
      </VotingProvider>
    </SolanaProvider>
  );
}
