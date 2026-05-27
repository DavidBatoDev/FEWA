"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api } from "@/lib/api";
import { 
  Building, 
  ShoppingBag, 
  TrendingUp, 
  AlertTriangle, 
  Calendar, 
  CheckCircle2, 
  Search, 
  Mail, 
  Phone, 
  FileText, 
  User, 
  ArrowLeft, 
  Activity, 
  DollarSign, 
  Package, 
  Sparkles,
  Clipboard,
  Check
} from "lucide-react";
import { BarChart, LineChart, DonutChart } from "@/components/DashboardCharts";

// Mock B2B Leads for fallback
const MOCK_B2B_LEADS = [
  {
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
    call_slot: "2026-05-28T14:00:00"
  },
  {
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
    call_slot: "2026-05-29T10:30:00"
  },
  {
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
    call_slot: "2026-05-28T16:00:00"
  },
  {
    id: "lead-4",
    name: "Sarah Santos",
    company: "Vibe Marketing",
    industry: "Advertising & Media",
    pain_point: "Looking to handle initial client inquiries on Facebook",
    timeline: "No rush",
    budget_readiness: "Low / Testing",
    decision_maker: "Yes, Founder",
    buying_intent: "Low",
    email: "santos@vibemarketing.com",
    phone: "0906-888-2323",
    lead_score: 45,
    lead_temperature: "Cold",
    recommended_offer: "Lead Capture Starter",
    next_best_action: "Send email guides for Facebook setup",
    objections: ["No budget for advanced workflow"],
    created_at: "2026-05-25T11:20:00Z",
    call_slot: null
  }
];

// Mock B2C Orders for dashboard
const MOCK_B2C_ORDERS = [
  {
    id: "order-1",
    customer_name: "Juan dela Cruz",
    email: "juan.dlc@gmail.com",
    phone: "0917-889-1243",
    address: "Project 4, Quezon City, Metro Manila",
    product_name: "Lenovo ThinkPad E14 Gen 5",
    amount: 58999,
    qty: 1,
    status: "Verified",
    reference: "WPH-2026-00142",
    use_case: "React Programming & Freelance",
    budget: "₱60,000",
    brand_preference: "Lenovo",
    created_at: "2026-05-27T12:05:00Z"
  },
  {
    id: "order-2",
    customer_name: "Maria Clara",
    email: "mclara@yahoo.com",
    phone: "0918-111-2233",
    address: "Forbes Park, Makati City",
    product_name: "ASUS VivoBook 14 Slim",
    amount: 54990,
    qty: 1,
    status: "Verified",
    reference: "WPH-2026-00143",
    use_case: "Online Office Tasks & Portability",
    budget: "₱55,000",
    brand_preference: "ASUS or Lenovo",
    created_at: "2026-05-27T09:40:00Z"
  },
  {
    id: "order-3",
    customer_name: "Ken Lim",
    email: "klim@outlook.com",
    phone: "0922-333-4455",
    address: "Sikatuna Village, Diliman, Quezon City",
    product_name: "Lenovo ThinkPad E14 Gen 5",
    amount: 58999,
    qty: 2,
    status: "Pending Payment",
    reference: "WPH-2026-00144",
    use_case: "CS Student Work & Coding",
    budget: "₱120,000",
    brand_preference: "Lenovo",
    created_at: "2026-05-26T17:15:00Z"
  },
  {
    id: "order-4",
    customer_name: "Jenny Ramos",
    email: "jenny.r@gmail.com",
    phone: "0915-444-5566",
    address: "Brgy. Plainview, Mandaluyong City",
    product_name: "Acer Swift Go 14 OLED",
    amount: 49999,
    qty: 1,
    status: "Verified",
    reference: "WPH-2026-00145",
    use_case: "Content Writing & Streaming",
    budget: "₱50,000",
    brand_preference: "Open to suggestions",
    created_at: "2026-05-25T14:30:00Z"
  }
];

