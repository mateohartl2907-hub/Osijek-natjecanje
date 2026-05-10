"use client";

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useVoting } from "@/components/providers/voting-context";

const COLORS = ["#14b8a6", "#8b5cf6", "#f59e0b", "#ef4444", "#3b82f6"];

export function ResultsChart() {
  const { polls } = useVoting();

  const aggregatedData = useMemo(() => {
    const totalVotesByPoll = polls.map((poll, index) => ({
      name: poll.question.slice(0, 20) + (poll.question.length > 20 ? "..." : ""),
      votes: poll.totalVotes,
      fullQuestion: poll.question,
      fill: COLORS[index % COLORS.length],
    }));

    const activeCount = polls.filter(
      (p) => p.isActive && new Date() < p.endsAt
    ).length;
    const completedCount = polls.length - activeCount;

    return {
      totalVotesByPoll,
      activeCount,
      completedCount,
      statusData: [
        { name: "Aktivna", value: activeCount, fill: COLORS[0] },
        { name: "Zavrsena", value: completedCount, fill: COLORS[1] },
      ],
    };
  }, [polls]);

  if (polls.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Bar Chart - Votes per Poll */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Glasovi po glasanju
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={aggregatedData.totalVotesByPoll}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <XAxis 
                  type="number" 
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={{ stroke: "#e2e8f0" }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={80}
                  tick={{ fill: "#64748b", fontSize: 11 }}
                  axisLine={{ stroke: "#e2e8f0" }}
                  tickLine={false}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  labelStyle={{ color: "#1e293b", fontWeight: 600 }}
                  formatter={(value: number) => [`${value} glasova`, "Ukupno"]}
                  labelFormatter={(_, payload) => {
                    if (payload && payload[0]) {
                      return payload[0].payload.fullQuestion;
                    }
                    return "";
                  }}
                />
                <Bar dataKey="votes" radius={[0, 6, 6, 0]} barSize={24}>
                  {aggregatedData.totalVotesByPoll.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart - Poll Status */}
      <Card className="border border-border shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold">
            Status glasanja
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-52 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={aggregatedData.statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {aggregatedData.statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#fff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: number, name: string) => [`${value}`, name]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-8 mt-2">
            {aggregatedData.statusData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.fill }}
                />
                <span className="text-sm text-muted-foreground font-medium">
                  {item.name}: {item.value}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
