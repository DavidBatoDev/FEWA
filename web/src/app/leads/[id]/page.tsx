"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { 
  Building, 
  TrendingUp, 
  ArrowLeft, 
  Mail, 
  Phone, 
  Calendar, 
  AlertTriangle, 
  Sparkles, 
  MessageSquare, 
  CheckCircle2,
  FileText,
  User,
  Clipboard,
  Check,
  Activity
} from "lucide-react";

const MOCK_PROFILES: Record<string, any> = {
  "lead-1": {
    id: "lead-1",
    name: "Alex Sy",
    company: "ABC Logistics",
    industry: "Logistics & Fleet",
    pain_point: "Losing inquiries due to poor tracking, manual follow-ups",
    timeline: "This month",
    budget_readiness: "Open to proposal",
    decision_maker: "Yes, Owner",
    buying_intent: "High",
    email: "alex.sy@abclogistics.ph",
    phone: "0917-889-1122",
    lead_score: 90,
    lead_temperature: "Hot",
    recommended_offer: "Sales Automation Package",
    next_best_action: "Confirm Wednesday 2pm slot via Calendar Invite",
    objections: ["Pricing concerns / ROI proof"],
    created_at: "2026-05-27T10:00:00Z",
    transcript: [
      { id: "t1", speaker: "user", text: "Hello? Is this FFlow.ph?" },
      { id: "t2", speaker: "assistant", text: "Hello! Yes, welcome to FFlow.ph. I am your AI agent. How can I help your business today?" },
      { id: "t3", speaker: "user", text: "Yeah, I run ABC Logistics. We've been having problems keeping track of inbound inquiries and manual follow-ups are taking too long." },
      { id: "t4", speaker: "assistant", text: "I see. Slow callback response times are challenging for fleet logistics. How soon are you looking to fix this lead tracking problem?" },
      { id: "t5", speaker: "user", text: "This month. Peak season is starting soon so it is quite urgent." },
      { id: "t6", speaker: "assistant", text: "Understood. That's immediate. Are you the sole decision maker for implementing this workflow?" },
      { id: "t7", speaker: "user", text: "Yes, I'm the owner. I approve the budget. Speaking of budget, what are your rates? It might be too expensive." },
      { id: "t8", speaker: "assistant", text: "Understandable pricing concern. Our packages start at basic tiers, but let's confirm the ROI first by calculating the leads you lose. Can we book a 20-minute slot to check the demo?" },
      { id: "t9", speaker: "user", text: "Sure, Wednesday 2pm works for me. Please send the invite." }
    ]
  },
  "lead-2": {
    id: "lead-2",
    name: "Maria Cruz",
    company: "TechSolutions Agency",
    industry: "Professional Services",
    pain_point: "Slow follow-up times after business hours",
    timeline: "Within 3 months",
    budget_readiness: "Flexible",
    decision_maker: "No, Needs VP approval",
    buying_intent: "Medium",
    email: "mcruz@techsolutions.com",
    phone: "0918-223-4455",
    lead_score: 75,
    lead_temperature: "Warm",
    recommended_offer: "Growth Campaign Package",
    next_best_action: "Send basic CRM capabilities deck",
    objections: ["Wants client reference proof"],
    created_at: "2026-05-27T08:30:00Z",
    transcript: [
      { id: "t1", speaker: "user", text: "Hi, I'm calling to ask if your voice agents can qualify leads after 6 PM." },
      { id: "t2", speaker: "assistant", text: "Hello! Yes, absolutely. FFlow.ph agents deploy 24/7 to catch and qualify out-of-office leads. What industry is your company in?" },
      { id: "t3", speaker: "user", text: "We are TechSolutions Agency, a marketing agency. We lose about 10 leads a day after hours." },
      { id: "t4", speaker: "assistant", text: "Catching those leads is crucial. What is your ideal project launch timeline?" },
      { id: "t5", speaker: "user", text: "Within 3 months. We need to present this to our VP first. Do you have any client testimonials?" }
    ]
  },
  "lead-3": {
    id: "lead-3",
    name: "Juan Perez",
    company: "Manila Realty Inc",
    industry: "Real Estate",
    pain_point: "Needs to qualify property buyers before site visits",
    timeline: "Immediate",
    budget_readiness: "Ready to invest",
    decision_maker: "Yes, VP Sales",
    buying_intent: "High",
    email: "jperez@manilarealty.ph",
    phone: "0920-555-6677",
    lead_score: 95,
    lead_temperature: "Hot",
    recommended_offer: "Enterprise Workflow Package",
    next_best_action: "Draft Custom Integrations Plan",
    objections: [],
    created_at: "2026-05-26T15:45:00Z",
    transcript: [
      { id: "t1", speaker: "user", text: "Hello, we need a qualification agent to check real estate client budgets before booking property trippings." },
      { id: "t2", speaker: "assistant", text: "Hello! FFlow.ph is perfect for pre-qualifying real estate leads. I can collect budget, location preference, and purchase timeline. Are you looking to launch this immediately?" },
      { id: "t3", speaker: "user", text: "Yes, immediately. I am the VP of Sales and I want this launched by next week." }
    ]
  },
  "lead-4": {
    id: "lead-4",
    name: "Sarah Santos",
    company: "Vibe Marketing",
    industry: "Advertising & Media",
    lead_score: 45,
    lead_temperature: "Cold",
    pain_point: "Looking to handle initial client inquiries on Facebook",
    timeline: "No rush",
    budget_readiness: "Low / Testing",
    decision_maker: "Yes, Founder",
    buying_intent: "Low",
    email: "santos@vibemarketing.com",
    phone: "0906-888-2323",
    created_at: "2026-05-25T11:20:00Z",
    transcript: [
      { id: "t1", speaker: "user", text: "Hi, I just want to know if this works for Facebook Page chat." },
      { id: "t2", speaker: "assistant", text: "Hello! We support voice and custom chat MCP extensions. What is your budget range for testing this out?" },
      { id: "t3", speaker: "user", text: "Honestly, we don't have a budget yet, we are just checking options." }
    ]
  }
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const leadId = typeof params?.id === "string" ? params.id : "";
  
  const [lead, setLead] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!leadId) return;

    async function loadLeadDetail() {
      try {
        const res = await api.get(`/leads/${leadId}`);
        if (res.data) {
          const l = res.data;
          // Merge with fallback profiles for visual completeness
          const fallbackKey = l.name && Object.keys(MOCK_PROFILES).find(k => MOCK_PROFILES[k].name === l.name) || "lead-1";
          const refProfile = MOCK_PROFILES[fallbackKey];

          setLead({
            ...refProfile,
            id: l.id,
            name: l.name || refProfile.name,
            company: l.company || refProfile.company,
            industry: l.industry || refProfile.industry,
            pain_point: l.pain_point || refProfile.pain_point,
            timeline: l.timeline || refProfile.timeline,
            budget_readiness: l.budget_readiness || refProfile.budget_readiness,
            decision_maker: l.decision_maker ? "Yes" : "No",
            lead_score: l.lead_score || refProfile.lead_score,
            lead_temperature: l.lead_temperature || refProfile.lead_temperature,
            recommended_offer: l.recommended_offer || refProfile.recommended_offer,
            next_best_action: l.next_best_action || refProfile.next_best_action,
            objections: l.objections || refProfile.objections,
            created_at: l.created_at || refProfile.created_at,
            transcript: l.conversation?.transcript || refProfile.transcript
          });
        }
      } catch (e) {
        console.warn("Backend /leads/{id} offline, using fallback mock profile.");
        if (MOCK_PROFILES[leadId]) {
          setLead(MOCK_PROFILES[leadId]);
        } else {
          setLead(MOCK_PROFILES["lead-1"]);
        }
      }
    }

    loadLeadDetail();
  }, [leadId]);

  const handleCopyEmail = (subject: string, body: string) => {
    const text = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!lead) {
    return (
      <div className="dark min-h-screen bg-zinc-950 text-white flex items-center justify-center font-sans">
        <div className="text-center space-y-3">
          <Activity className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs text-zinc-500 uppercase tracking-widest font-mono">Loading Lead Profile...</p>
        </div>
      </div>
    );
  }

  const emailSubject = `Follow-up proposal: FFlow.ph AI voice integration for ${lead.company}`;
  const emailBody = `Hi ${lead.name},\n\nThank you for speaking with FFlow.ph Conversational Agent today. We've documented your requirements regarding ${lead.company}.\n\nSpecifically, you mentioned facing challenges with: "${lead.pain_point}". Our Faye Visual Architect has recommended the "${lead.recommended_offer}" which directly automates inquiries and callback logs to address this.\n\nNext Step: ${lead.next_best_action}.\n\nBest regards,\nFFlow.ph Automation Team`;

  return (
    <div className="dark min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* Header navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-white/[0.05] bg-zinc-950/70 backdrop-blur-md">
        <div className="mx-auto max-w-7xl flex h-16 items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-black transition-transform duration-300 group-hover:scale-105">
              F
            </div>
            <span className="text-lg font-bold tracking-tight text-white group-hover:text-cyan-400 transition-colors">
              FFlow<span className="text-cyan-400">.ph</span>
            </span>
          </Link>

          <Link 
            href="/leads" 
            className="rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Directory
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12 space-y-10">
        
        {/* Lead Profile Hero Summary card */}
        <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/40 p-6 md:p-8 backdrop-blur-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-0.5 text-xs font-bold text-cyan-400 tracking-wide uppercase mb-3">
              <Building className="w-3.5 h-3.5" />
              Qualified B2B Lead Profile
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">{lead.name}</h1>
            <p className="text-sm text-zinc-400 mt-1">{lead.company} · {lead.industry}</p>
            <div className="flex gap-4 items-center text-xs text-zinc-550 mt-4">
              <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-zinc-500" /> {lead.email}</span>
              <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-zinc-500" /> {lead.phone}</span>
            </div>
          </div>

          {/* Radial score gauge */}
          <div className="flex items-center gap-4 bg-zinc-950/60 p-4 rounded-2xl border border-white/[0.04] min-w-[200px]">
            <div className="relative h-16 w-16 flex items-center justify-center rounded-full bg-zinc-900 border border-white/[0.08]">
              <span className="text-lg font-black text-cyan-400 font-mono">{lead.lead_score}</span>
              <span className="text-[7px] text-zinc-500 absolute bottom-1.5 font-mono uppercase">Score</span>
            </div>
            <div>
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block">Qualification Temp</span>
              <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-widest mt-1 ${
                lead.lead_temperature === "Hot"
                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                  : lead.lead_temperature === "Warm"
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
              }`}>
                {lead.lead_temperature} {lead.lead_temperature === "Hot" ? "🔴" : lead.lead_temperature === "Warm" ? "🟡" : "🔵"}
              </span>
            </div>
          </div>
        </div>

        {/* Details and Actions grid split */}
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 items-start">
          
          {/* Left Column: Qualifiers Profile & Transcript */}
          <div className="space-y-8">
            
            {/* Qualifiers list card */}
            <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                Qualification Criteria Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {[
                  { label: "Core Challenge / Pain Point", val: lead.pain_point },
                  { label: "Implementation Timeline", val: lead.timeline },
                  { label: "Decision Maker status", val: lead.decision_maker },
                  { label: "Budget Readiness", val: lead.budget_readiness },
                  { label: "Buying Intent", val: lead.buying_intent || "Not Specified" }
                ].map((item, idx) => (
                  <div key={idx} className="p-4 rounded-2xl bg-zinc-950/40 border border-white/[0.03] space-y-1 col-span-1 sm:col-span-2 last:col-span-2">
                    <span className="text-[10px] font-bold text-zinc-550 uppercase tracking-wider block">{item.label}</span>
                    <span className="text-zinc-250 font-medium text-sm">{item.val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Conversation Transcript Speech bubbles */}
            <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-cyan-400" />
                Conversational voice Transcript
              </h3>

              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin">
                {lead.transcript && lead.transcript.length > 0 ? (
                  lead.transcript.map((msg: any) => {
                    const isAgent = msg.speaker === "assistant";
                    return (
                      <div 
                        key={msg.id}
                        className={`flex flex-col max-w-[80%] ${
                          isAgent ? "mr-auto items-start" : "ml-auto items-end"
                        }`}
                      >
                        <span className="text-[9px] text-zinc-500 font-mono uppercase mb-1">
                          {isAgent ? "Faye Agent" : "Lead Customer"}
                        </span>
                        <div 
                          className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                            isAgent
                              ? "bg-zinc-800/60 text-zinc-300 rounded-tl-none border border-white/[0.04]"
                              : "bg-cyan-500/10 text-white rounded-tr-none border border-cyan-500/20"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-xs text-zinc-500 italic py-10 text-center">No conversation turns recorded for this lead.</div>
                )}
              </div>
            </div>

          </div>

          {/* Right Column: Recommended Offer, Objections & Follow-up Draft */}
          <div className="space-y-8">
            
            {/* Offer Recommendation card */}
            <div className="p-6 rounded-3xl border border-cyan-500/30 bg-cyan-950/10 backdrop-blur-xl space-y-3">
              <span className="text-[9px] uppercase font-black tracking-widest text-cyan-400">Campaign Recommendation</span>
              <h4 className="font-black text-lg text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400 animate-pulse" />
                {lead.recommended_offer}
              </h4>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Faye mapped operations directly to this package based on budget limits and the requirement to resolve inbound callback delays.
              </p>
              <div className="pt-2">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Next Best Action:</span>
                <span className="text-xs font-semibold text-zinc-200">{lead.next_best_action}</span>
              </div>
            </div>

            {/* Objections logged */}
            <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl space-y-4">
              <h3 className="font-extrabold text-base text-white flex items-center gap-1.5">
                <AlertTriangle className="w-4.5 h-4.5 text-cyan-400" />
                Objections Playbook Handling
              </h3>

              <div className="space-y-3">
                {lead.objections && lead.objections.length > 0 ? (
                  lead.objections.map((ob: string, i: number) => (
                    <div key={i} className="p-3 rounded-2xl bg-zinc-950/40 border border-white/[0.04] text-[11px] text-zinc-400 leading-relaxed">
                      <span className="text-amber-400 font-semibold flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        Objection: {ob}
                      </span>
                      Playbook Response: Emphasize sub-second inquiry capturing and GCash checkout rate increase. Propose the ROI of lost calls vs our package price.
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-zinc-500 italic py-2">No active objections raised in the voice stream.</div>
                )}
              </div>
            </div>

            {/* Follow up Draft Composer box */}
            <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl overflow-hidden font-mono text-[11px]">
              <div className="bg-white/[0.02] border-b border-white/[0.05] px-5 py-3 flex items-center justify-between">
                <h4 className="font-black text-xs text-zinc-300 flex items-center gap-1.5 font-sans">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Proposed Follow-up Email
                </h4>
                <button 
                  onClick={() => handleCopyEmail(emailSubject, emailBody)}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline font-bold"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                  {copied ? "Copied!" : "Copy Code"}
                </button>
              </div>
              <div className="p-5 space-y-3.5 text-zinc-400 leading-relaxed max-h-[250px] overflow-y-auto">
                <div>
                  <span className="text-zinc-650 block uppercase text-[9px] font-bold tracking-widest mb-0.5">Subject Header:</span>
                  <span className="text-zinc-200 font-semibold">{emailSubject}</span>
                </div>
                <div className="border-t border-white/[0.04] pt-3 whitespace-pre-line text-zinc-300 leading-relaxed">
                  {emailBody}
                </div>
              </div>
            </div>

          </div>

        </div>

      </main>

    </div>
  );
}
