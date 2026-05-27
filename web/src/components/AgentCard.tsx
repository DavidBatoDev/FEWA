"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  CheckCircle2, 
  Activity, 
  Building, 
  ShoppingBag, 
  ArrowRight
} from "lucide-react";

interface OutcomeSim {
  tool: string;
  time: string;
  detail: string;
}

interface AgentCardProps {
  type: "sales" | "commerce";
  title: string;
  description: string;
  badges: string[];
  targetIndustry: string;
  outcomes: string[];
  deployUrl: string;
  simulatedLogs: OutcomeSim[];
}

export function AgentCard({
  type,
  title,
  description,
  badges,
  targetIndustry,
  outcomes,
  deployUrl,
  simulatedLogs,
}: AgentCardProps) {
  const [visibleLogsCount, setVisibleLogsCount] = useState(1);

  // Cycle through logs to animate the simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setVisibleLogsCount((prev) => (prev % simulatedLogs.length) + 1);
    }, 2800);
    return () => clearInterval(interval);
  }, [simulatedLogs.length]);

  const isSales = type === "sales";
  const accentColor = isSales ? "from-cyan-500 to-blue-600" : "from-purple-500 to-indigo-600";
  const glowColor = isSales ? "shadow-[0_0_30px_rgba(6,182,212,0.15)]" : "shadow-[0_0_30px_rgba(168,85,247,0.15)]";
  const borderHoverColor = isSales ? "group-hover:border-cyan-500/40" : "group-hover:border-purple-500/40";
  const iconBg = isSales ? "bg-cyan-500/10 text-cyan-400" : "bg-purple-500/10 text-purple-400";

  return (
    <div className={`group relative rounded-3xl border border-white/[0.07] bg-zinc-900/60 p-6 backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:bg-zinc-900/80 ${glowColor} ${borderHoverColor} flex flex-col h-full`}>
      {/* Decorative gradient light corner */}
      <div className={`absolute -right-4 -top-4 -z-10 h-32 w-32 rounded-full bg-gradient-to-br ${accentColor} opacity-5 blur-[40px] transition-all duration-300 group-hover:opacity-15`} />

      {/* Badges Row */}
      <div className="flex flex-wrap gap-2 mb-4">
        {badges.map((badge, idx) => (
          <span
            key={idx}
            className={`text-[10px] font-semibold tracking-wider uppercase px-2.5 py-1 rounded-full border border-white/[0.05] bg-white/[0.02] text-zinc-400`}
          >
            {badge}
          </span>
        ))}
      </div>

      {/* Icon and Title */}
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-2xl ${iconBg} border border-white/[0.05]`}>
          {isSales ? <Building className="w-6 h-6" /> : <ShoppingBag className="w-6 h-6" />}
        </div>
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-white">{title}</h3>
          <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Active Deployment Mode
          </p>
        </div>
      </div>

      {/* Description */}
      <p className="text-sm leading-relaxed text-zinc-300 mb-6 flex-grow">{description}</p>

      {/* Industry Info */}
      <div className="mb-6 p-3.5 rounded-2xl bg-white/[0.02] border border-white/[0.03]">
        <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Target Sector</span>
        <span className="text-sm font-medium text-zinc-300">{targetIndustry}</span>
      </div>

      {/* Business outcomes */}
      <div className="mb-6">
        <h4 className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mb-3">Capabilities & Outcomes</h4>
        <ul className="space-y-2">
          {outcomes.map((item, idx) => (
            <li key={idx} className="flex items-start gap-2.5 text-xs text-zinc-300">
              <CheckCircle2 className={`w-4 h-4 shrink-0 mt-0.5 ${isSales ? "text-cyan-400" : "text-purple-400"}`} />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Interactive Tool activity log widget */}
      <div className="mb-8 rounded-2xl bg-zinc-950/70 border border-white/[0.04] overflow-hidden">
        <div className="bg-white/[0.02] px-4 py-2 border-b border-white/[0.04] flex items-center justify-between">
          <span className="text-[9px] uppercase font-bold tracking-widest text-zinc-400 flex items-center gap-1.5">
            <Activity className={`w-3.5 h-3.5 animate-pulse ${isSales ? "text-cyan-400" : "text-purple-400"}`} />
            Live Tool Activity Log
          </span>
          <span className="text-[9px] font-mono text-zinc-500">SIMULATED STREAM</span>
        </div>
        <div className="p-3.5 space-y-2 h-[130px] font-mono text-[11px] overflow-y-auto scrollbar-thin">
          {simulatedLogs.map((log, idx) => {
            const isVisible = idx < visibleLogsCount;
            return (
              <div
                key={idx}
                className={`flex items-start justify-between gap-1.5 transition-all duration-300 ${
                  isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2 pointer-events-none absolute"
                }`}
              >
                <div className="flex items-start gap-1">
                  <span className={isSales ? "text-cyan-400" : "text-purple-400"}>✓</span>
                  <span className="text-zinc-300">{log.tool}</span>
                </div>
                <div className="text-zinc-500 whitespace-nowrap">{log.time}</div>
                <div className="text-zinc-400 text-right overflow-hidden text-ellipsis max-w-[140px] whitespace-nowrap">
                  {log.detail}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Button */}
      <Link
        href={deployUrl}
        className={`w-full group/btn relative overflow-hidden rounded-2xl bg-gradient-to-r ${accentColor} p-[1px] transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.05)]`}
      >
        <div className="relative flex items-center justify-center gap-2 rounded-[15px] bg-zinc-900 px-6 py-3.5 text-sm font-semibold text-white transition-colors duration-300 group-hover/btn:bg-transparent">
          <span>Deploy Agent</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
        </div>
      </Link>
    </div>
  );
}
