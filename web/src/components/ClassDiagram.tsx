"use client";

import React, { useState } from "react";
import { 
  Settings, 
  Shield, 
  Sparkles, 
  Database,
  Code,
  Layout,
  Copy,
  Check,
  CheckCircle2
} from "lucide-react";

interface ClassProperty {
  name: string;
  type: string;
  isOptional?: boolean;
}

interface ClassNode {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  borderColor: string;
  glowColor: string;
  x: number;
  y: number;
  width: number;
  height: number;
  properties: ClassProperty[];
  codeTs: string;
  codePy: string;
}

export function ClassDiagram() {
  const [viewMode, setViewMode] = useState<"interactive" | "code">("interactive");
  const [selectedClass, setSelectedClass] = useState<string>("Config");
  const [codeLang, setCodeLang] = useState<"ts" | "py">("ts");
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [copiedMermaid, setCopiedMermaid] = useState<boolean>(false);

  const classes: ClassNode[] = [
    {
      id: "Config",
      name: "Config",
      description: "Root application configuration schema mapping the API listening port, voice channel credentials, active LLM model specifications, database contexts, and agent profiles.",
      icon: Settings,
      color: "text-cyan-400",
      borderColor: "border-cyan-500/30",
      glowColor: "rgba(6, 182, 212, 0.15)",
      x: 430,
      y: 30,
      width: 240,
      height: 140,
      properties: [
        { name: "port", type: "number" },
        { name: "agora", type: "AgoraConfig" },
        { name: "llm", type: "LLMConfig" },
        { name: "couchbase", type: "CouchbaseConfig" },
        { name: "agentId", type: "string" }
      ],
      codeTs: `interface Config {
  port: number;
  agora: AgoraConfig;
  llm: LLMConfig;
  couchbase: CouchbaseConfig;
  agentId: string;
}`,
      codePy: `class Config(BaseModel):
    port: int
    agora: AgoraConfig
    llm: LLMConfig
    couchbase: CouchbaseConfig
    agent_id: str`
    },
    {
      id: "AgoraConfig",
      name: "AgoraConfig",
      description: "Production credentials for client-side Agora SDK authorization, connecting browser voice channels to host systems.",
      icon: Shield,
      color: "text-blue-400",
      borderColor: "border-blue-500/30",
      glowColor: "rgba(59, 130, 246, 0.15)",
      x: 100,
      y: 280,
      width: 220,
      height: 110,
      properties: [
        { name: "appId", type: "string" },
        { name: "appCertificate", type: "string" },
        { name: "authToken", type: "string" }
      ],
      codeTs: `interface AgoraConfig {
  appId: string;
  appCertificate: string;
  authToken: string;
}`,
      codePy: `class AgoraConfig(BaseModel):
    app_id: str
    app_certificate: str
    auth_token: str`
    },
    {
      id: "LLMConfig",
      name: "LLMConfig",
      description: "Credentials and API targets for core LLM inference routing, defaulting to OpenAI GPT-4o mini.",
      icon: Sparkles,
      color: "text-purple-400",
      borderColor: "border-purple-500/30",
      glowColor: "rgba(168, 85, 247, 0.15)",
      x: 440,
      y: 280,
      width: 220,
      height: 100,
      properties: [
        { name: "openaiApiKey", type: "string" },
        { name: "model", type: "string" }
      ],
      codeTs: `interface LLMConfig {
  openaiApiKey: string;
  model: string;
}`,
      codePy: `class LLMConfig(BaseModel):
    openai_api_key: str
    model: str`
    },
    {
      id: "CouchbaseConfig",
      name: "CouchbaseConfig",
      description: "Connection strings, credentials, scope names, and target bucket details for the Couchbase Capella vector database integration.",
      icon: Database,
      color: "text-pink-400",
      borderColor: "border-pink-500/30",
      glowColor: "rgba(244, 63, 94, 0.15)",
      x: 760,
      y: 280,
      width: 240,
      height: 140,
      properties: [
        { name: "connectionString", type: "string" },
        { name: "username", type: "string" },
        { name: "password", type: "string" },
        { name: "bucket", type: "string" },
        { name: "scope", type: "string" }
      ],
      codeTs: `interface CouchbaseConfig {
  connectionString: string;
  username: string;
  password: string;
  bucket: string;
  scope: string;
}`,
      codePy: `class CouchbaseConfig(BaseModel):
    connection_string: str
    username: str
    password: str
    bucket: str
    scope: str`
    }
  ];

  const mermaidCode = `classDiagram
    class Config {
        +port: number
        +agora: AgoraConfig
        +llm: LLMConfig
        +couchbase: CouchbaseConfig
        +agentId: string
    }

    class AgoraConfig {
        +appId: string
        +appCertificate: string
        +authToken: string
    }

    class LLMConfig {
        +openaiApiKey: string
        +model: string
    }

    class CouchbaseConfig {
        +connectionString: string
        +username: string
        +password: string
        +bucket: string
        +scope: string
    }

    Config -- AgoraConfig
    Config -- LLMConfig
    Config -- CouchbaseConfig`;

  const currentClassNode = classes.find(c => c.id === selectedClass) || classes[0];

  const copyMermaidToClipboard = () => {
    navigator.clipboard.writeText(mermaidCode);
    setCopiedMermaid(true);
    setTimeout(() => setCopiedMermaid(false), 2000);
  };

  const copyCodeToClipboard = () => {
    const code = codeLang === "ts" ? currentClassNode.codeTs : currentClassNode.codePy;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="w-full space-y-8">
      {/* Blueprint Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center border-b border-white/[0.05] pb-4 gap-4">
        <div className="text-left w-full sm:w-auto">
          <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
            <Database className="w-4 h-4 text-purple-400 animate-pulse" />
            Configurations Models Blueprint
          </h3>
        </div>
        
        <div className="flex p-1 rounded-xl bg-zinc-950/80 border border-white/[0.05] self-end sm:self-auto">
          <button
            onClick={() => setViewMode("interactive")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "interactive"
                ? "bg-purple-500 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Layout className="w-3.5 h-3.5" />
            Interactive UML
          </button>
          <button
            onClick={() => setViewMode("code")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              viewMode === "code"
                ? "bg-purple-500 text-black shadow-lg"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Mermaid
          </button>
        </div>
      </div>

      {viewMode === "interactive" ? (
        <div className="space-y-8 animate-in fade-in duration-500">

          {/* Interactive UML Canvas */}
          <div className="w-full rounded-2xl border border-white/[0.05] bg-zinc-950/40 p-4 md:p-6 flex justify-center overflow-hidden">
            <div className="w-full aspect-[1100/460]">
              <svg viewBox="0 0 1100 460" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  {/* Glow Filters */}
                  <filter id="glow-cyan-class" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-purple-class" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-blue-class" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="glow-pink-class" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="4" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>

                {/* Orthogonal Association lines from Config to its 3 sub-configs */}
                
                {/* Main vertical trunk down from Config center-bottom (550, 170) to branch-level (550, 225) */}
                <line 
                  x1="550" 
                  y1="170" 
                  x2="550" 
                  y2="225" 
                  stroke="#52525b" 
                  strokeWidth="1.5"
                />

                {/* Horizontal branch bar spanning from left card center (210) to right card center (880) */}
                <line 
                  x1="210" 
                  y1="225" 
                  x2="880" 
                  y2="225" 
                  stroke="#52525b" 
                  strokeWidth="1.5"
                />

                {/* AgoraConfig branch down: (210, 225) to (210, 280) */}
                <path 
                  d="M 210 225 L 210 280" 
                  fill="transparent" 
                  stroke="#52525b" 
                  strokeWidth="1.5" 
                />
                <circle cx="210" cy="280" r="3.5" fill="#3b82f6" />

                {/* LLMConfig branch down: (550, 225) to (550, 280) */}
                <path 
                  d="M 550 225 L 550 280" 
                  fill="transparent" 
                  stroke="#52525b" 
                  strokeWidth="1.5" 
                />
                <circle cx="550" cy="280" r="3.5" fill="#a855f7" />

                {/* CouchbaseConfig branch down: (880, 225) to (880, 280) */}
                <path 
                  d="M 880 225 L 880 280" 
                  fill="transparent" 
                  stroke="#52525b" 
                  strokeWidth="1.5" 
                />
                <circle cx="880" cy="280" r="3.5" fill="#f43f5e" />


                {/* Class Nodes */}
                {classes.map((cls) => {
                  const Icon = cls.icon;
                  const isSelected = selectedClass === cls.id;
                  
                  return (
                    <g 
                      key={cls.id} 
                      className="cursor-pointer group"
                      onClick={() => setSelectedClass(cls.id)}
                    >
                      {/* Box border & glow */}
                      <rect
                        x={cls.x}
                        y={cls.y}
                        width={cls.width}
                        height={cls.height}
                        rx={12}
                        fill="#09090b"
                        stroke={isSelected ? (cls.id === "Config" ? "#22d3ee" : cls.id === "AgoraConfig" ? "#3b82f6" : cls.id === "LLMConfig" ? "#a855f7" : "#ec4899") : "#27272a"}
                        strokeWidth={isSelected ? 2 : 1}
                        filter={isSelected ? (cls.id === "Config" ? "url(#glow-cyan-class)" : cls.id === "AgoraConfig" ? "url(#glow-blue-class)" : cls.id === "LLMConfig" ? "url(#glow-purple-class)" : "url(#glow-pink-class)") : undefined}
                        className="transition-all duration-300 group-hover:stroke-zinc-500"
                      />

                      {/* Header bar */}
                      <g transform={`translate(${cls.x}, ${cls.y})`}>
                        {/* Title header block */}
                        <rect 
                          x={0} 
                          y={0} 
                          width={cls.width} 
                          height={36} 
                          rx={12} 
                          fill="rgba(255,255,255,0.01)" 
                        />
                        
                        <g transform="translate(12, 10)">
                          <Icon className={`w-4 h-4 ${cls.color}`} />
                        </g>

                        <text
                          x={34}
                          y={22}
                          fill="#ffffff"
                          className="text-[11px] font-bold font-mono tracking-wide"
                        >
                          {cls.name}
                        </text>

                        {/* Separator line */}
                        <line 
                          x1={0} 
                          y1={36} 
                          x2={cls.width} 
                          y2={36} 
                          stroke="#18181b" 
                          strokeWidth="1" 
                        />
                      </g>

                      {/* Properties list */}
                      <g transform={`translate(${cls.x + 12}, ${cls.y + 48})`}>
                        {cls.properties.map((prop, pIdx) => (
                          <g key={pIdx} transform={`translate(0, ${pIdx * 18})`}>
                            <text
                              x={0}
                              y={10}
                              fill="#a1a1aa"
                              className="text-[10px] font-mono"
                            >
                              <tspan fill="#71717a">+</tspan> {prop.name}
                              {prop.isOptional && "?"}:
                            </text>
                            <text
                              x={cls.width - 24}
                              y={10}
                              textAnchor="end"
                              fill={
                                prop.type === "number" || prop.type === "string" 
                                  ? "#e2e8f0" 
                                  : (prop.type === "AgoraConfig" ? "#60a5fa" : prop.type === "LLMConfig" ? "#c084fc" : "#f472b6")
                              }
                              className="text-[10px] font-mono font-semibold"
                            >
                              {prop.type}
                            </text>
                          </g>
                        ))}
                      </g>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Interactive Details Inspector panel */}
          <div className="rounded-2xl border border-white/[0.05] bg-zinc-950/80 p-5 grid grid-cols-1 lg:grid-cols-2 gap-6 text-left animate-in fade-in duration-300">
            {/* Column 1: Info and description */}
            <div className="space-y-4 flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className={`p-3 rounded-2xl border ${currentClassNode.borderColor} bg-white/[0.01]`}>
                    {React.createElement(currentClassNode.icon, { className: `w-5 h-5 ${currentClassNode.color}` })}
                  </div>
                  <div>
                    <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border border-white/[0.05] bg-white/[0.02]">
                      Class Node
                    </span>
                    <h4 className="text-sm font-bold text-white mt-1">{currentClassNode.name}</h4>
                  </div>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed pt-2">
                  {currentClassNode.description}
                </p>
              </div>
              
              <div className="text-[10px] font-mono text-zinc-500 bg-zinc-900/30 px-3 py-2 rounded-xl border border-white/[0.02] flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Click any class node in the UML canvas above to inspect model parameters.
              </div>
            </div>

            {/* Column 2: Code snippets */}
            <div className="relative rounded-2xl border border-white/[0.04] bg-zinc-900/10 p-5 flex flex-col space-y-4 justify-between min-h-[190px]">
              {/* Language switcher */}
              <div className="flex justify-between items-center pb-2 border-b border-white/[0.03]">
                <div className="flex gap-2 p-0.5 bg-zinc-950 rounded-lg border border-white/[0.03]">
                  <button
                    onClick={() => setCodeLang("ts")}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide transition-all ${
                      codeLang === "ts" ? "bg-purple-500 text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    TypeScript
                  </button>
                  <button
                    onClick={() => setCodeLang("py")}
                    className={`px-2.5 py-1 rounded text-[10px] font-bold tracking-wide transition-all ${
                      codeLang === "py" ? "bg-purple-500 text-black" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Python (Pydantic)
                  </button>
                </div>

                <button
                  onClick={copyCodeToClipboard}
                  className="flex h-7 items-center gap-1 rounded-md bg-zinc-900 border border-white/[0.05] hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 hover:text-white px-2.5 py-1 transition-all active:scale-95"
                >
                  {copiedCode ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      Copy Code
                    </>
                  )}
                </button>
              </div>

              {/* Code display */}
              <pre className="flex-1 w-full overflow-x-auto text-left text-[11px] font-mono text-purple-300/90 leading-relaxed pt-2 scrollbar-thin">
                <code>{codeLang === "ts" ? currentClassNode.codeTs : currentClassNode.codePy}</code>
              </pre>
            </div>
          </div>

        </div>
      ) : (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="relative">
            {/* Copy Mermaid button */}
            <button
              onClick={copyMermaidToClipboard}
              className="absolute right-4 top-4 flex h-8 items-center gap-1.5 rounded-lg bg-zinc-900 border border-white/[0.06] hover:bg-zinc-800 text-[10px] font-semibold text-zinc-300 hover:text-white px-3 py-1 transition-all active:scale-95 z-10"
            >
              {copiedMermaid ? (
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
            
            {/* Mermaid Markdown */}
            <pre className="w-full rounded-2xl border border-white/[0.04] bg-zinc-950 p-6 overflow-x-auto text-left text-xs font-mono text-purple-400/90 leading-relaxed scrollbar-thin scrollbar-thumb-zinc-850">
              <code>{mermaidCode}</code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
