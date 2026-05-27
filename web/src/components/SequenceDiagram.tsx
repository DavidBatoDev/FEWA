"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  User, 
  Mic, 
  Cpu, 
  Server, 
  Shield, 
  Sparkles, 
  Database, 
  Code, 
  Layout, 
  Copy,
  Check,
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  Activity,
  Terminal
} from "lucide-react";

interface Participant {
  id: string;
  name: string;
  label: string;
  tech: string;
  x: number;
  icon: React.ComponentType<any>;
}

interface Step {
  from: string;
  to: string;
  label: string;
  type: "solid" | "dashed";
  isAlt?: boolean;
  desc: string;
}

export function SequenceDiagram() {
  const [viewMode, setViewMode] = useState<"interactive" | "static" | "code">("interactive");
  const [activeStep, setActiveStep] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const participants: Participant[] = [
    { id: "FE", name: "Frontend", label: "Next.js + TypeScript + Tailwind + shadcn/ui", tech: "Next.js + TS", x: 100, icon: User },
    { id: "H_FE", name: "Hosting FE", label: "Vercel", tech: "Vercel", x: 300, icon: Shield },
    { id: "V", name: "Voice Pipeline", label: "Agora Conversational AI (Web SDK)", tech: "Agora SDK", x: 500, icon: Mic },
    { id: "H_BE", name: "Hosting BE", label: "Render or Railway", tech: "Render / Railway", x: 700, icon: Server },
    { id: "BE", name: "Backend", label: "FastAPI + Python", tech: "FastAPI + Python", x: 900, icon: Cpu },
    { id: "DB", name: "Database", label: "Couchbase Capella (Free Tier)", tech: "Couchbase Capella", x: 1100, icon: Database },
    { id: "AI", name: "AI Model", label: "OpenAI API — GPT-4o mini", tech: "GPT-4o mini", x: 1300, icon: Sparkles }
  ];

  const steps: Step[] = [
    { from: "FE", to: "H_FE", label: "Request static assets / SSR", type: "solid", desc: "Client requests app build and loads Next.js app bundle from Vercel." },
    { from: "H_FE", to: "FE", label: "Return compiled client payload", type: "dashed", desc: "Vercel hosts and serves optimized static pages, assets, and components." },
    { from: "FE", to: "V", label: "Initialize Agora Voice Session", type: "solid", desc: "Frontend loads the Agora Conversational AI SDK and prepares browser microphone context." },
    { from: "V", to: "V", label: "Capture audio & local ASR conversion", type: "solid", desc: "Voice Pipeline processes voice inputs and converts spoken speech chunks to text transcripts." },
    { from: "FE", to: "H_BE", label: "POST /chat/completion", type: "solid", desc: "Frontend sends speech transcripts to FastAPI completion endpoint via GCP API route." },
    { from: "H_BE", to: "BE", label: "Route completion payload", type: "solid", desc: "Hosting platform routes incoming API payloads directly to FastAPI backend service instance." },
    { from: "BE", to: "DB", label: "Query Context (RAG)", type: "solid", desc: "FastAPI service queries Couchbase Capella vector databases for relevant business context." },
    { from: "DB", to: "BE", label: "Return Vector Docs Data", type: "dashed", desc: "Couchbase Capella returns matched context text logs, specs, and documents." },
    { from: "BE", to: "AI", label: "Send Prompt + RAG + text", type: "solid", desc: "FastAPI forwards prompt instructions, RAG context, and speech transcript to OpenAI API." },
    { from: "AI", to: "BE", label: "Return generated chat response", type: "dashed", desc: "OpenAI GPT-4o mini generates response text or requested tool execution calls." },
    
    // Alt Tool Execution
    { from: "BE", to: "V", label: "Send RTM control message", type: "solid", isAlt: true, desc: "[Alt] If tool call is triggered, FastAPI sends real-time controls to client-side Agora SDK." },
    { from: "V", to: "BE", label: "Confirm execution output", type: "dashed", isAlt: true, desc: "[Alt] Agora voice client performs required local task and sends outcome data back." },
    { from: "BE", to: "AI", label: "Resend updated context payload", type: "solid", isAlt: true, desc: "[Alt] FastAPI backend updates prompt history with tool output and asks OpenAI API again." },
    { from: "AI", to: "BE", label: "Return final chat text response", type: "dashed", isAlt: true, desc: "[Alt] OpenAI GPT-4o mini evaluates final result and returns complete answer text." },

    { from: "BE", to: "H_BE", label: "Return completion response JSON", type: "dashed", desc: "FastAPI replies with final JSON payload including text transcription details." },
    { from: "H_BE", to: "FE", label: "Route response to client", type: "dashed", desc: "GCP gateway passes API completion response back to the Next.js frontend." },
    { from: "FE", to: "V", label: "Synthesize text-to-speech stream", type: "solid", desc: "Next.js page pushes final text to Agora synthesis engine to read response out loud." },
    { from: "V", to: "FE", label: "Output audio + text transcription", type: "dashed", desc: "Agora Conversational AI SDK plays low-latency voice audio stream and renders subtitles." }
  ];

  const mermaidCode = `sequenceDiagram
    participant FE as Frontend: Next.js + TypeScript + Tailwind CSS + shadcn/ui
    participant H_FE as Hosting FE: Vercel
    participant V as Voice: Agora Conversational AI (Web SDK)
    participant H_BE as Hosting BE: GCP
    participant BE as Backend: FastAPI + Python
    participant DB as Database: Couchbase Capella (Free Tier)
    participant AI as AI: OpenAI API — GPT-4o mini

    FE->>H_FE: Request static assets / SSR
    H_FE-->>FE: Return compiled client payload
    FE->>V: Initialize Agora Voice Session
    V->>V: Capture audio & local ASR conversion
    FE->>H_BE: POST /chat/completion
    H_BE->>BE: Route completion payload
    BE->>DB: Query Context (RAG)
    DB-->>BE: Return Vector Docs Data
    BE->>AI: Send System Prompt + RAG + text
    AI-->>BE: Return generated chat response
    alt Function Call Required
        BE->>V: Send RTM control message
        V-->>BE: Confirm execution output
        BE->>AI: Resend updated context payload
        AI-->>BE: Return final chat text response
    end
    BE-->>H_BE: Return completion response JSON
    H_BE-->>FE: Route response to client
    FE->>V: Synthesize text-to-speech stream
    V-->>FE: Output audio + text transcription`;

  useEffect(() => {
    if (isPlaying && viewMode === "interactive") {
      timerRef.current = setInterval(() => {
        setActiveStep((prev) => {
          if (prev >= steps.length - 1) {
            setIsPlaying(false);
            return -1;
          }
          return prev + 1;
        });
      }, 2500);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, steps.length, viewMode]);

  // Scroll target participant path into focus on active step change
  useEffect(() => {
    if (activeStep !== -1 && containerRef.current && viewMode === "interactive") {
      const step = steps[activeStep];
      const fromP = participants.find((p) => p.id === step.from);
      const toP = participants.find((p) => p.id === step.to);
      if (fromP && toP) {
        const midX = (fromP.x + toP.x) / 2;
        const containerWidth = containerRef.current.clientWidth;
        containerRef.current.scrollTo({
          left: midX - containerWidth / 2,
          behavior: "smooth",
        });
      }
    }
  }, [activeStep, viewMode]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStepClick = (idx: number) => {
    if (viewMode !== "interactive") return;
    setIsPlaying(false);
    setActiveStep(idx === activeStep ? -1 : idx);
  };

  const handleNext = () => {
    setIsPlaying(false);
    setActiveStep((prev) => (prev >= steps.length - 1 ? 0 : prev + 1));
  };

  const handlePrev = () => {
    setIsPlaying(false);
    setActiveStep((prev) => (prev <= 0 ? steps.length - 1 : prev - 1));
  };

  const handleReset = () => {
    setIsPlaying(false);
    setActiveStep(-1);
  };


  return (
    <div className="w-full space-y-8">
      {/* Visual / Code View Toggle */}
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/[0.05] pb-4 gap-4">
        <div className="text-left w-full sm:w-auto">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Activity className="w-4 h-4 text-cyan-400 animate-pulse" />
            Architecture Blueprint
          </h3>
        </div>
        
        <div className="flex p-1 rounded-xl bg-zinc-950/80 border border-white/[0.05] self-end sm:self-auto">
          <button
            onClick={() => { setViewMode("interactive"); handleReset(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "interactive"
                ? "bg-cyan-500 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            Interactive
          </button>
          <button
            onClick={() => setViewMode("static")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "static"
                ? "bg-cyan-500 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Static
          </button>
          <button
            onClick={() => setViewMode("code")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "code"
                ? "bg-cyan-500 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Mermaid
          </button>
        </div>
      </div>

      {viewMode !== "code" ? (
        <div className="space-y-8 animate-in fade-in duration-500">

          {/* Interactive Simulation Controls Bar */}
          {viewMode === "interactive" && (
            <div className="flex flex-wrap items-center gap-3 bg-zinc-950/40 p-3 rounded-2xl border border-white/[0.04] justify-between animate-in fade-in duration-300">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className={`flex h-10 px-4 items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all hover:scale-[1.02] active:scale-95 ${
                    isPlaying 
                      ? "bg-amber-500/10 border border-amber-500/20 text-amber-400" 
                      : "bg-cyan-500 text-black shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                  }`}
                >
                  {isPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-amber-400" />
                      Pause Flow
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-black" />
                      Play Flow
                    </>
                  )}
                </button>
                
                <button
                  onClick={handlePrev}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] text-zinc-300 hover:text-white transition-colors"
                  title="Previous Step"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  onClick={handleNext}
                  className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] text-zinc-300 hover:text-white transition-colors"
                  title="Next Step"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                <button
                  onClick={handleReset}
                  className="flex h-10 px-3 items-center justify-center gap-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05] hover:bg-white/[0.06] text-xs text-zinc-400 hover:text-white transition-colors"
                  title="Reset Flow"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </button>
              </div>

              <div className="text-[11px] font-mono text-zinc-550 flex items-center gap-2 bg-zinc-950 px-3 py-1.5 rounded-lg border border-white/[0.03]">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                Step: {activeStep === -1 ? "Idle" : `${activeStep + 1} / ${steps.length}`}
              </div>
            </div>
          )}

          {/* SVG Diagram Container (Responsive & Scaled via viewBox) */}
          <div 
            ref={containerRef}
            className="w-full rounded-2xl border border-white/[0.05] bg-zinc-950/40 p-4 md:p-6 flex justify-center overflow-hidden"
          >
            <div className="w-full aspect-[1400/550]">
              <svg viewBox="0 0 1400 550" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                
                {/* Define Arrowheads and Filters */}
                <defs>
                  <marker id="arrow-standard" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#71717a" />
                  </marker>
                  <marker id="arrow-highlight" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#a855f7" />
                  </marker>
                  <marker id="arrow-voice" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#06b6d4" />
                  </marker>
                  <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-purple" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Draw Dashed Participant Lifelines */}
                {participants.map((p) => (
                  <line
                    key={p.id}
                    x1={p.x}
                    y1={80}
                    x2={p.x}
                    y2={510}
                    stroke="#27272a"
                    strokeWidth="1.5"
                    strokeDasharray="6,4"
                  />
                ))}

                {/* Render Alternative Loop Region Outline (Alt: Function Call) */}
                <rect
                  x={440}
                  y={295}
                  width={920}
                  height={85}
                  rx={12}
                  fill="rgba(168, 85, 247, 0.01)"
                  stroke="#a855f7"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity={viewMode === "interactive" ? (activeStep >= 10 && activeStep <= 13 ? 0.7 : 0.25) : 0.6}
                  className="transition-opacity duration-300"
                />
                <text
                  x={455}
                  y={315}
                  fill="#c084fc"
                  className="text-[9px] font-mono font-bold tracking-wider uppercase"
                  opacity={viewMode === "interactive" ? (activeStep >= 10 && activeStep <= 13 ? 0.9 : 0.4) : 0.7}
                >
                  ALT: Function Call Required
                </text>

                {/* Draw Message Arrows between Lifelines */}
                {steps.map((step, idx) => {
                  const fromP = participants.find((p) => p.id === step.from);
                  const toP = participants.find((p) => p.id === step.to);
                  if (!fromP || !toP) return null;

                  const stepY = 105 + idx * 20;
                  const isActive = viewMode === "interactive" && activeStep === idx;
                  const isInteractiveIdle = viewMode === "interactive" && activeStep === -1;
                  
                  // Color selection based on step category
                  let arrowColor = "#71717a";
                  let markerId = "arrow-standard";
                  
                  if (viewMode === "interactive") {
                    if (isActive) {
                      arrowColor = step.isAlt ? "#a855f7" : "#06b6d4";
                      markerId = step.isAlt ? "arrow-highlight" : "arrow-voice";
                    } else if (!isInteractiveIdle) {
                      arrowColor = "#1f1f23"; // Dim inactive lines when stepping
                    }
                  } else {
                    // Static View Mode Colors
                    if (step.isAlt) {
                      arrowColor = "#c084fc";
                      markerId = "arrow-highlight";
                    } else if (idx === 0 || idx === steps.length - 1) {
                      arrowColor = "#22d3ee";
                      markerId = "arrow-voice";
                    }
                  }

                  const isLeftToRight = toP.x > fromP.x;
                  const textAnchor = "middle";
                  
                  const lineX1 = fromP.x;
                  const lineX2 = isLeftToRight ? toP.x - 6 : toP.x + 6;

                  return (
                    <g 
                      key={idx} 
                      className={viewMode === "interactive" ? "cursor-pointer group" : ""} 
                      onClick={() => handleStepClick(idx)}
                    >
                      {/* Invisible wider path for easier clicking in interactive mode */}
                      {viewMode === "interactive" && (
                        <line
                          x1={fromP.x}
                          y1={stepY}
                          x2={toP.x}
                          y2={stepY}
                          stroke="transparent"
                          strokeWidth="12"
                        />
                      )}

                      {/* Arrow Line */}
                      <line
                        x1={lineX1}
                        y1={stepY}
                        x2={lineX2}
                        y2={stepY}
                        stroke={arrowColor}
                        strokeWidth={isActive ? 2 : 1.5}
                        strokeDasharray={step.type === "dashed" ? "5,3" : "none"}
                        markerEnd={`url(#${markerId})`}
                        filter={isActive ? (step.isAlt ? "url(#glow-purple)" : "url(#glow-cyan)") : undefined}
                        className="transition-all duration-300"
                      />

                      {/* Moving Particle for Active Line */}
                      {isActive && (
                        <circle r="4" fill={step.isAlt ? "#c084fc" : "#22d3ee"}>
                          <animateMotion
                            path={`M ${lineX1} ${stepY} L ${lineX2} ${stepY}`}
                            dur="1.5s"
                            repeatCount="indefinite"
                          />
                        </circle>
                      )}

                      {/* Step Text Label */}
                      <text
                        x={(fromP.x + toP.x) / 2}
                        y={stepY - 5}
                        textAnchor={textAnchor}
                        fill={
                          isActive 
                            ? (step.isAlt ? "#e9d5ff" : "#cffafe") 
                            : (viewMode === "interactive" && !isInteractiveIdle ? "#27272a" : (step.isAlt ? "#e9d5ff" : (idx === 0 || idx === steps.length - 1 ? "#cffafe" : "#a1a1aa")))
                        }
                        className={`text-[9px] font-mono select-none transition-colors duration-300 ${isActive ? "font-bold" : ""}`}
                      >
                        {idx + 1}. {step.label}
                      </text>
                    </g>
                  );
                })}

                {/* Render Participant Header Cards */}
                {participants.map((p) => {
                  const Icon = p.icon;
                  const isVoiceNode = p.id === "FE" || p.id === "H_FE" || p.id === "V";
                  
                  // Determine if active in interactive mode
                  const currentActiveStep = (viewMode === "interactive" && activeStep !== -1) ? steps[activeStep] : null;
                  const isParticipantActive = currentActiveStep 
                    ? (currentActiveStep.from === p.id || currentActiveStep.to === p.id) 
                    : false;

                  return (
                    <g key={p.id} className="transition-all duration-300">
                      {/* Column background highlights on active */}
                      {isParticipantActive && (
                        <rect
                          x={p.x - 12}
                          y={80}
                          width={24}
                          height={430}
                          fill={isVoiceNode ? "rgba(6,182,212,0.01)" : "rgba(168,85,247,0.01)"}
                          opacity="0.5"
                        />
                      )}

                      {/* Participant Header Box */}
                      <g transform={`translate(${p.x - 70}, 15)`}>
                        <rect
                          x={0}
                          y={0}
                          width={140}
                          height={50}
                          rx={10}
                          fill="#09090b"
                          stroke={isParticipantActive ? (isVoiceNode ? "#06b6d4" : "#a855f7") : (isVoiceNode ? "#06b6d4/60" : "#a855f7/60")}
                          strokeWidth={isParticipantActive ? 2 : 1}
                          filter={isParticipantActive ? (isVoiceNode ? "url(#glow-cyan)" : "url(#glow-purple)") : undefined}
                          className="transition-all duration-300"
                        />
                        
                        {/* Icon */}
                        <g transform="translate(10, 15)">
                          <circle r="10" cx="10" cy="10" fill="#18181b" />
                          <g transform="translate(4, 4)">
                            <Icon className={`w-3.5 h-3.5 ${isParticipantActive || viewMode === "static" ? (isVoiceNode ? "text-cyan-400" : "text-purple-400") : "text-zinc-500"}`} />
                          </g>
                        </g>
                        
                        {/* Category Name */}
                        <text
                          x={34}
                          y={20}
                          fill="#71717a"
                          className="text-[8px] font-bold uppercase tracking-wider transition-colors"
                        >
                          {p.name}
                        </text>

                        {/* Tech Stack Name */}
                        <text
                          x={34}
                          y={34}
                          fill={isParticipantActive || viewMode === "static" ? "#ffffff" : "#d4d4d8"}
                          className="text-[9px] font-extrabold font-mono transition-colors"
                        >
                          {p.tech}
                        </text>
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Active Step Description Card (only in interactive mode) */}
          {viewMode === "interactive" && (
            <div className="rounded-2xl border border-white/[0.05] bg-zinc-950/80 p-5 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between animate-in fade-in duration-300">
              {activeStep === -1 ? (
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-xl bg-zinc-900 border border-white/[0.04] text-zinc-500">
                    <Activity className="w-5 h-5 animate-pulse" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-sm font-bold text-zinc-300">Simulator Idle</h4>
                    <p className="text-xs text-zinc-500 mt-0.5">Click &quot;Play Flow&quot; or select any arrow step above to trace real-time API client routing and controls.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-4 text-left">
                    <div className={`p-3 rounded-2xl border shrink-0 ${steps[activeStep].isAlt ? 'bg-purple-500/10 border-purple-500/20 text-purple-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
                      {React.createElement(participants.find(p => p.id === steps[activeStep].from)?.icon || Terminal, { className: "w-5 h-5" })}
                    </div>
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${steps[activeStep].isAlt ? 'bg-purple-950/20 border-purple-500/20 text-purple-400' : 'bg-cyan-950/20 border-cyan-500/20 text-cyan-400'}`}>
                          Step {activeStep + 1}
                        </span>
                        <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                          <span>{participants.find(p => p.id === steps[activeStep].from)?.name}</span>
                          <ChevronRight className="w-3.5 h-3.5 text-zinc-650" />
                          <span className="text-zinc-300">{participants.find(p => p.id === steps[activeStep].to)?.name}</span>
                        </h4>
                      </div>
                      <p className="text-xs text-zinc-400 leading-relaxed max-w-3xl">
                        {steps[activeStep].desc}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.02] border border-white/[0.04] text-[10px] font-mono text-zinc-450 self-stretch md:self-auto justify-center">
                    {steps[activeStep].label}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="relative">
            {/* Copy code button */}
            <button
              onClick={copyToClipboard}
              className="absolute right-4 top-4 flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 hover:text-white px-3 py-1 transition-all active:scale-95 z-10"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  Copy Mermaid
                </>
              )}
            </button>
            
            {/* Markdown Code Area */}
            <pre className="w-full rounded-2xl border border-white/[0.04] bg-zinc-950 p-6 overflow-x-auto text-left text-xs font-mono text-cyan-400/90 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-850">
              <code>{mermaidCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
