"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { AgentCard } from "@/components/AgentCard";
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
  Code,
  Mic,
  MicOff,
  Square,
  X,
  Captions,
  Activity
} from "lucide-react";
import { GlobeAnimation } from "@/components/GlobeAnimation";
import { FayeDashboard } from "@/components/FayeDashboard";
import { SequenceDiagram } from "@/components/SequenceDiagram";
import { ClassDiagram } from "@/components/ClassDiagram";
import { TechStackDiagram } from "@/components/TechStackDiagram";

// Scroll reveal observer
function useScrollReveal(mounted: boolean) {
  useEffect(() => {
    if (!mounted) return;
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
  }, [mounted]);
}

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<"sales" | "commerce">("sales");
  const [animateKey, setAnimateKey] = useState(0);
  const [demoMode, setDemoMode] = useState<"b2b" | "b2c">("b2b");
  const [animateDemoKey, setAnimateDemoKey] = useState(0);
  const [simStep, setSimStep] = useState(1);
  const demoRef = useRef<HTMLDivElement>(null);

  const [globalMode, setGlobalMode] = useState<"b2b" | "b2c">("b2b");
  const [activeSection, setActiveSection] = useState<string>("agents");
  const [techTab, setTechTab] = useState<"flow" | "model">("flow");

  const handleSetGlobalMode = (mode: "b2b" | "b2c") => {
    setGlobalMode(mode);
    if (typeof window !== "undefined") {
      localStorage.setItem("globalMode", mode);
    }
    setSelectedAgent(mode === "b2b" ? "sales" : "commerce");
    setDemoMode(mode);
    setAnimateKey(prev => prev + 1);
    setAnimateDemoKey(prev => prev + 1);
    setActiveSection("agents");
  };

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
    if (typeof window !== "undefined") {
      const savedMode = localStorage.getItem("globalMode") as "b2b" | "b2c" | null;
      if (savedMode) {
        setGlobalMode(savedMode);
        setSelectedAgent(savedMode === "b2b" ? "sales" : "commerce");
        setDemoMode(savedMode);
      }
    }

    const handleScroll = () => {
      // Overall scroll progress
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (totalScroll > 0) {
        setScrollProgress((window.scrollY / totalScroll) * 100);
      }

      // SCROLL SPY LOGIC FOR NAVBAR HIGHLIGHTS
      const sectionIds = ["agents", "demo-booking", "comparison", "tech-stack"];
      let currentActive = "agents";
      
      if (window.scrollY < 100) {
        currentActive = "agents";
      } else {
        for (const id of sectionIds) {
          const el = document.getElementById(id);
          if (el) {
            const rect = el.getBoundingClientRect();
            // If the section top has scrolled past 1/3 of the viewport
            if (rect.top <= window.innerHeight * 0.35) {
              if (id === "demo-booking") {
                currentActive = "demo";
              } else if (id === "tech-stack") {
                currentActive = "stack";
              } else {
                currentActive = id;
              }
            }
          }
        }
      }
      setActiveSection(currentActive);

      // LOCAL SCROLL LOGIC FOR DEMO (Scrollytelling)
      if (demoRef.current) {
        const rect = demoRef.current.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // When the demo section enters/is in the viewport
        if (rect.top < viewportHeight && rect.bottom > 0) {
          // Map vertical scroll through the demo section to steps 1-6
          const visibleHeight = viewportHeight + rect.height;
          const currentVisible = viewportHeight - rect.top;
          const progress = Math.max(0, Math.min(1, currentVisible / visibleHeight));
          
          // Map to 6 steps of the simulation
          const step = Math.min(6, Math.max(1, Math.ceil(progress * 7))); 
          setSimStep(step);
        }
      }
    };
    window.addEventListener("scroll", handleScroll);

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useScrollReveal(mounted);

  if (!mounted) return null;

  return (
    <div className="dark min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500 selection:text-black scroll-smooth relative">
      
      {/* Scroll indicator bar at top (Likas AI style) */}
      <div 
        className="fixed left-0 top-0 z-50 h-1 bg-gradient-to-r from-cyan-500 via-blue-500 to-purple-500 transition-all duration-100" 
        style={{ width: `${scrollProgress}%` }}
      />

      {/* Floating frosted-glass header navbar (Likas style) */}
      <nav className={`fixed left-1/2 top-5 z-40 w-[min(1180px,calc(100%-48px))] -translate-x-1/2 flex items-center justify-between rounded-full border bg-zinc-900/60 px-5 py-3.5 backdrop-blur-xl transition-all duration-500 ${
        activeSection === 'agents'
          ? (globalMode === 'b2b' ? 'border-cyan-500/20 shadow-[0_8px_30px_rgba(6,182,212,0.12)]' : 'border-purple-500/20 shadow-[0_8px_30px_rgba(168,85,247,0.12)]')
          : activeSection === 'demo'
          ? (globalMode === 'b2b' ? 'border-emerald-500/20 shadow-[0_8px_30px_rgba(16,185,129,0.12)]' : 'border-purple-500/20 shadow-[0_8px_30px_rgba(168,85,247,0.12)]')
          : activeSection === 'comparison'
          ? (globalMode === 'b2b' ? 'border-blue-500/20 shadow-[0_8px_30px_rgba(59,130,246,0.12)]' : 'border-pink-500/20 shadow-[0_8px_30px_rgba(244,63,94,0.12)]')
          : activeSection === 'stack'
          ? (globalMode === 'b2b' ? 'border-cyan-500/20 shadow-[0_8px_30px_rgba(6,182,212,0.12)]' : 'border-purple-500/20 shadow-[0_8px_30px_rgba(168,85,247,0.12)]')
          : 'border-white/5 shadow-xl shadow-black/35'
      }`}>
        <a href="#top" className="flex items-center gap-2 group">
          <div className={`relative flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr ${globalMode === 'b2b' ? 'from-cyan-500 to-blue-600' : 'from-purple-500 to-indigo-600'} font-bold text-black transition-transform duration-300 group-hover:scale-105`}>
            F
            <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 border-2 border-zinc-950 animate-pulse" />
          </div>
          <span className="text-base font-black tracking-tight text-white group-hover:text-cyan-400 transition-colors">
            FFlow<span className={globalMode === 'b2b' ? 'text-cyan-400' : 'text-purple-400'}>.ph</span>
          </span>
        </a>
        
        <div className="hidden md:flex items-center gap-6 text-xs font-semibold text-zinc-400 tracking-wider uppercase">
          <Link 
            href={globalMode === "b2b" ? "/campaign?type=sales" : "/campaign?type=commerce"} 
            onClick={() => setActiveSection("agents")}
            className={`transition-all duration-300 hover:text-white ${
              activeSection === 'agents'
                ? (globalMode === 'b2b' ? 'text-cyan-400 font-black tracking-wide border-b border-cyan-400/50 pb-0.5' : 'text-purple-400 font-black tracking-wide border-b border-purple-400/50 pb-0.5')
                : ''
            }`}
          >
            {globalMode === 'b2b' ? 'B2B Agents' : 'B2C Agents'}
          </Link>
          <a 
            href="#demo-booking" 
            onClick={() => setActiveSection("demo")}
            className={`transition-all duration-300 hover:text-white ${
              activeSection === 'demo'
                ? (globalMode === 'b2b' ? 'text-emerald-400 font-black tracking-wide border-b border-emerald-400/50 pb-0.5' : 'text-purple-400 font-black tracking-wide border-b border-purple-400/50 pb-0.5')
                : ''
            }`}
          >
            {globalMode === 'b2b' ? 'Sales Demo' : 'Store Demo'}
          </a>
          <Link 
            href="/comparison" 
            onClick={() => setActiveSection("comparison")}
            className={`transition-all duration-300 hover:text-white ${
              activeSection === 'comparison'
                ? (globalMode === 'b2b' ? 'text-blue-400 font-black tracking-wide border-b border-blue-400/50 pb-0.5' : 'text-pink-400 font-black tracking-wide border-b border-pink-400/50 pb-0.5')
                : ''
            }`}
          >
            Comparison
          </Link>
          <a 
            href="#tech-stack" 
            onClick={() => setActiveSection("stack")}
            className={`transition-all duration-300 hover:text-white ${
              activeSection === 'stack'
                ? (globalMode === 'b2b' ? 'text-cyan-400 font-black tracking-wide border-b border-cyan-400/50 pb-0.5' : 'text-purple-400 font-black tracking-wide border-b border-purple-400/50 pb-0.5')
                : ''
            }`}
          >
            Stack
          </a>
          <Link href="/dashboard" className="hover:text-white transition-all duration-200 flex items-center gap-1">
            <BarChart3 className={`w-3.5 h-3.5 ${globalMode === 'b2b' ? 'text-cyan-400' : 'text-purple-400'}`} />
            Dashboard
          </Link>
          <Link href="/leads" className="hover:text-white transition-all duration-200 flex items-center gap-1">
            <FileText className={`w-3.5 h-3.5 ${globalMode === 'b2b' ? 'text-blue-400' : 'text-pink-400'}`} />
            Records
          </Link>
        </div>

        <div className="flex items-center gap-3">
          <Link 
            href={globalMode === "b2b" ? "/campaign?type=sales" : "/campaign?type=commerce"} 
            className="rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] px-4 py-2 text-[10px] sm:text-xs font-bold text-white transition-all flex items-center gap-1.5"
          >
            <Settings className={`w-3.5 h-3.5 ${globalMode === 'b2b' ? 'text-cyan-400/70' : 'text-purple-400/70'}`} />
            Settings
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
        
        /* 3D Rotating Desktop Mockup Keyframes */
        @keyframes desktop3DRotation {
          0% {
            transform: rotateY(-12deg) rotateX(6deg) rotateZ(0deg);
          }
          50% {
            transform: rotateY(12deg) rotateX(10deg) rotateZ(1deg);
          }
          100% {
            transform: rotateY(-12deg) rotateX(6deg) rotateZ(0deg);
          }
        }
        .animate-desktop-3d {
          animation: desktop3DRotation 8s ease-in-out infinite;
          transform-style: preserve-3d;
        }

        /* 3D screen items animations */
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
      <section id="top" className="relative px-6 pt-20 pb-8 md:pt-28 flex items-center overflow-hidden min-h-0">
        
        {/* Background visual components */}
        <div className="absolute inset-0 -z-10 pointer-events-none">
          <div className="absolute top-1/3 left-1/4 -translate-x-1/2 w-[700px] h-[700px] rounded-full bg-gradient-to-tr from-cyan-500/10 via-blue-500/5 to-transparent blur-3xl" />
          <div className="absolute top-1/2 right-1/4 translate-x-1/2 w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-purple-500/5 via-pink-500/5 to-transparent blur-3xl" />
          
          <div className="absolute top-[18%] right-[-180px] h-[600px] w-[600px] border border-white/[0.02] rounded-full opacity-45 animate-[spin_120s_linear_infinite]" />
          <div className="absolute bottom-[8%] left-[-220px] h-[500px] w-[500px] border border-dashed border-white/[0.02] rounded-full opacity-35 animate-[spin_80s_linear_infinite_reverse]" />
        </div>

        <div className="mx-auto max-w-7xl w-full grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] items-center gap-8 lg:gap-12 pt-2">

          {/* Hero Left Content */}
          <div className="space-y-4 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/30 bg-cyan-500/5 px-3 py-1 text-[10px] font-bold text-cyan-400 tracking-wide uppercase">
              <Sparkles className="w-3 h-3 animate-spin" style={{ animationDuration: "6s" }} />
              Powered by Agora Conversational AI
            </div>

            {/* MODE SELECTOR BOXES */}
            <div id="mode-selector" className="grid grid-cols-2 gap-3 max-w-lg mx-auto lg:mx-0 scroll-mt-32">
              <button
                onClick={() => handleSetGlobalMode("b2b")}
                className={`group relative p-4 rounded-2xl border-2 transition-all duration-500 text-left overflow-hidden ${
                  globalMode === 'b2b'
                    ? 'border-cyan-500 bg-cyan-500/5 shadow-[0_0_30px_rgba(6,182,212,0.15)] scale-[1.02] z-10'
                    : 'border-white/5 bg-zinc-900/40 hover:border-white/20 opacity-60 grayscale-[0.5]'
                }`}
              >
                {globalMode === 'b2b' && (
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-cyan-500/20 blur-2xl rounded-full" />
                )}

                <div className={`p-2 rounded-xl w-fit mb-2 transition-colors duration-500 ${globalMode === 'b2b' ? 'bg-cyan-500 text-zinc-950' : 'bg-white/5 text-zinc-500'}`}>
                  <Building className="w-4 h-4" />
                </div>

                <div className="space-y-0.5">
                  <h3 className={`font-black text-base tracking-tight transition-colors duration-500 ${globalMode === 'b2b' ? 'text-white' : 'text-zinc-500'}`}>
                    B2B Mode
                  </h3>
                  <p className={`text-[10px] font-medium leading-snug transition-colors duration-500 ${globalMode === 'b2b' ? 'text-cyan-400/80' : 'text-zinc-600'}`}>
                    Lead Qualification, Sales Scoring & Scheduling
                  </p>
                </div>

                {globalMode === 'b2b' && (
                  <div className="absolute bottom-3 right-4 text-cyan-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </button>

              <button
                onClick={() => handleSetGlobalMode("b2c")}
                className={`group relative p-4 rounded-2xl border-2 transition-all duration-500 text-left overflow-hidden ${
                  globalMode === 'b2c'
                    ? 'border-purple-500 bg-purple-500/5 shadow-[0_0_30px_rgba(168,85,247,0.15)] scale-[1.02] z-10'
                    : 'border-white/5 bg-zinc-900/40 hover:border-white/20 opacity-60 grayscale-[0.5]'
                }`}
              >
                {globalMode === 'b2c' && (
                  <div className="absolute -right-4 -top-4 w-20 h-20 bg-purple-500/20 blur-2xl rounded-full" />
                )}

                <div className={`p-2 rounded-xl w-fit mb-2 transition-colors duration-500 ${globalMode === 'b2c' ? 'bg-purple-500 text-white' : 'bg-white/5 text-zinc-500'}`}>
                  <ShoppingBag className="w-4 h-4" />
                </div>

                <div className="space-y-0.5">
                  <h3 className={`font-black text-base tracking-tight transition-colors duration-500 ${globalMode === 'b2c' ? 'text-white' : 'text-zinc-500'}`}>
                    B2C Mode
                  </h3>
                  <p className={`text-[10px] font-medium leading-snug transition-colors duration-500 ${globalMode === 'b2c' ? 'text-purple-400/80' : 'text-zinc-600'}`}>
                    E-commerce, GCash Checkouts & Product Search
                  </p>
                </div>

                {globalMode === 'b2c' && (
                  <div className="absolute bottom-3 right-4 text-purple-500">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                )}
              </button>
            </div>

            <div className="space-y-3">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-[1.1] text-white">
                {globalMode === "b2b" ? (
                  <>
                    Turn Voice Into{" "}
                    <span className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 bg-clip-text text-transparent block mt-1">
                      Business Outcomes
                    </span>
                  </>
                ) : (
                  <>
                    Scale Your Sales With{" "}
                    <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-cyan-500 bg-clip-text text-transparent block mt-1">
                      Voice Commerce
                    </span>
                  </>
                )}
              </h1>

              <p className="text-sm sm:text-base text-zinc-300 max-w-xl leading-relaxed mx-auto lg:mx-0">
                {globalMode === "b2b" ? (
                  "Capture and qualify leads 24/7. Our B2B agents score prospects, handle objections, and book discovery calls without human intervention."
                ) : (
                  "Let your customers shop via natural voice. Our B2C agents guide buyers through your catalog, compare items, and prepare secure GCash-ready checkout references."
                )}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-4">
              <Link 
                href={globalMode === "b2b" ? "/campaign?type=sales" : "/campaign?type=commerce"}
                className={`w-full sm:w-auto rounded-full ${globalMode === 'b2b' ? 'bg-cyan-500 hover:bg-cyan-400 shadow-[0_0_30px_rgba(6,182,212,0.3)]' : 'bg-purple-500 hover:bg-purple-400 shadow-[0_0_30px_rgba(168,85,247,0.3)]'} text-zinc-950 font-bold px-8 py-4 flex items-center justify-center gap-2 transition-all hover:scale-[1.02]`}
              >
                <span>{globalMode === 'b2b' ? 'View B2B Agents' : 'View B2C Agents'}</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/dashboard"
                className="w-full sm:w-auto rounded-full bg-white/[0.06] border border-white/[0.08] hover:bg-white/[0.1] text-white font-semibold px-6 py-3 text-sm flex items-center justify-center gap-2 transition-all hover:scale-[1.02]"
              >
                <BarChart3 className={`w-4 h-4 ${globalMode === 'b2b' ? 'text-cyan-400' : 'text-purple-400'}`} />
                <span>View Dashboard</span>
              </Link>
            </div>
          </div>

          {/* Hero Right Content: 3D rotating Desktop mockup containing AI Agent Faye */}
          <div className="w-full flex items-center justify-center py-2" style={{ perspective: "1500px" }}>
            <div className="relative group w-full max-w-[580px]">
              {/* Desktop Monitor Shell */}
              <div className={`animate-desktop-3d w-full aspect-[580/360] rounded-[24px] border-[10px] border-zinc-800 bg-zinc-950 shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9),_0_0_60px_rgba(6,182,212,0.1)] relative overflow-hidden flex flex-col p-1 select-none transition-all duration-700 ${globalMode === 'b2c' ? 'shadow-[0_40px_100px_-20px_rgba(0,0,0,0.9),_0_0_60px_rgba(168,85,247,0.1)]' : ''}`}>
                
                {/* Glowing Bezel effect */}
                <div className={`absolute inset-0 rounded-[14px] border border-white/5 pointer-events-none z-10`} />

                {/* Main Screen Content: Futuristic Dashboard UI */}
                <div className="flex-1 flex flex-col p-4 z-20 relative bg-zinc-950/80 rounded-[12px] overflow-hidden border border-white/[0.03]">
                  
                  {/* Monitor Top: System Status Bar */}
                  <div className="flex items-center justify-between px-2 mb-6">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${globalMode === 'b2b' ? 'bg-cyan-400 shadow-[0_0_12px_rgba(34,211,238,0.8)]' : 'bg-purple-400 shadow-[0_0_12px_rgba(192,132,252,0.8)]'} animate-pulse`} />
                      <div className="flex flex-col">
                        <span className="text-[8px] font-black tracking-widest text-white uppercase font-mono">FFLOW_PH_CORE_v1.2</span>
                        <span className="text-[6px] text-zinc-500 font-mono">LIVE_AGENT_ENVIRONMENT</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                        <div className="w-1.5 h-1.5 rounded-full bg-zinc-800" />
                      </div>
                      <div className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/5 text-[7px] font-mono text-zinc-400">
                        128-BIT_ENCRYPTED
                      </div>
                    </div>
                  </div>

                  {/* Main Dashboard Grid - LANDSCAPE */}
                  <div className="flex-1 grid grid-cols-12 gap-4 h-full">
                    
                    {/* Left 4 Cols: System Stats & AI Visual */}
                    <div className="col-span-4 flex flex-col gap-4">
                      <div className="flex-1 relative flex items-center justify-center overflow-hidden rounded-2xl bg-white/[0.01] border border-white/[0.04] shadow-inner">
                        <div className="scale-[1.1] opacity-90 transform-gpu">
                          <GlobeAnimation isSpeaking={true} />
                        </div>
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          <div className="w-4 h-[1px] bg-white/10" />
                          <div className="w-6 h-[1px] bg-white/10" />
                        </div>
                      </div>
                      
                      <div className="h-20 rounded-2xl bg-zinc-900/60 border border-white/[0.03] p-3 flex items-center justify-between">
                        <div className="flex flex-col gap-1">
                          <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Voice Latency</span>
                          <span className={`text-sm font-black font-mono ${globalMode === 'b2b' ? 'text-cyan-400' : 'text-purple-400'}`}>124ms</span>
                        </div>
                        <div className="flex items-end gap-[2px] h-8">
                          {[0.4, 0.7, 0.5, 0.9, 0.6, 1.0, 0.3].map((h, i) => (
                            <div key={i} className={`w-1 rounded-full ${globalMode === 'b2b' ? 'bg-cyan-500/30' : 'bg-purple-500/30'}`} style={{ height: `${h * 100}%` }}>
                              <div className={`w-full rounded-full ${globalMode === 'b2b' ? 'bg-cyan-400' : 'bg-purple-400'} animate-pulse`} style={{ height: '30%' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Middle 5 Cols: Main Activity Feed */}
                    <div className="col-span-5 flex flex-col gap-4">
                      <div className="flex-1 rounded-2xl bg-zinc-900/40 border border-white/[0.03] p-4 flex flex-col gap-3">
                         <div className="flex justify-between items-center border-b border-white/[0.03] pb-2">
                            <span className="text-[8px] font-black text-white uppercase tracking-tighter">Real-time Transcription</span>
                            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                         </div>
                         <div className="space-y-2">
                           <div className="flex gap-2">
                              <div className="w-1 h-3 rounded-full bg-zinc-700 mt-1" />
                              <div className="flex flex-col gap-1">
                                <div className="w-32 h-2 bg-zinc-800 rounded-full" />
                                <div className="w-24 h-1.5 bg-zinc-900 rounded-full" />
                              </div>
                           </div>
                           <div className="flex gap-2 justify-end text-right">
                              <div className="flex flex-col items-end gap-1">
                                <div className={`w-40 h-2 ${globalMode === 'b2b' ? 'bg-cyan-500/10' : 'bg-purple-500/10'} rounded-full`} />
                                <div className={`w-28 h-1.5 ${globalMode === 'b2b' ? 'bg-cyan-500/5' : 'bg-purple-500/5'} rounded-full`} />
                              </div>
                              <div className={`w-1 h-3 rounded-full ${globalMode === 'b2b' ? 'bg-cyan-400' : 'bg-purple-400'} mt-1`} />
                           </div>
                         </div>
                         <div className="mt-auto flex gap-2">
                            <div className="flex-1 h-8 rounded-xl bg-zinc-950 border border-white/[0.02] flex items-center px-3">
                               <div className="w-2 h-2 rounded-full bg-white/5 animate-pulse" />
                            </div>
                            <div className={`w-8 h-8 rounded-xl ${globalMode === 'b2b' ? 'bg-cyan-500' : 'bg-purple-500'} flex items-center justify-center`}>
                               <Mic className="w-3.5 h-3.5 text-black" />
                            </div>
                         </div>
                      </div>
                    </div>

                    {/* Right 3 Cols: Modular Widgets */}
                    <div className="col-span-3 flex flex-col gap-4">
                      {/* Score Meter Panel */}
                      <div className="flex-1 rounded-2xl bg-zinc-900/80 border border-white/[0.05] p-3 flex flex-col items-center justify-center gap-2">
                        <div className="relative w-14 h-14">
                          <svg className="w-full h-full -rotate-90">
                            <circle cx="28" cy="28" r="24" fill="transparent" stroke="currentColor" strokeWidth="3" className="text-zinc-800" />
                            <circle 
                              cx="28" cy="28" r="24" 
                              fill="transparent" stroke="currentColor" strokeWidth="3" 
                              strokeDasharray="150" strokeDashoffset="45"
                              className={globalMode === 'b2b' ? 'text-cyan-500' : 'text-purple-500'} 
                            />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-xs font-black text-white">75</span>
                          </div>
                        </div>
                        <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest">Lead Score</span>
                      </div>

                      {/* Small Grid widget */}
                      <div className="h-28 rounded-2xl bg-zinc-900/80 border border-white/[0.05] p-3">
                         <div className="grid grid-cols-7 gap-1 h-full opacity-40">
                            {Array.from({ length: 28 }).map((_, i) => (
                              <div 
                                key={i} 
                                className={`rounded-[2px] ${
                                  i % 7 === 0 ? (globalMode === 'b2b' ? 'bg-cyan-500/20' : 'bg-purple-500/20') : 'bg-zinc-800'
                                }`} 
                              />
                            ))}
                         </div>
                      </div>
                    </div>

                  </div>

                  {/* Desktop Footer: System HUD */}
                  <div className="mt-4 pt-3 border-t border-white/[0.03] flex items-center justify-between px-2">
                    <div className="flex items-center gap-6">
                      <div className="flex items-center gap-2">
                        <Activity className={`w-3.5 h-3.5 ${globalMode === 'b2b' ? 'text-cyan-400' : 'text-purple-400'}`} />
                        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Signal_Strength: 98%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Database className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="text-[7px] font-mono text-zinc-500 uppercase tracking-widest">Storage_Load: 12GB/TB</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-5 w-[1px] bg-zinc-800" />
                      <span className={`text-[8px] font-mono font-black ${globalMode === 'b2b' ? 'text-cyan-400' : 'text-purple-400'} uppercase tracking-widest`}>Node_PH-01: READY</span>
                    </div>
                  </div>

                </div>

              </div>

              {/* Desktop Monitor Stand */}
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[-40px] w-28 h-20 bg-gradient-to-b from-zinc-800 to-zinc-900 border-x border-zinc-700 z-0 animate-desktop-3d" style={{ animationDelay: '0s', clipPath: 'polygon(20% 0%, 80% 0%, 100% 100%, 0% 100%)' }} />
              <div className="absolute left-1/2 -translate-x-1/2 bottom-[-60px] w-48 h-4 bg-zinc-800 rounded-full border border-zinc-700 shadow-2xl z-0 animate-desktop-3d" style={{ animationDelay: '0s' }} />
              
              {/* Reflection/Glow below */}
              <div className={`absolute left-1/2 -translate-x-1/2 bottom-[-80px] w-64 h-8 ${globalMode === 'b2b' ? 'bg-cyan-500/10' : 'bg-purple-500/10'} blur-3xl rounded-full pointer-events-none`} />
            </div>
          </div>

        </div>
      </section>

      {/* 3. AGENT CARDS SECTION */}
      <section id="agents" className="mx-auto max-w-7xl px-6 py-16 scroll-mt-20">
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
              onClick={() => handleSetGlobalMode("b2b")}
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
              onClick={() => handleSetGlobalMode("b2c")}
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

      {/* 4. INTERACTIVE CALENDAR & COMMERCE DEMO SECTION - REMOVED REVEAL FOR STABILITY */}
      <section id="demo-booking" className="mx-auto max-w-7xl px-6 py-24 border-t border-white/[0.03] scroll-mt-20">
        <div className="text-center space-y-4 mb-10">
          <span className={`text-xs font-bold tracking-widest uppercase ${globalMode === 'b2b' ? 'text-cyan-400' : 'text-purple-400'}`}>INTERACTIVE PREVIEW</span>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
            {globalMode === 'b2b' ? 'Lead Qualification Sandbox' : 'Voice Commerce Sandbox'}
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            {globalMode === 'b2b' 
              ? 'Test how our agents qualify business leads and book them directly into your schedule.' 
              : 'Experience a conversational checkout journey—from preference matching to GCash-ready references.'}
          </p>
        </div>

        {/* B2B vs B2C Sandbox Mode Selector */}
        <div className="flex justify-center mb-10">
          <div className="inline-flex p-1 rounded-full border border-white/[0.05] bg-zinc-950/80 backdrop-blur-xl">
            <button
              onClick={() => handleSetGlobalMode("b2b")}
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
              onClick={() => handleSetGlobalMode("b2c")}
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
        
        <div key={animateDemoKey} className="space-y-12">
          {/* New Sales/Commerce Workflow Demo Section - ALWAYS VISIBLE */}
          <div className="text-left">
            <div className="text-center space-y-4 mb-10">
              <span className={`text-[10px] font-black tracking-[0.2em] uppercase ${globalMode === 'b2b' ? 'text-cyan-400' : 'text-purple-400'}`}>System Logic Demo</span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                Faye&apos;s System Intelligence
              </h3>
              <p className="text-sm text-zinc-500 max-w-xl mx-auto italic">
                Observe how Faye processes voice transcripts into structured business data in real-time.
              </p>
            </div>

            <div className="relative group">
              {/* High-intensity glow */}
              <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-transparent to-purple-500/20 blur-3xl opacity-100 transition-opacity" />
              
              <div className="relative rounded-[40px] border-4 border-white/10 bg-zinc-900 p-4 sm:p-8 overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
                {/* Simulated playback status */}
                <div className="absolute top-6 right-8 z-30 flex items-center gap-3">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500 text-[10px] font-black text-black uppercase tracking-widest shadow-lg">
                    <div className="w-2 h-2 rounded-full bg-black animate-pulse" />
                    LIVE_WORKFLOW_SYNC
                  </div>
                </div>

                <div className="max-w-5xl mx-auto h-[800px] flex flex-col relative z-20" ref={demoRef}>
                  <FayeDashboard 
                    type={demoMode === "b2b" ? "sales" : "commerce"} 
                    transcript={[]} 
                    simulationActive={true}
                    simulationStep={simStep}
                  />
                </div>
              </div>
            </div>
            
            <div className="mt-8 flex justify-center">
              <Link 
                href="/agent" 
                className={`flex items-center gap-2 px-8 py-3 rounded-full border-2 font-bold text-xs uppercase tracking-widest transition-all ${
                  globalMode === 'b2b' 
                    ? 'border-cyan-500/30 text-cyan-400 hover:bg-cyan-500 hover:text-black' 
                    : 'border-purple-500/30 text-purple-400 hover:bg-purple-500 hover:text-white'
                }`}
              >
                Launch Production Console
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
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

      {/* 6. ORCHESTRATION PIPELINE FLOW SECTION */}
      <section id="tech-stack" className="mx-auto max-w-7xl px-6 py-24 border-t border-white/[0.03] scroll-mt-20 bg-gradient-to-b from-transparent to-zinc-950">
        <div className="text-center space-y-4 mb-8 reveal-item">
          <span className={`text-xs font-bold tracking-widest uppercase ${globalMode === 'b2b' ? 'text-cyan-400' : 'text-purple-400'}`}>PIPELINE INFRASTRUCTURE & REFERENCE</span>
          <h2 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            {techTab === "flow" ? "Voice Orchestration Flow" : "System Configuration Models"}
          </h2>
          <p className="text-sm text-zinc-400 max-w-xl mx-auto">
            {techTab === "flow" 
              ? "High-performance real-time communications flow mapping ASR processing, context injection, and direct control loops."
              : "UML diagram showing configuration objects, LLM attributes, and message structure models."}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex justify-center mb-12 reveal-item">
          <div className="flex p-1.5 rounded-2xl bg-zinc-950/80 border border-white/[0.05] shadow-2xl relative z-10 backdrop-blur-md animate-in fade-in duration-300">
            <button
              onClick={() => setTechTab("flow")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 duration-300 relative ${
                techTab === "flow"
                  ? (globalMode === "b2b" ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "bg-purple-500 text-black shadow-lg shadow-purple-500/20")
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Flow Sequence
            </button>
            <button
              onClick={() => setTechTab("model")}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 duration-300 relative ${
                techTab === "model"
                  ? (globalMode === "b2b" ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "bg-purple-500 text-black shadow-lg shadow-purple-500/20")
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              Data Models
            </button>
          </div>
        </div>

        <div className="reveal-item">
          {techTab === "flow" ? <SequenceDiagram /> : <ClassDiagram />}
        </div>

        <div className="mt-16 reveal-item">
          <TechStackDiagram />
        </div>

        {/* MVP Recommendations / Strategy Sub-section */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto reveal-item">
          {/* Card 1: Hackathon Hosting Recommendation */}
          <div className="relative group overflow-hidden rounded-3xl border border-white/[0.05] bg-zinc-900/20 p-8 hover:bg-zinc-900/30 hover:border-white/[0.08] transition-all">
            {/* Ambient glow */}
            <div className="absolute -inset-10 bg-gradient-to-r from-cyan-500/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Zap className="w-6 h-6" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Hackathon Velocity</h4>
                <p className="text-[9px] text-zinc-500 leading-relaxed uppercase font-mono tracking-widest">Recommended BE Hosting</p>
                <div className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mt-2">
                  GCP
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed pt-1">
                  Selected for extreme deployment simplicity, zero-config SSL, and rapid database connection setup.
                </p>
              </div>
            </div>
          </div>

          {/* Card 2: Development Priority */}
          <div className="relative group overflow-hidden rounded-3xl border border-white/[0.05] bg-zinc-900/20 p-8 hover:bg-zinc-900/30 hover:border-white/[0.08] transition-all">
            {/* Ambient glow */}
            <div className="absolute -inset-10 bg-gradient-to-r from-purple-500/10 to-transparent blur-2xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
            
            <div className="flex items-start gap-4 relative z-10">
              <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div className="space-y-3 w-full">
                <h4 className="text-sm font-bold text-white uppercase tracking-wider">Development Strategy</h4>
                <p className="text-[9px] text-zinc-550 leading-relaxed uppercase font-mono tracking-widest">Priority Roadmap</p>
                <div className="space-y-2 pt-1">
                  {[
                    "Build the sales workflow first",
                    "Connect Agora voice",
                    "Polish the demo"
                  ].map((priority, index) => (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-purple-500/20 border border-purple-500/30 text-[10px] font-bold text-purple-400">
                        {index + 1}
                      </div>
                      <span className="text-xs text-zinc-300 font-semibold">{priority}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
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
            <Link href={globalMode === "b2b" ? "/campaign?type=sales" : "/campaign?type=commerce"} className="hover:text-zinc-350 transition-colors">Campaigns</Link>
            <Link href="/leads" className="hover:text-zinc-350 transition-colors">Leads</Link>
          </div>
        </div>
      </footer>

    </div>
  );
}
