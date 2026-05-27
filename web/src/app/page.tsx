"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
import { CalendarDemo } from "@/components/CalendarDemo";
import { CommerceDemo } from "@/components/CommerceDemo";
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

// Scroll reveal observer
function useScrollReveal() {
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal-visible");
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -50px 0px" }
    );

    const elements = document.querySelectorAll(".reveal-item, .reveal-item-slide-top, .reveal-item-slide-up");
    elements.forEach((el) => observer.observe(el));

    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<"sales" | "commerce">("sales");
  const [animateKey, setAnimateKey] = useState(0);
  const [demoMode, setDemoMode] = useState<"b2b" | "b2c">("b2b");
  const [animateDemoKey, setAnimateDemoKey] = useState(0);

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

  useEffect(() => {
    setMounted(true);

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useScrollReveal();

  if (!mounted) return null;

  return (
    <div className="dark min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500 selection:text-black scroll-smooth relative">
      
      {/* Scroll indicator bar at top (Likas AI style) */}
      <div 
        className="fixed left-0 top-0 z-50 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-100" 
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Floating frosted-glass header navbar (Likas style) */}
      <nav className="fixed left-1/2 top-5 z-40 w-[min(1180px,calc(100%-48px))] -translate-x-1/2 flex items-center justify-between rounded-full border border-white/5 bg-zinc-900/60 px-5 py-3.5 shadow-xl shadow-black/35 backdrop-blur-xl transition-all duration-300">
        <a href="#top" className="flex items-center gap-2 group">
          <div className="relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-black transition-transform duration-300 group-hover:scale-105">
            F
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
          </div>
          <span className="text-base font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
            FFlow<span className="text-cyan-400">.ph</span>
          </span>
        </a>
        
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-400 tracking-wider uppercase">
          <a href="#agents" className="hover:text-white transition-all duration-200">Agents</a>
          <a href="#demo-booking" className="hover:text-white transition-all duration-200 font-bold text-cyan-400">Calendar Demo</a>
          <a href="#comparison" className="hover:text-white transition-all duration-200">Why FFlow.ph</a>
          <a href="#tech-stack" className="hover:text-white transition-all duration-200">Tech Stack</a>
          <Link href="/dashboard" className="hover:text-white transition-all duration-200 flex items-center gap-1">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            Live Dashboard
          </Link>
          <Link href="/leads" className="hover:text-white transition-all duration-200 flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-purple-400" />
            Record Detail
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href="/campaign" 
            className="rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] px-4 py-2 text-xs font-bold text-white transition-all flex items-center gap-1.5"
          >
            <Settings className="w-3.5 h-3.5 text-zinc-400" />
            Configure Settings
          </Link>
        </div>
      </nav>

      {/* Viewport scroll reveal style rules */}
      <style dangerouslySetInnerHTML={{__html: `
        .reveal-item {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-item.reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-item-slide-top {
          opacity: 0;
          transform: translateY(-60px);
          transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-item-slide-top.reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
        .reveal-item-slide-up {
          opacity: 0;
          transform: translateY(60px);
          transition: opacity 1.2s cubic-bezier(0.16, 1, 0.3, 1), transform 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        .reveal-item-slide-up.reveal-visible {
          opacity: 1;
          transform: translateY(0);
        }
        
        /* 3D Rotating Phone Mockup Keyframes */
        @keyframes phone3DRotation {
          0% {
            transform: rotateY(-18deg) rotateX(12deg) rotateZ(-1deg);
          }
          50% {
            transform: rotateY(18deg) rotateX(18deg) rotateZ(1deg);
          }
          100% {
            transform: rotateY(-18deg) rotateX(12deg) rotateZ(-1deg);
          }
        }
        .animate-phone-3d {
          animation: phone3DRotation 6s ease-in-out infinite;
          transform-style: preserve-3d;
        }

        /* 3D Phone screen items animations */
        @keyframes floatItem {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-6px) rotate(0.5deg); }
        }
        .animate-float-item {
          animation: floatItem 4s ease-in-out infinite;
        }

        @keyframes pulseRing {
          0% { transform: scale(0.95); opacity: 0.2; }
          50% { transform: scale(1.1); opacity: 0.6; }
          100% { transform: scale(0.95); opacity: 0.2; }
        }
        .animate-pulse-ring {
          animation: pulseRing 3s ease-in-out infinite;
        }

        @keyframes rotateRadar {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-rotate-radar {
          animation: rotateRadar 15s linear infinite;
        }

        @keyframes waveGrow {
          0%, 100% { height: 12px; }
          50% { height: 32px; }
        }
        .animate-wave-bar {
          animation: waveGrow 1.2s ease-in-out infinite;
        }

        /* Slide in from top animation for choices on select */
        @keyframes slideDownFromTop {
          0% {
            opacity: 0;
            transform: translateY(-40px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-top {
          animation: slideDownFromTop 0.6s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}} />

      {/* 2. HERO SECTION */}
      <section id="top" className="relative min-h-screen px-6 pt-32 pb-24 md:pt-40 flex items-center overflow-hidden">
        
        {/* Background visual components */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl" />
          <div className="absolute top-1/2 right-1/4 translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-purple-500/5 via-pink-500/5 to-transparent blur-3xl" />
          
          <div className="absolute top-[18%] right-[-180px] h-[600px] w-[600px] border border-white/[0.02] rounded-full opacity-45 animate-[spin_120s_linear_infinite]" />
          <div className="absolute bottom-[8%] left-[-220px] h-[500px] w-[500px] border border-dashed border-white/[0.02] rounded-full opacity-35 animate-[spin_80s_linear_infinite_reverse]" />
        </div>

        <div className="mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-[1.05fr_0.95fr] items-center gap-14 pt-6">
          
          {/* Hero Left Content */}
          <div className="space-y-6 text-center lg:text-left">
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
              We extend Agora&apos;s Conversational AI infrastructure with FFlow.ph&apos;s custom workflow layer—pre-built sales qualification, lead scoring, and instant e-commerce checkouts.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <a 
                href="#agents"
                className="w-full sm:w-auto rounded-full bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold px-8 py-4 flex items-center justify-center gap-2 shadow-[0_0_30px_rgba(6,182,212,0.3)] transition-all hover:scale-[1.02]"
              >
                <span>Select Agent Type</span>
                <ArrowRight className="w-5 h-5" />
              </a>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white font-semibold px-8 py-4 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <BarChart3 className="w-5 h-5 text-cyan-400" />
                <span>View Dashboard</span>
              </Link>
            </div>

            {/* Micro KPI Section */}
            <div className="grid grid-cols-3 gap-6 pt-10 border-t border-white/[0.05] max-w-lg mx-auto lg:mx-0 text-left">
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

          {/* Hero Right Content: 3D rotating phone mockup containing AI Agent Faye */}
          <div className="w-full max-w-[450px] mx-auto flex items-center justify-center py-6" style={{ perspective: "1200px" }}>
            <div className="animate-phone-3d w-[285px] h-[570px] rounded-[48px] border-[6px] border-zinc-800 bg-zinc-950 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),_0_0_50px_rgba(6,182,212,0.15)] relative overflow-hidden flex flex-col justify-between p-3.5 select-none">
              
              {/* Phone Speaker & Notch ("Dynamic Island") */}
              <div className="absolute top-3.5 left-1/2 -translate-x-1/2 w-24 h-5 rounded-full bg-black z-30 flex items-center justify-center border border-white/[0.03]">
                <div className="w-8 h-1 rounded-full bg-zinc-800 absolute top-1" />
                <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 border border-zinc-800 absolute right-2" />
              </div>
              
              {/* Screen Top Status bar */}
              <div className="w-full flex justify-between items-center text-[8px] font-semibold text-zinc-550 px-4 pt-1.5 z-20">
                <span>13:30</span>
                <div className="flex items-center gap-1.5">
                  <span>5G</span>
                  <div className="w-4 h-2 rounded-sm border border-zinc-500 flex items-center p-[1px]">
                    <div className="w-full h-full bg-cyan-400 rounded-sm" />
                  </div>
                </div>
              </div>

              {/* Glowing Phone Screen Borders */}
              <div className="absolute inset-0 rounded-[42px] border border-cyan-500/10 pointer-events-none z-10" />

              {/* Main Screen Content */}
              <div className="flex-1 flex flex-col justify-between py-6 px-1 z-20 relative">
                
                {/* Faye Active banner */}
                <div className="text-center space-y-1 pt-2">
                  <span className="text-[7px] tracking-widest font-black uppercase text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2 py-0.5 rounded-full">
                    FAYE VIRTUAL AI
                  </span>
                  <div className="text-[10px] font-bold text-white flex items-center justify-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    ACTIVE OUTCOME ROUTING
                  </div>
                </div>

                {/* Concentric rotating radar circles */}
                <div className="relative flex-1 flex items-center justify-center my-6">
                  {/* Wave effect rings */}
                  <div className="absolute w-36 h-36 rounded-full border border-cyan-500/10 animate-pulse-ring" style={{ animationDelay: "0s" }} />
                  <div className="absolute w-28 h-28 rounded-full border border-cyan-500/15 animate-pulse-ring" style={{ animationDelay: "1s" }} />
                  <div className="absolute w-20 h-20 rounded-full border border-purple-500/20 animate-pulse-ring" style={{ animationDelay: "1.5s" }} />
                  
                  {/* Faye Core Vector Avatar */}
                  <div className="relative w-16 h-16 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 border border-cyan-400/30 flex items-center justify-center shadow-[0_0_30px_rgba(6,182,212,0.4)] z-10">
                    <span className="text-2xl font-black text-black select-none">F</span>
                  </div>

                  {/* Rotating dashed ring */}
                  <div className="absolute w-24 h-24 rounded-full border border-dashed border-cyan-400/30 animate-rotate-radar" />
                </div>

                {/* Floating transcripts bubble inside phone */}
                <div className="space-y-2.5 px-1 pb-4">
                  {/* Active Transcript bubble */}
                  <div className="p-3.5 rounded-2xl bg-zinc-900/90 border border-white/[0.08] shadow-lg text-[9.5px] leading-relaxed text-zinc-300 animate-float-item text-left">
                    <span className="text-[7.5px] font-mono text-cyan-400 block uppercase mb-1">Qualifying B2B lead</span>
                    &quot;We need to qualify and score fleet logistics leads instantly...&quot;
                  </div>

                  {/* Fired outcomes tracker */}
                  <div className="p-2.5 rounded-2xl bg-cyan-950/20 border border-cyan-500/20 text-[9px] font-mono text-cyan-400 flex items-center justify-between">
                    <span>✓ score_lead() fired</span>
                    <span className="font-bold bg-cyan-500 text-black px-1 rounded">HOT 🔴</span>
                  </div>
                </div>

              </div>

              {/* Phone bottom indicators / waveform */}
              <div className="w-full pb-2 z-20 flex flex-col items-center gap-2">
                {/* Horizontal audio waveform */}
                <div className="flex items-center gap-1 h-8 justify-center">
                  {[0.5, 0.8, 1.2, 0.9, 0.4, 0.7, 1.1, 0.6].map((delay, idx) => (
                    <div 
                      key={idx}
                      className="w-[3px] bg-gradient-to-t from-cyan-400 to-blue-500 rounded-full animate-wave-bar" 
                      style={{ animationDelay: `${delay}s`, animationDuration: "1s" }}
                    />
                  ))}
                </div>
                {/* Home indicator bar */}
                <div className="w-24 h-1 rounded-full bg-zinc-700" />
              </div>

            </div>
          </div>

        </div>
      </section>

      {/* 3. AGENT CARDS SECTION */}
      <section id="agents" className="mx-auto max-w-7xl px-6 py-24 scroll-mt-20">
        <div className="text-center space-y-4 mb-16 reveal-item">
          <span className="text-xs font-bold tracking-widest uppercase text-cyan-400">DEPLOYABLE MODULES</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white font-sans">Choose Your Business Agent</h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Select one of our specialized agent architectures to view its outcomes, check out details, and test its capabilities.
          </p>
        </div>

        {/* Dynamic Selector Tabs */}
        <div className="flex justify-center mb-10 reveal-item">
          <div className="inline-flex p-1.5 rounded-full border border-white/[0.06] bg-zinc-900/60 backdrop-blur-xl">
            <button
              onClick={() => {
                setSelectedAgent("sales");
                setAnimateKey(prev => prev + 1);
              }}
              className={`flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                selectedAgent === "sales"
                  ? "bg-cyan-500 text-zinc-950 shadow-[0_0_20px_rgba(6,182,212,0.35)] font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              B2B Sales Agent
            </button>
            <button
              onClick={() => {
                setSelectedAgent("commerce");
                setAnimateKey(prev => prev + 1);
              }}
              className={`flex items-center gap-2 rounded-full px-6 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                selectedAgent === "commerce"
                  ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.35)] font-black"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              B2C Commerce Agent
            </button>
          </div>
        </div>

        <div key={animateKey} className="max-w-4xl mx-auto animate-slide-top">
          {selectedAgent === "sales" ? (
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
          ) : (
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
          )}
        </div>
      </section>

      {/* 4. INTERACTIVE CALENDAR & COMMERCE DEMO SECTION */}
      <section id="demo-booking" className="mx-auto max-w-7xl px-6 py-24 border-t border-white/[0.03] scroll-mt-20 reveal-item-slide-top">
        <div className="text-center space-y-4 mb-10">
          <span className="text-xs font-bold tracking-widest uppercase text-cyan-400">INTERACTIVE PREVIEW</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">Experience the Agent Pipeline</h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            Test our vertical AI pipelines below. Toggle between B2B scheduling and B2C conversational checkout simulations.
          </p>
        </div>

        {/* B2B vs B2C Sandbox Mode Selector */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 rounded-full border border-white/[0.05] bg-zinc-950/80 backdrop-blur-xl">
            <button
              onClick={() => {
                setDemoMode("b2b");
                setAnimateDemoKey(prev => prev + 1);
              }}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                demoMode === "b2b"
                  ? "bg-cyan-500 text-zinc-950 shadow-[0_0_15px_rgba(6,182,212,0.3)] font-black"
                  : "text-zinc-550 hover:text-white"
              }`}
            >
              <Building className="w-3.5 h-3.5" />
              B2B Call Scheduler
            </button>
            <button
              onClick={() => {
                setDemoMode("b2c");
                setAnimateDemoKey(prev => prev + 1);
              }}
              className={`flex items-center gap-1.5 rounded-full px-5 py-2.5 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                demoMode === "b2c"
                  ? "bg-purple-500 text-white shadow-[0_0_15px_rgba(168,85,247,0.3)] font-black"
                  : "text-zinc-550 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              B2C Cart Checkout
            </button>
          </div>
        </div>
        
        <div key={animateDemoKey} className="reveal-item-slide-up animate-slide-top">
          {demoMode === "b2b" ? <CalendarDemo /> : <CommerceDemo />}
        </div>
      </section>

      {/* 5. WHY FFLOW.PH / COMPARISON SECTION */}
      <section id="comparison" className="mx-auto max-w-7xl px-6 py-24 border-t border-white/[0.03] scroll-mt-20">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
          <div className="lg:col-span-2 space-y-6 reveal-item text-left">
            <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/5 px-3 py-1 text-xs font-semibold text-purple-400">
              <Cpu className="w-3.5 h-3.5" />
              Strategic Architecture
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white font-sans">
              Agora Powers the Voice.<br />
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                FFlow.ph Powers the Outcome.
              </span>
            </h2>
            <p className="text-sm text-zinc-450 leading-relaxed">
              Agora Conversational AI Studio is an exceptional builder for voice developers. But Philippine SMEs don&apos;t need raw infrastructure—they need outcomes. We&apos;ve built the business outcome intelligence layer directly on top.
            </p>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 h-9 w-9 shrink-0 flex items-center justify-center border border-cyan-500/20">
                  <Zap className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Zero Developer Coding Required</h4>
                  <p className="text-xs text-zinc-550 mt-0.5">Pick your business template, configure parameters, and launch instantly.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 h-9 w-9 shrink-0 flex items-center justify-center border border-purple-500/20">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white">Philippine Context Preloaded</h4>
                  <p className="text-xs text-zinc-550 mt-0.5">Understands Taglish conversation, local pricing structures, and GCash checkouts.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="lg:col-span-3 rounded-3xl border border-white/[0.05] bg-zinc-900/40 p-6 backdrop-blur-lg overflow-hidden reveal-item">
            <h3 className="text-lg font-bold text-white mb-4 text-left">Core Platform Differences</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-white/[0.05] text-zinc-500 uppercase tracking-wider text-[9px] font-bold">
                    <th className="pb-3 font-semibold">Requirement</th>
                    <th className="pb-3 font-semibold">Agora Studio Core</th>
                    <th className="pb-3 font-semibold text-cyan-400">FFlow.ph Extension</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.03] text-zinc-350">
                  <tr>
                    <td className="py-3.5 font-medium text-white">AI Capabilities</td>
                    <td className="py-3.5 text-zinc-400">Voice prompts, Knowledge bases</td>
                    <td className="py-3.5 text-emerald-400 font-semibold">Structured tool-calling pipeline</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Lead Actionability</td>
                    <td className="py-3.5 text-zinc-400">Chat histories</td>
                    <td className="py-3.5 text-emerald-400 font-semibold">Real-time qualification scoring (HOT/WARM)</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">B2C Checkout</td>
                    <td className="py-3.5 text-zinc-400">Manual MCP APIs</td>
                    <td className="py-3.5 text-emerald-400 font-semibold">Dynamic preference matching + GCash ready</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Analytics</td>
                    <td className="py-3.5 text-zinc-400">Call durations, tokens</td>
                    <td className="py-3.5 text-emerald-400 font-semibold">CRM Dashboard, objections, revenue tracked</td>
                  </tr>
                  <tr>
                    <td className="py-3.5 font-medium text-white">Closing Step</td>
                    <td className="py-3.5 text-zinc-400">Handoff or disconnect</td>
                    <td className="py-3.5 text-emerald-400 font-semibold">Calendar invites + personalized follow-up drafts</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-5 p-3.5 rounded-2xl bg-zinc-950 border border-white/[0.04] text-[11px] text-zinc-400 flex items-center gap-3 text-left">
              <Terminal className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Agora Studio powers the voice infrastructure; FFlow.ph captures the business revenue.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 6. TECH STACK GRID SECTION */}
      <section id="tech-stack" className="mx-auto max-w-7xl px-6 py-24 border-t border-white/[0.03] scroll-mt-20 bg-gradient-to-b from-transparent to-zinc-950">
        <div className="text-center space-y-4 mb-16 reveal-item">
          <span className="text-xs font-bold tracking-widest uppercase text-cyan-400">LOCKED-IN PLATFORM STACK</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">Modern Developer Infrastructure</h2>
          <p className="text-sm text-zinc-450 max-w-md mx-auto">
            High performance framework selections built for sub-second latency voice interactions.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 max-w-5xl mx-auto reveal-item">
          {[
            { name: "Next.js 16", label: "React Frontend Layout", icon: Code, color: "text-cyan-400" },
            { name: "Agora SDK", label: "Sub-second RTC Voice", icon: MessageSquare, color: "text-blue-400" },
            { name: "OpenAI GPT", label: "Structured Tool-Calling", icon: Sparkles, color: "text-purple-400" },
            { name: "Couchbase", label: "Capella Real-time DB", icon: Database, color: "text-pink-400" },
            { name: "FastAPI", label: "Python Business Logic", icon: Layers, color: "text-emerald-400" }
          ].map((stack, idx) => {
            const Icon = stack.icon;
            return (
              <div key={idx} className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30 flex flex-col items-center justify-center text-center space-y-2">
                <Icon className={`w-8 h-8 ${stack.color}`} />
                <div className="font-bold text-sm text-white">{stack.name}</div>
                <div className="text-[10px] text-zinc-550">{stack.label}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 7. FOOTER */}
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
            © 2026 FFLOW.PH. POWERED BY AGORA AUDIO INTERFACES. ALL RIGHTS RESERVED.
          </div>

          <div className="flex gap-4">
            <Link href="/dashboard" className="hover:text-zinc-350 transition-colors">Dashboard</Link>
            <Link href="/campaign" className="hover:text-zinc-350 transition-colors">Campaigns</Link>
            <Link href="/leads" className="hover:text-zinc-350 transition-colors">Leads</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
