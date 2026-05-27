"use client";

import { useMemo, useRef, useState, useEffect } from "react";
import { Mic, MicOff, Square, X, Captions, User, Building2, Frown, TrendingUp, Gift, CalendarCheck, ExternalLink, AlertTriangle, Mail, Check, MoreHorizontal } from "lucide-react";
import type { AxiosError } from "axios";
import type {
  IAgoraRTCClient,
  IAgoraRTCRemoteUser,
  IMicrophoneAudioTrack,
  IRemoteAudioTrack,
} from "agora-rtc-sdk-ng";
import { api } from "@/lib/api";
import { GlobeAnimation } from "@/components/GlobeAnimation";
import { ConversationalAIAPI } from "@/lib/conversational-ai-api";
import {
  EAgentState,
  ETranscriptHelperMode,
  IConversationalAIAPIEventHandler,
  ITranscriptHelperItem,
  RTMClientLike,
} from "@/lib/conversational-ai-api/type";
import type {
  AIDenoiserExtension,
  AIDenoiserProcessorLevel,
  AIDenoiserProcessorMode,
  IAIDenoiserProcessor,
} from "agora-extension-ai-denoiser";
type ConvoStartResponse = {
  agent_id: string;
  agent_name: string;
  agent_uid: string;
  user_uid: string;
  channel_name: string;
  user_token: string;
  status: string;
};

type ConvoUserTokenResponse = {
  channel_name: string;
  user_uid: string;
  user_token: string;
  issued_at: number;
  expires_at: number;
};

type ConvoStopResponse = {
  ok: boolean;
  agent_id: string;
};

type ConvoInterruptResponse = {
  status?: string;
  agent_id?: string;
};

type ConvoHistoryResponse = {
  agent_id: string;
  status: string;
  start_ts?: number;
  contents: Array<{ role?: string; content?: string }>;
  message_count: number;
};



type TranscriptSpeaker = "user" | "assistant" | "system";

type ToolLogEntry = { tool: string; timestamp: string; summary: string; data: Record<string, unknown> };

type TranscriptItem = {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  tools?: ToolLogEntry[];
};

const DEFAULT_AGENT_UID = "1001";
const TTS_SPEED_DEFAULT = 1.2;
const TTS_SPEED_OPTIONS = [0.5, 0.75, 1.0, 1.2, 1.5, 2.0];
const AUDIO_REPUBLISH_FLAP_WINDOW_MS = 1200;