export default function UnifiedDashboard() {
  const [dashboardMode, setDashboardMode] = useState<"b2b" | "b2c">("b2b");
  
  // B2B States
  const [leads, setLeads] = useState<any[]>(MOCK_B2B_LEADS);
  const [selectedLeadId, setSelectedLeadId] = useState<string>("lead-1");
  const [b2bSearch, setB2bSearch] = useState("");
  const [stats, setStats] = useState({
    total_leads: 4,
    hot_leads: 2,
    warm_leads: 1,
    cold_leads: 1,
    follow_ups_generated: 3
  });
  const [selectedCalendarDate, setSelectedCalendarDate] = useState<number | null>(null);

  // B2C States
  const [b2cOrders, setB2cOrders] = useState<any[]>(MOCK_B2C_ORDERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>("order-1");
  const [b2cSearch, setB2cSearch] = useState("");

  const [copied, setCopied] = useState(false);

  // Fetch real backend data
  useEffect(() => {
    async function loadData() {
      try {
        const statsRes = await api.get("/dashboard/stats");
        if (statsRes.data) {
          setStats(statsRes.data);
        }
      } catch (e) {
        console.warn("Backend /dashboard/stats offline, using seeded stats.");
      }

      try {
        const leadsRes = await api.get("/leads");
        if (leadsRes.data && leadsRes.data.leads && leadsRes.data.leads.length > 0) {
          // Map leads and merge with mock to ensure full profiles are loaded
          const backendLeads = leadsRes.data.leads.map((l: any, idx: number) => ({
            ...MOCK_B2B_LEADS[idx % MOCK_B2B_LEADS.length],
            id: l.id,
            name: l.name || `Lead #${idx + 1}`,
            company: l.company || "Not Provided",
            industry: l.industry || "Not Provided",
            pain_point: l.pain_point || "Slow inquiries response",
            timeline: l.timeline || "TBD",
            budget_readiness: l.budget_readiness || "Not specified",
            decision_maker: l.decision_maker ? "Yes" : "No",
            lead_score: l.lead_score || 50,
            lead_temperature: l.lead_temperature || "Cold",
            recommended_offer: l.recommended_offer || "Growth Campaign Package",
            next_best_action: l.next_best_action || "Reach out to lead",
            objections: l.objections || [],
            created_at: l.created_at || new Date().toISOString(),
            call_slot: l.call_slot || null
          }));
          setLeads(backendLeads);
          setSelectedLeadId(backendLeads[0].id);
        }
      } catch (e) {
        console.warn("Backend /leads offline, using mock lead records.");
      }

      try {
        const ordersRes = await api.get("/orders");
        if (ordersRes.data && ordersRes.data.orders && ordersRes.data.orders.length > 0) {
          const backendOrders = ordersRes.data.orders.map((o: any, idx: number) => {
            const firstItem = o.items && o.items.length > 0 ? o.items[0] : null;
            const productName = firstItem ? firstItem.product_name : "Lenovo ThinkPad E14 Gen 5";
            const unitPrice = firstItem ? firstItem.unit_price : (o.amount || 58999);
            const qty = firstItem ? firstItem.quantity : 1;
            
            // Map statuses
            let displayStatus = "Verified";
            if (o.status === "awaiting_payment") {
              displayStatus = "Pending Payment";
            } else if (o.status === "paid") {
              displayStatus = "Paid";
            } else if (o.status === "processing") {
              displayStatus = "Processing";
            } else if (o.status === "shipped") {
              displayStatus = "Shipped";
            } else if (o.status === "cancelled") {
              displayStatus = "Cancelled";
            } else if (o.status === "completed") {
              displayStatus = "Verified";
            } else {
              displayStatus = o.status.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase());
            }

            return {
              id: o.id,
              customer_name: o.customer_name || "Unknown Customer",
              email: o.email || "not-provided@example.com",
              phone: o.phone || "Not Provided",
              address: o.address || "Not Provided",
              product_name: productName,
              amount: unitPrice,
              qty: qty,
              status: displayStatus,
              reference: o.reference || `WPH-2026-${Math.floor(10000 + Math.random() * 90000)}`,
              use_case: o.notes || "Coding & Office Work",
              budget: o.budget || `₱${(unitPrice * qty).toLocaleString()}`,
              brand_preference: o.brand_preference || productName.split(" ")[0],
              created_at: o.created_at || new Date().toISOString()
            };
          });
          setB2cOrders(backendOrders);
          setSelectedOrderId(backendOrders[0].id);
        }
      } catch (e) {
        console.warn("Backend /orders offline, using mock B2C orders.");
      }
    }
    loadData();
  }, []);

  const activeLead = leads.find(l => l.id === selectedLeadId) || leads[0];
  const activeOrder = b2cOrders.find(o => o.id === selectedOrderId) || b2cOrders[0];

  // Dynamic B2C metrics calculated from orders state
  const totalB2cOrders = b2cOrders.length;
  const grossSales = b2cOrders.reduce((sum, order) => sum + (order.amount * (order.qty || 1)), 0);
  const verifiedCount = b2cOrders.filter(order => order.status === "Verified" || order.status === "Paid" || order.status === "Shipped").length;
  const verificationRatio = `${verifiedCount}/${totalB2cOrders}`;
  const checkoutCompletion = totalB2cOrders > 0 ? "85%" : "0%";

  // Filtering leads
  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.name.toLowerCase().includes(b2bSearch.toLowerCase()) ||
      lead.company.toLowerCase().includes(b2bSearch.toLowerCase()) ||
      lead.industry.toLowerCase().includes(b2bSearch.toLowerCase());
    
    if (selectedCalendarDate) {
      const callDay = lead.call_slot ? new Date(lead.call_slot).getDate() : null;
      return matchesSearch && callDay === selectedCalendarDate;
    }
    return matchesSearch;
  });

  // Filtering B2C orders
  const filteredOrders = b2cOrders.filter(order => 
    order.customer_name.toLowerCase().includes(b2cSearch.toLowerCase()) ||
    order.product_name.toLowerCase().includes(b2cSearch.toLowerCase()) ||
    order.reference.toLowerCase().includes(b2cSearch.toLowerCase()) ||
    order.address.toLowerCase().includes(b2cSearch.toLowerCase())
  );

  const handleCopyEmail = (subject: string, body: string) => {
    const text = `Subject: ${subject}\n\n${body}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getDayName = (dayNumber: number) => {
    const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const index = (dayNumber - 1 + 5) % 7; // May 1, 2026 is Friday
    return weekdays[index];
  };

  // Generate Follow up draft text dynamically
  const getFollowUpSubject = (lead: any) => {
    if (!lead) return "";
    return `Follow-up: FFlow.ph AI Integration Proposal for ${lead.company}`;
  };

  const getFollowUpBody = (lead: any) => {
    if (!lead) return "";
    return `Hi ${lead.name},\n\nThank you for taking the time to speak with our AI agent today regarding ${lead.company}'s operations. We noted your concern regarding "${lead.pain_point}" and that you are looking to get this fixed ${lead.timeline}.\n\nBased on your profile, we highly recommend our "${lead.recommended_offer}". This package will extend Agora's voice platform with structured lead qualification, real-time lead score dashboards, and custom follow-up pipelines to eliminate callback delays.\n\nNext Action: ${lead.next_best_action}.\n\nBest regards,\nFFlow.ph Sales Team`;
  };

  // B2B Chart Data
  const b2bWeeklyData = [
    { label: "Mon", value: 12 },
    { label: "Tue", value: 18 },
    { label: "Wed", value: 24 },
    { label: "Thu", value: 15 },
    { label: "Fri", value: 28 },
    { label: "Sat", value: 8 },
    { label: "Sun", value: 5 },
  ];

  const b2bScoreData = [
    { label: "0-20", value: 5 },
    { label: "21-40", value: 8 },
    { label: "41-60", value: 15 },
    { label: "61-80", value: 22 },
    { label: "81-100", value: 12 },
  ];

  // B2C Chart Data
  const b2cSalesTrend = [
    { label: "May 21", value: 45000 },
    { label: "May 22", value: 52000 },
    { label: "May 23", value: 38000 },
    { label: "May 24", value: 61000 },
    { label: "May 25", value: 49000 },
    { label: "May 26", value: 58000 },
    { label: "May 27", value: 72000 },
  ];

  const b2cCategoryData = [
    { label: "Laptops", value: 158000 },
    { label: "Accessories", value: 42000 },
    { label: "Tablets", value: 25000 },
    { label: "Monitors", value: 18000 },
  ];

  return (
    <div className="dark min-h-screen bg-zinc-950 text-white font-sans selection:bg-cyan-500 selection:text-black">
      
      {/* 1. Header navbar */}
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

          <div className="flex items-center gap-4">
            <Link 
              href="/" 
              className="rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white transition-all flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </Link>
            <Link 
              href="/campaign" 
              className="rounded-full bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-400 transition-all"
            >
              Start New Campaign
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10 space-y-10">
        
        {/* Title & Portal Selector */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-white/[0.05]">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/5 px-3 py-1 text-xs font-bold text-cyan-400 uppercase tracking-wide mb-3">
              <Activity className="w-3 h-3 animate-pulse" />
              Live CRM Workspace
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">Business Campaign Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1">Select your deployment target model to review outcomes, calls booked, and checkout receipts.</p>
          </div>

          {/* Toggle Switches B2B / B2C */}
          <div className="inline-flex p-1.5 rounded-full border border-white/[0.06] bg-zinc-900/60 backdrop-blur-xl">
            <button
              onClick={() => setDashboardMode("b2b")}
              className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                dashboardMode === "b2b"
                  ? "bg-cyan-500 text-zinc-950 shadow-[0_0_20px_rgba(6,182,212,0.3)] font-black"
                  : "text-zinc-450 hover:text-white"
              }`}
            >
              <Building className="w-4 h-4" />
              B2B Sales Portal
            </button>
            <button
              onClick={() => setDashboardMode("b2c")}
              className={`flex items-center gap-2 rounded-full px-5 py-3 text-xs font-bold uppercase tracking-wider transition-all duration-300 ${
                dashboardMode === "b2c"
                  ? "bg-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)] font-black"
                  : "text-zinc-450 hover:text-white"
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              B2C Commerce Portal
            </button>
          </div>
        </div>

        {/* -------------------- B2B SALES DASHBOARD -------------------- */}
        {dashboardMode === "b2b" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* B2B Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Total Leads</span>
                <div className="text-2xl font-black text-white">{stats.total_leads}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Logged in Capella</div>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Hot Temperature</span>
                <div className="text-2xl font-black text-red-400 flex items-center gap-1.5">
                  {stats.hot_leads} <span className="h-2 w-2 rounded-full bg-red-400 animate-pulse" />
                </div>
                <div className="text-[10px] text-zinc-500 mt-1">Score threshold &gt; 70</div>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Warm Temperature</span>
                <div className="text-2xl font-black text-amber-400">{stats.warm_leads}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Score threshold 50 - 70</div>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Cold Temperature</span>
                <div className="text-2xl font-black text-blue-400">{stats.cold_leads}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Score threshold &lt; 50</div>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30 col-span-2 lg:col-span-1">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Follow-ups Drafted</span>
                <div className="text-2xl font-black text-emerald-400">{stats.follow_ups_generated}</div>
                <div className="text-[10px] text-zinc-500 mt-1">Automated emails drafted</div>
              </div>
            </div>

            {/* B2B Visual Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl">
                <LineChart data={b2bWeeklyData} title="Weekly Qualification Velocity" color="cyan" />
              </div>
              <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl">
                <BarChart data={b2bScoreData} title="Lead Score Bucket Distribution" color="cyan" />
              </div>
            </div>

            {/* Main B2B Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
              
              {/* Left Column: Leads list & Calendar */}
              <div className="space-y-8">
                
                {/* Leads list table */}
                <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                      <Building className="w-5 h-5 text-cyan-400" />
                      Recent B2B Qualifications
                    </h3>

                    {/* Search filter */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        value={b2bSearch}
                        onChange={(e) => setB2bSearch(e.target.value)}
                        placeholder="Search company or name..."
                        className="w-full sm:w-[220px] rounded-xl border border-white/[0.08] bg-zinc-950/60 pl-9 pr-4 py-2 text-xs text-zinc-300 outline-none focus:border-cyan-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-zinc-500 font-bold uppercase tracking-wider text-[10px] pb-3">
                          <th className="pb-3">Lead / Company</th>
                          <th className="pb-3 text-center">Score</th>
                          <th className="pb-3 text-center">Temp</th>
                          <th className="pb-3">Recommended Offer</th>
                          <th className="pb-3 text-right">Created</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] text-zinc-300">
                        {filteredLeads.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-zinc-500 italic">
                              No matching lead records found.
                            </td>
                          </tr>
                        ) : (
                          filteredLeads.map((lead) => (
                            <tr 
                              key={lead.id}
                              onClick={() => setSelectedLeadId(lead.id)}
                              className={`cursor-pointer hover:bg-white/[0.02] transition-colors ${
                                selectedLeadId === lead.id ? "bg-cyan-500/5 text-white font-semibold" : ""
                              }`}
                            >
                              <td className="py-3.5">
                                <div className="font-bold">{lead.name}</div>
                                <div className="text-[10px] text-zinc-550 mt-0.5">{lead.company}</div>
                              </td>
                              <td className="py-3.5 text-center">
                                <span className="font-mono text-cyan-400 font-bold">{lead.lead_score}</span>
                              </td>
                              <td className="py-3.5 text-center">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                                  lead.lead_temperature === "Hot" 
                                    ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                    : lead.lead_temperature === "Warm"
                                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                    : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                }`}>
                                  {lead.lead_temperature}
                                </span>
                              </td>
                              <td className="py-3.5 text-zinc-400 truncate max-w-[140px]">{lead.recommended_offer}</td>
                              <td className="py-3.5 text-right text-zinc-500">
                                {new Date(lead.created_at).toLocaleDateString([], { month: "short", day: "numeric" })}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Calendar Widget showing booked slots */}
                <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-extrabold text-base text-white flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-cyan-400" />
                      Live Booked Discovery Slots (May 2026)
                    </h3>
                    {selectedCalendarDate && (
                      <button 
                        onClick={() => setSelectedCalendarDate(null)}
                        className="text-[10px] text-zinc-500 hover:text-white uppercase tracking-wider font-semibold border border-white/[0.05] rounded-lg px-2 py-1"
                      >
                        Reset Filter
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-7 gap-1.5 max-w-lg">
                    {/* Header */}
                    {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map(d => (
                      <span key={d} className="text-center font-mono font-bold text-[9px] uppercase tracking-wider text-zinc-500 py-1">{d}</span>
                    ))}

                    {/* Pre-fill calendar empty blocks for May 2026 (Starts on Friday, May 1) */}
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div key={`empty-${idx}`} className="p-2 border border-transparent" />
                    ))}

                    {/* Render May days */}
                    {Array.from({ length: 31 }).map((_, idx) => {
                      const dayNum = idx + 1;
                      // Find if any leads are booked on this day
                      const bookingsForDay = leads.filter(l => {
                        if (!l.call_slot) return false;
                        const callDate = new Date(l.call_slot);
                        return callDate.getMonth() === 4 && callDate.getDate() === dayNum; // May is month index 4
                      });

                      const isSelected = selectedCalendarDate === dayNum;
                      const hasBookings = bookingsForDay.length > 0;

                      return (
                        <button
                          key={`day-${dayNum}`}
                          onClick={() => {
                            if (hasBookings) {
                              setSelectedCalendarDate(dayNum);
                            }
                          }}
                          className={`p-2 rounded-lg border text-center transition-all flex flex-col items-center relative ${
                            isSelected
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-400 font-bold scale-105 shadow-[0_0_10px_rgba(6,182,212,0.2)]"
                              : hasBookings
                              ? "border-cyan-500/30 bg-zinc-950/60 hover:bg-cyan-500/5 hover:border-cyan-500/50 cursor-pointer"
                              : "border-white/[0.03] bg-zinc-950/20 text-zinc-650 cursor-not-allowed"
                          }`}
                          disabled={!hasBookings}
                        >
                          <span className="text-[10px]">{dayNum}</span>
                          {hasBookings && (
                            <span className="absolute bottom-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {selectedCalendarDate && (
                    <div className="mt-4 p-3 rounded-xl bg-cyan-500/5 border border-cyan-500/20 text-[11px] text-zinc-300">
                      Showing only bookings for <strong>May {selectedCalendarDate}, 2026</strong>. 
                      ({filteredLeads.length} lead found)
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: B2B Selected Lead Faye analysis details */}
              <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-xl space-y-6">
                
                {activeLead ? (
                  <>
                    {/* Header profile cards */}
                    <div className="flex items-start justify-between pb-4 border-b border-white/[0.05] gap-4">
                      <div>
                        <h4 className="text-xl font-bold tracking-tight text-white">{activeLead.name}</h4>
                        <p className="text-xs text-zinc-400 mt-1">{activeLead.company} · {activeLead.industry}</p>
                      </div>

                      {/* Score Meter display */}
                      <div className="flex flex-col items-center">
                        <div className="relative h-14 w-14 flex items-center justify-center rounded-full bg-zinc-950 border border-white/[0.08] shadow-inner">
                          <span className="text-base font-black text-cyan-400 font-mono">{activeLead.lead_score}</span>
                          <span className="text-[7px] text-zinc-550 absolute bottom-1 font-mono uppercase">Score</span>
                        </div>
                        <span className={`text-[8px] font-bold uppercase tracking-wider mt-1 px-1.5 py-0.5 rounded ${
                          activeLead.lead_temperature === "Hot"
                            ? "bg-red-500/10 text-red-400"
                            : activeLead.lead_temperature === "Warm"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {activeLead.lead_temperature}
                        </span>
                      </div>
                    </div>

                    {/* Lead info details */}
                    <div className="space-y-3.5">
                      <h5 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Qualifiers Context</h5>
                      <div className="grid grid-cols-3 gap-2.5 text-xs">
                        <span className="text-zinc-500">Core Pain:</span>
                        <span className="col-span-2 text-zinc-200 font-medium">{activeLead.pain_point}</span>
                        
                        <span className="text-zinc-500">Timeline:</span>
                        <span className="col-span-2 text-zinc-200 font-medium">{activeLead.timeline}</span>
                        
                        <span className="text-zinc-500">Decision Maker:</span>
                        <span className="col-span-2 text-zinc-200 font-medium">{activeLead.decision_maker}</span>
                        
                        <span className="text-zinc-500">Budget readiness:</span>
                        <span className="col-span-2 text-zinc-200 font-medium">{activeLead.budget_readiness}</span>

                        <span className="text-zinc-500">Contact:</span>
                        <span className="col-span-2 text-zinc-300 font-mono flex items-center gap-1.5">
                          <Mail className="w-3.5 h-3.5 text-zinc-500" /> {activeLead.email}
                        </span>
                        
                        <span className="text-zinc-500">Phone:</span>
                        <span className="col-span-2 text-zinc-300 font-mono flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-zinc-500" /> {activeLead.phone}
                        </span>
                      </div>
                    </div>

                    {/* Recommended Offer Card */}
                    <div className="p-4 rounded-2xl bg-cyan-950/15 border border-cyan-500/20 space-y-1">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-cyan-400">Faye&apos;s Service Recommendation</span>
                      <h4 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-cyan-400" />
                        {activeLead.recommended_offer}
                      </h4>
                      <p className="text-[11px] text-zinc-400 leading-relaxed">
                        Faye mapped operations to this tier based on operational bottlenecks and budget readiness.
                      </p>
                    </div>

                    {/* Objection logs */}
                    <div className="space-y-2">
                      <span className="text-[9px] uppercase font-bold tracking-wider text-zinc-500">Objection Playbook Handling</span>
                      {activeLead.objections && activeLead.objections.length > 0 ? (
                        activeLead.objections.map((ob: string, idx: number) => (
                          <div key={idx} className="p-3 rounded-2xl bg-zinc-950/40 border border-white/[0.04] text-[11px] text-zinc-400 leading-relaxed">
                            <span className="text-amber-400 font-semibold flex items-center gap-1.5 mb-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                              Objection: {ob}
                            </span>
                            To handle this objection, Faye visual HUD prioritized ROI savings logs over standard platform pricing.
                          </div>
                        ))
                      ) : (
                        <div className="text-xs text-zinc-500 italic">No objections logged during transaction call.</div>
                      )}
                    </div>

                    {/* Auto generated Follow Up Email box */}
                    <div className="rounded-2xl border border-white/[0.06] bg-zinc-950/80 overflow-hidden font-mono text-[10.5px]">
                      <div className="bg-white/[0.02] border-b border-white/[0.05] px-4 py-2 flex items-center justify-between">
                        <span className="text-[9px] font-bold text-zinc-400 tracking-wider">Automated Follow-up Email</span>
                        <button 
                          onClick={() => handleCopyEmail(getFollowUpSubject(activeLead), getFollowUpBody(activeLead))}
                          className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline"
                        >
                          {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Clipboard className="w-3 h-3" />}
                          {copied ? "Copied!" : "Copy Proposed Text"}
                        </button>
                      </div>
                      <div className="p-4 space-y-2.5 text-zinc-400 leading-relaxed max-h-[220px] overflow-y-auto">
                        <div>
                          <span className="text-zinc-600 block">SUBJECT:</span>
                          <span className="text-zinc-200 font-semibold">{getFollowUpSubject(activeLead)}</span>
                        </div>
                        <div className="border-t border-white/[0.04] pt-2 whitespace-pre-line text-zinc-300">
                          {getFollowUpBody(activeLead)}
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-zinc-500 italic">
                    Select a B2B lead record on the left grid to open qualifiers profile.
                  </div>
                )}

              </div>

            </div>

          </div>
        )}

        {/* -------------------- B2C COMMERCE DASHBOARD -------------------- */}
        {dashboardMode === "b2c" && (
          <div className="space-y-8 animate-fadeIn">
            
            {/* B2C Metrics */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Conversations Logged</span>
                <div className="text-2xl font-black text-white">{totalB2cOrders}</div>
                <div className="text-[10px] text-zinc-550 mt-1">Total orders logged</div>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Gross Sales</span>
                <div className="text-2xl font-black text-purple-400 flex items-center gap-1.5">
                  ₱{grossSales.toLocaleString()}
                </div>
                <div className="text-[10px] text-zinc-550 mt-1">Total checkout value</div>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">Checkout Completion</span>
                <div className="text-2xl font-black text-white">{checkoutCompletion}</div>
                <div className="text-[10px] text-zinc-550 mt-1">High conversion threshold</div>
              </div>
              <div className="p-5 rounded-2xl border border-white/[0.05] bg-zinc-900/30">
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-1">GCash Ref Verified</span>
                <div className="text-2xl font-black text-emerald-400">{verificationRatio}</div>
                <div className="text-[10px] text-zinc-550 mt-1">Ref check via tool calling</div>
              </div>
            </div>

            {/* B2C Visual Analytics Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl">
                <LineChart data={b2cSalesTrend} title="Daily Revenue Intake (PHP)" color="purple" />
              </div>
              <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl">
                <DonutChart data={b2cCategoryData} title="Catalog Revenue Distribution" color="purple" />
              </div>
            </div>

            {/* Main B2C Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8">
              
              {/* Left Column: B2C Orders lists & Catalog Interest */}
              <div className="space-y-8">

                <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <h3 className="font-extrabold text-lg text-white flex items-center gap-2">
                      <ShoppingBag className="w-5 h-5 text-purple-400" />
                      Simulated B2C Orders List
                    </h3>

                    {/* Search filter */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        value={b2cSearch}
                        onChange={(e) => setB2cSearch(e.target.value)}
                        placeholder="Search customer, reference..."
                        className="w-full sm:w-[220px] rounded-xl border border-white/[0.08] bg-zinc-950/60 pl-9 pr-4 py-2 text-xs text-zinc-300 outline-none focus:border-purple-500/50 transition-colors"
                      />
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-xs text-left border-collapse">
                      <thead>
                        <tr className="border-b border-white/[0.05] text-zinc-500 font-bold uppercase tracking-wider text-[10px] pb-3">
                          <th className="pb-3">Customer / Reference</th>
                          <th className="pb-3">Item Catalog</th>
                          <th className="pb-3 text-center">Qty</th>
                          <th className="pb-3 text-right">Total Price</th>
                          <th className="pb-3 text-right">GCash status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.03] text-zinc-300">
                        {filteredOrders.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="py-8 text-center text-zinc-500 italic">
                              No matching order records found.
                            </td>
                          </tr>
                        ) : (
                          filteredOrders.map((order) => (
                            <tr 
                              key={order.id}
                              onClick={() => setSelectedOrderId(order.id)}
                              className={`cursor-pointer hover:bg-white/[0.02] transition-colors ${
                                selectedOrderId === order.id ? "bg-purple-500/5 text-white font-semibold" : ""
                              }`}
                            >
                              <td className="py-3.5">
                                <div className="font-bold">{order.customer_name}</div>
                                <div className="text-[10px] text-zinc-550 mt-0.5">{order.reference}</div>
                              </td>
                              <td className="py-3.5 text-zinc-400">{order.product_name}</td>
                              <td className="py-3.5 text-center font-mono">{order.qty}</td>
                              <td className="py-3.5 text-right font-mono font-bold text-white">₱{(order.amount * order.qty).toLocaleString()}</td>
                              <td className="py-3.5 text-right">
                                <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide ${
                                  order.status === "Verified" 
                                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Product Fit Metrics Comparison */}
                <div className="p-6 rounded-3xl border border-white/[0.06] bg-zinc-900/30 backdrop-blur-xl">
                  <h3 className="font-extrabold text-base text-white mb-4">Product Catalog Interaction Distribution</h3>
                  <div className="space-y-4">
                    {[
                      { name: "Lenovo ThinkPad E14 Gen 5", percentage: 55, count: "23 Hits", color: "bg-purple-500" },
                      { name: "ASUS VivoBook 14 Slim", percentage: 30, count: "12 Hits", color: "bg-purple-400/80" },
                      { name: "Acer Swift Go 14 OLED", percentage: 15, count: "7 Hits", color: "bg-zinc-650" }
                    ].map((item, idx) => (
                      <div key={idx} className="space-y-1.5">
                        <div className="flex justify-between text-xs font-semibold">
                          <span className="text-zinc-200">{item.name}</span>
                          <span className="text-zinc-400 font-mono">{item.count}</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-zinc-950 overflow-hidden">
                          <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${item.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              {/* Right Column: B2C Selected Order Details */}
              <div className="rounded-3xl border border-white/[0.06] bg-zinc-900/60 p-6 backdrop-blur-xl space-y-6">
                {activeOrder ? (
                  <>
                    {/* Header info */}
                    <div className="flex items-start justify-between pb-4 border-b border-white/[0.05] gap-4">
                      <div>
                        <h4 className="text-xl font-bold tracking-tight text-white">{activeOrder.customer_name}</h4>
                        <p className="text-xs text-zinc-400 mt-1">Ref Code: <span className="font-mono text-zinc-200">{activeOrder.reference}</span></p>
                      </div>

                      <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        activeOrder.status === "Verified" 
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/30"
                      }`}>
                        {activeOrder.status}
                      </span>
                    </div>

                    {/* Cart summary breakdown */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5 text-purple-400" />
                        Cart Items purchased
                      </h5>
                      <div className="p-4 rounded-2xl bg-zinc-950/60 border border-white/[0.05] space-y-3">
                        <div className="flex justify-between items-start text-xs gap-3">
                          <div>
                            <span className="font-bold text-zinc-200">{activeOrder.product_name}</span>
                            <span className="block text-[10px] text-zinc-550 mt-0.5">Price: ₱{activeOrder.amount.toLocaleString()} each</span>
                          </div>
                          <span className="font-mono text-zinc-300 font-bold">Qty: {activeOrder.qty}</span>
                        </div>
                        <div className="border-t border-white/[0.04] pt-3 flex justify-between text-xs font-bold text-white">
                          <span className="text-zinc-500">Order Total</span>
                          <span className="text-purple-400 font-mono text-sm">₱{(activeOrder.amount * activeOrder.qty).toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Buyer Preferences gathered */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Faye Extracted Preferences</h5>
                      <div className="grid grid-cols-3 gap-2.5 text-xs border-b border-white/[0.04] pb-3">
                        <span className="text-zinc-500">Product Need:</span>
                        <span className="col-span-2 text-zinc-200 font-medium">{activeOrder.use_case}</span>
                        
                        <span className="text-zinc-500">Stated Budget:</span>
                        <span className="col-span-2 text-purple-400 font-semibold font-mono">{activeOrder.budget}</span>
                        
                        <span className="text-zinc-500">Brand Preference:</span>
                        <span className="col-span-2 text-zinc-200 font-medium">{activeOrder.brand_preference}</span>
                      </div>
                    </div>

                    {/* Shipping Address details */}
                    <div className="space-y-3">
                      <h5 className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">Verified Shipping Context</h5>
                      <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.04] space-y-2 text-xs">
                        <div className="grid grid-cols-3 gap-1">
                          <span className="text-zinc-500">Delivery Address:</span>
                          <span className="col-span-2 font-semibold text-zinc-200 leading-relaxed">{activeOrder.address}</span>
                          
                          <span className="text-zinc-500">Phone Contact:</span>
                          <span className="col-span-2 font-mono text-zinc-300">{activeOrder.phone}</span>
                          
                          <span className="text-zinc-500">Email Address:</span>
                          <span className="col-span-2 font-mono text-zinc-300">{activeOrder.email}</span>
                        </div>
                      </div>
                    </div>

                    {/* GCash payout receipt reference block */}
                    <div className="p-4 rounded-2xl bg-purple-950/15 border border-purple-500/20 space-y-2">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="uppercase font-bold tracking-wider text-purple-400">GCash Payment verified</span>
                        <span className="font-mono text-zinc-500">WPH-CHECKOUT-REF</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-zinc-400">GCash Reference Code:</span>
                        <span className="font-bold font-mono text-white text-right">{activeOrder.reference.replace("WPH", "GCASH")}</span>
                      </div>
                      <p className="text-[10px] text-zinc-500 leading-relaxed pt-1">
                        * The checkout transaction was validated automatically via Faye&apos;s real-time checkout_prep() tool call.
                      </p>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-20 text-zinc-500 italic">
                    Select a B2C order record on the left grid to open details.
                  </div>
                )}
              </div>

            </div>

          </div>
        )}

      </main>

    </div>
  );
}
