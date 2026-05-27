"use client";

import Link from "next/link";
import { 
  BarChart3, 
  CheckCircle2, 
  XCircle, 
  Zap, 
  ShieldCheck, 
  Activity, 
  ArrowLeft,
  Building,
  ShoppingBag,
  TrendingUp,
  Clock,
  Target,
  Users
} from "lucide-react";

export default function ComparisonPage() {
  return (
    <div className="min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
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

      <main className="mx-auto max-w-6xl px-6 py-16 space-y-20">
        {/* Title Section */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/20 bg-purple-500/5 px-3.5 py-1 text-xs font-bold text-purple-400 tracking-wide uppercase">
            <Activity className="w-3 h-3" />
            Comparative Analysis
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            Architecture Comparison & Metrics
          </h1>
          <p className="text-sm text-zinc-400 max-w-2xl mx-auto">
            A deep dive into the performance, capabilities, and business outcomes of our specialized AI agent frameworks.
          </p>
        </div>

        {/* High-Level Comparison Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* B2B Sales Agent */}
          <div className="rounded-[32px] border border-cyan-500/20 bg-cyan-500/5 p-8 space-y-6 relative overflow-hidden group hover:border-cyan-500/40 transition-all">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-cyan-500/10 blur-3xl rounded-full" />
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-cyan-500 text-zinc-950">
                <Building className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white italic">B2B Sales Agent</h2>
                <p className="text-xs text-cyan-400 font-bold uppercase tracking-widest">Outbound/Inbound Qualification</p>
              </div>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Designed for high-value service businesses. Focuses on extracting structured lead data, scoring prospects based on purposive communication, and securing calendar demo slots.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
                <div className="text-2xl font-black text-cyan-400">92%</div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase">Accuracy Rate</div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
                <div className="text-2xl font-black text-cyan-400">4.5x</div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase">Efficiency Lift</div>
              </div>
            </div>
          </div>

          {/* B2C Commerce Agent */}
          <div className="rounded-[32px] border border-purple-500/20 bg-purple-500/5 p-8 space-y-6 relative overflow-hidden group hover:border-purple-500/40 transition-all">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-purple-500/10 blur-3xl rounded-full" />
            <div className="flex items-center gap-4">
              <div className="p-4 rounded-2xl bg-purple-500 text-white">
                <ShoppingBag className="w-8 h-8" />
              </div>
              <div>
                <h2 className="text-2xl font-black text-white italic">B2C Commerce Agent</h2>
                <p className="text-xs text-purple-400 font-bold uppercase tracking-widest">Voice-Enabled Checkout</p>
              </div>
            </div>
            <p className="text-sm text-zinc-300 leading-relaxed">
              Optimized for retail and product stores. Focuses on preference matching, product comparison, address verification, and generating secure GCash payment references.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-4">
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
                <div className="text-2xl font-black text-purple-400">88%</div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase">Conversion Rate</div>
              </div>
              <div className="p-4 rounded-2xl bg-zinc-900/60 border border-white/5">
                <div className="text-2xl font-black text-purple-400">1.2s</div>
                <div className="text-[10px] text-zinc-500 font-bold uppercase">Search Latency</div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Metrics Table */}
        <div className="space-y-8">
          <div className="text-center md:text-left">
            <h2 className="text-2xl font-bold text-white">Performance Metrics</h2>
            <p className="text-sm text-zinc-500 mt-1">Benchmarking the core capabilities across different business scenarios.</p>
          </div>
          <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/40 overflow-hidden backdrop-blur-xl">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/[0.05] bg-white/[0.02]">
                  <th className="p-6 font-bold text-zinc-400 uppercase tracking-widest text-[10px]">Metric</th>
                  <th className="p-6 font-bold text-cyan-400 uppercase tracking-widest text-[10px]">B2B Sales Agent</th>
                  <th className="p-6 font-bold text-purple-400 uppercase tracking-widest text-[10px]">B2C Commerce Agent</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.03]">
                {[
                  { metric: "Tool-Calling Accuracy", b2b: "94.5%", b2c: "91.2%", desc: "How accurately the AI fires the correct backend tool (e.g. score_lead vs search_product)." },
                  { metric: "Taglish Understanding", b2b: "High (Native)", b2c: "High (Native)", desc: "Performance in mixed Filipino-English colloquial business conversations." },
                  { metric: "Memory Persistence", b2b: "Session-long", b2c: "Cart-persistent", desc: "How the agent maintains state during long multi-step interactions." },
                  { metric: "Objection Handling", b2b: "Advanced (Rule-based)", b2c: "Standard (FAQ-based)", desc: "Capability to navigate pricing or technical pushback from the user." },
                  { metric: "Checkout Integration", b2b: "Calendar/Booking", b2c: "GCash/Reference", desc: "The final 'closing' tool used to complete the business objective." },
                  { metric: "Average Call Time", b2b: "3.5 - 5.0 mins", b2c: "1.5 - 2.5 mins", desc: "Typical duration required to reach a successful business outcome." }
                ].map((row, idx) => (
                  <tr key={idx} className="hover:bg-white/[0.01] transition-colors group">
                    <td className="p-6">
                      <div className="font-bold text-white">{row.metric}</div>
                      <div className="text-[10px] text-zinc-600 mt-1 group-hover:text-zinc-500 transition-colors">{row.desc}</div>
                    </td>
                    <td className="p-6 font-mono font-bold text-cyan-400/80">{row.b2b}</td>
                    <td className="p-6 font-mono font-bold text-purple-400/80">{row.b2c}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Use Case Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl font-bold text-white">Ideal Use Cases</h2>
            <p className="text-sm text-zinc-500 leading-relaxed">
              Choosing the right agent depends on your core revenue model. B2B focuses on relationships; B2C focuses on transactions.
            </p>
            <div className="p-6 rounded-2xl bg-zinc-900 border border-white/[0.05] space-y-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="text-xs font-bold text-white">Production Ready v1.2</span>
              </div>
              <div className="flex items-center gap-3">
                <Zap className="w-5 h-5 text-yellow-400" />
                <span className="text-xs font-bold text-white">Zero-Latency Sync</span>
              </div>
            </div>
          </div>
          
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-cyan-500/10 space-y-4">
              <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Growth Scenarios (B2B)
              </h3>
              <ul className="space-y-3 text-xs text-zinc-400 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                  Fleet Management & Logistics Sales
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                  Software Development Agency Leads
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                  Professional Real Estate Consultations
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-500" />
                  B2B Wholesale Inquiry Handling
                </li>
              </ul>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900/60 border border-purple-500/10 space-y-4">
              <h3 className="text-sm font-black text-purple-400 uppercase tracking-widest flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Growth Scenarios (B2C)
              </h3>
              <ul className="space-y-3 text-xs text-zinc-400 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                  Electronics & Tech Retail Stores
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                  Fashion & Apparel Catalog Search
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                  Food Delivery & Quick Service Orders
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-purple-500" />
                  Personal Service Booking & Payments
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Feature Checkmarks */}
        <div className="rounded-[40px] bg-gradient-to-br from-zinc-900 to-zinc-950 border border-white/[0.05] p-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 blur-3xl rounded-full" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-cyan-400" />
              </div>
              <h4 className="font-bold text-white">Instant Deployment</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">Built for speed. Deploy either model in under 5 minutes with our pre-configured business directives.</p>
            </div>
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                <Target className="w-6 h-6 text-purple-400" />
              </div>
              <h4 className="font-bold text-white">Targeted Outcomes</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">Faye is focused on closing. Whether it&apos;s a calendar demo or a GCash checkout, the objective is always clear.</p>
            </div>
            <div className="space-y-4 text-center">
              <div className="mx-auto w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-400" />
              </div>
              <h4 className="font-bold text-white">User Centric</h4>
              <p className="text-xs text-zinc-500 leading-relaxed">Understanding mixed-language contexts (Taglish) ensures that your customers feel heard and understood locally.</p>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-white/[0.05] bg-zinc-950 py-12 text-zinc-500 text-xs">
        <div className="mx-auto max-w-7xl px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="relative flex h-6 w-6 items-center justify-center rounded bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-black text-xs">
              F
            </div>
            <span className="text-sm font-semibold tracking-tight text-white font-mono">
              FFlow.ph
            </span>
          </div>
          <div className="font-mono text-zinc-650 uppercase tracking-widest text-[9px] text-center">
            © 2026 FFLOW.PH. ALL RIGHTS RESERVED.
          </div>
          <div className="flex gap-4">
            <Link href="/" className="hover:text-zinc-350 transition-colors">Home</Link>
            <Link href="/dashboard" className="hover:text-zinc-350 transition-colors">Dashboard</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
