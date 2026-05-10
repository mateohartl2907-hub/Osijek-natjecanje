"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Vote, Shield, Eye } from "lucide-react";
import { useState, useEffect } from "react";

export function Header() {
  const { connected, publicKey } = useWallet();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header className="border-b border-border bg-card backdrop-blur-sm sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-teal-100 border border-teal-200">
              <Vote className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">
                SolanaVote
              </h1>
              <p className="text-xs text-muted-foreground">Devnet</p>
            </div>
          </div>

          {/* Stats */}
          <div className="hidden md:flex items-center gap-6">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="w-4 h-4 text-teal-600" />
              <span className="text-muted-foreground">Decentralizirano</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Eye className="w-4 h-4 text-teal-600" />
              <span className="text-muted-foreground">Transparentno</span>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="flex items-center gap-4">
            {connected && publicKey && (
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-teal-100 border border-teal-200">
                <div className="w-2 h-2 rounded-full bg-teal-500 animate-pulse" />
                <span className="text-xs font-mono text-teal-700">
                  {publicKey.toBase58().slice(0, 4)}...
                  {publicKey.toBase58().slice(-4)}
                </span>
              </div>
            )}
            {mounted && (
              <WalletMultiButton
                style={{
                  backgroundColor: "#0d9488",
                  color: "#ffffff",
                  borderRadius: "0.5rem",
                  padding: "0.5rem 1rem",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  height: "auto",
                }}
              />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
