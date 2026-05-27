"use client";

import { AgentPageContent } from "../agent/page";
import { Suspense } from "react";

export default function CommercePage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-zinc-950 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-purple-400 tracking-widest uppercase">Loading Agent Console...</span>
        </div>
      </div>
    }>
      <AgentPageContent forcedType="commerce" />
    </Suspense>
  );
}
