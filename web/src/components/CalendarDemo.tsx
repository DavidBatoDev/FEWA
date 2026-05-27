"use client";

import { useState } from "react";
import { Calendar, Clock, CheckCircle, Mail, Sparkles, Send, RotateCcw } from "lucide-react";

interface CalendarCell {
  day: number;
  month: "current" | "prev" | "next";
  isSelectable: boolean;
}

export function CalendarDemo() {
  const [selectedDate, setSelectedDate] = useState<number | null>(28); // Default to May 28
  const [selectedTime, setSelectedTime] = useState<string | null>("02:00 PM");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isBooked, setIsBooked] = useState(false);

  const timeSlots = ["09:00 AM", "10:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"];
  
  // May 2026: Starts on Friday (index 5), 31 days
  // Previous month is April (30 days): April 26, 27, 28, 29, 30
  // Next month is June: June 1, 2, 3, 4, 5, 6
  
  const cells: CalendarCell[] = [
    // Row 1 (April trailing days)
    { day: 26, month: "prev", isSelectable: false },
    { day: 27, month: "prev", isSelectable: false },
    { day: 28, month: "prev", isSelectable: false },
    { day: 29, month: "prev", isSelectable: false },
    { day: 30, month: "prev", isSelectable: false },
    // May starts here
    { day: 1, month: "current", isSelectable: false }, // Friday (past date in demo context)
    { day: 2, month: "current", isSelectable: false }, // Saturday (weekend)
    
    // Row 2
    { day: 3, month: "current", isSelectable: false }, // Sunday
    { day: 4, month: "current", isSelectable: false },
    { day: 5, month: "current", isSelectable: false },
    { day: 6, month: "current", isSelectable: false },
    { day: 7, month: "current", isSelectable: false },
    { day: 8, month: "current", isSelectable: false },
    { day: 9, month: "current", isSelectable: false },
    
    // Row 3
    { day: 10, month: "current", isSelectable: false },
    { day: 11, month: "current", isSelectable: false },
    { day: 12, month: "current", isSelectable: false },
    { day: 13, month: "current", isSelectable: false },
    { day: 14, month: "current", isSelectable: false },
    { day: 15, month: "current", isSelectable: false },
    { day: 16, month: "current", isSelectable: false },
    
    // Row 4
    { day: 17, month: "current", isSelectable: false },
    { day: 18, month: "current", isSelectable: false },
    { day: 19, month: "current", isSelectable: false },
    { day: 20, month: "current", isSelectable: false },
    { day: 21, month: "current", isSelectable: false },
    { day: 22, month: "current", isSelectable: false },
    { day: 23, month: "current", isSelectable: false },
    
    // Row 5
    { day: 24, month: "current", isSelectable: false },
    { day: 25, month: "current", isSelectable: false },
    { day: 26, month: "current", isSelectable: false },
    // May 27 is today in mock scenario
    { day: 27, month: "current", isSelectable: true },
    { day: 28, month: "current", isSelectable: true }, // Selectable
    { day: 29, month: "current", isSelectable: true }, // Selectable
    { day: 30, month: "current", isSelectable: false }, // Saturday (weekend)
    
    // Row 6
    { day: 31, month: "current", isSelectable: false }, // Sunday (weekend)
    // June leading days
    { day: 1, month: "next", isSelectable: false },
    { day: 2, month: "next", isSelectable: false },
    { day: 3, month: "next", isSelectable: false },
    { day: 4, month: "next", isSelectable: false },
    { day: 5, month: "next", isSelectable: false },
    { day: 6, month: "next", isSelectable: false }
  ];

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !company || !name || !email) return;
    setIsBooked(true);
  };

  const getDayName = (dayNumber: number) => {
    const weekdays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    // May 1st, 2026 is a Friday (index 5)
    const index = (dayNumber - 1 + 5) % 7;
    return weekdays[index];
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-8">
      {/* Visual Spiral Bound Ring Elements at the top of the Wall Calendar */}
      <div className="relative z-10 -mb-6 flex justify-around px-8 pointer-events-none">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="flex flex-col items-center">
            {/* Hanging nail/shadow */}
            <div className="w-1.5 h-1.5 rounded-full bg-zinc-850" />
            {/* The metal spiral loop */}
            <div className="w-3 h-10 rounded-full bg-gradient-to-b from-zinc-600 via-zinc-400 to-zinc-700 border border-white/20 shadow-lg -mt-1" />
          </div>
        ))}
      </div>

      {/* Main Wall Calendar Sheet */}
      <div className="relative rounded-3xl border border-white/[0.08] bg-zinc-900/40 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] overflow-hidden">
        {/* Calendar Header / Binder Band */}
        <div className="bg-zinc-950/80 px-6 py-6 border-b border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-2xl font-black tracking-widest text-white uppercase flex items-center gap-2">
                MAY 2026
                <span className="text-xs font-mono font-medium tracking-normal text-zinc-500 lowercase bg-white/[0.03] px-2 py-0.5 rounded border border-white/[0.04]">
                  complete-grid-v3
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Monthly Wall Calendar Grid — Select May 27, 28, or 29 to schedule a demo slot</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400 bg-white/[0.02] border border-white/[0.05] px-3.5 py-1.5 rounded-full">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            System Date Context: May 27, 2026
          </div>
        </div>

        {/* Calendar Weekday Names */}
        <div className="grid grid-cols-7 border-b border-white/[0.05] bg-white/[0.01]">
          {["SUNDAY", "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"].map((dayName) => (
            <div
              key={dayName}
              className="py-3 text-[10px] sm:text-xs font-black tracking-wider text-zinc-500 text-center border-r border-white/[0.03] last:border-0"
            >
              {dayName}
            </div>
          ))}
        </div>

        {/* Large Day Cells Grid */}
        <div className="grid grid-cols-7 bg-zinc-950/20">
          {cells.map((cell, idx) => {
            const isCurrentMonth = cell.month === "current";
            const isWeekend = isCurrentMonth && ((cell.day - 1 + 5) % 7 === 0 || (cell.day - 1 + 5) % 7 === 6);
            
            const isSelected = isCurrentMonth && selectedDate === cell.day;
            const hasBooking = isBooked && isSelected;
            const isToday = isCurrentMonth && cell.day === 27;

            // Background classes (no container opacity)
            const cellBg = !isCurrentMonth 
              ? "bg-zinc-950/60 border-white/[0.02]" 
              : isSelected
              ? "bg-cyan-950/20 border-cyan-500/50 shadow-[inset_0_0_15px_rgba(6,182,212,0.15)]"
              : isWeekend
              ? "bg-zinc-950/30 border-white/[0.02]"
              : !cell.isSelectable
              ? "bg-zinc-900/10 border-white/[0.03]"
              : "bg-zinc-900/40 hover:bg-white/[0.03] border-white/[0.06]";

            // Custom text color for date numbers to ensure readability
            const numberColor = !isCurrentMonth
              ? "text-zinc-700 font-medium"
              : isSelected
              ? "text-cyan-400 font-extrabold"
              : isWeekend
              ? "text-zinc-600 font-semibold"
              : !cell.isSelectable
              ? "text-zinc-550 font-semibold"
              : "text-zinc-200 font-bold";

            return (
              <button
                key={idx}
                type="button"
                disabled={!cell.isSelectable || isBooked}
                onClick={() => setSelectedDate(cell.day)}
                className={`min-h-[90px] sm:min-h-[110px] p-2.5 border-b border-r border-white/[0.04] last:border-r-0 text-left transition-all relative flex flex-col justify-between group ${cellBg}`}
              >
                {/* Day number */}
                <div className="flex justify-between items-start w-full">
                  <span className={`text-sm sm:text-base ${numberColor}`}>
                    {cell.day}
                  </span>
                  
                  {/* Status pills inside wall calendar */}
                  {isToday && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-400 uppercase">
                      Today
                    </span>
                  )}
                  {isSelected && !isBooked && (
                    <span className="text-[8px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 uppercase animate-pulse">
                      Selected
                    </span>
                  )}
                </div>

                {/* Simulated handwritten wall-calendar note */}
                {hasBooking ? (
                  <div className="w-full mt-2 p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-left text-[9px] sm:text-[10px] text-emerald-400 font-medium animate-fade-in flex flex-col gap-0.5">
                    <span className="font-bold text-[8px] uppercase tracking-wider text-emerald-500">Confirmed</span>
                    <span className="truncate">📞 {company}</span>
                    <span className="text-[8px] opacity-75 font-mono">{selectedTime}</span>
                  </div>
                ) : (
                  isSelected && cell.isSelectable && (
                    <div className="hidden sm:block text-[9px] text-cyan-400/70 italic mt-auto">
                      Awaiting details...
                    </div>
                  )
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Interactive scheduling actions and form details */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        
        {/* Left Form: Booking inputs & slot settings */}
        <div className="lg:col-span-7 rounded-3xl border border-white/[0.07] bg-zinc-900/30 p-6 flex flex-col justify-between">
          {!isBooked ? (
            <form onSubmit={handleBooking} className="space-y-6">
              <div className="space-y-1">
                <h4 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock className="w-4 h-4 text-cyan-400" />
                  Configure Booking Schedule
                </h4>
                <p className="text-xs text-zinc-400">
                  Fill in the B2B client qualifiers below for the chosen date: <strong className="text-cyan-400">May {selectedDate}, 2026 ({selectedDate ? getDayName(selectedDate) : ""})</strong>.
                </p>
              </div>

              {/* Time Slots row */}
              <div>
                <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 block mb-2">Select Call Time</span>
                <div className="flex flex-wrap gap-2">
                  {timeSlots.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? "bg-cyan-500/10 border-cyan-500 text-cyan-400 font-bold"
                            : "bg-white/[0.02] border-white/[0.06] text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                        }`}
                      >
                        <Clock className="w-3.5 h-3.5" />
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Detail fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Company Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. ABC Logistics"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full text-xs rounded-xl border border-white/[0.08] bg-zinc-950 px-3.5 py-3 text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Your Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Juan dela Cruz"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full text-xs rounded-xl border border-white/[0.08] bg-zinc-950 px-3.5 py-3 text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase font-bold tracking-wider text-zinc-500">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full text-xs rounded-xl border border-white/[0.08] bg-zinc-950 px-3.5 py-3 text-white outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                />
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold py-4 flex items-center justify-center gap-2 transition-all shadow-[0_0_20px_rgba(6,182,212,0.2)]"
              >
                <Send className="w-4 h-4" />
                <span>Confirm Call and Write to Calendar</span>
              </button>
            </form>
          ) : (
            // Success booking feedback
            <div className="space-y-6 flex flex-col justify-center h-full text-center md:text-left py-4">
              <div className="flex justify-center md:justify-start">
                <div className="p-3.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20">
                  <CheckCircle className="w-12 h-12" />
                </div>
              </div>
              
              <div className="space-y-2">
                <h4 className="text-2xl font-black text-white">Appointment Scheduled!</h4>
                <p className="text-sm text-zinc-300">
                  We've successfully updated your calendar block on May {selectedDate} and generated the automated B2B campaign response.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] space-y-2 text-xs">
                <div className="flex justify-between text-zinc-400">
                  <span>Qualifying Outcome:</span>
                  <span className="font-bold text-emerald-400">Lead Qualified ✓</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Scheduled Time:</span>
                  <span className="font-semibold text-white">May {selectedDate}, 2026 at {selectedTime}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>Client Company:</span>
                  <span className="text-white truncate max-w-[200px]">{company}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsBooked(false);
                  setCompany("");
                  setName("");
                  setEmail("");
                }}
                className="rounded-xl border border-white/[0.08] hover:bg-white/[0.05] text-zinc-300 px-5 py-2.5 text-xs font-semibold transition-all flex items-center justify-center gap-2 self-center md:self-start"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Book Another Slot
              </button>
            </div>
          )}
        </div>

        {/* Right Panel: Simulated Output Logs */}
        <div className="lg:col-span-5 rounded-3xl border border-white/[0.07] bg-zinc-900/30 p-6 flex flex-col justify-between font-mono text-xs overflow-hidden">
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.05]">
              <span className="text-[10px] font-bold text-cyan-400 flex items-center gap-1.5 uppercase">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                AI Log Stream
              </span>
              <span className="text-[9px] text-zinc-600 bg-white/[0.02] px-2 py-0.5 rounded">B2B SALES AGENT</span>
            </div>

            {/* Simulated Tool Activity Log */}
            <div className="space-y-2">
              <div className="text-[9px] uppercase font-bold text-zinc-500 tracking-wider">Fired Tools:</div>
              <div className="space-y-1.5 text-[11px] leading-relaxed">
                <div className="flex justify-between text-zinc-400">
                  <span>extract_lead_info()</span>
                  <span className="text-zinc-500 font-semibold">{company ? `Company: ${company}` : "Awaiting company..."}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>score_lead()</span>
                  <span className="text-emerald-400 font-bold">Score: 90 (HOT 🔴)</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>book_discovery_call()</span>
                  <span className="text-cyan-400 font-bold">{isBooked ? "Confirmed ✓" : "Pending slot..."}</span>
                </div>
                <div className="flex justify-between text-zinc-400">
                  <span>generate_follow_up()</span>
                  <span className={isBooked ? "text-purple-400 font-bold" : "text-zinc-600"}>
                    {isBooked ? "Email Generated ✓" : "Pending..."}
                  </span>
                </div>
              </div>
            </div>

            {/* Simulated Email Draft Preview */}
            <div className="pt-4 border-t border-white/[0.05] space-y-2.5">
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-bold text-zinc-500 tracking-wider">
                <Mail className="w-3.5 h-3.5 text-purple-400" />
                Email Follow-up Draft
              </div>
              <div className="rounded-xl border border-white/[0.04] bg-zinc-950 p-4 space-y-2 text-zinc-400 leading-relaxed text-[11px]">
                {isBooked ? (
                  <>
                    <div><span className="text-zinc-600">Subject:</span> <span className="text-white font-medium">Follow Up: Discovery Consultation Call - {company}</span></div>
                    <div className="h-px bg-white/[0.04] my-2" />
                    <div>Hi {name || "there"},</div>
                    <div>
                      Thank you for scheduling your slot for <strong>{getDayName(selectedDate!)}, May {selectedDate} at {selectedTime}</strong>. 
                      Based on our conversation, we have identified key automation opportunities for <strong>{company}</strong> and recommended our <strong>Sales Automation Package</strong>.
                    </div>
                    <div>Looking forward to our call!</div>
                    <div className="text-zinc-650 mt-2">FFlow.ph Sales Agent</div>
                  </>
                ) : (
                  <div className="text-center py-8 text-zinc-600 italic">
                    Fill out the scheduling form to simulate a personalized email follow-up generated by the agent.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
