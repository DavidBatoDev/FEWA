import Link from "next/link";
import { Briefcase, ShoppingBag, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen bg-[hsl(0,0%,4.9%)] text-white">
      <div className="max-w-6xl mx-auto px-6 py-16">
        <header className="mb-12 text-center">
          <p className="text-cyan-400 text-xs uppercase tracking-widest mb-3">Workflow PH · Powered by Agora</p>
          <h1 className="text-4xl md:text-5xl font-semibold tracking-tight mb-3">
            Deploy an AI Agent for Your Business
          </h1>
          <p className="text-white/60 max-w-2xl mx-auto leading-relaxed">
            Pick the agent that fits your business. Both run on the same voice infrastructure —
            only the workflow, tools, and dashboard are different.
          </p>
        </header>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Sales Agent — B2B */}
          <Link
            href="/agent"
            className="group rounded-2xl border border-white/10 bg-white/5 p-7 hover:bg-white/[0.08] hover:border-cyan-500/40 transition-all"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="rounded-xl bg-cyan-500/15 border border-cyan-500/30 p-3">
                <Briefcase size={26} className="text-cyan-300" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-cyan-300/80 font-semibold">B2B</span>
            </div>
            <h2 className="text-2xl font-semibold mb-1">Sales Agent</h2>
            <p className="text-cyan-300/70 text-sm mb-4">Faye — qualifies leads, books calls</p>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              For service businesses. Faye qualifies leads, scores opportunities, detects objections,
              recommends offers, and books discovery calls — all in real time.
            </p>
            <ul className="text-xs text-white/50 space-y-1.5 mb-6">
              <li>· Extract company, pain point, timeline, budget</li>
              <li>· Score Hot / Warm / Cold with breakdown</li>
              <li>· Recommend the right service package</li>
              <li>· Book the call before the conversation ends</li>
            </ul>
            <div className="inline-flex items-center gap-2 text-cyan-300 text-sm font-medium group-hover:gap-3 transition-all">
              Deploy Sales Agent <ArrowRight size={16} />
            </div>
          </Link>

          {/* Commerce Agent — B2C */}
          <Link
            href="/commerce"
            className="group rounded-2xl border border-white/10 bg-white/5 p-7 hover:bg-white/[0.08] hover:border-amber-500/40 transition-all"
          >
            <div className="flex items-start justify-between mb-5">
              <div className="rounded-xl bg-amber-500/15 border border-amber-500/30 p-3">
                <ShoppingBag size={26} className="text-amber-300" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-amber-300/80 font-semibold">B2C</span>
            </div>
            <h2 className="text-2xl font-semibold mb-1">Commerce Agent</h2>
            <p className="text-amber-300/70 text-sm mb-4">Maya — guides customers to checkout</p>
            <p className="text-white/60 text-sm leading-relaxed mb-5">
              For product businesses. Maya understands customer preferences, recommends shoes that fit,
              compares options, and walks the customer from "I'm browsing" to a confirmed order.
            </p>
            <ul className="text-xs text-white/50 space-y-1.5 mb-6">
              <li>· Capture use case, budget, brand preference</li>
              <li>· Search the catalog and show top 3 matches</li>
              <li>· Compare side-by-side when the customer is torn</li>
              <li>· Build order, verify, generate checkout reference</li>
            </ul>
            <div className="inline-flex items-center gap-2 text-amber-300 text-sm font-medium group-hover:gap-3 transition-all">
              Deploy Commerce Agent <ArrowRight size={16} />
            </div>
          </Link>
        </div>

        <footer className="mt-12 text-center text-white/30 text-xs">
          Agora powers the voice. Workflow PH powers the outcome.
        </footer>
      </div>
    </main>
  );
}
