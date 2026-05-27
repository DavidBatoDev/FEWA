"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  Building, 
  ShoppingBag, 
  Settings, 
  ArrowRight, 
  Sparkles, 
  Cpu, 
  Languages, 
  ShieldCheck, 
  Sliders, 
  Coins, 
  ChevronRight,
  Database,
  ArrowLeft,
  Check
} from "lucide-react";

function CampaignSetupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [agentType, setAgentType] = useState<"sales" | "commerce">("sales");
  const [isLoaded, setIsLoaded] = useState(false);
  const [channelName, setChannelName] = useState("");
  const [languageMode, setLanguageMode] = useState("Taglish");
  const [voice, setVoice] = useState("alloy");
  const [targetIndustry, setTargetIndustry] = useState("Logistics & Supply Chain");
  const [persona, setPersona] = useState("Crisp & Consultative");
  const [catalogType, setCatalogType] = useState("Electronics & Tech Accessories");
  const [paymentOption, setPaymentOption] = useState("GCash Direct");
  
  // New state for document extraction
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedText, setExtractedText] = useState("");
  const [extractedSummary, setExtractedSummary] = useState("");
  const [uploadedFilename, setUploadedFilename] = useState("");
  
  useEffect(() => {
    // Generate a default channel name if empty
    const suffix = Math.random().toString(36).slice(2, 8);
    setChannelName(`fewa-channel-${suffix}`);

    // Check localStorage preference
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("globalMode") as "b2b" | "b2c" | null;
      if (savedMode) {
        setAgentType(savedMode === "b2b" ? "sales" : "commerce");
      } else {
        const initialType = searchParams.get("type") === "commerce" ? "commerce" : "sales";
        setAgentType(initialType);
      }
    } else {
      const initialType = searchParams.get("type") === "commerce" ? "commerce" : "sales";
      setAgentType(initialType);
    }
    setIsLoaded(true);
  }, [searchParams]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsExtracting(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/campaigns/extract-doc`, {
        method: "POST",
        body: formData,
      });
      
      if (!res.ok) throw new Error("Extraction failed");
      
      const data = await res.json();
      setExtractedText(data.text);
      setExtractedSummary(data.summary);
      setUploadedFilename(data.filename);
    } catch (err) {
      console.error("Upload error:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleLaunch = () => {
    // Store large extracted text in localStorage to pass to agent page
    if (extractedText) {
      localStorage.setItem("campaign_knowledge", extractedText);
    } else {
      localStorage.removeItem("campaign_knowledge");
    }

    // Navigate to the agent console with all configuration parameters
    const params = new URLSearchParams({
      type: agentType,
      channel: channelName,
      lang: languageMode,
      voice: voice,
      industry: agentType === "sales" ? targetIndustry : catalogType,
      persona: persona,
      payment: paymentOption
    });
    const targetPath = agentType === "commerce" ? "/commerce" : "/agent";
    router.push(`${targetPath}?${params.toString()}`);
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Loading Configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="dark min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
      {/* Frosted header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-zinc-950/70 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-black transition-transform duration-300 group-hover:scale-105">
              F
              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              FFlow<span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">.ph</span>
            </span>
          </Link>

          <Link 
            href="/" 
            className="rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Home
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        {/* Title Section */}
        <div className="space-y-4 mb-10 text-center lg:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3.5 py-1 text-xs font-bold text-cyan-400 tracking-wide uppercase">
            <Settings className="w-3 h-3 animate-spin" style={{ animationDuration: "10s" }} />
            Deployment Engine
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            Campaign Setup & AI Configuration
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Configure your conversation criteria, select your business model, and deploy Faye alongside your real-time voice pipeline.
          </p>
        </div>

        {/* Two Column Form Layout */}
        <div className="flex flex-col lg:flex-row gap-8 items-start">
          {/* Form Side */}
          <div className="flex-1 w-full space-y-6">
            
            {/* 1. Selector B2B/B2C */}
            <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/40 p-6 backdrop-blur-xl space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-mono ${agentType === 'sales' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>1</span>
                Selected Agent Architecture
              </h2>
              
              <div className="grid grid-cols-1 gap-4">
                {agentType === "sales" ? (
                  <div
                    className="relative p-5 rounded-2xl border text-left flex items-start gap-4 border-cyan-500 bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.1)]"
                  >
                    <div className="p-2.5 rounded-xl border bg-cyan-500/20 border-cyan-500/30 text-cyan-400">
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">B2B Sales Agent</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Lead qualification, objection handling, score metrics, and calendar demo scheduling.
                      </p>
                    </div>
                    <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  </div>
                ) : (
                  <div
                    className="relative p-5 rounded-2xl border text-left flex items-start gap-4 border-purple-500 bg-purple-950/20 shadow-[0_0_20px_rgba(168,85,247,0.1)]"
                  >
                    <div className="p-2.5 rounded-xl border bg-purple-500/20 border-purple-500/30 text-purple-400">
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-white">B2C Commerce Agent</h3>
                      <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                        Conversational checkout, catalog searches, criteria matching, and GCash payments.
                      </p>
                    </div>
                    <span className="absolute top-3 right-3 h-2 w-2 rounded-full bg-purple-400 animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            {/* 2. Core Settings */}
            <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/40 p-6 backdrop-blur-xl space-y-5">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-mono">2</span>
                Core Parameters Configuration
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Voice Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Agora TTS Voice</label>
                  <select
                    value={voice}
                    onChange={(e) => setVoice(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    <option value="alloy">Alloy (Balanced, Conversational)</option>
                    <option value="ash">Ash (Deep, Professional)</option>
                    <option value="ballad">Ballad (Warm, Consultative)</option>
                    <option value="coral">Coral (Energetic, Sales-oriented)</option>
                    <option value="shimmer">Shimmer (Clear, Direct)</option>
                    <option value="sage">Sage (Soft, Calming)</option>
                  </select>
                </div>

                {/* Language Selection */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Language Mode</label>
                  <div className="flex gap-2">
                    {["Taglish", "English Only", "Filipino"].map((lang) => (
                      <button
                        key={lang}
                        type="button"
                        onClick={() => setLanguageMode(lang)}
                        className={`flex-1 rounded-xl border py-2.5 text-xs font-medium transition-all ${
                          languageMode === lang
                            ? "border-cyan-500/50 bg-cyan-500/5 text-cyan-400"
                            : "border-white/[0.05] bg-zinc-950/40 text-zinc-400 hover:border-white/[0.08]"
                        }`}
                      >
                        {lang}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Channel Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">RTC Channel Name</label>
                  <input
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                    placeholder="e.g. sales-campaign-hq"
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors font-mono"
                  />
                </div>

                {/* Persona Preset */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Agent Persona</label>
                  <select
                    value={persona}
                    onChange={(e) => setPersona(e.target.value)}
                    className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
                  >
                    <option value="Crisp & Consultative">Crisp & Consultative (Helpful & outcome focused)</option>
                    <option value="Urgent Closer">Urgent Closer (High objection-handling drive)</option>
                    <option value="Friendly Assistant">Friendly Assistant (Supportive & descriptive)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 3. AI Knowledge & Context Chatbot */}
            <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/40 backdrop-blur-xl overflow-hidden flex flex-col">
              <div className="p-6 border-b border-white/[0.06] flex items-center justify-between">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-mono">3</span>
                  AI Knowledge & Context
                </h2>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Live Sync
                </div>
              </div>

              <div className="h-[400px] flex flex-col bg-zinc-950/40 relative">
                {/* Chat Messages Area */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  <div className="flex items-start gap-3 max-w-[85%]">
                    <div className={`p-2 rounded-lg ${agentType === 'sales' ? 'bg-cyan-500 text-black' : 'bg-purple-500 text-white'} shrink-0`}>
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                    <div className="space-y-2">
                      <div className="p-3.5 rounded-2xl rounded-tl-none bg-white/[0.03] border border-white/[0.05] text-xs text-zinc-300 leading-relaxed">
                        {agentType === 'sales' 
                          ? "Ready to prime Faye for your B2B campaign. Upload your sales scripts, client case studies, or pain-point matrices to build her knowledge base."
                          : "Ready to configure the B2C store context. Upload your product CSVs, brand guidelines, or delivery policies so Faye can answer customer queries accurately."}
                      </div>
                      <span className="text-[10px] text-zinc-600 font-mono ml-1">FAYE_SYSTEM • Just now</span>
                    </div>
                  </div>

                  {extractedSummary && (
                    <div className="flex items-start gap-3 max-w-[85%] animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className={`p-2 rounded-lg ${agentType === 'sales' ? 'bg-cyan-500 text-black' : 'bg-purple-500 text-white'} shrink-0`}>
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <div className="space-y-2">
                        <div className="p-3.5 rounded-2xl rounded-tl-none bg-cyan-500/10 border border-cyan-500/20 text-xs text-cyan-50 leading-relaxed">
                          <p className="font-bold text-cyan-400 mb-1 flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            Knowledge Base Updated
                          </p>
                          {extractedSummary}
                        </div>
                        <span className="text-[10px] text-zinc-600 font-mono ml-1">FAYE_SYSTEM • Analyzed {uploadedFilename}</span>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-center py-2">
                    <div className="px-4 py-1.5 rounded-full border border-white/[0.03] bg-zinc-900/50 text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                      Session started: May 27, 2026
                    </div>
                  </div>
                </div>

                {/* Dropzone / Input Area */}
                <div className="p-6 pt-0">
                  <div className="relative group">
                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-cyan-500/20 to-blue-600/20 blur opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                    <div className="relative p-6 rounded-2xl border-2 border-dashed border-white/[0.08] bg-zinc-900/40 hover:border-cyan-500/30 transition-all flex flex-col items-center justify-center text-center gap-3 cursor-pointer overflow-hidden">
                      {isExtracting ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
                          <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Extracting Context...</p>
                        </div>
                      ) : uploadedFilename ? (
                        <div className="flex flex-col items-center gap-2">
                          <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-400">
                            <Check className="w-6 h-6" />
                          </div>
                          <p className="text-sm font-bold text-white">{uploadedFilename}</p>
                          <p className="text-[9px] text-zinc-500 uppercase tracking-widest font-black">Knowledge Extracted</p>
                        </div>
                      ) : (
                        <>
                          <div className={`p-3 rounded-full ${agentType === 'sales' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-purple-500/10 text-purple-400'}`}>
                            <Database className="w-6 h-6" />
                          </div>
                          <div className="space-y-1">
                            <p className="text-sm font-bold text-white">Upload Training Data</p>
                            <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-black">PDF ONLY FOR NOW</p>
                          </div>
                        </>
                      )}
                      <input 
                        type="file" 
                        accept=".pdf"
                        className="absolute inset-0 opacity-0 cursor-pointer" 
                        onChange={handleFileUpload}
                      />
                    </div>
                  </div>
                  
                  <div className="mt-4 flex items-center gap-3">
                    <input 
                      type="text" 
                      placeholder="Add context manually (e.g. 'Faye, mention our 20% discount')..."
                      className="flex-1 rounded-xl border border-white/[0.08] bg-zinc-950/60 px-4 py-3 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
                    />
                    <button className={`p-3 rounded-xl ${agentType === 'sales' ? 'bg-cyan-500 text-black' : 'bg-purple-500 text-white'} shadow-lg hover:scale-105 transition-transform active:scale-95`}>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Specialized Settings */}
            <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/40 p-6 backdrop-blur-xl space-y-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-mono">4</span>
                {agentType === "sales" ? "B2B Sales Directives" : "B2C E-commerce Options"}
              </h2>

              {agentType === "sales" ? (
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Target Industry Sector</label>
                    <select
                      value={targetIndustry}
                      onChange={(e) => setTargetIndustry(e.target.value)}
                      className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
                    >
                      <option value="Logistics & Supply Chain">Logistics & Supply Chain (Fleet, warehouse, tracking)</option>
                      <option value="Professional Services & Agencies">Professional Services & Agencies (Marketing, development)</option>
                      <option value="SaaS & Tech Consultations">SaaS & Tech Consultations (Software integration)</option>
                      <option value="Real Estate & Brokerage">Real Estate & Brokerage (Property search & bookings)</option>
                    </select>
                  </div>
                  <div className="p-4 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] text-xs text-zinc-500 leading-relaxed">
                    <span className="font-semibold text-zinc-400 block mb-1">Lead Qualification Threshold</span>
                    Faye will evaluate client input against your Purposive Communication metrics. If the Lead Score exceeds <strong>70 points</strong>, the contact is flagged as <strong>HOT 🔴</strong>, auto-drafting follow-ups and launching the calendar.
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Store Catalog Focus</label>
                      <select
                        value={catalogType}
                        onChange={(e) => setCatalogType(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
                      >
                        <option value="Electronics & Tech Accessories">Electronics & Tech Accessories (Laptops, peripherals)</option>
                        <option value="Local Fashion & Apparel">Local Fashion & Apparel (Retail garments, bags)</option>
                        <option value="Food & Quick Services">Food & Quick Services (Menu items, deliveries)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider block">Payment Integration Gateway</label>
                      <select
                        value={paymentOption}
                        onChange={(e) => setPaymentOption(e.target.value)}
                        className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/60 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
                      >
                        <option value="GCash Direct">GCash (QR & Reference Code check)</option>
                        <option value="Cash on Delivery">Cash on Delivery (Address verified by agent)</option>
                        <option value="Maya Wallet">Maya (Direct checkout gateway)</option>
                      </select>
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-dashed border-white/[0.08] bg-white/[0.01] text-xs text-zinc-500 leading-relaxed">
                    <span className="font-semibold text-zinc-400 block mb-1">Conversational Checkout Flow</span>
                    Faye will sync the active checkout cart on-screen, comparing buyer criteria in real-time, verifying spelling of names/addresses, and generating the payment QR.
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Deployment Summary Side */}
          <div className="w-full lg:w-[350px] shrink-0 sticky top-24 space-y-6">
            <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-xl flex flex-col">
              <h3 className="text-sm font-bold tracking-wider text-zinc-400 uppercase mb-4 flex items-center gap-1.5">
                <Cpu className="w-4 h-4 text-cyan-400" />
                Orchestration Summary
              </h3>

              <div className="space-y-3.5 mb-6 text-xs border-b border-white/[0.05] pb-5">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Selected Node</span>
                  <span className="font-medium text-white capitalize">{agentType} Mode</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Pipeline Voice</span>
                  <span className="font-medium text-white capitalize">{voice}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Language Standard</span>
                  <span className="font-medium text-cyan-400">{languageMode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Active DB Scope</span>
                  <span className="font-mono text-zinc-300">couchbase::leads</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">RTC Latency Target</span>
                  <span className="font-medium text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Sub-second
                  </span>
                </div>
              </div>

              {/* Visual Architect Highlight */}
              <div className="rounded-2xl bg-cyan-950/20 border border-cyan-500/20 p-4 mb-6 space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
                  <span className="font-bold text-xs text-cyan-400 uppercase tracking-wide">Faye AI HUD Enabled</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Faye is armed with the <strong>&quot;shot list&quot;</strong> for this campaign:
                  {agentType === "sales" ? (
                    <span> Lead score dials, objections trackers, qualification matrices, and calendar bookings.</span>
                  ) : (
                    <span> Buyer preferences profiles, catalog search results, checkout carts, and GCash QR codes.</span>
                  )}
                </p>
              </div>

              {/* Deploy Button */}
              <button
                type="button"
                onClick={handleLaunch}
                className={`w-full group/btn relative overflow-hidden rounded-2xl bg-gradient-to-r p-[1px] transition-all duration-300 hover:scale-[1.02] ${
                  agentType === "sales" 
                    ? "from-cyan-500 to-blue-600 shadow-[0_0_30px_rgba(6,182,212,0.2)] hover:shadow-[0_0_40px_rgba(6,182,212,0.3)]" 
                    : "from-purple-500 to-indigo-600 shadow-[0_0_30px_rgba(168,85,247,0.2)] hover:shadow-[0_0_40px_rgba(168,85,247,0.3)]"
                }`}
              >
                <div className="relative flex items-center justify-center gap-2 rounded-[15px] bg-zinc-950 px-6 py-4 text-sm font-bold text-white transition-colors duration-300 group-hover/btn:bg-transparent">
                  <span>Deploy to AI Console</span>
                  <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover/btn:translate-x-1" />
                </div>
              </button>
            </div>
            
            <div className="rounded-2xl border border-white/[0.04] bg-white/[0.01] p-4 text-[10px] text-zinc-500 leading-relaxed flex items-start gap-2.5">
              <Database className="w-3.5 h-3.5 text-zinc-400 shrink-0 mt-0.5" />
              <span>
                By deploying, a session will be registered in Couchbase. The active transcripts are processed via OpenAI GPT and synced directly onto Faye&apos;s UI.
              </span>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}

export default function CampaignPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Loading Deployer...</span>
        </div>
      </div>
    }>
      <CampaignSetupForm />
    </Suspense>
  );
}
