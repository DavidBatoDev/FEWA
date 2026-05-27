"use client";

import React, { useState } from "react";
import { 
  Server, 
  Shield, 
  Sparkles, 
  Database,
  Terminal,
  Mic,
  Layout
} from "lucide-react";

interface TechBlock {
  id: string;
  title: string;
  spec: string;
  category: string;
  icon: React.ComponentType<any>;
  color: string;
  borderColor: string;
  glowColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function TechStackDiagram() {
  const [hoveredBlock, setHoveredBlock] = useState<string | null>(null);

  const blocks: TechBlock[] = [
    {
      id: "hosting-fe",
      title: "Hosting FE",
      spec: "Vercel",
      category: "Deployment",
      icon: Shield,
      color: "text-yellow-400",
      borderColor: "border-yellow-500/30",
      glowColor: "rgba(234, 179, 8, 0.15)",
      x: 290,
      y: 20,
      width: 220,
      height: 65
    },
    {
      id: "frontend",
      title: "Frontend Client",
      spec: "Next.js + TypeScript + Tailwind CSS + shadcn/ui",
      category: "Client UI",
      icon: Layout,
      color: "text-cyan-400",
      borderColor: "border-cyan-500/30",
      glowColor: "rgba(6, 182, 212, 0.15)",
      x: 280,
      y: 120,
      width: 240,
      height: 70
    },
    {
      id: "voice",
      title: "Voice Pipeline",
      spec: "Agora Conversational AI (Web SDK)",
      category: "Voice Integration",
      icon: Mic,
      color: "text-blue-400",
      borderColor: "border-blue-500/30",
      glowColor: "rgba(59, 130, 246, 0.15)",
      x: 560,
      y: 120,
      width: 210,
      height: 70
    },
    {
      id: "hosting-be",
      title: "Hosting BE",
      spec: "GCP",
      category: "Deployment",
      icon: Server,
      color: "text-orange-400",
      borderColor: "border-orange-500/30",
      glowColor: "rgba(249, 115, 22, 0.15)",
      x: 40,
      y: 230,
      width: 200,
      height: 70
    },
    {
      id: "backend",
      title: "Backend API Server",
      spec: "FastAPI + Python",
      category: "Business Logic",
      icon: Terminal,
      color: "text-emerald-400",
      borderColor: "border-emerald-500/30",
      glowColor: "rgba(16, 185, 129, 0.15)",
      x: 280,
      y: 230,
      width: 240,
      height: 70
    },
    {
      id: "database",
      title: "Database Store",
      spec: "Couchbase Capella (Free Tier)",
      category: "Data Layer",
      icon: Database,
      color: "text-pink-400",
      borderColor: "border-pink-500/30",
      glowColor: "rgba(244, 63, 94, 0.15)",
      x: 140,
      y: 370,
      width: 220,
      height: 70
    },
    {
      id: "ai",
      title: "AI Engine Model",
      spec: "OpenAI API — GPT-4o mini",
      category: "Intelligence",
      icon: Sparkles,
      color: "text-purple-400",
      borderColor: "border-purple-500/30",
      glowColor: "rgba(168, 85, 247, 0.15)",
      x: 440,
      y: 370,
      width: 220,
      height: 70
    }
  ];

  // Helper to determine arrow colors on hover
  const getArrowColor = (fromId: string, toId: string) => {
    if (!hoveredBlock) return "#3f3f46"; // zinc-700
    if (hoveredBlock === fromId || hoveredBlock === toId) {
      const activeBlock = blocks.find(b => b.id === hoveredBlock);
      return activeBlock ? (hoveredBlock === "frontend" ? "#22d3ee" : hoveredBlock === "backend" ? "#34d399" : "#a78bfa") : "#3f3f46";
    }
    return "#18181b"; // zinc-900 (dimmed)
  };

  return (
    <div className="w-full rounded-3xl border border-white/[0.06] bg-zinc-900/20 p-6 md:p-8 space-y-6 text-left relative overflow-hidden transition-all hover:bg-zinc-900/30">
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <Server className="w-4 h-4 text-cyan-400" />
          System Tech Stack Architecture
        </h4>
        <p className="text-xs text-zinc-400">
          Schematic diagram detailing how core technologies integrate across client, backend logic, data layers, and deployment targets.
        </p>
      </div>

      <div className="w-full aspect-[800/470] relative select-none">
        <svg viewBox="0 0 800 470" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            {/* Arrow Markers */}
            <marker id="arrow-stack-std" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#52525b" />
            </marker>
            <marker id="arrow-stack-cyan" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#22d3ee" />
            </marker>
            <marker id="arrow-stack-emerald" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#34d399" />
            </marker>
            <marker id="arrow-stack-purple" viewBox="0 0 10 10" refX="7" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M 0 1 L 9 5 L 0 9 z" fill="#a78bfa" />
            </marker>

            {/* Ambient glows */}
            <filter id="glow-cyan-stack" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-purple-stack" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-emerald-stack" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Connection Lines (Arrows) */}
          
          {/* Hosting FE (Vercel) -> Frontend Client */}
          <path
            d="M 400 85 L 400 120"
            fill="transparent"
            stroke={getArrowColor("hosting-fe", "frontend")}
            strokeWidth={hoveredBlock === "hosting-fe" || hoveredBlock === "frontend" ? 2 : 1.5}
            markerEnd={hoveredBlock === "hosting-fe" || hoveredBlock === "frontend" ? "url(#arrow-stack-cyan)" : "url(#arrow-stack-std)"}
            className="transition-all duration-300"
          />

          {/* Frontend Client <-> Voice Pipeline (Bidirectional) */}
          <path
            d="M 520 145 L 560 145"
            fill="transparent"
            stroke={getArrowColor("frontend", "voice")}
            strokeWidth={hoveredBlock === "frontend" || hoveredBlock === "voice" ? 2 : 1.5}
            markerEnd={hoveredBlock === "frontend" || hoveredBlock === "voice" ? "url(#arrow-stack-cyan)" : "url(#arrow-stack-std)"}
            className="transition-all duration-300"
          />
          <path
            d="M 560 165 L 520 165"
            fill="transparent"
            stroke={getArrowColor("frontend", "voice")}
            strokeWidth={hoveredBlock === "frontend" || hoveredBlock === "voice" ? 2 : 1.5}
            markerEnd={hoveredBlock === "frontend" || hoveredBlock === "voice" ? "url(#arrow-stack-cyan)" : "url(#arrow-stack-std)"}
            className="transition-all duration-300"
          />

          {/* Frontend Client -> Backend API Server */}
          <path
            d="M 400 190 L 400 230"
            fill="transparent"
            stroke={getArrowColor("frontend", "backend")}
            strokeWidth={hoveredBlock === "frontend" || hoveredBlock === "backend" ? 2 : 1.5}
            markerEnd={hoveredBlock === "frontend" || hoveredBlock === "backend" ? (hoveredBlock === "frontend" ? "url(#arrow-stack-cyan)" : "url(#arrow-stack-emerald)") : "url(#arrow-stack-std)"}
            className="transition-all duration-300"
          />

          {/* Hosting BE (GCP) -> Backend API Server */}
          <path
            d="M 240 265 L 280 265"
            fill="transparent"
            stroke={getArrowColor("hosting-be", "backend")}
            strokeWidth={hoveredBlock === "hosting-be" || hoveredBlock === "backend" ? 2 : 1.5}
            markerEnd={hoveredBlock === "hosting-be" || hoveredBlock === "backend" ? "url(#arrow-stack-emerald)" : "url(#arrow-stack-std)"}
            className="transition-all duration-300"
          />

          {/* Backend API Server -> Database Store & AI Engine (Split down-left and down-right) */}
          
          {/* Main vertical stem down from Backend */}
          <path
            d="M 400 300 L 400 335"
            fill="transparent"
            stroke={getArrowColor("backend", "database") === "#3f3f46" && getArrowColor("backend", "ai") === "#3f3f46" ? "#3f3f46" : (hoveredBlock === "backend" ? "#34d399" : "#a78bfa")}
            strokeWidth={hoveredBlock === "backend" || hoveredBlock === "database" || hoveredBlock === "ai" ? 2 : 1.5}
            className="transition-all duration-300"
          />
          {/* Horizontal crossbar splitting */}
          <path
            d="M 250 335 L 550 335"
            fill="transparent"
            stroke={getArrowColor("backend", "database") === "#3f3f46" && getArrowColor("backend", "ai") === "#3f3f46" ? "#3f3f46" : (hoveredBlock === "backend" ? "#34d399" : "#a78bfa")}
            strokeWidth={hoveredBlock === "backend" || hoveredBlock === "database" || hoveredBlock === "ai" ? 2 : 1.5}
            className="transition-all duration-300"
          />
          {/* Downward drop to Database */}
          <path
            d="M 250 335 L 250 370"
            fill="transparent"
            stroke={getArrowColor("backend", "database")}
            strokeWidth={hoveredBlock === "backend" || hoveredBlock === "database" ? 2 : 1.5}
            markerEnd={hoveredBlock === "backend" || hoveredBlock === "database" ? "url(#arrow-stack-emerald)" : "url(#arrow-stack-std)"}
            className="transition-all duration-300"
          />
          {/* Downward drop to AI */}
          <path
            d="M 550 335 L 550 370"
            fill="transparent"
            stroke={getArrowColor("backend", "ai")}
            strokeWidth={hoveredBlock === "backend" || hoveredBlock === "ai" ? 2 : 1.5}
            markerEnd={hoveredBlock === "backend" || hoveredBlock === "ai" ? "url(#arrow-stack-emerald)" : "url(#arrow-stack-std)"}
            className="transition-all duration-300"
          />

          {/* Render Boxes */}
          {blocks.map((block) => {
            const Icon = block.icon;
            const isHovered = hoveredBlock === block.id;

            return (
              <g 
                key={block.id}
                onMouseEnter={() => setHoveredBlock(block.id)}
                onMouseLeave={() => setHoveredBlock(null)}
                className="cursor-pointer"
              >
                {/* Background Box */}
                <rect
                  x={block.x}
                  y={block.y}
                  width={block.width}
                  height={block.height}
                  rx={10}
                  fill="#09090b"
                  stroke={isHovered ? (block.id === "frontend" ? "#22d3ee" : block.id === "backend" ? "#34d399" : "#a78bfa") : "#27272a"}
                  strokeWidth={isHovered ? 2 : 1}
                  filter={isHovered ? (block.id === "frontend" ? "url(#glow-cyan-stack)" : block.id === "backend" ? "url(#glow-emerald-stack)" : "url(#glow-purple-stack)") : undefined}
                  className="transition-all duration-300"
                />

                {/* Box details */}
                <g transform={`translate(${block.x + 12}, ${block.y + 10})`}>
                  {/* Category text */}
                  <text
                    x={0}
                    y={10}
                    fill="#71717a"
                    className="text-[9px] font-bold font-mono tracking-widest uppercase"
                  >
                    {block.category}
                  </text>

                  {/* Icon & Title */}
                  <g transform="translate(0, 16)">
                    <Icon className={`w-3.5 h-3.5 ${block.color} shrink-0`} />
                    <text
                      x={20}
                      y={11}
                      fill="#ffffff"
                      className="text-[11px] font-extrabold font-mono"
                    >
                      {block.title}
                    </text>
                  </g>

                  {/* Tech specs detail text */}
                  <text
                    x={0}
                    y={46}
                    fill="#a1a1aa"
                    className="text-[9px] font-semibold leading-normal font-sans"
                  >
                    {block.spec.length > 34 ? (
                      <>
                        <tspan x={0} dy={0}>{block.spec.split(" + ").slice(0, 2).join(" + ") + " +"}</tspan>
                        <tspan x={0} dy={10}>{block.spec.split(" + ").slice(2).join(" + ")}</tspan>
                      </>
                    ) : (
                      block.spec
                    )}
                  </text>
                </g>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