type VoiceData = { id: string; name: string; tag: string; image: string };
const VOICE_DATA: VoiceData[] = [
  { id: "alloy",   name: "Alloy",   tag: "Neutral",    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=160&h=200&fit=crop&crop=faces&auto=format" },
  { id: "ash",     name: "Ash",     tag: "Clear",      image: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=160&h=200&fit=crop&crop=faces&auto=format" },
  { id: "ballad",  name: "Ballad",  tag: "Melodic",    image: "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=160&h=200&fit=crop&crop=faces&auto=format" },
  { id: "coral",   name: "Coral",   tag: "Warm",       image: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=160&h=200&fit=crop&crop=faces&auto=format" },
  { id: "echo",    name: "Echo",    tag: "Calm",       image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=160&h=200&fit=crop&crop=faces&auto=format" },
  { id: "sage",    name: "Sage",    tag: "Wise",       image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=160&h=200&fit=crop&crop=faces&auto=format" },
  { id: "shimmer", name: "Shimmer", tag: "Bright",     image: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=160&h=200&fit=crop&crop=faces&auto=format" },
  { id: "verse",   name: "Verse",   tag: "Expressive", image: "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=160&h=200&fit=crop&crop=faces&auto=format" },
];
const AI_DENOISER_ASSETS_PATH = "/external";
const AI_DENOISER_MODE_NSNG = "NSNG" as AIDenoiserProcessorMode;
const AI_DENOISER_LEVEL_AGGRESSIVE = "AGGRESSIVE" as AIDenoiserProcessorLevel;

function generateDefaultChannelName() {
  const suffix = Math.random().toString(36).slice(2, 8);
  return `workflow-ph-cae-${suffix}`;
}

function generateDefaultUserUid(agentUidCandidate = DEFAULT_AGENT_UID) {
  const min = 100000;
  const max = 999999;
  let next = Math.floor(Math.random() * (max - min + 1)) + min;
  while (String(next) === agentUidCandidate) {
    next = Math.floor(Math.random() * (max - min + 1)) + min;
  }
  return String(next);
}

export default function AgentPage() {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";

  const agoraRtcModuleRef = useRef<(typeof import("agora-rtc-sdk-ng")) | null>(null);
  const agoraRtmModuleRef = useRef<(typeof import("agora-rtm-sdk")) | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const rtmClientRef = useRef<RTMClientLike | null>(null);
  const convoApiRef = useRef<ConversationalAIAPI | null>(null);
  const aiDenoiserExtensionRef = useRef<AIDenoiserExtension | null>(null);
  const aiDenoiserProcessorRef = useRef<IAIDenoiserProcessor | null>(null);
  const activeChannelRef = useRef<string>("");
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteAgentAudioRef = useRef<IRemoteAudioTrack | null>(null);
  const subscribedAudioUidsRef = useRef<Set<string>>(new Set());
  const subscribeInFlightUidsRef = useRef<Set<string>>(new Set());
  const lastPlayedTrackByUidRef = useRef<Map<string, string>>(new Map());
  const lastPlayedAtMsByUidRef = useRef<Map<string, number>>(new Map());
  const lastSubscribeAtMsByUidRef = useRef<Map<string, number>>(new Map());
  const lastUnpublishedAtMsByUidRef = useRef<Map<string, number>>(new Map());
  const autoHalfDuplexRef = useRef(false);
  const micHalfDuplexMutedRef = useRef(false);
  const micUnmuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micHalfDuplexMuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const agentStateDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volumePollerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [channelName, setChannelName] = useState(() => generateDefaultChannelName());
  const [agentUid, setAgentUid] = useState(DEFAULT_AGENT_UID);
  const [voice, setVoice] = useState("alloy");
  const [ttsSpeed, setTtsSpeed] = useState(TTS_SPEED_DEFAULT);
  const [userUid, setUserUid] = useState(() => generateDefaultUserUid(DEFAULT_AGENT_UID));

  const [agentId, setAgentId] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [remoteJoinCount, setRemoteJoinCount] = useState(0);
  const [transcriptEventCount, setTranscriptEventCount] = useState(0);
  const [rtmConnectionStatus, setRtmConnectionStatus] = useState("unknown");
  const [agentState, setAgentState] = useState<EAgentState>(EAgentState.UNKNOWN);
  const [agentMetricsCount, setAgentMetricsCount] = useState(0);
  const [lastAgentError, setLastAgentError] = useState("");
  const [autoHalfDuplex, setAutoHalfDuplex] = useState(false);
  const [isInterrupting, setIsInterrupting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioProcessingMode, setAudioProcessingMode] = useState("browser-ans");
  const [showTranscript, setShowTranscript] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);
  const [showMoreMenu, setShowMoreMenu] = useState(false);


  const sseRef = useRef<EventSource | null>(null);
  // Buffer for tools that arrive before the assistant transcript message lands.
  const pendingToolsRef = useRef<ToolLogEntry[]>([]);
  // Tracks the most-recently-seen assistant message ID for the current turn.
  // Cleared when a user message arrives so late SSE events don't bleed onto
  // the previous response.
  const currentAssistantMsgIdRef = useRef<string>("");

  const appIdReady = useMemo(() => appId.trim().length > 0, [appId]);

  function buildToolSummary(tool: string, data: Record<string, unknown>): string {
    if (tool === "extract_lead_info") {
      const lines: string[] = [];
      const d = data as Record<string, string>;
      if (d.name)             lines.push(`Your name is "${d.name}"`);
      if (d.company)          lines.push(`Your company is "${d.company}"`);
      if (d.industry)         lines.push(`Industry: ${d.industry}`);
      if (d.timeline)         lines.push(`Timeline: ${d.timeline}`);
      if (d.budget_readiness) lines.push(`Budget: ${d.budget_readiness}`);
      if (d.decision_maker)   lines.push(`Decision maker: ${d.decision_maker}`);
      if (d.email)            lines.push(`Email confirmed: ${d.email}`);
      if (d.phone)            lines.push(`Phone: ${d.phone}`);
      return lines.length > 0
        ? `Knowing more about you... ${lines.join(" · ")}`
        : "Updating your profile...";
    }
    if (tool === "capture_pain_point") {
      return `Understanding your challenge... ${data.pain_point ?? "noted"}`;
    }
    if (tool === "score_lead") {
      const temp = data.temperature as string;
      const icon = temp === "Hot" ? "🔥" : temp === "Warm" ? "☀️" : "❄️";
      return `Lead score: ${data.score}/100 — ${temp} ${icon}`;
    }
    if (tool === "recommend_offer") {
      return `Recommending: ${data.offer_name}`;
    }
    if (tool === "detect_objection") {
      return `Concern noted: ${(data.objection_type as string).replace(/_/g, " ")}`;
    }
    if (tool === "book_discovery_call") {
      return data.confirmed
        ? `Discovery call booked: ${data.slot} ✓`
        : "Booking discovery call...";
    }
    if (tool === "generate_follow_up") {
      return `Preparing follow-up: ${data.subject}`;
    }
    return "";
  }

  function renderToolCard(t: ToolLogEntry) {
    const d = t.data;

    if (t.tool === "extract_lead_info") {
      const contactFields: { label: string; value: string }[] = [];
      if (d.name)             contactFields.push({ label: "Name",     value: d.name as string });
      if (d.company)          contactFields.push({ label: "Company",  value: d.company as string });
      if (d.timeline)         contactFields.push({ label: "Timeline", value: d.timeline as string });
      if (d.budget_readiness) contactFields.push({ label: "Budget",   value: d.budget_readiness as string });
      if (d.decision_maker)   contactFields.push({ label: "Decision maker", value: d.decision_maker as string });
      if (d.email)            contactFields.push({ label: "Email",    value: d.email as string });
      if (d.phone)            contactFields.push({ label: "Phone",    value: d.phone as string });
      return (
        <div className="flex flex-col gap-1 py-1">
          {!!d.industry && (
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-indigo-400 shrink-0" />
              <span className="text-[10px] text-white/60">{d.industry as string}</span>
            </div>
          )}
          {contactFields.length > 0 && (
            <div className="flex items-start gap-2">
              <User size={18} className="text-blue-400 mt-0.5 shrink-0" />
              <div className="text-[10px] text-white/60 leading-relaxed">
                {contactFields.map((f, i) => (
                  <span key={i}>{i > 0 && <span className="text-white/20"> · </span>}<span className="text-white/40">{f.label}:</span> {f.value}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    if (t.tool === "capture_pain_point") {
      const severityColor =
        d.severity === "high" ? "text-red-400" :
        d.severity === "medium" ? "text-amber-400" : "text-green-400";
      return (
        <div className="flex items-start gap-2 py-1">
          <Frown size={18} className="text-orange-400 mt-0.5 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] text-white/60">{d.pain_point as string}</span>
            {!!d.severity && (
              <span className={`text-[9px] font-semibold uppercase ${severityColor}`}>{d.severity as string}</span>
            )}
          </div>
        </div>
      );
    }

    if (t.tool === "score_lead") {
      const temp = d.temperature as string;
      const tempColor = temp === "Hot" ? "text-red-400" : temp === "Warm" ? "text-amber-400" : "text-sky-400";
      const barColor  = temp === "Hot" ? "bg-red-500"   : temp === "Warm" ? "bg-amber-500"   : "bg-sky-500";
      const badgeClass = temp === "Hot"
        ? "bg-red-500/20 text-red-300"
        : temp === "Warm"
        ? "bg-amber-500/20 text-amber-300"
        : "bg-sky-500/20 text-sky-300";
      const score = (d.score as number) ?? 0;
      return (
        <div className="py-1.5">
          <div className="flex items-center gap-1.5 mb-1">
            <TrendingUp size={18} className={tempColor} />
            <span className="text-[10px] text-white/60">Lead score: {score}/100</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${badgeClass}`}>{temp}</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${score}%` }} />
          </div>
        </div>
      );
    }

    if (t.tool === "recommend_offer") {
      return (
        <div className="mt-1 rounded-lg bg-white/5 border border-white/10 p-2">
          <div className="flex items-center gap-1.5 mb-1">
            <Gift size={18} className="text-purple-400" />
            <span className="text-[10px] font-semibold text-white/80">{d.offer_name as string}</span>
          </div>
          {!!d.reason && <p className="text-[9px] text-white/40 leading-relaxed">{d.reason as string}</p>}
        </div>
      );
    }

    if (t.tool === "book_discovery_call") {
      return (
        <div className="mt-1 rounded-lg bg-white/5 border border-white/10 p-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            <CalendarCheck size={18} className="text-green-400" />
            <span className="text-[10px] font-semibold text-white/80">Discovery Call</span>
          </div>
          {!!d.slot && <p className="text-[9px] text-white/50 mb-2">{d.slot as string}</p>}
          {!!d.confirmed && (
            <a
              href="https://calendar.google.com/calendar/u/0/r"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[9px] bg-green-500/20 text-green-300 px-2 py-1 rounded-full hover:bg-green-500/30 transition-colors"
            >
              <ExternalLink size={12} /> Open Calendar
            </a>
          )}
        </div>
      );
    }

    if (t.tool === "detect_objection") {
      return (
        <div className="flex items-center gap-2 py-1">
          <AlertTriangle size={18} className="text-yellow-400 shrink-0" />
          <span className="text-[10px] text-white/60">{(d.objection_type as string).replace(/_/g, " ")}</span>
          {!!d.raw_quote && (
            <span className="text-[9px] text-white/30 italic truncate max-w-[160px]">&ldquo;{d.raw_quote as string}&rdquo;</span>
          )}
        </div>
      );
    }

    if (t.tool === "generate_follow_up") {
      return (
        <div className="flex items-center gap-2 py-1">
          <Mail size={18} className="text-sky-400 shrink-0" />
          <span className="text-[10px] text-white/60 truncate">{d.subject as string}</span>
        </div>
      );
    }

    // Fallback: plain text summary
    return (
      <div className="flex items-center gap-1.5 py-0.5">
        <span className="text-green-400 text-[10px] shrink-0">✓</span>
        <span className="text-white/40 text-[10px] italic">{t.summary}</span>
      </div>
    );
  }

  function handleToolEvent(event: { tool: string; timestamp: string; data: Record<string, unknown> }) {
    const { tool, timestamp, data } = event;

    const summary = buildToolSummary(tool, data);
    if (!summary) return; // no_op, summary_updated, unknown — skip

    const entry: ToolLogEntry = { tool, timestamp, summary, data };
    const msgId = currentAssistantMsgIdRef.current;

    if (msgId) {
      // An assistant message for this turn already exists — attach directly
      // (handles the case where RTM beat SSE to the frontend)
      setTranscript((prev) => {
        const idx = prev.findIndex((m) => m.id === msgId);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], tools: [...(next[idx].tools ?? []), entry] };
          return next;
        }
        // Message not yet in transcript — fall back to buffer
        pendingToolsRef.current.push(entry);
        return prev;
      });
    } else {
      // No assistant message yet — buffer until one arrives
      pendingToolsRef.current.push(entry);
    }
  }

  function openSse(channel: string) {
    if (sseRef.current) sseRef.current.close();
    const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    const es = new EventSource(`${apiBase}/events/${encodeURIComponent(channel)}`);
    es.onmessage = (e) => {
      try {
        const payload = JSON.parse(e.data as string);
        if (payload.type === "connected") return;
        handleToolEvent(payload as { tool: string; timestamp: string; data: Record<string, unknown> });
      } catch {
        // ignore malformed events
      }
    };
    sseRef.current = es;
  }

  function closeSse() {
    sseRef.current?.close();
    sseRef.current = null;
  }

  function formatApiError(error: unknown, fallback: string): string {
    const axiosErr = error as AxiosError<{ detail?: unknown }> | undefined;
    const detail = axiosErr?.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) {
      return detail;
    }
    if (detail && typeof detail === "object") {
      const mapped = detail as { message?: string; body?: string; status_code?: number };
      if (mapped.message && mapped.body) {
        return `${mapped.message} (${mapped.status_code ?? "?"}): ${mapped.body}`;
      }
      if (mapped.message) {
        return mapped.message;
      }
    }
    if (error instanceof Error && error.message) {
      return error.message;
    }
    return fallback;
  }

  async function toggleMicMute() {
    const micTrack = micTrackRef.current;
    if (!micTrack) return;
    const next = !isMicMuted;
    try {
      await micTrack.setMuted(next);
      setIsMicMuted(next);
    } catch {
      // best effort
    }
  }

  useEffect(() => {
    if (!isActive) {
      setMicVolumeLevel(0);
      if (volumePollerRef.current) {
        clearInterval(volumePollerRef.current);
        volumePollerRef.current = null;
      }
      return;
    }
    volumePollerRef.current = setInterval(() => {
      const level = micTrackRef.current?.getVolumeLevel?.() ?? 0;
      setMicVolumeLevel(level);
    }, 100);
    return () => {
      if (volumePollerRef.current) {
        clearInterval(volumePollerRef.current);
        volumePollerRef.current = null;
      }
    };
  }, [isActive]);

  function upsertTranscriptLine(id: string, speaker: TranscriptSpeaker, text: string) {
    if (speaker === "user") {
      // New user turn — clear so late SSE tools don't bleed onto the previous response
      currentAssistantMsgIdRef.current = "";
    } else if (speaker === "assistant") {
      currentAssistantMsgIdRef.current = id;
    }

    // Drain pending tools BEFORE entering setState (avoids mutating ref inside pure updater)
    const drainedTools =
      speaker === "assistant" && pendingToolsRef.current.length > 0
        ? pendingToolsRef.current.splice(0)
        : [];

    setTranscript((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          text,
          // Merge any just-drained tools into an existing entry too
          ...(drainedTools.length > 0 && {
            tools: [...(next[idx].tools ?? []), ...drainedTools],
          }),
        };
        return next.slice(-40);
      }
      return [
        ...prev.slice(-39),
        { id, speaker, text, ...(drainedTools.length > 0 && { tools: drainedTools }) },
      ];
    });
  }

  function mapToolkitTranscript(items: ITranscriptHelperItem[]): TranscriptItem[] {
    return items
      .map((item) => ({
        id: item.id,
        speaker: item.role as TranscriptSpeaker,
        text: item.text,
      }))
      .slice(-40);
  }

  function clearMicUnmuteTimer() {
    if (micUnmuteTimerRef.current) {
      clearTimeout(micUnmuteTimerRef.current);
      micUnmuteTimerRef.current = null;
    }
  }

  function clearHalfDuplexMuteTimer() {
    if (micHalfDuplexMuteTimerRef.current) {
      clearTimeout(micHalfDuplexMuteTimerRef.current);
      micHalfDuplexMuteTimerRef.current = null;
    }
  }

  async function setHalfDuplexMicMuted(muted: boolean) {
    const micTrack = micTrackRef.current;
    if (!micTrack) return;
    if (micHalfDuplexMutedRef.current === muted) return;

    micHalfDuplexMutedRef.current = muted;
    try {
      await micTrack.setMuted(muted);
    } catch {
      // best effort
    }
  }

  async function ensureAgoraRtcModule() {
    if (!agoraRtcModuleRef.current) {
      agoraRtcModuleRef.current = await import("agora-rtc-sdk-ng");
    }
    return agoraRtcModuleRef.current.default;
  }

  async function ensureAgoraRtmModule() {
    if (!agoraRtmModuleRef.current) {
      agoraRtmModuleRef.current = await import("agora-rtm-sdk");
    }
    return agoraRtmModuleRef.current.default;
  }

  async function attachAiDenoiser(
    agoraRtc: Awaited<ReturnType<typeof ensureAgoraRtcModule>>,
    micTrack: IMicrophoneAudioTrack,
  ): Promise<boolean> {
    try {
      if (!aiDenoiserExtensionRef.current) {
        const denoiserModule = await import("agora-extension-ai-denoiser");
        const extension = new denoiserModule.AIDenoiserExtension({
          assetsPath: AI_DENOISER_ASSETS_PATH,
        });

        if (!extension.checkCompatibility()) {
          setStatus("AI denoiser unavailable on this browser. Using browser ANS.");
          return false;
        }

        extension.onloaderror = (error: Error) => {
          setLastAgentError(`AI denoiser load error: ${error.message}`);
        };

        agoraRtc.registerExtensions([extension]);
        aiDenoiserExtensionRef.current = extension;
      }

      const processor = aiDenoiserExtensionRef.current.createProcessor();
      processor.on("loaderror", (error: Error) => {
        setLastAgentError(`AI denoiser processor load error: ${error.message}`);
      });
      processor.on("overload", async () => {
        try {
          await processor.disable();
        } catch {
          // best effort
        }
      });

      micTrack.pipe(processor).pipe(micTrack.processorDestination);
      await processor.setMode(AI_DENOISER_MODE_NSNG);
      await processor.setLevel(AI_DENOISER_LEVEL_AGGRESSIVE);
      await processor.enable();
      aiDenoiserProcessorRef.current = processor;
      setAudioProcessingMode("ai-denoiser");
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown AI denoiser error";
      setLastAgentError(`AI denoiser init failed: ${message}`);
      return false;
    }
  }

  async function cleanupAiDenoiser() {
    const processor = aiDenoiserProcessorRef.current;
    const micTrack = micTrackRef.current;
    if (!processor) return;

    try {
      processor.unpipe();
      if (micTrack) {
        micTrack.unpipe();
        micTrack.pipe(micTrack.processorDestination);
      }
      try {
        await processor.disable();
      } catch {
        // best effort
      }
      const processorWithDestroy = processor as IAIDenoiserProcessor & {
        destroy?: () => Promise<void> | void;
      };
      await processorWithDestroy.destroy?.();
    } catch {
      // best effort cleanup
    } finally {
      aiDenoiserProcessorRef.current = null;
      setAudioProcessingMode("browser-ans");
    }
  }

  async function cleanupRtm() {
    const rtmClient = rtmClientRef.current;
    const convoApi = convoApiRef.current;
    const activeChannel = activeChannelRef.current;

    if (!rtmClient) {
      activeChannelRef.current = "";
      setRtmConnectionStatus("disconnected");
      return;
    }

    try {
      if (convoApi && activeChannel) {
        await convoApi.unsubscribeMessage(activeChannel);
      }
      convoApi?.destroy();
      await rtmClient.logout();
    } catch {
      // best effort cleanup
    } finally {
      rtmClientRef.current = null;
      convoApiRef.current = null;
      activeChannelRef.current = "";
      setRtmConnectionStatus("disconnected");
    }
  }

  function scheduleHalfDuplexUnmute(delayMs = 450) {
    if (!autoHalfDuplexRef.current || !micTrackRef.current) return;
    clearMicUnmuteTimer();
    micUnmuteTimerRef.current = setTimeout(() => {
      void setHalfDuplexMicMuted(false);
    }, delayMs);
  }

  async function cleanupRtc() {
    const micTrack = micTrackRef.current;
    const client = clientRef.current;

    try {
      clearMicUnmuteTimer();
      clearHalfDuplexMuteTimer();
      if (agentStateDebounceTimerRef.current) {
        clearTimeout(agentStateDebounceTimerRef.current);
        agentStateDebounceTimerRef.current = null;
      }
      await cleanupAiDenoiser();
      if (micTrack) {
        await setHalfDuplexMicMuted(false);
        micTrack.stop();
        micTrack.close();
      }

      remoteAgentAudioRef.current?.stop();
      remoteAgentAudioRef.current = null;

      if (client) {
        await client.leave();
      }
    } catch {
      // best effort cleanup
    } finally {
      micTrackRef.current = null;
      clientRef.current = null;
      micHalfDuplexMutedRef.current = false;
      subscribedAudioUidsRef.current.clear();
      subscribeInFlightUidsRef.current.clear();
      lastPlayedTrackByUidRef.current.clear();
      lastPlayedAtMsByUidRef.current.clear();
      lastSubscribeAtMsByUidRef.current.clear();
      lastUnpublishedAtMsByUidRef.current.clear();
    }
  }

  async function cleanupSession() {
    await cleanupRtc();
    await cleanupRtm();
  }

  function scheduleHalfDuplexMute() {
    if (!autoHalfDuplexRef.current || !micTrackRef.current) return;
    clearHalfDuplexMuteTimer();
    micHalfDuplexMuteTimerRef.current = setTimeout(() => {
      void setHalfDuplexMicMuted(true);
    }, 350);
  }



  async function refreshHistoryIntoTranscript(agentIdOverride?: string) {
    const effectiveAgentId = agentIdOverride ?? agentId;
    if (!effectiveAgentId) return;
    try {
      const res = await api.post<ConvoHistoryResponse>("/agora/convo/history", {
        agent_id: effectiveAgentId,
        channel_name: channelName.trim(),
        agent_uid: agentUid.trim(),
      });
      const items = (res.data.contents || [])
        .filter((item) => (item.role === "user" || item.role === "assistant") && item.content)
        .map((item, idx) => ({
          id: `history-${idx}`,
          speaker: item.role as TranscriptSpeaker,
          text: String(item.content),
        }));
      if (items.length > 0) {
        setTranscript(items.slice(-40));
      }
    } catch {
      // best effort history hydration only
    }
  }

  async function interruptAgent() {
    if (isInterrupting || !agentId) return;
    setIsInterrupting(true);
    setErrorMessage("");
    try {
      await api.post<ConvoInterruptResponse>("/agora/convo/interrupt", {
        agent_id: agentId,
        channel_name: channelName.trim(),
        agent_uid: agentUid.trim(),
      });
      setStatus("Agent interrupted.");
    } catch (error) {
      const message = formatApiError(error, "Failed to interrupt agent.");
      setErrorMessage(message);
      setStatus("Interrupt failed");
    } finally {
      setIsInterrupting(false);
    }
  }

  async function startSession() {
    if (isStarting || isActive) return;

    setErrorMessage("");
    setTranscript([]);
    setRemoteJoinCount(0);
    setTranscriptEventCount(0);
    setAgentMetricsCount(0);
    setAgentState(EAgentState.UNKNOWN);
    setLastAgentError("");
    setRtmConnectionStatus("starting");
    setStatus("Starting Agora Conversational AI...");
    setIsStarting(true);

    try {
      if (!appIdReady) {
        throw new Error("Missing NEXT_PUBLIC_AGORA_APP_ID in web/.env.local");
      }
      if (!channelName.trim()) {
        throw new Error("Channel name is required.");
      }
      if (!userUid.trim()) {
        throw new Error("User UID is required.");
      }
      if (!agentUid.trim()) {
        throw new Error("Agent UID is required.");
      }
      if (!/^[0-9]{1,18}$/.test(userUid.trim())) {
        throw new Error("User UID must be numeric.");
      }
      if (!/^[0-9]{1,18}$/.test(agentUid.trim())) {
        throw new Error("Agent UID must be numeric.");
      }
      if (userUid.trim() === agentUid.trim()) {
        throw new Error("User UID must be different from Agent UID.");
      }

      const requestedChannel = channelName.trim();
      const requestedUserUid = userUid.trim();
      const requestedAgentUid = agentUid.trim();

      setStatus("Preparing combined RTC + RTM token...");
      const tokenRes = await api.post<ConvoUserTokenResponse>("/agora/convo/user-token", {
        channel_name: requestedChannel,
        user_uid: requestedUserUid,
      });
      const { channel_name, user_uid, user_token } = tokenRes.data;

      setStatus("Connecting RTM transcript channel...");

      const AgoraRTM = await ensureAgoraRtmModule();
      const rtmClient = new AgoraRTM.RTM(appId, user_uid, {
        logLevel: "none",
      }) as RTMClientLike;
      await rtmClient.login({ token: user_token });
      rtmClientRef.current = rtmClient;
      activeChannelRef.current = channel_name;

      ConversationalAIAPI.init({
        rtmEngine: rtmClient,
        renderMode: ETranscriptHelperMode.WORD,
        enableLog: false,
      });
      const convoApi = ConversationalAIAPI.getInstance();
      convoApiRef.current = convoApi;
      const toolkitHandler: IConversationalAIAPIEventHandler = {
        onTranscriptUpdated: (_agentUserId, transcription) => {
          setTranscriptEventCount((prev) => prev + 1);
          const items = transcription.items;

          // Keep currentAssistantMsgIdRef in sync so handleToolEvent can attach directly
          const lastItem = items.length > 0 ? items[items.length - 1] : null;
          if (lastItem?.role === "user") {
            currentAssistantMsgIdRef.current = "";
          } else if (lastItem?.role === "assistant") {
            currentAssistantMsgIdRef.current = lastItem.id;
          }

          // Drain any buffered tool events onto the last assistant message.
          // Must happen outside of setState to avoid mutating a ref inside a pure updater.
          const drainedTools =
            lastItem?.role === "assistant" && pendingToolsRef.current.length > 0
              ? pendingToolsRef.current.splice(0)
              : [];
          const drainTargetId = drainedTools.length > 0 ? (lastItem?.id ?? null) : null;

          setTranscript((prev) => {
            const existingById = new Map(prev.map((item) => [item.id, item]));
            return items.slice(-40).map((item) => {
              const existing = existingById.get(item.id);
              const preserved = existing?.tools ?? [];
              const fresh = item.id === drainTargetId ? drainedTools : [];
              const allTools = [...preserved, ...fresh];
              return {
                id: item.id,
                speaker: item.role as TranscriptSpeaker,
                text: item.text,
                ...(allTools.length > 0 && { tools: allTools }),
              };
            });
          });
        },
        onAgentStateChanged: (_agentUserId, event) => {
          setAgentState(event.state);
          setIsSpeaking(event.state === EAgentState.SPEAKING);
          if (!autoHalfDuplexRef.current) return;
          if (agentStateDebounceTimerRef.current) clearTimeout(agentStateDebounceTimerRef.current);
          agentStateDebounceTimerRef.current = setTimeout(() => {
            if (event.state === EAgentState.SPEAKING) {
              scheduleHalfDuplexMute();
            } else {
              scheduleHalfDuplexUnmute(500);
            }
          }, 250);
        },
        onAgentInterrupted: (_agentUserId, event) => {
          const suffix = event.turn_id ? ` (turn ${event.turn_id})` : "";
          upsertTranscriptLine(`system-interrupt-${Date.now()}`, "system", `Agent interrupted${suffix}.`);
        },
        onAgentMetrics: () => {
          setAgentMetricsCount((prev) => prev + 1);
        },
        onAgentError: (_agentUserId, event) => {
          setLastAgentError(event.message);
          upsertTranscriptLine(`system-error-${Date.now()}`, "system", `Agent error: ${event.message}`);
        },
        onRTMStateChanged: (event) => {
          const connectionText = `${event.state}${event.reason ? ` (${event.reason})` : ""}`;
          setRtmConnectionStatus(connectionText);
        },
      };
      convoApi.addHandler(toolkitHandler);
      await convoApi.subscribeMessage(channel_name);

      setStatus("Starting CAE agent...");
      const startRes = await api.post<ConvoStartResponse>("/agora/convo/start", {
        channel_name,
        user_uid,
        agent_uid: requestedAgentUid,
        tts_voice: voice,
        tts_speed: ttsSpeed,
      });

      const { agent_id, agent_uid } = startRes.data;
      setAgentId(agent_id);
      setStatus("Joining RTC channel...");

      const joinUid = Number(user_uid);
      if (!Number.isInteger(joinUid) || joinUid <= 0 || joinUid > 2147483647) {
        throw new Error("User UID must be a 32-bit positive integer for RTC join.");
      }

      const AgoraRTC = await ensureAgoraRtcModule();
      const rtcTuning = AgoraRTC as unknown as {
        setParameter?: (key: string, value: unknown) => void;
      };
      rtcTuning.setParameter?.("ENABLE_AUDIO_PTS_METADATA", true);
      const client = AgoraRTC.createClient({ mode: "rtc", codec: "vp8" });
      clientRef.current = client;

      client.on("user-published", async (remoteUser: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel") => {
        if (mediaType !== "audio") return;

        const uidKey = String(remoteUser.uid);
        const now = Date.now();
        const lastSubscribeTs = lastSubscribeAtMsByUidRef.current.get(uidKey) ?? 0;
        const alreadySubscribed = subscribedAudioUidsRef.current.has(uidKey);

        if (!alreadySubscribed && now - lastSubscribeTs < 1200) {
          return;
        }

        if (!alreadySubscribed) {
          if (subscribeInFlightUidsRef.current.has(uidKey)) return;
          subscribeInFlightUidsRef.current.add(uidKey);
          try {
            await client.subscribe(remoteUser, "audio");
            subscribedAudioUidsRef.current.add(uidKey);
            lastSubscribeAtMsByUidRef.current.set(uidKey, Date.now());
          } catch {
            return;
          } finally {
            subscribeInFlightUidsRef.current.delete(uidKey);
          }
        }

        const audioTrack = remoteUser.audioTrack;
        if (!audioTrack) return;

        const nextTrackId = audioTrack.getTrackId();
        const lastTrackId = lastPlayedTrackByUidRef.current.get(uidKey);
        const lastPlayedAt = lastPlayedAtMsByUidRef.current.get(uidKey) ?? 0;
        const lastUnpublishedAt = lastUnpublishedAtMsByUidRef.current.get(uidKey) ?? 0;
        const currentPlayingTrackId = remoteAgentAudioRef.current?.getTrackId();
        const sameTrack = lastTrackId === nextTrackId;
        const inRepublishFlapWindow = sameTrack && now - lastUnpublishedAt < AUDIO_REPUBLISH_FLAP_WINDOW_MS;
        const inReplayFlapWindow = sameTrack && now - lastPlayedAt < AUDIO_REPUBLISH_FLAP_WINDOW_MS;

        if (
          currentPlayingTrackId &&
          currentPlayingTrackId === nextTrackId &&
          lastTrackId === nextTrackId &&
          (inRepublishFlapWindow || inReplayFlapWindow)
        ) {
          return;
        }

        remoteAgentAudioRef.current = audioTrack;

        if (!sameTrack || now - lastPlayedAt > 3000) {
          audioTrack.play();
          lastPlayedTrackByUidRef.current.set(uidKey, nextTrackId);
          lastPlayedAtMsByUidRef.current.set(uidKey, now);
        }
        lastUnpublishedAtMsByUidRef.current.delete(uidKey);
        setStatus(`Agent connected (${remoteUser.uid})`);
      });

      client.on("user-joined", (remoteUser: IAgoraRTCRemoteUser) => {
        setRemoteJoinCount((prev) => prev + 1);
        setStatus(`Remote joined (${remoteUser.uid})`);
      });

      client.on("user-unpublished", (remoteUser: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel") => {
        if (mediaType === "audio") {
          lastUnpublishedAtMsByUidRef.current.set(String(remoteUser.uid), Date.now());
          setStatus(`Agent audio unpublished (${remoteUser.uid})`);
        }
      });

      client.on("user-left", (remoteUser: IAgoraRTCRemoteUser) => {
        const uidKey = String(remoteUser.uid);
        subscribedAudioUidsRef.current.delete(uidKey);
        subscribeInFlightUidsRef.current.delete(uidKey);
        lastPlayedTrackByUidRef.current.delete(uidKey);
        lastPlayedAtMsByUidRef.current.delete(uidKey);
        lastSubscribeAtMsByUidRef.current.delete(uidKey);
        lastUnpublishedAtMsByUidRef.current.delete(uidKey);
        setStatus(`Remote left (${remoteUser.uid})`);
      });

      await client.join(appId, channel_name, user_token, joinUid);

      const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "speech_standard",
        AEC: true,
        ANS: false,
        AGC: true,
      });
      micTrackRef.current = micTrack;
      const denoiserAttached = await attachAiDenoiser(AgoraRTC, micTrack);
      if (!denoiserAttached) {
        // Fallback to built-in suppression if AI denoiser is unavailable.
        try {
          await micTrack.setEnabled(false);
          await micTrack.setEnabled(true);
        } catch {
          // best effort fallback
        }
      }
      await client.publish([micTrack]);

      setIsActive(true);
      setStatus(`Live on "${channel_name}" as ${user_uid}. Speak to the agent.`);
      setUserUid(user_uid);
      setAgentUid(agent_uid);
      setChannelName(channel_name);
      openSse(channel_name);
      await refreshHistoryIntoTranscript(agent_id);
    } catch (error) {
      const message = formatApiError(error, "Failed to start session.");
      setErrorMessage(message);
      setStatus("Start failed");
      setIsSpeaking(false);
      setAgentState(EAgentState.UNKNOWN);
      await cleanupSession();
    } finally {
      setIsStarting(false);
    }
  }

  function onHalfDuplexToggle(nextValue: boolean) {
    autoHalfDuplexRef.current = nextValue;
    setAutoHalfDuplex(nextValue);
    if (!nextValue) {
      clearMicUnmuteTimer();
      clearHalfDuplexMuteTimer();
      void setHalfDuplexMicMuted(false);
    }
  }

  async function stopSession() {
    if (isStopping) return;
    setIsStopping(true);
    setErrorMessage("");
    setStatus("Stopping session...");

    try {
      await cleanupSession();

      if (agentId) {
        await api.post<ConvoStopResponse>("/agora/convo/stop", {
          agent_id: agentId,
          channel_name: channelName.trim(),
          agent_uid: agentUid.trim(),
        });
      }

      closeSse();
      setStatus("Session stopped");
      setAgentId("");
      setIsActive(false);
      setIsSpeaking(false);
      setAgentState(EAgentState.UNKNOWN);
      setRtmConnectionStatus("disconnected");
      setTranscriptEventCount(0);
      setAgentMetricsCount(0);
      setLastAgentError("");
      setAudioProcessingMode("browser-ans");
      clearMicUnmuteTimer();
      setTranscript([]);
      pendingToolsRef.current = [];
      currentAssistantMsgIdRef.current = "";
      setChannelName(generateDefaultChannelName());
      setUserUid(generateDefaultUserUid(agentUid.trim() || DEFAULT_AGENT_UID));
    } catch (error) {
      const message = formatApiError(error, "Failed to stop session.");
      setErrorMessage(message);
      setStatus("Stop failed");
    } finally {
      setIsStopping(false);
    }
  }

  return (
    <div className="dark h-screen w-full bg-background text-foreground overflow-hidden flex flex-col md:flex-row">
      {/* LEFT SIDE: Globe & Action Button */}
      <div className="relative w-full md:w-1/2 h-1/2 md:h-full flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/20">
        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-90 flex items-center justify-center">
          <GlobeAnimation isSpeaking={isSpeaking} />
        </div>
        
        {/* Bottom Control Bar */}
        <div className="absolute bottom-10 z-10 flex flex-col items-center gap-3">
          {!isActive ? (
            <button
              type="button"
              onClick={startSession}
              disabled={isStarting}
              className="rounded-full bg-cyan-500 hover:bg-cyan-400 px-8 py-4 text-lg font-bold text-black transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.7)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStarting ? "Connecting..." : "Initialize Session"}
            </button>
          ) : (
            <>
              {/* Status label */}
              <p className="text-sm font-medium text-white/70 flex items-center gap-2">
                {isSpeaking ? (
                  <><span className="inline-block w-2 h-2 rounded-full bg-white/60 animate-pulse" />Speak or click button to interrupt agent</>
                ) : (
                  "Listening..."
                )}
              </p>

              {/* Control row */}
              <div className="flex items-center gap-3">
                {/* CC — subtitles toggle */}
                <button
                  type="button"
                  onClick={() => setShowTranscript((v) => !v)}
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${showTranscript ? "bg-white/20 text-white" : "bg-white/10 text-white/40"}`}
                  title="Toggle subtitles"
                >
                  <Captions className="w-5 h-5" />
                </button>

                {/* Center: mic + wave OR mic + stop */}
                <div className="flex items-center gap-2 bg-white/10 rounded-full px-5 py-3">
                  {/* Mic / mute button */}
                  <button
                    type="button"
                    onClick={toggleMicMute}
                    className="text-white/80 hover:text-white transition-colors"
                    title={isMicMuted ? "Unmute mic" : "Mute mic"}
                  >
                    {isMicMuted ? <MicOff className="w-5 h-5 text-red-400" /> : <Mic className="w-5 h-5" />}
                  </button>

                  {/* Divider */}
                  <div className="w-px h-5 bg-white/20" />

                  {/* Wave bars when user speaking, animated dots otherwise, stop when AI speaking */}
                  {isSpeaking ? (
                    <button
                      type="button"
                      onClick={interruptAgent}
                      disabled={isInterrupting}
                      className="text-white hover:text-red-300 transition-colors disabled:opacity-50"
                      title="Stop agent"
                    >
                      <Square className="w-4 h-4 fill-current" />
                    </button>
                  ) : micVolumeLevel > 0.02 ? (
                    /* Audio wave bars */
                    <div className="flex items-center gap-[3px] h-5">
                      {[0.6, 1, 0.7, 0.9, 0.5].map((base, i) => (
                        <div
                          key={i}
                          className="w-[3px] rounded-full bg-cyan-400"
                          style={{
                            height: `${Math.max(4, Math.min(20, micVolumeLevel * 100 * base))}px`,
                            transition: "height 80ms ease",
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    /* Idle dots */
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className="w-[6px] h-[6px] rounded-full bg-cyan-400 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s`, animationDuration: "1s" }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* X — terminate */}
                <button
                  type="button"
                  onClick={stopSession}
                  disabled={isStopping}
                  className="w-12 h-12 rounded-full bg-white/10 hover:bg-red-500/30 flex items-center justify-center transition-all disabled:opacity-50"
                  title="Terminate session"
                >
                  <X className="w-5 h-5 text-red-400" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Config card + Conversation */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col p-6 overflow-y-auto gap-5 bg-card/30">
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
          FEWA CAE System
        </h1>

        {/* ── Config card ── */}
        <div className="rounded-2xl border border-white/10 bg-[#0d0d1a] p-5 flex flex-col gap-5">

          {/* Top bar: channel pill + three-dot menu */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 max-w-[70%]">
              <span className={`w-2 h-2 rounded-full flex-none ${isActive ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]" : "bg-white/20"}`} />
              <span className="text-sm font-medium text-white/80 truncate">{channelName}</span>
            </div>
            <button
              type="button"
              onClick={() => setShowMoreMenu(true)}
              className="w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-white/60 hover:text-white transition-all"
              title="More settings"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>

          {/* Voice circles */}
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/40 mb-3">VOICE</p>
            <div className="flex justify-between gap-1">
              {VOICE_DATA.map((v) => {
                const selected = voice === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => { if (!isActive && !isStarting) setVoice(v.id); }}
                    disabled={isActive || isStarting}
                    className="flex flex-col items-center gap-1.5 group disabled:opacity-60"
                    title={`${v.name} — ${v.tag}`}
                  >
                    {/* Circle avatar */}
                    <div className={`relative w-12 h-12 rounded-full overflow-hidden transition-all duration-200 ${
                      selected
                        ? "ring-2 ring-emerald-400 ring-offset-2 ring-offset-[#0d0d1a] shadow-[0_0_10px_rgba(52,211,153,0.5)]"
                        : "ring-1 ring-white/15 group-hover:ring-white/30"
                    }`}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={v.image}
                        alt={v.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                      {/* Selected overlay */}
                      {selected && (
                        <div className="absolute inset-0 bg-emerald-400/10 flex items-center justify-center">
                          <Check className="w-4 h-4 text-emerald-300 drop-shadow" strokeWidth={3} />
                        </div>
                      )}
                    </div>
                    {/* Name */}
                    <span className={`text-[10px] font-medium transition-colors leading-tight ${
                      selected ? "text-emerald-400" : "text-white/40 group-hover:text-white/60"
                    }`}>
                      {v.name}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Speech speed pills */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-white/40">SPEECH SPEED</p>
              <p className="text-sm font-bold text-emerald-400">{ttsSpeed}×</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {TTS_SPEED_OPTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { if (!isActive && !isStarting) setTtsSpeed(s); }}
                  disabled={isActive || isStarting}
                  className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    ttsSpeed === s
                      ? "bg-emerald-400/15 border-emerald-400 text-emerald-400"
                      : "border-white/15 text-white/50 hover:border-white/30 hover:text-white/70"
                  } disabled:opacity-60`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ── More settings popup ── */}
        {showMoreMenu && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={() => setShowMoreMenu(false)}
          >
            <div
              className="w-[340px] rounded-2xl bg-[#0d0d1a] border border-white/10 p-6 flex flex-col gap-5 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">Session Settings</h2>
                <button type="button" onClick={() => setShowMoreMenu(false)} className="text-white/40 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1.5">Channel Name</label>
                  <input
                    value={channelName}
                    onChange={(e) => setChannelName(e.target.value)}
                    disabled={isActive || isStarting}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30 disabled:opacity-50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1.5">User UID</label>
                  <input
                    value={userUid}
                    onChange={(e) => setUserUid(e.target.value)}
                    disabled={isActive || isStarting}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30 disabled:opacity-50 text-sm"
                  />
                </div>
                <div>
                  <label className="text-white/40 text-[10px] uppercase tracking-wider block mb-1.5">Agent UID</label>
                  <input
                    value={agentUid}
                    onChange={(e) => setAgentUid(e.target.value)}
                    disabled={isActive || isStarting}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-white outline-none focus:border-emerald-400/60 focus:ring-1 focus:ring-emerald-400/30 disabled:opacity-50 text-sm"
                  />
                </div>
              </div>

              {/* Auto half-duplex toggle */}
              <button
                type="button"
                onClick={() => onHalfDuplexToggle(!autoHalfDuplex)}
                className="flex items-center justify-between w-full"
              >
                <span className="text-sm text-white/70">Auto half-duplex</span>
                <div className={`w-11 h-6 rounded-full transition-all relative ${autoHalfDuplex ? "bg-emerald-500" : "bg-white/15"}`}>
                  <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all ${autoHalfDuplex ? "left-5" : "left-0.5"}`} />
                </div>
              </button>

              {/* Status info */}
              <div className="rounded-xl bg-white/5 border border-white/8 p-3 flex flex-col gap-1.5 text-[11px]">
                <div className="flex justify-between"><span className="text-white/40">Status</span><span className="text-cyan-400 font-medium">{status}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Agent State</span><span className="text-white/70">{agentState}</span></div>
                <div className="flex justify-between"><span className="text-white/40">RTM</span><span className="text-white/70">{rtmConnectionStatus}</span></div>
                <div className="flex justify-between"><span className="text-white/40">Audio</span><span className="text-white/70">{audioProcessingMode}</span></div>
                {agentId && <div className="flex justify-between"><span className="text-white/40">Agent ID</span><span className="text-white/70 font-mono truncate max-w-[180px]">{agentId}</span></div>}
              </div>

              {lastAgentError && (
                <p className="text-amber-400 text-xs bg-amber-400/10 rounded-xl px-3 py-2">⚠ {lastAgentError}</p>
              )}
              {errorMessage && (
                <p className="text-red-400 text-xs bg-red-400/10 rounded-xl px-3 py-2">{errorMessage}</p>
              )}
            </div>
          </div>
        )}

        {/* Conversation */}
        {showTranscript && <div className="flex-1 flex flex-col min-h-[250px] rounded-xl border bg-background/50 overflow-hidden shadow-sm">
          <div className="bg-muted/30 p-3 border-b flex justify-between items-center">
            <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Transcript</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4 flex flex-col">
            {transcript.length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                No transcript yet. Session inactive.
              </div>
            ) : (
              transcript.map((line) => (
                <div
                  key={line.id}
                  className={`rounded-2xl p-4 text-sm max-w-[85%] ${
                    line.speaker === "assistant"
                      ? "bg-muted/80 text-foreground self-start rounded-bl-sm"
                      : line.speaker === "user" 
                      ? "bg-cyan-600/20 border border-cyan-500/30 text-cyan-50 self-end rounded-br-sm ml-auto"
                      : "bg-gray-600/20 border border-gray-500/30 text-gray-300 self-center rounded-lg text-xs"
                  }`}
                >
                  <p className="mb-1 text-[10px] font-bold uppercase tracking-wider opacity-50">{line.speaker}</p>
                  <p className="leading-relaxed">{line.text}</p>
                  {line.tools && line.tools.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-white/10 flex flex-col gap-0.5">
                      {line.tools.map((t, i) => (
                        <div key={i}>{renderToolCard(t)}</div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>}
      </div>
    </div>
  );
}
