"use client";

import { useEffect, useState, useRef } from "react";
import { 
  Sparkles, 
  Activity, 
  Building, 
  ShoppingBag, 
  Calendar, 
  DollarSign, 
  User, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  AlertTriangle, 
  TrendingUp, 
  Package, 
  ChevronRight, 
  CreditCard,
  Check,
  Percent,
  Layers,
  PhoneCall
} from "lucide-react";

interface FayeDashboardProps {
  type: "sales" | "commerce";
  transcript: Array<{ id: string; speaker: string; text: string }>;
  backendLeadProfile?: any;
  backendObjections?: string[];
  backendBuyingSignals?: string[];
  backendLeadScore?: number;
  backendLeadTemperature?: string;
  backendRecommendedOffer?: string;
  backendNextBestAction?: string;
  simulationActive?: boolean;
  simulationStep?: number;
}

export function FayeDashboard({
  type,
  transcript,
  backendLeadProfile,
  backendObjections,
  backendBuyingSignals,
  backendLeadScore,
  backendLeadTemperature,
  backendRecommendedOffer,
  backendNextBestAction,
  simulationActive = false,
  simulationStep = 0,
}: FayeDashboardProps) {
  const isSales = type === "sales";
  
  // State for Faye's active HUD
  const [fayeFocus, setFayeFocus] = useState<string>("none");
  const [fayeStatus, setFayeStatus] = useState("Standing by. Launch session to start visual framing.");
  const [fayeActionLogs, setFayeActionLogs] = useState<string[]>([
    "Initialized Faye Visual Architect engine.",
    "Shot list loaded: Ready to organize components."
  ]);

  // Lead score state (synthesized from backend + client simulation)
  const [leadScore, setLeadScore] = useState(0);
  const [leadTemp, setLeadTemp] = useState<"Cold" | "Warm" | "Hot">("Cold");
  const [leadProfile, setLeadProfile] = useState({
    name: "",
    company: "",
    industry: "",
    pain_point: "",
    timeline: "",
    decision_maker: "",
    budget_readiness: "",
    buying_intent: "",
  });
  const [objections, setObjections] = useState<string[]>([]);
  const [recommendedOffer, setRecommendedOffer] = useState("");
  const [nextBestAction, setNextBestAction] = useState("");

  // B2C Commerce State
  const [cartItems, setCartItems] = useState<Array<{ name: string; price: number; qty: number }>>([]);
  const [buyerPrefs, setBuyerPrefs] = useState({
    useCase: "",
    budget: "",
    brand: "",
  });
  const [shippingInfo, setShippingInfo] = useState({
    name: "",
    address: "",
    phone: "",
  });
  const [checkoutStatus, setCheckoutStatus] = useState<"preferences" | "match" | "verification" | "gcash" | "paid">("preferences");
  const [gcashRef, setGcashRef] = useState("");

  const addFayeLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setFayeActionLogs(prev => [`[${timestamp}] ${message}`, ...prev.slice(0, 15)]);
  };

  // Sync with backend lead profile if available
  useEffect(() => {
    if (isSales && backendLeadProfile) {
      setLeadProfile({
        name: backendLeadProfile.name || leadProfile.name,
        company: backendLeadProfile.company || leadProfile.company,
        industry: backendLeadProfile.industry || leadProfile.industry,
        pain_point: backendLeadProfile.pain_point || leadProfile.pain_point,
        timeline: backendLeadProfile.timeline || leadProfile.timeline,
        decision_maker: backendLeadProfile.decision_maker || leadProfile.decision_maker,
        budget_readiness: backendLeadProfile.budget_readiness || leadProfile.budget_readiness,
        buying_intent: backendLeadProfile.buying_intent || leadProfile.buying_intent,
      });
      if (backendLeadScore !== undefined) {
        setLeadScore(backendLeadScore);
      }
      if (backendLeadTemperature) {
        setLeadTemp(backendLeadTemperature as any);
      }
      if (backendRecommendedOffer) {
        setRecommendedOffer(backendRecommendedOffer);
      }
      if (backendNextBestAction) {
        setNextBestAction(backendNextBestAction);
      }
      if (backendObjections) {
        setObjections(backendObjections);
      }
    }
  }, [backendLeadProfile, backendLeadScore, backendLeadTemperature, backendRecommendedOffer, backendNextBestAction, backendObjections, isSales]);

  // Client-side transcription parsing for instant interactive framing & mock filling
  useEffect(() => {
    if (transcript.length === 0) return;
    const lastTurn = transcript[transcript.length - 1];
    const text = lastTurn.text.toLowerCase();
    
    // Keyword based framing and value insertion for Sales
    if (isSales) {
      if (text.includes("hello") || text.includes("agent") || text.includes("start")) {
        setFayeFocus("none");
        setFayeStatus("Faye: Listening closely to customer introduction...");
      } else if (text.includes("company") || text.includes("corp") || text.includes("logistics") || text.includes("agency") || text.includes("from")) {
        setFayeFocus("profile");
        setFayeStatus("Faye: Framed Lead Profile. Extracting firmographics...");
        addFayeLog("Framing: Lead Profile details card");
        
        // Mock extraction if backend empty
        if (!backendLeadProfile) {
          const companyMatch = lastTurn.text.match(/(from|at)\s+([A-Za-z0-9\s]+(\bLogistics\b|\bCorp\b|\bAgency\b|\bCo\b))/i);
          const comp = companyMatch ? companyMatch[2] : "ABC Logistics";
          setLeadProfile(prev => ({
            ...prev,
            company: comp,
            industry: comp.toLowerCase().includes("logistics") ? "Logistics & Fleet" : "Professional Services"
          }));
          setLeadScore(prev => Math.min(prev + 20, 100));
          addFayeLog(`Extracted firmographic: ${comp}`);
        }
      } else if (text.includes("pain") || text.includes("challenge") || text.includes("lost") || text.includes("delay") || text.includes("manual")) {
        setFayeFocus("profile");
        setFayeStatus("Faye: Updating Lead Profile. Detected operational challenges...");
        addFayeLog("Reframed: Focus on operational pain points");
        if (!backendLeadProfile) {
          setLeadProfile(prev => ({ ...prev, pain_point: "Lost inquiry tracking, manual follow-ups" }));
          setLeadScore(prev => Math.min(prev + 20, 100));
        }
      } else if (text.includes("price") || text.includes("cost") || text.includes("budget") || text.includes("expensive") || text.includes("rates")) {
        setFayeFocus("objections");
        setFayeStatus("Faye: Objection Detected! Highlighting objection handling playbook...");
        addFayeLog("Visual Alert: Highlighting Pricing Objection card");
        
        if (!objections.includes("Pricing concerns / ROI proof")) {
          setObjections(prev => [...prev, "Pricing concerns / ROI proof"]);
        }
        if (!backendLeadProfile) {
          setLeadProfile(prev => ({ ...prev, budget_readiness: "Open to proposal" }));
          setLeadScore(prev => Math.min(prev + 10, 100));
        }
      } else if (text.includes("score") || text.includes("temperature") || text.includes("hot") || text.includes("warm") || text.includes("leads")) {
        setFayeFocus("score");
        setFayeStatus("Faye: Projecting Lead Score Meter. Completeness evaluated.");
        addFayeLog("Framing: Highlighting Lead Score Radial Dial");
      } else if (text.includes("book") || text.includes("schedule") || text.includes("calendar") || text.includes("meeting") || text.includes("wednesday") || text.includes("may")) {
        setFayeFocus("calendar");
        setFayeStatus("Faye: Interactive Calendar widget activated. Framing slot May 28.");
        addFayeLog("Orchestration: Framing Calendar Widget. Slot selected.");
        if (!backendLeadProfile) {
          setNextBestAction("Confirm May 28, 2PM Slot via Voice");
        }
      }
    } 
    
    // Keyword based framing and value insertion for Commerce (B2C)
    else {
      if (text.includes("lenovo") || text.includes("thinkpad") || text.includes("laptop")) {
        setFayeFocus("compare");
        setCheckoutStatus("match");
        setFayeStatus("Faye: Match found. Framing product comparison matrix...");
        addFayeLog("Visual Sync: Rendering comparison table (Lenovo vs ASUS)");
        setBuyerPrefs(prev => ({ ...prev, brand: "Lenovo", useCase: "Coding & Office Work" }));
        
        if (!cartItems.some(i => i.name.includes("ThinkPad"))) {
          setCartItems([{ name: "Lenovo ThinkPad E14 Gen 5", price: 58999, qty: 1 }]);
          addFayeLog("Cart update: Added Lenovo ThinkPad E14 (₱58,999)");
        }
      } else if (text.includes("asus") || text.includes("vivobook")) {
        setFayeFocus("compare");
        setFayeStatus("Faye: Framing product alternative details...");
        addFayeLog("Visual Sync: Highlighting ASUS VivoBook specifications");
        setBuyerPrefs(prev => ({ ...prev, brand: "ASUS" }));
      } else if (text.includes("budget") || text.includes("pesos") || text.includes("60k") || text.includes("60,000") || text.includes("50k")) {
        setFayeFocus("preferences");
        setFayeStatus("Faye: Matching budget criteria. Adjusting catalog filters...");
        addFayeLog("Highlight: Matched buyer budget preference (₱60,000 limit)");
        setBuyerPrefs(prev => ({ ...prev, budget: "₱60,000 max" }));
      } else if (text.includes("juan") || text.includes("dela cruz") || text.includes("deliver") || text.includes("quezon city") || text.includes("qc") || text.includes("address")) {
        setFayeFocus("cart");
        setCheckoutStatus("verification");
        setFayeStatus("Faye: Checking shipping details. Verifying names & addresses...");
        addFayeLog("Orchestration: Framing cart details for delivery verification");
        
        const name = text.includes("juan") ? "Juan dela Cruz" : shippingInfo.name || "Juan dela Cruz";
        const addr = (text.includes("quezon") || text.includes("qc")) ? "Quezon City, Metro Manila" : shippingInfo.address || "Quezon City, Metro Manila";
        setShippingInfo({
          name: name,
          address: addr,
          phone: "0917-889-1243"
        });
      } else if (text.includes("gcash") || text.includes("pay") || text.includes("checkout") || text.includes("confirm")) {
        setFayeFocus("gcash");
        setCheckoutStatus("gcash");
        setFayeStatus("Faye: Generating GCash invoice. Framing payment reference...");
        addFayeLog("Invoice: Rendered GCash checkout reference & QR Code");
        setGcashRef("WPH-2026-00142");
      }
    }
  }, [transcript, isSales, backendLeadProfile, objections]);

  // Adjust lead temperature relative to score
  useEffect(() => {
    if (!backendLeadProfile && isSales) {
      if (leadScore >= 70) {
        setLeadTemp("Hot");
      } else if (leadScore >= 40) {
        setLeadTemp("Warm");
      } else {
        setLeadTemp("Cold");
      }
    }
  }, [leadScore, isSales, backendLeadProfile]);

  // Handle simulation steps directly
  useEffect(() => {
    if (!simulationActive) return;
    
    if (isSales) {
      switch (simulationStep) {
        case 1:
          setFayeFocus("profile");
          setFayeStatus("Faye: Extracted company name ABC Logistics. Framing profile...");
          setLeadProfile(prev => ({ ...prev, company: "ABC Logistics", industry: "Logistics & Cargo" }));
          setLeadScore(20);
          addFayeLog("Faye: Synchronized Lead Profile (ABC Logistics)");
          break;
        case 2:
          setFayeFocus("profile");
          setFayeStatus("Faye: Extracted operational pain points. Focus: Profile...");
          setLeadProfile(prev => ({ ...prev, pain_point: "Lost inquiry tracking, manual callbacks" }));
          setLeadScore(40);
          addFayeLog("Faye: Identified core pain point (Lost inquiries)");
          break;
        case 3:
          setFayeFocus("score");
          setFayeStatus("Faye: Recalculating lead completeness. Framing lead score dial...");
          setLeadProfile(prev => ({ ...prev, decision_maker: "Yes (Managing Director)" }));
          setLeadScore(60);
          addFayeLog("Faye: Lead completeness updated. Decision maker verified.");
          break;
        case 4:
          setFayeFocus("objections");
          setFayeStatus("Faye: Alert! Detected pricing objection. Framing playbook handling...");
          setObjections(["Pricing objection / Requesting discount"]);
          setLeadProfile(prev => ({ ...prev, budget_readiness: "Open to proposal, wants ROI breakdown" }));
          setLeadScore(80);
          addFayeLog("Playbook: Highlighting pricing response script");
          break;
        case 5:
          setFayeFocus("calendar");
          setFayeStatus("Faye: Booking confirmation. Framing interactive wall calendar...");
          setLeadProfile(prev => ({ ...prev, timeline: "Immediate (This month)" }));
          setLeadScore(90);
          setRecommendedOffer("Sales Automation Package (SME)");
          setNextBestAction("Book May 28 2:00 PM discovery slot");
          addFayeLog("Calendar: Framed date cell May 28");
          break;
        case 6:
          setFayeFocus("none");
          setFayeStatus("Faye: Complete, clear, and coherent dashboard. Call qualified!");
          setLeadScore(100);
          addFayeLog("Faye: B2B sales lead fully qualified.");
          break;
      }
    } else {
      // B2C Commerce simulation steps
      switch (simulationStep) {
        case 1:
          setFayeFocus("preferences");
          setCheckoutStatus("preferences");
          setFayeStatus("Faye: Listening to preferences. Framing buyer criteria...");
          setBuyerPrefs({ useCase: "Programming & React development", budget: "₱60,000 maximum", brand: "" });
          addFayeLog("Faye: Initialized buyer criteria profile");
          break;
        case 2:
          setFayeFocus("compare");
          setCheckoutStatus("match");
          setFayeStatus("Faye: Matches found. Rendering comparison cards...");
          setBuyerPrefs(prev => ({ ...prev, brand: "Lenovo preferred" }));
          setCartItems([{ name: "Lenovo ThinkPad E14 Gen 5", price: 58999, qty: 1 }]);
          addFayeLog("Faye: Synced product comparison layout");
          break;
        case 3:
          setFayeFocus("cart");
          setCheckoutStatus("verification");
          setFayeStatus("Faye: Verification. Formatting cart items and shipping...");
          setShippingInfo({ name: "Juan dela Cruz", address: "Project 4, Quezon City", phone: "0917-889-1243" });
          addFayeLog("Faye: Verified buyer credentials & address");
          break;
        case 4:
          setFayeFocus("gcash");
          setCheckoutStatus("gcash");
          setFayeStatus("Faye: Checkout billing. Framed GCash reference code...");
          setGcashRef("WPH-2026-00142");
          addFayeLog("GCash: QR Code generated. Awaiting user verification.");
          break;
        case 5:
          setFayeFocus("cart");
          setCheckoutStatus("paid");
          setFayeStatus("Faye: Payment confirmed. Visualizing checkout success!");
          addFayeLog("Outcome: Cart checked out. Reference WPH-2026-00142 confirmed.");
          break;
      }
    }
  }, [simulationStep, simulationActive, isSales]);

  return (
    <div className="flex flex-col h-full gap-5">
      {/* 1. FAYE HEADS-UP DISPLAY (HUD) */}
      <div className="relative rounded-3xl border border-white/[0.08] bg-zinc-900/40 p-5 backdrop-blur-2xl shadow-[0_15px_35px_rgba(0,0,0,0.3)] overflow-hidden">
        {/* Dynamic decorative backdrop glow */}
        <div className={`absolute -right-12 -top-12 -z-10 h-36 w-36 rounded-full bg-gradient-to-br ${
          isSales ? "from-cyan-500/10 to-blue-500/10" : "from-purple-500/10 to-pink-500/10"
        } blur-[30px]`} />

        <div className="flex flex-col md:flex-row items-center gap-5 justify-between">
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Pulsing Avatar */}
            <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-zinc-950 border border-white/[0.08] overflow-hidden group">
              {/* Spinning star background */}
              <div className={`absolute inset-0.5 rounded-[14px] bg-gradient-to-tr ${
                isSales ? "from-cyan-500/20 to-blue-500/10" : "from-purple-500/20 to-pink-500/10"
              } animate-pulse`} />
              
              {/* Double Rotating Square representing Faye */}
              <div className={`w-6 h-6 border-2 ${
                isSales ? "border-cyan-400" : "border-purple-400"
              } rounded-md rotate-45 animate-[spin_10s_linear_infinite] opacity-80`} />
              <div className={`absolute w-4 h-4 border-2 ${
                isSales ? "border-blue-400" : "border-pink-400"
              } rounded-md -rotate-45 animate-[spin_6s_linear_infinite_reverse] opacity-80`} />
              <div className={`absolute w-1.5 h-1.5 rounded-full ${isSales ? "bg-cyan-300" : "bg-purple-300"}`} />
            </div>

            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black tracking-widest uppercase text-white">Faye HUD v1.2</h3>
                <span className={`inline-flex items-center gap-1 text-[9px] font-mono font-bold tracking-wider px-2 py-0.5 rounded-full ${
                  isSales ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/25" : "bg-purple-500/10 text-purple-400 border border-purple-500/25"
                }`}>
                  {isSales ? "B2B Sales Architect" : "B2C Commerce Architect"}
                </span>
              </div>
              <p className="text-xs text-zinc-300 font-medium font-sans leading-relaxed">{fayeStatus}</p>
            </div>
          </div>

          {/* Core Quality stats */}
          <div className="flex gap-4 text-[10px] font-mono border-t md:border-t-0 md:border-l border-white/[0.06] pt-3 md:pt-0 md:pl-5 w-full md:w-auto shrink-0 justify-around">
            <div className="text-center">
              <span className="text-zinc-500 block">COMPLETENESS</span>
              <span className="font-bold text-white text-xs">{isSales ? `${leadScore}%` : checkoutStatus === "paid" ? "100%" : checkoutStatus === "gcash" ? "80%" : checkoutStatus === "verification" ? "60%" : "30%"}</span>
            </div>
            <div className="text-center">
              <span className="text-zinc-500 block">CLARITY</span>
              <span className="font-bold text-emerald-400 text-xs">High</span>
            </div>
            <div className="text-center">
              <span className="text-zinc-500 block">COHERENCE</span>
              <span className="font-bold text-cyan-400 text-xs">Synchronized</span>
            </div>
          </div>
        </div>

        {/* Faye Action ticker */}
        <div className="mt-4 pt-3 border-t border-white/[0.05] flex gap-2 overflow-hidden h-6 items-center">
          <span className="text-[9px] font-bold tracking-wider text-zinc-500 uppercase flex items-center gap-1 shrink-0 font-mono">
            <Activity className="w-3 h-3 text-cyan-500" />
            Faye Log:
          </span>
          <span className="text-[10px] text-zinc-400 font-mono truncate animate-pulse">
            {fayeActionLogs[0] || "Awaiting architectural actions..."}
          </span>
        </div>
      </div>

      {/* 2. DYNAMIC WORKSPACE (Sales vs Commerce) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 flex-1 overflow-visible">
        
        {/* ==================== B2B SALES MODE ==================== */}
        {isSales && (
          <>
            {/* B2B component 1: Lead Score Dial */}
            <div className={`relative rounded-3xl border p-5 bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 ${
              fayeFocus === "score" 
                ? "border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)] scale-[1.01]" 
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}>
              {fayeFocus === "score" && (
                <span className="absolute top-3 right-3 text-[8px] font-bold tracking-widest uppercase bg-cyan-500 text-black px-1.5 py-0.5 rounded font-mono animate-pulse">
                  Faye Focused 🎥
                </span>
              )}
              
              <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-cyan-400" />
                Lead Score Meter
              </h4>

              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                {/* SVG Radial Gauge */}
                <div className="relative w-32 h-32 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle 
                      cx="64" cy="64" r="54" 
                      className="stroke-zinc-800" strokeWidth="8" fill="transparent" 
                    />
                    <circle 
                      cx="64" cy="64" r="54" 
                      className="stroke-cyan-500 transition-all duration-700 ease-out" 
                      strokeWidth="8" 
                      fill="transparent" 
                      strokeDasharray={2 * Math.PI * 54}
                      strokeDashoffset={2 * Math.PI * 54 * (1 - leadScore / 100)}
                      strokeLinecap="round"
                    />
                  </svg>
                  
                  {/* Inside dial text */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-3xl font-black text-white">{leadScore}</span>
                    <span className="text-[9px] font-mono tracking-wider text-zinc-500 uppercase">Points</span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="text-xs text-zinc-400">Lead Temperature:</span>
                  <span className={`px-3 py-1 rounded-full text-xs font-bold font-mono tracking-wider ${
                    leadTemp === "Hot" 
                      ? "bg-red-500/10 text-red-400 border border-red-500/25" 
                      : leadTemp === "Warm" 
                      ? "bg-amber-500/10 text-amber-400 border border-amber-500/25" 
                      : "bg-blue-500/10 text-blue-400 border border-blue-500/25"
                  }`}>
                    {leadTemp.toUpperCase()} {leadTemp === "Hot" ? "🔴" : leadTemp === "Warm" ? "🟡" : "🔵"}
                  </span>
                </div>
              </div>
            </div>

            {/* B2B component 2: Lead Profile Info */}
            <div className={`relative rounded-3xl border p-5 bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 ${
              fayeFocus === "profile" 
                ? "border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)] scale-[1.01]" 
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}>
              {fayeFocus === "profile" && (
                <span className="absolute top-3 right-3 text-[8px] font-bold tracking-widest uppercase bg-cyan-500 text-black px-1.5 py-0.5 rounded font-mono animate-pulse">
                  Faye Focused 🎥
                </span>
              )}
              
              <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-cyan-400" />
                Qualifiers profile
              </h4>

              <div className="space-y-3 text-xs">
                {[
                  { label: "Company", val: leadProfile.company },
                  { label: "Industry", val: leadProfile.industry },
                  { label: "Core Challenge", val: leadProfile.pain_point },
                  { label: "Timeline", val: leadProfile.timeline },
                  { label: "Decision Maker", val: leadProfile.decision_maker },
                  { label: "Budget Readiness", val: leadProfile.budget_readiness },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start justify-between py-1.5 border-b border-white/[0.04] last:border-0 gap-3">
                    <span className="text-zinc-500 shrink-0 font-medium">{item.label}</span>
                    <span className={`text-right font-semibold truncate ${
                      item.val ? "text-zinc-200" : "text-zinc-600 font-normal italic"
                    }`}>
                      {item.val || "Awaiting detail..."}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* B2B component 3: Objections Card */}
            <div className={`relative rounded-3xl border p-5 bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 ${
              fayeFocus === "objections" 
                ? "border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)] scale-[1.01]" 
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}>
              {fayeFocus === "objections" && (
                <span className="absolute top-3 right-3 text-[8px] font-bold tracking-widest uppercase bg-cyan-500 text-black px-1.5 py-0.5 rounded font-mono animate-pulse">
                  Faye Focused 🎥
                </span>
              )}
              
              <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-3.5 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
                Objections & Playbook Handling
              </h4>

              <div className="space-y-4">
                {objections.length === 0 ? (
                  <div className="text-xs text-zinc-500 italic py-6 text-center">
                    No active objections detected in the conversation.
                  </div>
                ) : (
                  objections.map((objection, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        {objection}
                      </div>
                      <div className="p-3 rounded-2xl bg-zinc-950/60 border border-white/[0.05] text-[11px] text-zinc-400 leading-relaxed font-sans">
                        <strong className="text-zinc-300 block mb-1">Faye Suggests:</strong>
                        &quot;Understand context first. Emphasize sub-second inquiry capturing and GCash checkout rate increase. Propose the ROI of lost calls vs our package price.&quot;
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* B2B component 4: Calendar slot bookings */}
            <div className={`relative rounded-3xl border p-5 bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 ${
              fayeFocus === "calendar" 
                ? "border-cyan-400 ring-1 ring-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.25)] scale-[1.01]" 
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}>
              {fayeFocus === "calendar" && (
                <span className="absolute top-3 right-3 text-[8px] font-bold tracking-widest uppercase bg-cyan-500 text-black px-1.5 py-0.5 rounded font-mono animate-pulse">
                  Faye Focused 🎥
                </span>
              )}
              
              <div className="space-y-4">
                <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-mono font-bold text-zinc-500">
                  <span>M</span><span>T</span><span>W</span><span>T</span><span>F</span>
                </div>
                
                {/* Simulated calendar week around May 27/28 */}
                <div className="grid grid-cols-5 gap-1.5">
                  {[25, 26, 27, 28, 29].map((day) => {
                    const isTarget = day === 28;
                    const isPassed = day < 27;
                    return (
                      <div 
                        key={day}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          isTarget 
                            ? "border-cyan-500 bg-cyan-950/20 text-white font-bold scale-105 shadow-[0_0_15px_rgba(6,182,212,0.2)]" 
                            : isPassed
                            ? "border-white/[0.02] bg-zinc-950/20 text-zinc-700 cursor-not-allowed"
                            : "border-white/[0.05] bg-zinc-950/40 text-zinc-400 hover:border-white/[0.08]"
                        }`}
                      >
                        <span className="block text-[11px]">{day}</span>
                        <span className={`block text-[8px] font-mono mt-0.5 ${
                          isTarget ? "text-cyan-400" : "text-zinc-500"
                        }`}>{isTarget ? "DEMO" : "SLOT"}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3.5 rounded-2xl bg-zinc-950/50 border border-white/[0.05] space-y-2">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 font-medium">Recommended Offer:</span>
                    <span className="font-bold text-cyan-400">{recommendedOffer || "Sales Automation (SME)"}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-zinc-500 font-medium">Next Best Action:</span>
                    <span className="font-semibold text-zinc-200">{nextBestAction || "Verify Timeline context..."}</span>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* ==================== B2C COMMERCE MODE ==================== */}
        {!isSales && (
          <>
            {/* B2C component 1: Shopping Cart */}
            <div className={`relative rounded-3xl border p-5 bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 ${
              fayeFocus === "cart" 
                ? "border-purple-400 ring-1 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.25)] scale-[1.01]" 
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}>
              {fayeFocus === "cart" && (
                <span className="absolute top-3 right-3 text-[8px] font-bold tracking-widest uppercase bg-purple-500 text-white px-1.5 py-0.5 rounded font-mono animate-pulse">
                  Faye Focused 🎥
                </span>
              )}
              
              <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-1.5">
                <ShoppingBag className="w-3.5 h-3.5 text-purple-400" />
                Active Shopping Cart
              </h4>

              <div className="space-y-4">
                {cartItems.length === 0 ? (
                  <div className="text-xs text-zinc-500 italic py-8 text-center">
                    Cart is empty. Suggesting product fits...
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Cart Items list */}
                    <div className="space-y-2 border-b border-white/[0.05] pb-3">
                      {cartItems.map((item, i) => (
                        <div key={i} className="flex justify-between items-start text-xs gap-3">
                          <div>
                            <div className="font-bold text-zinc-100 flex items-center gap-1.5">
                              <Package className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                              {item.name}
                            </div>
                            <div className="text-[10px] text-zinc-500 mt-0.5">Qty: {item.qty} × ₱{item.price.toLocaleString()}</div>
                          </div>
                          <span className="font-bold text-zinc-200">₱{(item.price * item.qty).toLocaleString()}</span>
                        </div>
                      ))}
                    </div>

                    {/* Total info */}
                    <div className="flex justify-between text-xs font-bold border-b border-white/[0.05] pb-3">
                      <span className="text-zinc-500">Subtotal</span>
                      <span className="text-purple-400">₱{cartItems.reduce((acc, curr) => acc + curr.price * curr.qty, 0).toLocaleString()}</span>
                    </div>

                    {/* Shipping Info verified */}
                    <div className="p-3.5 rounded-2xl bg-zinc-950/40 border border-white/[0.05] space-y-2 text-xs">
                      <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block mb-1">Verified Shipping Context</span>
                      <div className="grid grid-cols-3 gap-1">
                        <span className="text-zinc-500">Name:</span>
                        <span className="col-span-2 font-semibold text-zinc-300">{shippingInfo.name || "Pending..."}</span>
                        
                        <span className="text-zinc-500">Address:</span>
                        <span className="col-span-2 font-semibold text-zinc-300 truncate">{shippingInfo.address || "Pending..."}</span>
                        
                        <span className="text-zinc-500">Phone:</span>
                        <span className="col-span-2 font-semibold text-zinc-300">{shippingInfo.phone || "Pending..."}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* B2C component 2: Buyer Preferences */}
            <div className={`relative rounded-3xl border p-5 bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 ${
              fayeFocus === "preferences" 
                ? "border-purple-400 ring-1 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.25)] scale-[1.01]" 
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}>
              {fayeFocus === "preferences" && (
                <span className="absolute top-3 right-3 text-[8px] font-bold tracking-widest uppercase bg-purple-500 text-white px-1.5 py-0.5 rounded font-mono animate-pulse">
                  Faye Focused 🎥
                </span>
              )}
              
              <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                Buyer Preferences Checklist
              </h4>

              <div className="space-y-3.5">
                {[
                  { title: "Use Case / Work Needs", val: buyerPrefs.useCase, placeholder: "Looking for programming, gaming, or office workspace?" },
                  { title: "Budget Limit", val: buyerPrefs.budget, placeholder: "Awaiting budget range criteria..." },
                  { title: "Brand Preference", val: buyerPrefs.brand, placeholder: "Lenovo, ASUS, or open to alternatives?" }
                ].map((pref, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center border mt-0.5 ${
                      pref.val ? "bg-purple-500/10 border-purple-500 text-purple-400" : "border-white/[0.06] bg-zinc-950/20 text-zinc-600"
                    }`}>
                      {pref.val ? <Check className="w-3 h-3" /> : <span className="text-[10px] font-mono">{i + 1}</span>}
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-zinc-300 block">{pref.title}</span>
                      <p className={`text-xs ${pref.val ? "text-zinc-200 font-semibold" : "text-zinc-500 italic"}`}>
                        {pref.val || pref.placeholder}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* B2C component 3: Specs Comparison Grid */}
            <div className={`relative rounded-3xl border p-5 bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 ${
              fayeFocus === "compare" 
                ? "border-purple-400 ring-1 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.25)] scale-[1.01]" 
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}>
              {fayeFocus === "compare" && (
                <span className="absolute top-3 right-3 text-[8px] font-bold tracking-widest uppercase bg-purple-500 text-white px-1.5 py-0.5 rounded font-mono animate-pulse">
                  Faye Focused 🎥
                </span>
              )}
              
              <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-purple-400" />
                Catalog Comparison
              </h4>

              <div className="space-y-4">
                <table className="w-full text-[11px] border-collapse text-left">
                  <thead>
                    <tr className="border-b border-white/[0.06] text-zinc-500">
                      <th className="pb-2">Feature</th>
                      <th className="pb-2 font-bold text-zinc-300">Lenovo ThinkPad</th>
                      <th className="pb-2">ASUS VivoBook</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-400 font-sans">
                    <tr>
                      <td className="py-2 text-zinc-500 font-medium">Price</td>
                      <td className="py-2 text-purple-400 font-semibold">₱58,999</td>
                      <td className="py-2">₱54,990</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-zinc-500 font-medium">RAM / Disk</td>
                      <td className="py-2 text-zinc-300">16GB / 512GB</td>
                      <td className="py-2">8GB / 512GB</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-zinc-500 font-medium">Keyboard</td>
                      <td className="py-2 text-zinc-300">Spill-Resistant</td>
                      <td className="py-2">Standard Chiclet</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-zinc-500 font-medium">Durability</td>
                      <td className="py-2 text-zinc-300">Mil-spec verified</td>
                      <td className="py-2">Consumer Standard</td>
                    </tr>
                  </tbody>
                </table>

                <div className="p-3 rounded-2xl bg-zinc-950/30 border border-white/[0.05] text-[10px] text-zinc-500 text-center leading-relaxed">
                  Faye recommends <strong>ThinkPad E14</strong> for professional developers based on Mil-spec build quality and RAM requirements.
                </div>
              </div>
            </div>

            {/* B2C component 4: GCash invoice reference */}
            <div className={`relative rounded-3xl border p-5 bg-zinc-900/30 backdrop-blur-xl transition-all duration-500 ${
              fayeFocus === "gcash" 
                ? "border-purple-400 ring-1 ring-purple-400 shadow-[0_0_25px_rgba(168,85,247,0.25)] scale-[1.01]" 
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}>
              {fayeFocus === "gcash" && (
                <span className="absolute top-3 right-3 text-[8px] font-bold tracking-widest uppercase bg-purple-500 text-white px-1.5 py-0.5 rounded font-mono animate-pulse">
                  Faye Focused 🎥
                </span>
              )}
              
              <h4 className="text-[10px] font-black tracking-widest text-zinc-500 uppercase mb-4 flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                GCash payment Reference
              </h4>

              <div className="flex flex-col items-center justify-center space-y-4 py-2">
                {checkoutStatus === "paid" ? (
                  <div className="flex flex-col items-center justify-center py-6 text-center space-y-2">
                    <div className="w-12 h-12 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
                      <Check className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-bold text-white">GCash Reference Paid</span>
                    <span className="text-xs text-zinc-500 font-mono">Ref: {gcashRef}</span>
                  </div>
                ) : checkoutStatus === "gcash" ? (
                  <>
                    {/* Simulated GCash QR Box */}
                    <div className="relative p-4 bg-white rounded-2xl flex flex-col items-center gap-2 border shadow-lg animate-pulse">
                      {/* Stylized QR representation */}
                      <div className="w-24 h-24 bg-zinc-900 border-4 border-zinc-900 flex flex-wrap p-1 gap-1">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div 
                            key={i} 
                            className={`w-4 h-4 rounded-sm ${
                              (i % 3 === 0 || i === 7 || i === 11 || i === 15) ? "bg-white" : "bg-zinc-900"
                            }`} 
                          />
                        ))}
                      </div>
                      <span className="text-[8px] font-black text-blue-600 tracking-wider">GCASH SCAN QR</span>
                    </div>

                    <div className="text-center space-y-1">
                      <span className="text-[10px] font-semibold text-zinc-400 block">GCash Reference Generated:</span>
                      <span className="text-sm font-mono font-bold text-purple-400 tracking-wide bg-purple-500/10 px-3 py-1 rounded border border-purple-500/25">
                        {gcashRef}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-xs text-zinc-500 italic py-8 text-center">
                    Awaiting checkout confirmations.
                  </div>
                )}
              </div>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
