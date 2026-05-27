"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Cpu, 
  Sparkles, 
  Layers, 
  ArrowRight, 
  Zap, 
  ShieldCheck, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Phone,
  Settings,
  Database,
  Terminal,
  LineChart,
  Home,
  Building,
  ShoppingBag,
  Calendar,
  Layers3,
  HelpCircle,
  Play,
  CheckCircle2,
  ChevronRight,
  Code
} from "lucide-react";
import { CalendarDemo } from "@/components/CalendarDemo";

type TabId = "home" | "sales" | "commerce" | "calendar" | "comparison" | "tech" | "db";

export default function HomeWorkspace() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("home");
  const [selectedModel, setSelectedModel] = useState<"sales" | "commerce">("sales");
  
  // States for B2B simulated logs
  const [salesLogsCount, setSalesLogsCount] = useState(1);
  const salesLogs = [
    { tool: "extract_lead_info()", time: "00:08", detail: "Company: ABC Logistics" },
    { tool: "extract_lead_info()", time: "00:21", detail: "Pain: Lost inquiries" },
    { tool: "score_lead()", time: "00:34", detail: "Score: 90 — Hot 🔴" },
    { tool: "recommend_offer()", time: "00:41", detail: "Sales Automation" },
    { tool: "detect_objection()", time: "00:53", detail: "Pricing concern" },
    { tool: "book_discovery_call()", time: "01:10", detail: "Wed 2pm confirmed" },
    { tool: "generate_follow_up()", time: "01:45", detail: "Email draft ready" }
  ];

  // States for B2C simulated logs
  const [commerceLogsCount, setCommerceLogsCount] = useState(1);
  const commerceLogs = [
    { tool: "extract_preferences()", time: "00:12", detail: "Use case: Programming" },
    { tool: "extract_preferences()", time: "00:25", detail: "Budget: ₱60,000" },
    { tool: "search_products()", time: "00:32", detail: "Lenovo ThinkPad E14" },
    { tool: "compare_items()", time: "00:48", detail: "ThinkPad vs ASUS" },
    { tool: "build_order()", time: "01:05", detail: "Juan dela Cruz, QC" },
    { tool: "verify_order()", time: "01:18", detail: "ThinkPad ₱58,999 ✓" },
    { tool: "checkout_prep()", time: "01:30", detail: "Ref: WPH-2026-00142" }
  ];

  // Couchbase JSON explorer state
  const [activeJsonDoc, setActiveJsonDoc] = useState<"logistics" | "buyer">("logistics");

  const logisticsJson = `{
  "type": "lead",
  "campaign_id": "campaign::sme-sales",
  "company": "ABC Logistics",
  "industry": "Logistics & Fleet",
  "pain_point": "Lost inquiries, poor call tracking",
  "timeline": "Immediate (This month)",
  "decision_maker": true,
  "objections": [
    "Pricing concerns"
  ],
  "lead_score": 90,
  "lead_temperature": "Hot",
  "recommended_offer": "Sales Automation Package",
  "status": "call_booked",
  "created_at": "2026-05-27T12:00:00Z"
}`;

  const buyerJson = `{
  "type": "commerce_cart",
  "campaign_id": "campaign::electronics-b2c",
  "customer": {
    "name": "Juan dela Cruz",
    "phone": "0917-889-1243",
    "delivery_address": "Project 4, Quezon City"
  },
  "preferences": {
    "use_case": "Programming & Web Dev",
    "budget_max": 60000,
    "brand_preference": "Lenovo"
  },
  "items": [
    {
      "sku": "prod::lenovo-e14",
      "name": "Lenovo ThinkPad E14 Gen 5",
      "price": 58999,
      "qty": 1
    }
  ],
  "totals": {
    "subtotal": 58999,
    "shipping": 0,
    "total": 58999
  },
  "payment": {
    "method": "GCash Scan",
    "reference": "WPH-2026-00142",
    "status": "paid"
  }
}`;

  useEffect(() => {
    setMounted(true);
    
    // Cycle B2B simulated logs
    const salesInterval = setInterval(() => {
      setSalesLogsCount((prev) => (prev % salesLogs.length) + 1);
    }, 2500);

    // Cycle B2C simulated logs
    const commerceInterval = setInterval(() => {
      setCommerceLogsCount((prev) => (prev % commerceLogs.length) + 1);
    }, 2500);

    return () => {
      clearInterval(salesInterval);
      clearInterval(commerceInterval);
    };
  }, [salesLogs.length, commerceLogs.length]);

  if (!mounted) return null;

  return (
    <div className="dark h-screen w-full bg-zinc-950 text-white font-sans flex overflow-hidden">
      
      {/* 1. LEFT SIDEBAR: Navigation Menu Panel (Canva Style) */}
      <div className="w-[280px] shrink-0 border-r border-white/[0.06] bg-zinc-900/60 backdrop-blur-xl flex flex-col h-full">
        
        {/* Workspace Brand Header */}
        <div className="p-6 border-b border-white/[0.05] flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-black transition-transform duration-300 group-hover:scale-105">
              F
              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
            </div>
            <span className="text-base font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              FFlow<span className="text-cyan-400">.ph</span>
            </span>
          </Link>
          <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 uppercase bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.05]">
            v2.0
          </span>
        </div>

        {/* Navigation Categories */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          
          {/* Main workspace section */}
          <div className="space-y-1.5">
            <h4 className="px-3 text-[9px] font-black tracking-widest text-zinc-500 uppercase mb-2">
              Design Workspace
            </h4>
            
            {[
              { id: "home", label: "Dashboard Home", icon: Home, color: "text-cyan-400" },
              { id: "sales", label: "B2B Sales Agent", icon: Building, color: "text-cyan-400" },
              { id: "commerce", label: "B2C Commerce Agent", icon: ShoppingBag, color: "text-purple-400" },
              { id: "calendar", label: "Interactive Calendar", icon: Calendar, color: "text-amber-400" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as TabId)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? "bg-white/[0.06] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                      : "text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? item.color : "text-zinc-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className={`h-1.5 w-1.5 rounded-full ${item.id === "commerce" ? "bg-purple-400" : item.id === "calendar" ? "bg-amber-400" : "bg-cyan-400"}`} />}
                </button>
              );
            })}
          </div>

          {/* Database & Technical section */}
          <div className="space-y-1.5">
            <h4 className="px-3 text-[9px] font-black tracking-widest text-zinc-500 uppercase mb-2">
              Utilities & Data
            </h4>
            
            {[
              { id: "comparison", label: "Agora vs FFlow.ph", icon: Layers3, color: "text-emerald-400" },
              { id: "tech", label: "Tech Stack Nodes", icon: Cpu, color: "text-blue-400" },
              { id: "db", label: "Couchbase DB Explorer", icon: Database, color: "text-pink-400" },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id as TabId)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                    isActive 
                      ? "bg-white/[0.06] text-white shadow-[inset_0_1px_1px_rgba(255,255,255,0.05)]" 
                      : "text-zinc-400 hover:bg-white/[0.02] hover:text-zinc-200"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${isActive ? item.color : "text-zinc-500"}`} />
                    <span>{item.label}</span>
                  </div>
                  {isActive && <div className={`h-1.5 w-1.5 rounded-full ${item.color}`} />}
                </button>
              );
            })}
          </div>

        </div>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-white/[0.05] bg-zinc-950/40 text-[10px] space-y-3 font-sans shrink-0">
          <div className="flex items-center gap-2 text-zinc-400">
            <Database className="w-3.5 h-3.5 text-pink-400" />
            <span>DB Status:</span>
            <span className="font-mono text-emerald-400 font-bold uppercase">Online</span>
          </div>
          <Link
            href="/campaign"
            className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] py-2 font-bold text-white transition-all text-xs"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            Configure Engine
          </Link>
        </div>
      </div>

      {/* 2. RIGHT PREVIEW PANEL: Large Dynamic Workspace (Canva Workspace Style) */}
      <div className="flex-1 flex flex-col h-full bg-zinc-950 overflow-hidden relative">
        
        {/* Background decorative glows */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-cyan-500/5 via-purple-500/5 to-transparent blur-3xl -z-10" />

        {/* Workspace Top Header Bar */}
        <header className="h-16 border-b border-white/[0.06] bg-zinc-950/70 backdrop-blur-md px-8 flex items-center justify-between shrink-0">
          <h2 className="text-sm font-bold tracking-wider text-zinc-300 uppercase flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400 animate-pulse" />
            Active Workspace: {activeTab === "home" ? "Home Dashboard" : activeTab === "sales" ? "B2B Sales Agent" : activeTab === "commerce" ? "B2C Commerce Agent" : activeTab === "calendar" ? "Interactive Wall Calendar" : activeTab === "comparison" ? "Comparative Features Matrix" : activeTab === "tech" ? "Technology Node Graph" : "Couchbase Document Database"}
          </h2>

          <div className="flex items-center gap-3">
            {/* Live Indicator */}
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-white/[0.02] border border-white/[0.05] px-3.5 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              May 27, 2026
            </div>
            
            {/* Direct Console Launch Shortcut */}
            <Link
              href="/agent"
              className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-4 py-1.5 text-xs transition-all shadow-[0_0_15px_rgba(6,182,212,0.2)] hover:scale-102 flex items-center gap-1"
            >
              <span>AI Console</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </header>

        {/* Dynamic Workspace Body */}
        <div className="flex-1 overflow-y-auto p-8">

          {/* ==================== TAB 1: HOME ==================== */}
          {activeTab === "home" && (
            <div className="space-y-8 max-w-5xl">
              {/* Frosted Welcome Banner */}
              <div className="relative rounded-3xl border border-white/[0.07] bg-zinc-900/40 p-8 overflow-hidden backdrop-blur-xl shadow-[0_15px_30px_rgba(0,0,0,0.3)]">
                <div className="absolute -right-12 -top-12 h-44 w-44 rounded-full bg-gradient-to-tr from-cyan-500/10 to-blue-600/10 blur-[30px]" />
                
                <div className="max-w-2xl space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1 text-[10px] font-bold text-cyan-400 tracking-wide uppercase">
                    <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: "5s" }} />
                    Agora Conversational AI Core
                  </div>
                  
                  <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white leading-tight">
                    Turn Voice Conversations Into <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Structured Outcomes</span>
                  </h1>
                  
                  <p className="text-xs text-zinc-400 leading-relaxed font-medium">
                    The Philippine vertical AI agent console. Leverage sub-second latency voice channels to extract qualifiers, compute lead scores, objection handle, comparison-match, and generate checkout reference numbers on the fly.
                  </p>
                </div>
              </div>

              {/* KPI Cards Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {[
                  { label: "Lead qualification Rate", val: "90%", desc: "B2B discovery success factor", color: "from-cyan-400 to-blue-500" },
                  { label: "B2C checkout prep", val: "24/7", desc: "Automated GCash invoices", color: "from-blue-400 to-purple-500" },
                  { label: "Platform Mock Revenue", val: "₱1,250,000+", desc: "Couchbase analytics summary", color: "from-purple-400 to-pink-500" }
                ].map((kpi, idx) => (
                  <div key={idx} className="rounded-2xl border border-white/[0.05] bg-zinc-900/30 p-5 backdrop-blur-md">
                    <span className="text-[9px] font-bold tracking-widest text-zinc-500 uppercase block">{kpi.label}</span>
                    <span className={`text-2xl font-black bg-gradient-to-r ${kpi.color} bg-clip-text text-transparent block mt-1.5`}>{kpi.val}</span>
                    <span className="text-[10px] text-zinc-400 mt-0.5 block">{kpi.desc}</span>
                  </div>
                ))}
              </div>

              {/* Direct B2B vs B2C Selection Workspace */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase font-mono">Select Business Agent Workspace</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* B2B Selection Card */}
                  <button
                    type="button"
                    onClick={() => setSelectedModel("sales")}
                    className={`p-5 rounded-2xl border text-left transition-all flex items-start gap-4 relative ${
                      selectedModel === "sales" 
                        ? "border-cyan-500 bg-cyan-950/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]" 
                        : "border-white/[0.05] bg-zinc-900/20 hover:border-white/[0.1] hover:bg-zinc-900/30"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl border ${selectedModel === "sales" ? "bg-cyan-500/20 border-cyan-500/30 text-cyan-400" : "bg-white/[0.02] border-white/[0.05] text-zinc-500"}`}>
                      <Building className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100">B2B Sales Agent</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">Qualify firmographics, evaluate urgency, score leads (0-100), and schedule discovery slots.</p>
                    </div>
                    {selectedModel === "sales" && (
                      <span className="absolute top-3.5 right-3.5 h-2.5 w-2.5 rounded-full bg-cyan-400 animate-pulse" />
                    )}
                  </button>

                  {/* B2C Selection Card */}
                  <button
                    type="button"
                    onClick={() => setSelectedModel("commerce")}
                    className={`p-5 rounded-2xl border text-left transition-all flex items-start gap-4 relative ${
                      selectedModel === "commerce" 
                        ? "border-purple-500 bg-purple-950/10 shadow-[0_0_20px_rgba(168,85,247,0.15)]" 
                        : "border-white/[0.05] bg-zinc-900/20 hover:border-white/[0.1] hover:bg-zinc-900/30"
                    }`}
                  >
                    <div className={`p-2.5 rounded-xl border ${selectedModel === "commerce" ? "bg-purple-500/20 border-purple-500/30 text-purple-400" : "bg-white/[0.02] border-white/[0.05] text-zinc-500"}`}>
                      <ShoppingBag className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-zinc-100">B2C Commerce Agent</h4>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">Sync shopping carts, compare products catalog specs, and generate GCash payment QR codes.</p>
                    </div>
                    {selectedModel === "commerce" && (
                      <span className="absolute top-3.5 right-3.5 h-2.5 w-2.5 rounded-full bg-purple-400 animate-pulse" />
                    )}
                  </button>
                </div>
              </div>

              {/* Active Model workspace detail panel */}
              <div className={`rounded-3xl border p-6 bg-zinc-900/40 backdrop-blur-xl flex flex-col md:flex-row gap-8 transition-all ${
                selectedModel === "sales" ? "border-cyan-500/30" : "border-purple-500/30"
              }`}>
                {/* Details column */}
                <div className="flex-1 space-y-5">
                  <div className="space-y-1">
                    <span className={`text-[9px] font-mono font-bold tracking-widest uppercase ${
                      selectedModel === "sales" ? "text-cyan-400" : "text-purple-400"
                    }`}>
                      {selectedModel === "sales" ? "B2B sales model directives" : "B2C e-commerce checkout model"}
                    </span>
                    <h3 className="text-xl font-black text-white">
                      {selectedModel === "sales" ? "Sales Qualification Pipeline" : "Conversational Checkout Funnel"}
                    </h3>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed font-sans font-medium">
                    {selectedModel === "sales" 
                      ? "Evaluates incoming client voice calls to verify fleet operations/company scale, industry sectors, decision maker roles, timeline scopes, and budget ranges. Synthesizes a lead score dashboard instantly."
                      : "Supports product catalog search, side-by-side specifications comparisons, address credentials verifications, and creates automated GCash payment invoice reference numbers."
                    }
                  </p>

                  <div className="space-y-2.5">
                    <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 uppercase block">Outcomes tracked by Faye</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-zinc-300">
                      {selectedModel === "sales" ? (
                        <>
                          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Lead profile info qualifiers</div>
                          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Objection handlers triggers</div>
                          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Radial score dials (0-100)</div>
                          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" /> Live calendar demo bookings</div>
                        </>
                      ) : (
                        <>
                          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> Shopping cart items & totals</div>
                          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> Specs comparisons metrics</div>
                          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> GCash scans QR invoices</div>
                          <div className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" /> Shipping parameters checks</div>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={selectedModel === "sales" ? "/campaign?type=sales" : "/campaign?type=commerce"}
                      className={`inline-flex items-center justify-center gap-2 rounded-2xl font-bold px-6 py-3.5 text-xs transition-all hover:scale-[1.02] ${
                        selectedModel === "sales" 
                          ? "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-[0_0_20px_rgba(6,182,212,0.3)]" 
                          : "bg-purple-500 hover:bg-purple-400 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]"
                      }`}
                    >
                      <span>Deploy to Campaign Setup</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>

                {/* Simulated Tool Activity Stream Column */}
                <div className="w-full md:w-[280px] shrink-0 bg-zinc-950/50 rounded-2xl border border-white/[0.04] p-4 flex flex-col gap-3.5">
                  <div className="flex justify-between items-center border-b border-white/[0.05] pb-2 shrink-0">
                    <span className={`text-[8px] font-mono font-bold tracking-widest uppercase flex items-center gap-1.5 ${
                      selectedModel === "sales" ? "text-cyan-400" : "text-purple-400"
                    }`}>
                      <span className={`w-1 h-1 rounded-full animate-ping ${selectedModel === "sales" ? "bg-cyan-400" : "bg-purple-400"}`} />
                      Live Stream Preview
                    </span>
                    <span className="text-[8px] font-mono text-zinc-500 uppercase">Auto Loop</span>
                  </div>

                  <div className="space-y-2 h-[130px] overflow-y-auto font-mono text-[10px] scrollbar-thin">
                    {(selectedModel === "sales" ? salesLogs : commerceLogs).map((log, idx) => {
                      const limit = selectedModel === "sales" ? salesLogsCount : commerceLogsCount;
                      const isVisible = idx < limit;
                      return (
                        <div
                          key={idx}
                          className={`flex justify-between gap-2 border-b border-white/[0.01] pb-1.5 last:border-0 transition-opacity duration-300 ${
                            isVisible ? "opacity-100" : "opacity-10"
                          }`}
                        >
                          <span className={selectedModel === "sales" ? "text-cyan-400" : "text-purple-400"}>✓</span>
                          <span className="text-zinc-300 truncate flex-1">{log.tool}</span>
                          <span className="text-zinc-500 shrink-0 font-light">{log.time}</span>
                          <span className="text-zinc-400 truncate max-w-[100px]">{log.detail}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-[9px] text-zinc-500 leading-relaxed pt-2 border-t border-white/[0.04] text-center shrink-0">
                    Faye visualizes these tool runs in real time on the console.
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 2: B2B SALES ==================== */}
          {activeTab === "sales" && (
            <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
              <div className="flex-1 space-y-6">
                <div className="p-3.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 inline-flex items-center gap-2">
                  <Building className="w-5 h-5 text-cyan-400" />
                  <span className="font-bold text-xs text-cyan-400 uppercase tracking-wide">B2B Sales Module</span>
                </div>
                
                <h2 className="text-2xl font-black text-white">B2B Sales Qualification Agent</h2>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-2xl">
                  Qualify enterprise leads field-by-field, determine buying authority, budget readiness, and timeline urgency. Integrated with a sub-second sales scoring dial and live meeting Booker.
                </p>

                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Capabilities</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-300">
                    {[
                      "Real-time Lead Profiling",
                      "Lead Score radial dials (0-100)",
                      "Urgency timeline mapping",
                      "Pricing Objection Handle scripts",
                      "Meeting scheduler confirmations",
                      "Follow-up document outlines"
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4">
                  <Link
                    href="/campaign?type=sales"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-6 py-3.5 text-xs transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-102"
                  >
                    <span>Deploy B2B Agent</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* B2B Live Simulation Log Panel */}
              <div className="w-full lg:w-[350px] shrink-0 rounded-3xl border border-white/[0.06] bg-zinc-900/40 p-5 backdrop-blur-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-cyan-400 uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                    Simulated Tool Stream
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">Sales Rep HUD</span>
                </div>

                <div className="space-y-3 h-[180px] overflow-y-auto font-mono text-[11px]">
                  {salesLogs.map((log, idx) => {
                    const isVisible = idx < salesLogsCount;
                    return (
                      <div
                        key={idx}
                        className={`flex justify-between gap-2 border-b border-white/[0.02] pb-1.5 last:border-0 transition-opacity duration-300 ${
                          isVisible ? "opacity-100" : "opacity-10"
                        }`}
                      >
                        <div className="text-zinc-300">
                          <span className="text-cyan-400 mr-1.5">✓</span>
                          {log.tool}
                        </div>
                        <div className="text-zinc-500 shrink-0 font-light">{log.time}</div>
                        <div className="text-zinc-400 truncate max-w-[130px]">{log.detail}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.04] text-[10px] text-zinc-500 leading-relaxed">
                  Faye silently orchestrates the UI on the agent console to reflect these logs as they are triggered in conversation.
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 3: B2C COMMERCE ==================== */}
          {activeTab === "commerce" && (
            <div className="flex flex-col lg:flex-row gap-8 max-w-5xl">
              <div className="flex-1 space-y-6">
                <div className="p-3.5 rounded-2xl bg-purple-500/5 border border-purple-500/20 inline-flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-400" />
                  <span className="font-bold text-xs text-purple-400 uppercase tracking-wide">B2C Commerce Module</span>
                </div>
                
                <h2 className="text-2xl font-black text-white">B2C Conversational Commerce Agent</h2>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans max-w-2xl">
                  Provide retail buyers with instant product specification comparisons, shopping cart updates, spelling verifications of shipping parameters, and GCash invoice reference codes.
                </p>

                <div className="space-y-3.5">
                  <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase">Capabilities</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-zinc-300">
                    {[
                      "Shopping Cart integrations",
                      "Specifications comparisons matrix",
                      "Budget limit validations",
                      "Shipping Address verifications",
                      "GCash Reference QR codes",
                      "Preference criteria checkmarks"
                    ].map((item, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-purple-400 shrink-0" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4">
                  <Link
                    href="/campaign?type=commerce"
                    className="inline-flex items-center justify-center gap-2 rounded-2xl bg-purple-500 hover:bg-purple-400 text-zinc-950 font-bold px-6 py-3.5 text-xs transition-all shadow-[0_0_20px_rgba(168,85,247,0.3)] hover:scale-102"
                  >
                    <span>Deploy B2C Agent</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* B2C Live Simulation Log Panel */}
              <div className="w-full lg:w-[350px] shrink-0 rounded-3xl border border-white/[0.06] bg-zinc-900/40 p-5 backdrop-blur-xl space-y-4">
                <div className="flex justify-between items-center border-b border-white/[0.05] pb-3">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-purple-400 uppercase flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-ping" />
                    Simulated Tool Stream
                  </span>
                  <span className="text-[9px] text-zinc-500 font-mono">Commerce HUD</span>
                </div>

                <div className="space-y-3 h-[180px] overflow-y-auto font-mono text-[11px]">
                  {commerceLogs.map((log, idx) => {
                    const isVisible = idx < commerceLogsCount;
                    return (
                      <div
                        key={idx}
                        className={`flex justify-between gap-2 border-b border-white/[0.02] pb-1.5 last:border-0 transition-opacity duration-300 ${
                          isVisible ? "opacity-100" : "opacity-10"
                        }`}
                      >
                        <div className="text-zinc-300">
                          <span className="text-purple-400 mr-1.5">✓</span>
                          {log.tool}
                        </div>
                        <div className="text-zinc-500 shrink-0 font-light">{log.time}</div>
                        <div className="text-zinc-400 truncate max-w-[130px]">{log.detail}</div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950/60 border border-white/[0.04] text-[10px] text-zinc-500 leading-relaxed">
                  Faye frames specifications comparison and GCash checkouts instantly on the screen as the buyer responds.
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 4: CALENDAR PREVIEW ==================== */}
          {activeTab === "calendar" && (
            <div className="max-w-5xl">
              <CalendarDemo />
            </div>
          )}

          {/* ==================== TAB 5: PLATFORM COMPARISON ==================== */}
          {activeTab === "comparison" && (
            <div className="rounded-3xl border border-white/[0.05] bg-zinc-900/30 p-6 backdrop-blur-xl max-w-4xl space-y-5">
              <div>
                <h3 className="text-lg font-bold text-white mb-1.5">Core Platform Differences</h3>
                <p className="text-xs text-zinc-400 font-sans">Compare capabilities between default Agora Studio setups and our customized FFlow.ph outcome integration layers.</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse font-sans">
                  <thead>
                    <tr className="border-b border-white/[0.05] text-zinc-500 uppercase tracking-wider text-[9px] font-bold">
                      <th className="pb-3 font-bold">Requirement</th>
                      <th className="pb-3 font-semibold">Agora Studio Core</th>
                      <th className="pb-3 font-bold text-cyan-400">FFlow.ph + Faye</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.03] text-zinc-300">
                    <tr>
                      <td className="py-4 font-bold text-zinc-200">AI Outcome Logic</td>
                      <td className="py-4 text-zinc-400">Voice prompts & simple knowledge files</td>
                      <td className="py-4 text-cyan-400 font-semibold flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Structured tool-calling pipeline
                      </td>
                    </tr>
                    <tr>
                      <td className="py-4 font-bold text-zinc-200">Lead qualification</td>
                      <td className="py-4 text-zinc-400">Basic chat transcripts logs</td>
                      <td className="py-4 text-emerald-400 font-semibold">Real-time qualifiers and score dial (0-100)</td>
                    </tr>
                    <tr>
                      <td className="py-4 font-bold text-zinc-200">Commerce checkout</td>
                      <td className="py-4 text-zinc-400">Manual JSON APIs configurations</td>
                      <td className="py-4 text-emerald-400 font-semibold">Preference checkmarks + GCash invoices generated</td>
                    </tr>
                    <tr>
                      <td className="py-4 font-bold text-zinc-200">Visual reframing</td>
                      <td className="py-4 text-zinc-400">Not supported (voice only)</td>
                      <td className="py-4 text-cyan-400 font-semibold">Faye AI visual organizer & screen framing glows</td>
                    </tr>
                    <tr>
                      <td className="py-4 font-bold text-zinc-200">Calendar checkouts</td>
                      <td className="py-4 text-zinc-400">Disconnect calls</td>
                      <td className="py-4 text-emerald-400 font-semibold">Live wall calendar schedules + automated drafts</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ==================== TAB 6: TECH STACK NODES ==================== */}
          {activeTab === "tech" && (
            <div className="space-y-6 max-w-4xl">
              <div>
                <h3 className="text-lg font-bold text-white mb-1.5">Modern Technical Infrastructure</h3>
                <p className="text-xs text-zinc-400">High-performance tech stack pre-configured for Philippine latency requirements.</p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {[
                  { title: "Next.js 16", desc: "React layout engine", icon: Code, color: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20" },
                  { title: "Agora SDK", desc: "Sub-second RTC Voice", icon: MessageSquare, color: "text-blue-400 bg-blue-500/10 border-blue-500/20" },
                  { title: "OpenAI GPT", desc: "Structured tool extraction", icon: Sparkles, color: "text-purple-400 bg-purple-500/10 border-purple-500/20" },
                  { title: "Couchbase", desc: "Capella Real-time DB", icon: Database, color: "text-pink-400 bg-pink-500/10 border-pink-500/20" },
                  { title: "FastAPI", desc: "Python business logic", icon: Layers, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20" }
                ].map((node, idx) => {
                  const Icon = node.icon;
                  return (
                    <div key={idx} className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-3">
                      <div className={`p-3 rounded-xl border ${node.color} flex items-center justify-center`}>
                        <Icon className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-white">{node.title}</div>
                        <div className="text-[9px] text-zinc-500 leading-tight">{node.desc}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Data pipeline architecture map */}
              <div className="rounded-2xl border border-white/[0.05] bg-zinc-900/30 p-5 space-y-4">
                <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 uppercase block">Sub-second Latency Pipeline Flow</span>
                
                <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-400 text-center">
                  <div className="p-3.5 rounded-xl border border-white/[0.06] bg-zinc-950/60 w-full md:w-auto">Client Microphone</div>
                  <div className="text-zinc-600">──►</div>
                  <div className="p-3.5 rounded-xl border border-blue-500/20 bg-blue-500/5 text-blue-400 w-full md:w-auto">Agora RTC Channels</div>
                  <div className="text-zinc-600">──►</div>
                  <div className="p-3.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 w-full md:w-auto">FastAPI & OpenAI</div>
                  <div className="text-zinc-600">──►</div>
                  <div className="p-3.5 rounded-xl border border-pink-500/20 bg-pink-500/5 text-pink-400 w-full md:w-auto">Couchbase DB</div>
                  <div className="text-zinc-600">──►</div>
                  <div className="p-3.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 w-full md:w-auto">Faye Dynamic UI</div>
                </div>
              </div>
            </div>
          )}

          {/* ==================== TAB 7: DB EXPLORER ==================== */}
          {activeTab === "db" && (
            <div className="flex flex-col lg:flex-row gap-6 max-w-5xl items-start h-[calc(100vh-190px)]">
              {/* Document Lists */}
              <div className="w-full lg:w-[250px] shrink-0 space-y-3">
                <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 uppercase block">Couchbase Collections</span>
                
                {[
                  { id: "logistics", name: "lead::ABC_Logistics", type: "Sales Lead", color: "border-cyan-500/30 text-cyan-400" },
                  { id: "buyer", name: "cart::Juan_Dela_Cruz", type: "Commerce Order", color: "border-purple-500/30 text-purple-400" }
                ].map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => setActiveJsonDoc(doc.id as any)}
                    className={`w-full p-4 rounded-2xl border text-left transition-all ${
                      activeJsonDoc === doc.id 
                        ? "border-pink-500 bg-pink-950/15" 
                        : "border-white/[0.05] bg-zinc-900/30 hover:bg-zinc-900/50"
                    }`}
                  >
                    <span className="text-xs font-bold text-white block">{doc.name}</span>
                    <span className="text-[9px] font-mono text-zinc-400 mt-1 block uppercase tracking-wider">{doc.type}</span>
                  </button>
                ))}
              </div>

              {/* JSON preview */}
              <div className="flex-1 w-full h-full rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl flex flex-col overflow-hidden">
                <div className="bg-zinc-950/80 px-5 py-3 border-b border-white/[0.05] flex items-center justify-between shrink-0">
                  <span className="text-[9px] font-mono font-bold tracking-widest text-zinc-500 uppercase">JSON Document Viewer</span>
                  <span className="text-[9px] text-pink-400 font-bold uppercase tracking-wider bg-pink-500/10 px-2 py-0.5 rounded border border-pink-500/20">Capella Realtime</span>
                </div>

                <div className="flex-1 p-5 overflow-y-auto font-mono text-xs text-zinc-300 leading-relaxed text-left bg-zinc-950/20 select-all">
                  <pre className="whitespace-pre-wrap">{activeJsonDoc === "logistics" ? logisticsJson : buyerJson}</pre>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

    </div>
  );
}
