"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { CalendarDemo } from "@/components/CalendarDemo";
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
  LineChart
} from "lucide-react";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const salesLogs = [
    { tool: "extract_lead_info()", time: "00:08", detail: "Company: ABC Logistics" },
    { tool: "extract_lead_info()", time: "00:21", detail: "Pain: Lost inquiries" },
    { tool: "score_lead()", time: "00:34", detail: "Score: 90 — Hot 🔴" },
    { tool: "recommend_offer()", time: "00:41", detail: "Sales Automation" },
    { tool: "detect_objection()", time: "00:53", detail: "Pricing concern" },
    { tool: "book_discovery_call()", time: "01:10", detail: "Wed 2pm confirmed" },
    { tool: "generate_follow_up()", time: "01:45", detail: "Email draft ready" }
  ];

  const commerceLogs = [
    { tool: "extract_preferences()", time: "00:12", detail: "Use case: Programming" },
    { tool: "extract_preferences()", time: "00:25", detail: "Budget: ₱60,000" },
    { tool: "search_products()", time: "00:32", detail: "Lenovo ThinkPad E14" },
    { tool: "compare_items()", time: "00:48", detail: "ThinkPad vs ASUS" },
    { tool: "build_order()", time: "01:05", detail: "Juan dela Cruz, QC" },
    { tool: "verify_order()", time: "01:18", detail: "ThinkPad ₱58,999 ✓" },
    { tool: "checkout_prep()", time: "01:30", detail: "Ref: WPH-2026-00142" }
  ];

  return (
    <div className="dark min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
      {/* Floating frosted-glass header navbar */}
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
          
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400 font-medium">
            <a href="#agents" className="hover:text-white transition-colors">Agents</a>
            <a href="#comparison" className="hover:text-white transition-colors">Why FFlow.ph</a>
            <a href="#tech-stack" className="hover:text-white transition-colors">Tech Stack</a>
            <Link href="/dashboard" className="hover:text-white transition-colors flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-cyan-400" />
              Live Dashboard
            </Link>
            <Link href="/leads" className="hover:text-white transition-colors flex items-center gap-1.5">
              <FileText className="w-4 h-4 text-purple-400" />
              Record Detail
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link 
              href="/campaign" 
              className="rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] px-4 py-2 text-xs font-semibold text-white transition-all flex items-center gap-1.5"
            >
              <Settings className="w-3.5 h-3.5" />
              Configure Settings
            </Link>
          </div>
        </div>
      </header>

      {/* Hero section */}
      <section className="relative overflow-hidden pt-20 pb-24 border-b border-white/[0.03]">
        {/* Glow rings and background animation mount */}
        <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none opacity-40">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-gradient-to-tr from-cyan-500/10 via-purple-500/5 to-transparent blur-3xl" />
          <div className="absolute w-[1200px] h-[1200px] border border-white/[0.02] rounded-full animate-[spin_120s_linear_infinite]" />
          <div className="absolute w-[800px] h-[800px] border border-dashed border-white/[0.02] rounded-full animate-[spin_80s_linear_infinite_reverse]" />
        </div>

        <div className="mx-auto max-w-7xl px-6 flex flex-col lg:flex-row items-center gap-12">
          {/* Hero Left Content */}
          <div className="flex-1 text-center lg:text-left space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-4 py-1.5 text-xs font-bold text-cyan-400 tracking-wide uppercase">
              <Sparkles className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: "6s" }} />
              Powered by Agora Conversational AI
            </div>
            
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] text-white">
              Turn Voice Conversations Into{" "}
              <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent block mt-2">
                Business Outcomes
              </span>
            </h1>

            <p className="text-base sm:text-lg text-zinc-300 max-w-2xl leading-relaxed mx-auto lg:mx-0">
              The first vertical AI voice agent platform built specifically for Philippine businesses. 
              We extend Agora's Conversational AI infrastructure with FFlow.ph's custom workflow layer—pre-built sales qualification, lead scoring, and instant e-commerce checkouts.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <a 
                href="#agents"
                className="w-full sm:w-auto rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-8 py-4 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02]"
              >
                <span>Select Agent Type</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-2xl bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white font-semibold px-8 py-4 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <span>View Dashboard</span>
              </Link>
            </div>

            {/* Micro KPI Section */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/[0.05] max-w-lg mx-auto lg:mx-0">
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">90%</div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mt-1">Lead Qual. Rate</div>
              </div>
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">24/7</div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mt-1">B2C Checkout</div>
              </div>
              <div>
                <div className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">₱1.2M+</div>
                <div className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mt-1">Mock Revenue</div>
              </div>
            </div>
          </div>

          {/* Hero Right Visual: High-fidelity code console showing Couchbase JSON outputs */}
          <div className="flex-1 w-full max-w-[500px] rounded-3xl border border-white/[0.06] bg-zinc-950/80 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.5)] font-mono text-[11px] leading-relaxed text-zinc-400">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05] mb-4">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                <span className="text-[10px] font-semibold text-zinc-500 ml-2">couchbase::fflow_ph::leads</span>
              </div>
              <span className="text-[9px] text-cyan-400 font-bold uppercase tracking-wider bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">Active DB</span>
            </div>
            
            <div className="space-y-1 overflow-x-auto text-left text-zinc-300">
              <span className="text-purple-400">{"{"}</span>
              <div className="pl-4"><span className="text-cyan-400">"type"</span>: <span className="text-emerald-400">"lead"</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"campaign_id"</span>: <span className="text-emerald-400">"campaign::sme-sales"</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"company"</span>: <span className="text-emerald-400">"ABC Logistics"</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"industry"</span>: <span className="text-emerald-400">"Logistics"</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"pain_point"</span>: <span className="text-emerald-400">"Lost inquiries, poor tracking"</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"timeline"</span>: <span className="text-emerald-400">"This month"</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"decision_maker"</span>: <span className="text-amber-400">true</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"objections"</span>: <span className="text-purple-400">[</span><span className="text-emerald-400">"Pricing concern"</span><span className="text-purple-400">]</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"lead_score"</span>: <span className="text-amber-400">90</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"lead_temperature"</span>: <span className="text-red-400">"Hot"</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"recommended_offer"</span>: <span className="text-emerald-400">"Sales Automation Package"</span>,</div>
              <div className="pl-4"><span className="text-cyan-400">"status"</span>: <span className="text-emerald-400">"call_booked"</span></div>
              <span className="text-purple-400">{"}"}</span>
            </div>
            
            <div className="mt-4 p-3 rounded-2xl bg-zinc-900/40 border border-white/[0.04] text-[10px] text-zinc-500 leading-relaxed">
              <span className="font-bold text-zinc-400 block mb-0.5">Structured Database Outcome</span>
              This JSON document is updated in Couchbase Capella automatically as FFlow.ph agents qualify voice calls.
            </div>
          </div>
        </div>
      </section>

      {/* Agent Selector Section */}
      <section id="agents" className="mx-auto max-w-7xl px-6 py-24 scroll-mt-16">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-cyan-400">DEPLOYABLE MODULES</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Choose Your Business Agent</h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Select one of our specialized agent architectures. Both share the same high-performance Agora and FastAPI base but are armed with different tools.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <AgentCard
            type="sales"
            title="B2B Sales Agent"
            description="Perfect for logistics, professional services, agency campaigns, and consulting firms looking to capture, qualify, score, objection-handle, and schedule meetings."
            badges={["B2B Service", "Lead Qualification"]}
            targetIndustry="Logistics, Consulting, Agencies, SaaS"
            outcomes={[
              "Extract lead info field-by-field",
              "Compute real-time lead score (HOT/WARM/COLD)",
              "Identify objection types (Price, Urgent, Supplier)",
              "Auto-draft personalized follow-up emails",
              "Book discovery calls via live calendar slots"
            ]}
            deployUrl="/campaign?type=sales"
            simulatedLogs={salesLogs}
          />

          <AgentCard
            type="commerce"
            title="B2C Commerce Agent"
            description="Built for product stores, local retailers, electronics catalogs, and retail checkouts. Guides buyers from preferences to item comparison and secure references."
            badges={["B2C Product", "Conversational Checkout"]}
            targetIndustry="E-commerce, Retail, Food, Electronics"
            outcomes={[
              "Extract buyer preferences and criteria",
              "Live product catalogs searches",
              "Produce side-by-side product comparisons",
              "Verify cart and delivery addresses",
              "Prepare checkout details and GCash references"
            ]}
            deployUrl="/campaign?type=commerce"
            simulatedLogs={commerceLogs}
          />
        </div>
      </section>

      {/* Interactive Calendar Demo Section */}
      <section id="demo-booking" className="mx-auto max-w-7xl px-6 py-24 border-t border-white/[0.03]">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-cyan-400">INTERACTIVE PREVIEW</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Experience the Agent Pipeline</h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Book a test demo slot using the calendar widget below. Watch how the B2B agent fires tools and generates follow-ups dynamically.
          </p>
        </div>
        <CalendarDemo />
      </section>

      {/* Why FFlow.ph / Comparison Section */}
      <section id="comparison" className="mx-auto max-w-7xl px-6 py-24 border-t border-white/[0.03] scroll-mt-16">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-2 space-y-6">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/5 px-3 py-1 text-xs font-semibold text-purple-400">
              <Cpu className="w-3.5 h-3.5" />
              Strategic Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
              Agora Powers the Voice.<br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                FFlow.ph Powers the Outcome.
              </span>
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed">
              Agora Conversational AI Studio is an exceptional builder for voice developers. But Philippine SMEs don't need raw infrastructure—they need outcomes. We've built the business outcome intelligence layer directly on top.
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 h-9 w-9 shrink-0 flex items-center justify-center border border-cyan-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Zero Developer Coding Required</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Pick your business template, configure parameters, and launch instantly.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 h-9 w-9 shrink-0 flex items-center justify-center border border-purple-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Philippine Context Preloaded</h4>
                  <p className="text-xs text-zinc-500 mt-0.5">Understands Taglish conversation, local pricing structures, and GCash checkouts.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="lg:col-span-3 rounded-3xl border border-white/[0.05] bg-zinc-900/40 p-6 backdrop-blur-lg overflow-hidden">
            <h3 className="text-lg font-bold text-white mb-4">Core Platform Differences</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] text-zinc-500">
                    <th className="pb-3 font-semibold">Requirement</th>
                    <th className="pb-3 font-semibold">Agora Studio Core</th>
                    <th className="pb-3 font-semibold text-cyan-400">FFlow.ph Extension</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03]">
                  <tr>
                    <td className="py-3 font-medium text-white">AI Capabilities</td>
                    <td className="py-3 text-zinc-400">Voice prompts, Knowledge bases</td>
                    <td className="py-3 text-emerald-400 font-semibold">Structured tool-calling pipeline</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-white">Lead Actionability</td>
                    <td className="py-3 text-zinc-400">Chat histories</td>
                    <td className="py-3 text-emerald-400 font-semibold">Real-time qualification scoring (HOT/WARM)</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-white">B2C Checkout</td>
                    <td className="py-3 text-zinc-400">Manual MCP APIs</td>
                    <td className="py-3 text-emerald-400 font-semibold">Dynamic preference matching + GCash ready</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-white">Analytics</td>
                    <td className="py-3 text-zinc-400">Call durations, tokens</td>
                    <td className="py-3 text-emerald-400 font-semibold">CRM Dashboard, objections, revenue tracked</td>
                  </tr>
                  <tr>
                    <td className="py-3 font-medium text-white">Closing Step</td>
                    <td className="py-3 text-zinc-400">Handoff or disconnect</td>
                    <td className="py-3 text-emerald-400 font-semibold">Calendar invites + personalized follow-up drafts</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 p-3.5 rounded-2xl bg-zinc-950 border border-white/[0.04] text-[11px] text-zinc-400 flex items-center gap-3">
              <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Agora Studio powers the voice infrastructure; FFlow.ph captures the business revenue.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Tech Stack Grid Section */}
      <section id="tech-stack" className="mx-auto max-w-7xl px-6 py-24 border-t border-white/[0.03] scroll-mt-16 bg-gradient-to-b from-transparent to-zinc-950">
        <div className="text-center space-y-4 mb-16">
          <span className="text-xs font-bold tracking-widest uppercase text-cyan-400">LOCKED-IN PLATFORM STACK</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white">Modern Developer Infrastructure</h2>
          <p className="text-sm text-zinc-400 max-w-md mx-auto">
            High performance framework selections built for sub-second latency voice interactions.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-2">
            <Cpu className="w-8 h-8 text-cyan-400" />
            <div className="font-bold text-sm text-white">Next.js 16</div>
            <div className="text-[10px] text-zinc-500">React Frontend Layout</div>
          </div>
          <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-2">
            <MessageSquare className="w-8 h-8 text-blue-400" />
            <div className="font-bold text-sm text-white">Agora SDK</div>
            <div className="text-[10px] text-zinc-500">Sub-second RTC Voice</div>
          </div>
          <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-2">
            <Sparkles className="w-8 h-8 text-purple-400" />
            <div className="font-bold text-sm text-white">OpenAI GPT</div>
            <div className="text-[10px] text-zinc-500">Structured Tool-Calling</div>
          </div>
          <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-2">
            <Database className="w-8 h-8 text-pink-400" />
            <div className="font-bold text-sm text-white">Couchbase</div>
            <div className="text-[10px] text-zinc-500">Capella Real-time DB</div>
          </div>
          <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-2">
            <Layers className="w-8 h-8 text-emerald-400" />
            <div className="font-bold text-sm text-white">FastAPI</div>
            <div className="text-[10px] text-zinc-500">Python Business Logic</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.05] bg-zinc-950 py-12 text-zinc-500">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="relative flex h-6 w-6 items-center justify-center rounded bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-black text-xs">
              F
            </div>
            <span className="text-sm font-semibold tracking-tight text-white">
              FFlow.ph
            </span>
          </div>

          <div className="text-xs font-mono text-zinc-600">
            © 2026 FFLOW.PH. ALL RIGHTS RESERVED. POWERED BY AGORA.
          </div>

          <div className="flex gap-4 text-xs">
            <Link href="/dashboard" className="hover:text-zinc-300 transition-colors">Dashboard</Link>
            <Link href="/campaign" className="hover:text-zinc-300 transition-colors">Campaigns</Link>
            <Link href="/leads" className="hover:text-zinc-300 transition-colors">Leads</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
