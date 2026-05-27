"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Building, 
  TrendingUp, 
  ArrowLeft, 
  Search, 
  Mail, 
  Phone, 
  ChevronRight, 
  Calendar,
  Sparkles
} from "lucide-react";

const MOCK_LEADS = [
  {
    id: "lead-1",
    name: "Alex Sy",
    company: "ABC Logistics",
    industry: "Logistics & Fleet",
    lead_score: 90,
    lead_temperature: "Hot",
    pain_point: "Losing inquiries due to poor tracking, manual follow-ups",
    timeline: "This month",
    email: "alex.sy@abclogistics.ph",
    created_at: "2026-05-27T10:00:00Z"
  },
  {
    id: "lead-2",
    name: "Maria Cruz",
    company: "TechSolutions Agency",
    industry: "Professional Services",
    lead_score: 75,
    lead_temperature: "Warm",
    pain_point: "Slow follow-up times after business hours",
    timeline: "Within 3 months",
    email: "mcruz@techsolutions.com",
    created_at: "2026-05-27T08:30:00Z"
  },
  {
    id: "lead-3",
    name: "Juan Perez",
    company: "Manila Realty Inc",
    industry: "Real Estate",
    lead_score: 95,
    lead_temperature: "Hot",
    pain_point: "Needs to qualify property buyers before site visits",
    timeline: "Immediate",
    email: "jperez@manilarealty.ph",
    created_at: "2026-05-26T15:45:00Z"
  },
  {
    id: "lead-4",
    name: "Sarah Santos",
    company: "Vibe Marketing",
    industry: "Advertising & Media",
    lead_score: 45,
    lead_temperature: "Cold",
    pain_point: "Looking to handle initial client inquiries on Facebook",
    timeline: "No rush",
    email: "santos@vibemarketing.com",
    created_at: "2026-05-25T11:20:00Z"
  }
];

export default function LeadsPage() {
  const [leadsList, setLeadsList] = useState<any[]>(MOCK_LEADS);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function loadLeads() {
      try {
        const res = await api.get("/leads");
        if (res.data && res.data.leads && res.data.leads.length > 0) {
          const formatted = res.data.leads.map((l: any, idx: number) => ({
            ...MOCK_LEADS[idx % MOCK_LEADS.length],
            id: l.id,
            name: l.name || `Lead #${idx + 1}`,
            company: l.company || "Not Provided",
            industry: l.industry || "Not Provided",
            lead_score: l.lead_score || 50,
            lead_temperature: l.lead_temperature || "Cold",
            pain_point: l.pain_point || "Inquiry automation",
            timeline: l.timeline || "TBD",
            email: l.email || "no-email@test.com",
            created_at: l.created_at || new Date().toISOString()
          }));
          setLeadsList(formatted);
        }
      } catch (e) {
        console.warn("Backend /leads offline, using fallback mock leads.");
      }
    }
    loadLeads();
  }, []);

  const filteredLeads = leadsList.filter(l => 
    l.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.industry.toLowerCase().includes(searchTerm.toLowerCase()) ||
    l.pain_point.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="dark min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-zinc-950/70 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-black transition-transform duration-300 group-hover:scale-105">
              F
              <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
            </div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              FFlow<span className="text-cyan-400">.ph</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link 
              href="/dashboard" 
              className="rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              CRM Dashboard
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-12 space-y-8">
        
        {/* Title and search bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/[0.05]">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Leads Directory</h1>
            <p className="text-sm text-zinc-400 mt-1">Review all qualified lead profiles processed by Faye AI Conversational Agent.</p>
          </div>

          <div className="relative w-full sm:w-[280px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-550" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search leads, companies..."
              className="w-full rounded-xl border border-white/[0.08] bg-zinc-950/60 pl-9 pr-4 py-2.5 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
            />
          </div>
        </div>

        {/* Lead cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filteredLeads.length === 0 ? (
            <div className="col-span-2 text-center py-20 text-zinc-500 italic">
              No matching lead records found in database scope.
            </div>
          ) : (
            filteredLeads.map((lead) => (
              <Link 
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="group p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/40 hover:bg-zinc-900/60 hover:border-cyan-500/30 transition-all duration-300 shadow-xl shadow-black/10 flex flex-col justify-between gap-6"
              >
                <div className="space-y-4">
                  
                  {/* Card Header */}
                  <div className="flex justify-between items-start gap-4">
                    <div>
                      <h3 className="font-extrabold text-lg text-white group-hover:text-cyan-400 transition-colors">{lead.name}</h3>
                      <p className="text-xs text-zinc-400 mt-0.5">{lead.company} · {lead.industry}</p>
                    </div>

                    {/* Temp & Score Badge */}
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                        lead.lead_temperature === "Hot"
                          ? "bg-red-500/10 text-red-400 border border-red-500/20"
                          : lead.lead_temperature === "Warm"
                          ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}>
                        {lead.lead_temperature}
                      </span>
                      <span className="font-mono text-xs font-black text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                        {lead.lead_score} pts
                      </span>
                    </div>
                  </div>

                  {/* Pain point excerpt */}
                  <div className="p-3.5 rounded-2xl bg-zinc-950/40 border border-white/[0.03] text-xs text-zinc-300 leading-relaxed">
                    <span className="font-bold text-[10px] uppercase text-zinc-500 tracking-wider block mb-0.5">Core Challenge</span>
                    {lead.pain_point}
                  </div>

                </div>

                {/* Footer info link */}
                <div className="flex items-center justify-between pt-4 border-t border-white/[0.04] text-[11px] text-zinc-500">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {lead.email}</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" /> {lead.timeline}</span>
                  </div>

                  <span className="text-cyan-400 font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                    View Record
                    <ChevronRight className="w-3.5 h-3.5" />
                  </span>
                </div>

              </Link>
            ))
          )}
        </div>

      </main>

    </div>
  );
}
