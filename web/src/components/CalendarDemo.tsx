"use client";

import { useState } from "react";
import { 
  Calendar as CalendarIcon, 
  Clock, 
  CheckCircle, 
  Mail, 
  Sparkles, 
  Send, 
  RotateCcw
} from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, setMonth, setYear } from "date-fns";
import "react-day-picker/dist/style.css";

interface CalendarDemoProps {
  mode?: "b2b" | "b2c";
}

export function CalendarDemo({ mode = "b2b" }: CalendarDemoProps) {
  const isB2B = mode === "b2b";
  const themeColor = isB2B ? "text-cyan-600" : "text-purple-600";
  const themeBg = isB2B ? "bg-cyan-100" : "bg-purple-100";
  const themeBorder = isB2B ? "border-cyan-200" : "border-purple-200";
  const themeBtn = isB2B ? "bg-cyan-600 hover:bg-cyan-700 text-white shadow-lg" : "bg-purple-600 hover:bg-purple-700 text-white shadow-lg";

  const [month, setMonthDate] = useState<Date>(new Date(2026, 4));
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date(2026, 4, 28));
  const [selectedTime, setSelectedTime] = useState<string | null>("02:00 PM");
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isBooked, setIsBooked] = useState(false);

  const timeSlots = ["09:00 AM", "10:30 AM", "02:00 PM", "03:30 PM", "05:00 PM"];

  const handleBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !company || !name || !email) return;
    setIsBooked(true);
  };

  const formatDate = (date: Date) => {
    return format(date, "EEEE, MMMM d, yyyy");
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      
      {/* Left Column: Calendar Sheet */}
      <div className="space-y-0">
        {/* Visual Spiral Bound Ring Elements */}
        <div className="relative z-10 -mb-6 flex justify-around px-8 pointer-events-none">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex flex-col items-center">
              <div className="w-1.5 h-1.5 rounded-full bg-zinc-300" />
              <div className="w-3 h-10 rounded-full bg-gradient-to-b from-zinc-100 via-white to-zinc-200 border border-zinc-300 shadow-md -mt-1" />
            </div>
          ))}
        </div>

        {/* Main Wall Calendar Sheet - SOLID LIGHT COLOR */}
        <div className="relative rounded-3xl border-4 border-zinc-200 bg-white shadow-2xl overflow-hidden text-zinc-900">
          {/* Calendar Header */}
          <div className="bg-zinc-50 px-8 py-8 border-b-2 border-zinc-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className={`p-3 rounded-2xl ${themeBg} ${themeColor} border ${themeBorder} shadow-sm`}>
                <CalendarIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-3xl font-black tracking-tighter text-zinc-900 uppercase">
                  {format(month, "MMMM yyyy")}
                </h3>
                <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest mt-1">
                  {isB2B ? "B2B SALES APPOINTMENT" : "B2C DELIVERY SCHEDULE"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border-2 border-zinc-100 shadow-sm">
                <select 
                  value={month.getMonth()}
                  onChange={(e) => setMonthDate(setMonth(month, parseInt(e.target.value)))}
                  className="bg-transparent text-zinc-900 font-bold text-sm px-3 py-1.5 outline-none cursor-pointer hover:bg-zinc-50 rounded-xl transition-colors appearance-none border-r-2 border-zinc-100"
                >
                  {Array.from({ length: 12 }).map((_, i) => (
                    <option key={i} value={i}>{format(new Date(2026, i), "MMMM")}</option>
                  ))}
                </select>
                <select 
                  value={month.getFullYear()}
                  onChange={(e) => setMonthDate(setYear(month, parseInt(e.target.value)))}
                  className="bg-transparent text-zinc-900 font-bold text-sm px-3 py-1.5 outline-none cursor-pointer hover:bg-zinc-50 rounded-xl transition-colors appearance-none"
                >
                  {Array.from({ length: 11 }).map((_, i) => (
                    <option key={i} value={2024 + i}>{2024 + i}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* DayPicker Container */}
          <div className="p-8 flex justify-center bg-white relative">
            <style>{`
              .rdp-root {
                --rdp-accent-color: ${isB2B ? '#0891b2' : '#9333ea'};
                --rdp-accent-foreground: #ffffff;
                --rdp-day-height: 56px;
                --rdp-day-width: 56px;
                margin: 0;
              }
              .rdp-month_grid {
                width: 100%;
                border-collapse: separate;
                border-spacing: 4px;
              }
              .rdp-weekday {
                color: #71717a !important;
                font-weight: 900 !important;
                font-size: 0.7rem !important;
                text-transform: uppercase !important;
                padding-bottom: 12px !important;
                text-align: center !important;
              }
              .rdp-day {
                font-weight: 800 !important;
                font-size: 1rem !important;
                border-radius: 12px !important;
                transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1) !important;
                border: 2px solid transparent !important;
                cursor: pointer !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              .rdp-day:hover:not(.rdp-selected):not(.rdp-outside) {
                background-color: ${isB2B ? '#0891b2' : '#9333ea'} !important;
                color: white !important;
                transform: scale(1.1) !important;
                z-index: 10 !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
                border-color: white !important;
              }
              .rdp-selected {
                background-color: ${isB2B ? '#0891b2' : '#9333ea'} !important;
                color: white !important;
                box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
                transform: scale(1.05) !important;
              }
              .rdp-today {
                border: 2px solid ${isB2B ? '#0891b2' : '#9333ea'} !important;
                color: ${isB2B ? '#0891b2' : '#9333ea'} !important;
                font-weight: 900 !important;
              }
              .rdp-outside {
                opacity: 0.2 !important;
              }
              @media (max-width: 640px) {
                .rdp-day {
                  width: 44px !important;
                  height: 44px !important;
                  font-size: 0.875rem !important;
                }
              }
            `}</style>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              month={month}
              onMonthChange={setMonthDate}
              disabled={{ dayOfWeek: [0, 6] }}
              className="w-full flex justify-center"
              showOutsideDays
            />
          </div>
        </div>
      </div>

      {/* Right Column: Interactive scheduling actions */}
      <div className="space-y-8 flex flex-col">
        <div className="rounded-3xl border-2 border-zinc-200 bg-white p-8 shadow-xl flex flex-col justify-between text-zinc-900">
          {!isBooked ? (
            <form onSubmit={handleBooking} className="space-y-8">
              <div className="space-y-2">
                <h4 className="text-xl font-black text-zinc-900 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${themeBg} ${themeColor}`}>
                    <Clock className="w-5 h-5" />
                  </div>
                  {isB2B ? 'Schedule your Demo' : 'Delivery Details'}
                </h4>
                <p className="text-sm text-zinc-500 font-medium">
                  {selectedDate 
                    ? `You've selected ${formatDate(selectedDate)}`
                    : "Please pick a date from the calendar on the left."}
                </p>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {timeSlots.map((time) => {
                    const isSelected = selectedTime === time;
                    return (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 transition-all font-bold text-sm ${
                          isSelected
                            ? `${themeBg} ${themeColor} ${themeBorder} scale-105 shadow-md`
                            : "bg-zinc-50 border-zinc-100 text-zinc-400 hover:border-zinc-200 hover:text-zinc-600"
                        }`}
                      >
                        <Clock className="w-4 h-4" />
                        {time}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs uppercase font-black tracking-widest text-zinc-400 ml-1">{isB2B ? 'Company Name' : 'Recipient Name'}</label>
                  <input
                    type="text"
                    required
                    placeholder={isB2B ? "e.g. Acme Corp" : "e.g. Juan dela Cruz"}
                    value={isB2B ? company : name}
                    onChange={(e) => isB2B ? setCompany(e.target.value) : setName(e.target.value)}
                    className="w-full text-sm font-bold rounded-2xl border-2 border-zinc-100 bg-zinc-50 px-5 py-4 text-zinc-900 outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-300"
                  />
                </div>
                {isB2B && (
                  <div className="space-y-2">
                    <label className="text-xs uppercase font-black tracking-widest text-zinc-400 ml-1">Your Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Juan dela Cruz"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="w-full text-sm font-bold rounded-2xl border-2 border-zinc-100 bg-zinc-50 px-5 py-4 text-zinc-900 outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-300"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-black tracking-widest text-zinc-400 ml-1">{isB2B ? 'Work Email' : 'Shipping Address'}</label>
                <input
                  type={isB2B ? "email" : "text"}
                  required
                  placeholder={isB2B ? "name@company.com" : "e.g. 123 Street, Manila"}
                  value={isB2B ? email : company}
                  onChange={(e) => isB2B ? setEmail(e.target.value) : setCompany(e.target.value)}
                  className="w-full text-sm font-bold rounded-2xl border-2 border-zinc-100 bg-zinc-50 px-5 py-4 text-zinc-900 outline-none focus:border-cyan-500/50 transition-all placeholder:text-zinc-300"
                />
              </div>

              <button
                type="submit"
                disabled={!selectedDate}
                className={`w-full rounded-2xl ${themeBtn} font-black py-5 flex items-center justify-center gap-3 transition-all disabled:opacity-50 active:scale-95`}
              >
                <Send className="w-5 h-5" />
                <span className="uppercase tracking-widest">{isB2B ? 'Confirm Discovery Call' : 'Finalize Schedule'}</span>
              </button>
            </form>
          ) : (
            <div className="space-y-8 flex flex-col justify-center h-full text-center py-8">
              <div className="flex justify-center">
                <div className={`p-6 ${isB2B ? 'bg-emerald-100 text-emerald-600 border-emerald-200' : 'bg-purple-100 text-purple-600 border-purple-200'} rounded-full border-4 shadow-inner`}>
                  <CheckCircle className="w-16 h-16" />
                </div>
              </div>
              
              <div className="space-y-3">
                <h4 className="text-3xl font-black text-zinc-900 italic tracking-tighter">Success!</h4>
                <p className="text-zinc-500 font-bold max-w-md mx-auto leading-relaxed">
                  {isB2B 
                    ? `Your discovery call for ${selectedDate && formatDate(selectedDate)} at ${selectedTime} is confirmed. Expect an invite in your inbox shortly.`
                    : `We've scheduled your delivery for ${selectedDate && formatDate(selectedDate)}. Our team will notify you via SMS when we're on the way.`}
                </p>
              </div>

              <button
                onClick={() => {
                  setIsBooked(false);
                  setCompany("");
                  setName("");
                  setEmail("");
                }}
                className="rounded-2xl border-2 border-zinc-200 hover:bg-zinc-50 text-zinc-500 px-8 py-3 text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 self-center"
              >
                <RotateCcw className="w-4 h-4" />
                {isB2B ? 'Schedule Another' : 'Modify Request'}
              </button>
            </div>
          )}
        </div>

        <div className="rounded-3xl border-2 border-zinc-200 bg-white p-8 shadow-xl flex flex-col justify-between font-mono text-xs overflow-hidden text-zinc-900">
          <div className="space-y-6">
            <div className="flex items-center justify-between pb-4 border-b-2 border-zinc-50">
              <span className={`text-xs font-black ${themeColor} flex items-center gap-2 uppercase tracking-tighter`}>
                <Sparkles className="w-4 h-4" />
                Live Agent Intel
              </span>
              <span className="text-[10px] text-zinc-400 font-black border-2 border-zinc-50 px-3 py-1 rounded-lg">ID: AGENT_001</span>
            </div>

            <div className="space-y-4">
              <div className="text-[10px] uppercase font-black text-zinc-300 tracking-widest">Active Processes:</div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-bold italic">validate_params()</span>
                  <span className="text-zinc-900 font-black px-2 py-0.5 bg-zinc-100 rounded">TRUE</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-bold italic">check_availability()</span>
                  <span className="text-zinc-900 font-black px-2 py-0.5 bg-zinc-100 rounded">OK</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-400 font-bold italic">generate_invite()</span>
                  <span className={`${isB2B ? 'text-cyan-600' : 'text-purple-600'} font-black`}>{isBooked ? "DONE" : "WAITING..."}</span>
                </div>
              </div>
            </div>

            <div className="pt-6 border-t-2 border-zinc-50 space-y-4">
              <div className="flex items-center gap-2 text-xs font-black text-zinc-900 uppercase tracking-tighter">
                <Mail className="w-4 h-4 text-zinc-400" />
                Draft Confirmation
              </div>
              <div className="rounded-2xl border-2 border-zinc-50 bg-zinc-50 p-6 space-y-4 text-zinc-600 leading-relaxed text-[11px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-16 h-16 bg-white rotate-45 translate-x-8 -translate-y-8 border-b-2 border-zinc-100 shadow-sm" />
                {isBooked ? (
                  <>
                    <div className="text-zinc-900 font-black">{isB2B ? `RE: Demo Request - ${company}` : `RE: Delivery Schedule`}</div>
                    <div className="h-0.5 bg-white my-2" />
                    <div className="font-bold">Dear {name},</div>
                    <div className="font-medium italic">
                      {isB2B 
                        ? `This confirms our session on ${formatDate(selectedDate!)} at ${selectedTime}.`
                        : `Your delivery window is confirmed for ${formatDate(selectedDate!)}.`}
                    </div>
                    <div className="text-zinc-300 mt-4 text-[9px] font-black uppercase tracking-widest italic">Sent via Agora Agent</div>
                  </>
                ) : (
                  <div className="text-center py-10 text-zinc-300 font-bold italic text-sm">
                    Waiting for input...
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
