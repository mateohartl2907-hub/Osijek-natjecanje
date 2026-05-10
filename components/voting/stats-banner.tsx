"use client";

import { useVoting } from "@/components/providers/voting-context";
import { Vote, Users, CheckCircle } from "lucide-react";

export function StatsBanner() {
  const { polls } = useVoting();

  const totalPolls = polls.length;
  const totalVotes = polls.reduce((acc, poll) => acc + poll.totalVotes, 0);
  const activePolls = polls.filter(
    (poll) => poll.isActive && new Date() < poll.endsAt
  ).length;

  const stats = [
    {
      icon: Vote,
      label: "Ukupno glasanja",
      value: totalPolls,
      color: "text-teal-600",
      bg: "bg-teal-100",
    },
    {
      icon: CheckCircle,
      label: "Predanih glasova",
      value: totalVotes.toLocaleString(),
      color: "text-amber-600",
      bg: "bg-amber-100",
    },
    {
      icon: Users,
      label: "Aktivnih glasanja",
      value: activePolls,
      color: "text-violet-600",
      bg: "bg-violet-100",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="flex items-center gap-4 p-4 rounded-xl bg-card border border-border"
        >
          <div
            className={`flex items-center justify-center w-12 h-12 rounded-lg ${stat.bg} ${stat.color}`}
          >
            <stat.icon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
