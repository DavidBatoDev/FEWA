"use client";

import { useMemo, useRef, useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Mic, MicOff, Square, X, Captions, Terminal, Play, Settings, Sparkles, Building, ShoppingBag } from "lucide-react";
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
import { FayeDashboard } from "@/components/FayeDashboard";

type ConvoStartResponse = {
  agent_id: string;
  agent_name: string;
  agent_uid: string;
  user_uid: string;
  channel_name: string;
  lead_id: string;
  conversation_id: string;
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

type ConvoMemorySaveResponse = {
  ok: boolean;
  agent_id: string;
  channel_name: string;
  user_uid: string;
  message_count: number;
  summary: string;
  latest_key: string;
  snapshot_key: string;
};

type ConvoMemoryInjectResponse = {
  ok: boolean;
  agent_id: string;
  system_messages_count: number;
  loaded_from_key: string;
};

type TranscriptSpeaker = "user" | "assistant" | "system";

type TranscriptItem = {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
};

const DEFAULT_AGENT_UID = "1001";
const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"];
const AUDIO_REPUBLISH_FLAP_WINDOW_MS = 1200;
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

export function AgentPageContent({ forcedType }: { forcedType?: "sales" | "commerce" }) {
  const searchParams = useSearchParams();
  const searchType = searchParams.get("type");
  const agentType = forcedType ?? (searchType === "commerce" || searchType === "b2c" ? "commerce" : "sales");
  
  // Custom navigation configurations passed from Campaign Setup
  const queryChannel = searchParams.get("channel");
  const queryVoice = searchParams.get("voice");
  const queryLang = searchParams.get("lang");
  
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

  // Simulation Refs
  const simTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Real-time synchronization state refs to avoid closure stale context
  const leadIdRef = useRef("");
  const conversationIdRef = useRef("");
  const agentIdRef = useRef("");
  const agentUidRef = useRef(DEFAULT_AGENT_UID);
  const userUidRef = useRef("");
  const sentTurnsRef = useRef<Set<string>>(new Set());

  // Input states
  const [channelName, setChannelName] = useState(() => queryChannel || generateDefaultChannelName());
  const [agentUid, setAgentUid] = useState(DEFAULT_AGENT_UID);
  const [voice, setVoice] = useState(() => queryVoice || "alloy");
  const [userUid, setUserUid] = useState(() => generateDefaultUserUid(DEFAULT_AGENT_UID));

  // Sync state refs on inputs
  useEffect(() => {
    agentUidRef.current = agentUid;
  }, [agentUid]);

  useEffect(() => {
    userUidRef.current = userUid;
  }, [userUid]);

  // Tab View
  const [activeTab, setActiveTab] = useState<"faye" | "dev">("faye");

  // Faye Dashboard State Sync
  const [backendLeadProfile, setBackendLeadProfile] = useState<any>(undefined);
  const [backendObjections, setBackendObjections] = useState<string[]>([]);
  const [backendBuyingSignals, setBackendBuyingSignals] = useState<string[]>([]);
  const [backendLeadScore, setBackendLeadScore] = useState(0);
  const [backendLeadTemperature, setBackendLeadTemperature] = useState("Cold");
  const [backendRecommendedOffer, setBackendRecommendedOffer] = useState("");
  const [backendNextBestAction, setBackendNextBestAction] = useState("");

  // Simulation states
  const [isSimulating, setIsSimulating] = useState(false);
  const [simStep, setSimStep] = useState(0);

  // RTC Connection States
  const [agentId, setAgentId] = useState("");
  const [leadId, setLeadId] = useState("");
  const [conversationId, setConversationId] = useState("");
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
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [isInjectingMemory, setIsInjectingMemory] = useState(false);
  const [memorySummary, setMemorySummary] = useState("");
  const [memoryMessageCount, setMemoryMessageCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioProcessingMode, setAudioProcessingMode] = useState("browser-ans");
  const [showTranscript, setShowTranscript] = useState(true);
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [micVolumeLevel, setMicVolumeLevel] = useState(0);

  const appIdReady = useMemo(() => appId.trim().length > 0, [appId]);

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
    setTranscript((prev) => {
      const idx = prev.findIndex((item) => item.id === id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], text };
        return next.slice(-40);
      }
      return [...prev.slice(-39), { id, speaker, text }];
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

  // Handle RTM Transcript Updates & Sync to FastAPI DB
  const handleRTMTranscriptSync = (items: ITranscriptHelperItem[]) => {
    items.forEach((item) => {
      if (item.final && !sentTurnsRef.current.has(item.id)) {
        sentTurnsRef.current.add(item.id);
        
        const currentLeadId = leadIdRef.current;
        const currentConversationId = conversationIdRef.current;
        const currentAgentId = agentIdRef.current;

        if (currentLeadId && currentConversationId && currentAgentId) {
          api.post("/agora/convo/transcript/upsert", {
            lead_id: currentLeadId,
            conversation_id: currentConversationId,
            agent_id: currentAgentId,
            channel_name: activeChannelRef.current,
            agent_uid: agentUidRef.current,
            user_uid: userUidRef.current,
            role: item.role,
            text: item.text,
            turn_id: item.turn_id,
            is_final: true,
            publisher_uid: item.uid,
            timestamp: new Date(item.updated_at_ms).toISOString(),
          })
          .then((res) => {
            // Update Faye Dashboard states with response snapshot
            setBackendLeadProfile(res.data.lead_profile);
            setBackendObjections(res.data.objections);
            setBackendBuyingSignals(res.data.buying_signals);
            setBackendLeadScore(res.data.lead_score);
            setBackendLeadTemperature(res.data.lead_temperature);
            setBackendRecommendedOffer(res.data.recommended_offer);
            setBackendNextBestAction(res.data.next_best_action);
          })
          .catch((err) => {
            console.error("[Faye API Sync Error]", err);
          });
        }
      }
    });
  };

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

  async function saveShortTermMemoryInternal(silent = false) {
    if (!agentId) {
      throw new Error("No active agent_id available.");
    }

    const res = await api.post<ConvoMemorySaveResponse>("/agora/convo/memory/save", {
      agent_id: agentId,
      channel_name: channelName.trim(),
      agent_uid: agentUid.trim(),
      user_uid: userUid.trim(),
    });
    setMemorySummary(res.data.summary || "");
    setMemoryMessageCount(res.data.message_count || 0);
    if (!silent) {
      setStatus(`Short-term memory saved (${res.data.message_count} messages).`);
    }
    return res.data;
  }

  async function saveShortTermMemory() {
    if (isSavingMemory) return;
    setIsSavingMemory(true);
    setErrorMessage("");

    try {
      await saveShortTermMemoryInternal(false);
    } catch (error) {
      const message = formatApiError(error, "Failed to save short-term memory.");
      setErrorMessage(message);
      setStatus("Memory save failed");
    } finally {
      setIsSavingMemory(false);
    }
  }

  async function injectSavedMemory() {
    if (isInjectingMemory || !agentId) return;
    setIsInjectingMemory(true);
    setErrorMessage("");

    try {
      const res = await api.post<ConvoMemoryInjectResponse>("/agora/convo/memory/inject", {
        agent_id: agentId,
        channel_name: channelName.trim(),
        agent_uid: agentUid.trim(),
        user_uid: userUid.trim(),
      });
      setStatus(
        `Memory injected (${res.data.system_messages_count} system message${res.data.system_messages_count === 1 ? "" : "s"}).`,
      );
    } catch (error) {
      const message = formatApiError(error, "Failed to inject saved memory.");
      setErrorMessage(message);
      setStatus("Memory inject failed");
    } finally {
      setIsInjectingMemory(false);
    }
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
    stopSimulation(); // Stop simulation if running

    setErrorMessage("");
    setTranscript([]);
    setRemoteJoinCount(0);
    setTranscriptEventCount(0);
    setAgentMetricsCount(0);
    setAgentState(EAgentState.UNKNOWN);
    setLastAgentError("");
    setMemorySummary("");
    setMemoryMessageCount(0);
    setRtmConnectionStatus("starting");
    setStatus("Starting Agora Conversational AI...");
    setIsStarting(true);
    sentTurnsRef.current.clear();

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
          setTranscript(mapToolkitTranscript(transcription.items));
          // Sync with the backend database
          handleRTMTranscriptSync(transcription.items);
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
      
      // Check for campaign knowledge context
      const knowledge = localStorage.getItem("campaign_knowledge");
      if (knowledge) {
        console.log("[Agent Console] Injecting campaign knowledge context...");
      }

      const startRes = await api.post<ConvoStartResponse>("/agora/convo/start", {
        channel_name,
        user_uid,
        agent_uid: requestedAgentUid,
        tts_voice: voice,
        knowledge: knowledge || undefined,
        flow: agentType === "sales" ? "b2b" : "b2c"
      });

      // Clear the knowledge after starting
      localStorage.removeItem("campaign_knowledge");

      const { agent_id, agent_uid: resp_agent_uid, lead_id: resp_lead_id, conversation_id: resp_convo_id } = startRes.data;
      setAgentId(agent_id);
      agentIdRef.current = agent_id;
      
      setLeadId(resp_lead_id);
      leadIdRef.current = resp_lead_id;

      setConversationId(resp_convo_id);
      conversationIdRef.current = resp_convo_id;

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
      setAgentUid(resp_agent_uid);
      setChannelName(channel_name);
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

      setStatus("Session stopped");
      setAgentId("");
      setLeadId("");
      setConversationId("");
      
      leadIdRef.current = "";
      conversationIdRef.current = "";
      agentIdRef.current = "";
      
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

  // Client Simulation Engine (when Agora credentials are absent or for quick sandbox walkthroughs)
  const startSimulation = () => {
    if (isSimulating) return;
    setIsActive(false);
    setIsSimulating(true);
    setSimStep(0);
    setTranscript([]);
    sentTurnsRef.current.clear();
    
    // Clear backend states for B2B/B2C dashboards
    setBackendLeadProfile(undefined);
    setBackendObjections([]);
    setBackendBuyingSignals([]);
    setBackendLeadScore(0);
    setBackendLeadTemperature("Cold");
    setBackendRecommendedOffer("");
    setBackendNextBestAction("");

    let currentStep = 0;
    const maxSteps = agentType === "sales" ? 6 : 5;

    const runStep = () => {
      currentStep++;
      setSimStep(currentStep);
      
      // Update transcripts simulating client call
      if (agentType === "sales") {
        if (currentStep === 1) {
          setTranscript([
            { id: "sim-s1a", speaker: "user", text: "Hello? Hello! Is this the FFlow.ph voice agent?" },
            { id: "sim-s1b", speaker: "assistant", text: "Hello! Yes, welcome to FFlow.ph. I'm your sales qualification agent. How can I help you today?" }
          ]);
        } else if (currentStep === 2) {
          setTranscript(prev => [
            ...prev,
            { id: "sim-s2a", speaker: "user", text: "Yeah, I'm calling from ABC Logistics. We've been having problems keeping track of inbound leads and manual follow-ups are taking too long." },
            { id: "sim-s2b", speaker: "assistant", text: "I see. So you are looking to automate lead tracking for ABC Logistics to solve manual callback delays. What sector of logistics do you focus on, and how soon are you looking to fix this?" }
          ]);
        } else if (currentStep === 3) {
          setTranscript(prev => [
            ...prev,
            { id: "sim-s3a", speaker: "user", text: "We deal with fleet operations and supply chain management. We want to get this implemented immediately, hopefully this month." },
            { id: "sim-s3b", speaker: "assistant", text: "Understood. Fleet operations and supply chain need quick tracking. Implementing this month is ideal. Who else is involved in approving this project budget?" }
          ]);
        } else if (currentStep === 4) {
          setTranscript(prev => [
            ...prev,
            { id: "sim-s4a", speaker: "user", text: "I'm the Managing Director, so I approve the budget. Speaking of budget, what are your rates? It might be too expensive for us." },
            { id: "sim-s4b", speaker: "assistant", text: "Got it. As the Managing Director, you have direct approval. Regarding rates, our packages start at basic tiers. I understand pricing concerns, but we can verify the ROI by saving hours of manual labor per rep." }
          ]);
        } else if (currentStep === 5) {
          setTranscript(prev => [
            ...prev,
            { id: "sim-s5a", speaker: "user", text: "That makes sense. Can we schedule a quick call to check the demo?" },
            { id: "sim-s5b", speaker: "assistant", text: "Absolutely! I recommend our Sales Automation Package. We can book a short discovery demo. How does tomorrow, May 28 at 2:00 PM sound?" }
          ]);
        } else if (currentStep === 6) {
          setTranscript(prev => [
            ...prev,
            { id: "sim-s6a", speaker: "user", text: "Yes, May 28 at 2 PM works for me. Please send the meeting link." },
            { id: "sim-s6b", speaker: "assistant", text: "Perfect! I've booked your slot for May 28 at 2:00 PM. I'm drafting a calendar invite and proposal summary for ABC Logistics now. Talk to you soon!" }
          ]);
        }
      } else {
        // Commerce simulation script
        if (currentStep === 1) {
          setTranscript([
            { id: "sim-c1a", speaker: "user", text: "Hi, I'm looking to buy a new laptop for programming and React development. Do you have anything under 60k?" },
            { id: "sim-c1b", speaker: "assistant", text: "Hello! I can definitely help with that. For programming and React development within a ₱60,000 budget, we have a few options. Are you looking for durability, or standard consumer builds?" }
          ]);
        } else if (currentStep === 2) {
          setTranscript(prev => [
            ...prev,
            { id: "sim-c2a", speaker: "user", text: "Definitely durability. I travel a lot for coding, so I want something tough." },
            { id: "sim-c2b", speaker: "assistant", text: "Got it. I recommend the Lenovo ThinkPad E14 Gen 5, which is ₱58,999 and has Mil-spec durability, compared to the ASUS VivoBook 14 at ₱54,990 which is lighter but standard build. Do you want to go with the ThinkPad?" }
          ]);
        } else if (currentStep === 3) {
          setTranscript(prev => [
            ...prev,
            { id: "sim-c3a", speaker: "user", text: "Yeah, let's go with the ThinkPad. It fits my specs and budget." },
            { id: "sim-c3b", speaker: "assistant", text: "Excellent choice! I've added the Lenovo ThinkPad E14 to your cart. Can you confirm your delivery name, address, and mobile number?" }
          ]);
        } else if (currentStep === 4) {
          setTranscript(prev => [
            ...prev,
            { id: "sim-c4a", speaker: "user", text: "Sure, my name is Juan dela Cruz, address is Project 4, Quezon City, phone 0917-889-1243." },
            { id: "sim-c4b", speaker: "assistant", text: "Thank you! Name: Juan dela Cruz, address: Project 4, Quezon City verified. I'm initializing your checkout reference." }
          ]);
        } else if (currentStep === 5) {
          setTranscript(prev => [
            ...prev,
            { id: "sim-c5a", speaker: "user", text: "Great, how do I pay? Do you take GCash?" },
            { id: "sim-c5b", speaker: "assistant", text: "Yes, we support GCash. I've generated a GCash scan invoice. Your reference code is WPH-2026-00142. Please complete payment to confirm your order." }
          ]);
        }
      }

      if (currentStep >= maxSteps) {
        if (simTimerRef.current) clearInterval(simTimerRef.current);
      }
    };

    runStep();
    simTimerRef.current = setInterval(runStep, 4500);
  };

  const stopSimulation = () => {
    if (simTimerRef.current) {
      clearInterval(simTimerRef.current);
      simTimerRef.current = null;
    }
    setIsSimulating(false);
    setSimStep(0);
    setTranscript([]);
  };

  return (
    <div className="dark h-screen w-full bg-background text-foreground overflow-hidden flex flex-col md:flex-row">
      
      {/* LEFT COLUMN: Sphere Animation & Control Panel */}
      <div className="relative w-full md:w-[40%] h-1/2 md:h-full flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/10 bg-zinc-950">
        
        {/* Glow Header Brand */}
        <div className="absolute top-6 left-6 z-10 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 font-bold text-black text-xs">F</div>
          <span className="text-xs font-black tracking-widest text-white uppercase">
            FFlow<span className="text-cyan-400">.ph</span>
          </span>
        </div>

        {/* Ambient sphere animation */}
        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-80 flex items-center justify-center">
          <GlobeAnimation isSpeaking={isSpeaking || isSimulating} />
        </div>
        
        {/* Bottom Control Bar */}
        <div className="absolute bottom-10 z-10 flex flex-col items-center gap-4 w-[85%]">
          {!isActive && !isSimulating ? (
            <div className="flex flex-col gap-3.5 w-full items-center">
              <button
                type="button"
                onClick={startSession}
                disabled={isStarting}
                className={`rounded-full px-8 py-3.5 text-sm font-bold text-black transition-all disabled:opacity-60 flex items-center gap-2 ${
                  agentType === "sales"
                    ? "bg-cyan-400 hover:bg-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.4)] hover:shadow-[0_0_30px_rgba(6,182,212,0.6)]"
                    : "bg-purple-400 hover:bg-purple-300 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)]"
                }`}
              >
                {isStarting ? "Connecting Agora..." : "Initialize Real-time Agent"}
              </button>

              <button
                type="button"
                onClick={startSimulation}
                className="rounded-full bg-white/[0.04] border border-white/[0.06] hover:bg-white/[0.08] px-6 py-2.5 text-xs font-semibold text-zinc-300 transition-all flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                Simulate Call Pipeline
              </button>
            </div>
          ) : (
            <>
              {/* Status label */}
              <p className="text-xs font-semibold tracking-wide text-zinc-400 flex items-center gap-2 bg-zinc-900/60 px-3 py-1.5 rounded-full border border-white/[0.05]">
                {isSimulating ? (
                  <><span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />Simulation Playback Step {simStep}</>
                ) : isSpeaking ? (
                  <><span className="inline-block w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />Agent is speaking...</>
                ) : (
                  <><span className="inline-block w-2 h-2 rounded-full bg-zinc-600 animate-ping" />Listening to Client...</>
                )}
              </p>

              {/* Control row */}
              <div className="flex items-center gap-3">
                {/* CC — subtitles toggle */}
                <button
                  type="button"
                  onClick={() => setShowTranscript((v) => !v)}
                  className={`w-11 h-11 rounded-full flex items-center justify-center transition-all border ${
                    showTranscript 
                      ? "bg-white/10 text-white border-white/20" 
                      : "bg-white/[0.02] text-white/30 border-white/[0.04]"
                  }`}
                  title="Toggle subtitles"
                >
                  <Captions className="w-4.5 h-4.5" />
                </button>

                {/* Center: mic + wave OR mic + stop */}
                <div className="flex items-center gap-2 bg-white/[0.05] border border-white/[0.07] rounded-full px-4 py-2.5">
                  <button
                    type="button"
                    onClick={toggleMicMute}
                    disabled={isSimulating}
                    className="text-white/80 hover:text-white transition-colors disabled:opacity-30"
                    title={isMicMuted ? "Unmute mic" : "Mute mic"}
                  >
                    {isMicMuted ? <MicOff className="w-4 h-4 text-red-400" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <div className="w-px h-4 bg-white/20" />

                  {isSpeaking && !isSimulating ? (
                    <button
                      type="button"
                      onClick={interruptAgent}
                      disabled={isInterrupting}
                      className="text-white hover:text-red-300 transition-colors disabled:opacity-50"
                      title="Stop agent"
                    >
                      <Square className="w-3.5 h-3.5 fill-current" />
                    </button>
                  ) : micVolumeLevel > 0.02 && !isSimulating ? (
                    <div className="flex items-center gap-[3px] h-4">
                      {[0.6, 1, 0.7, 0.9, 0.5].map((base, i) => (
                        <div
                          key={i}
                          className="w-[2.5px] rounded-full bg-cyan-400"
                          style={{
                            height: `${Math.max(3, Math.min(16, micVolumeLevel * 100 * base))}px`,
                            transition: "height 80ms ease",
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <div
                          key={i}
                          className={`w-1.5 h-1.5 rounded-full ${agentType === "sales" ? "bg-cyan-400" : "bg-purple-400"} animate-bounce`}
                          style={{ animationDelay: `${i * 0.12}s`, animationDuration: "1s" }}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Terminate */}
                <button
                  type="button"
                  onClick={isSimulating ? stopSimulation : stopSession}
                  className="w-11 h-11 rounded-full bg-red-950/20 hover:bg-red-500/30 border border-red-500/20 flex items-center justify-center transition-all"
                  title="Terminate Session"
                >
                  <X className="w-4.5 h-4.5 text-red-400" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Tabbed Dashboards & Transcripts */}
      <div className="flex-1 h-1/2 md:h-full flex flex-col p-6 overflow-y-auto gap-5 bg-zinc-950/80">
        
        {/* Header Tabs */}
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 shrink-0">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("faye")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "faye" 
                  ? "bg-white/[0.06] text-white" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Sparkles className={`w-3.5 h-3.5 ${agentType === "sales" ? "text-cyan-400" : "text-purple-400"}`} />
              Faye Architect
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("dev")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                activeTab === "dev" 
                  ? "bg-white/[0.06] text-white" 
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <Terminal className="w-3.5 h-3.5 text-zinc-400" />
              Developer View
            </button>
          </div>

          <span className="text-[10px] font-mono text-zinc-500">
            {leadId ? `LEAD: ${leadId.slice(0, 14)}...` : "NO ACTIVE LEAD"}
          </span>
        </div>

        {/* TAB CONTENT: FAYE VISUAL WORKSPACE */}
        {activeTab === "faye" && (
          <div className="flex flex-col gap-5 flex-1 overflow-visible">
            <FayeDashboard 
              type={agentType} 
              transcript={transcript}
              backendLeadProfile={backendLeadProfile}
              backendObjections={backendObjections}
              backendBuyingSignals={backendBuyingSignals}
              backendLeadScore={backendLeadScore}
              backendLeadTemperature={backendLeadTemperature}
              backendRecommendedOffer={backendRecommendedOffer}
              backendNextBestAction={backendNextBestAction}
              simulationActive={isSimulating}
              simulationStep={simStep}
            />
          </div>
        )}

        {/* TAB CONTENT: ORIGINAL SYSTEM SETUPS */}
        {activeTab === "dev" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Status & Metrics */}
              <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/30 p-4 text-xs flex flex-col gap-2 overflow-hidden">
                <h2 className="text-[9px] font-bold uppercase tracking-wider text-zinc-500 mb-1">System Status</h2>
                <div className="grid grid-cols-2 gap-2 text-zinc-400">
                  <div>Status: <span className="font-semibold text-cyan-400">{status}</span></div>
                  <div>App ID: {appIdReady ? "Configured" : "Missing"}</div>
                  <div>Agent ID: {agentId || "-"}</div>
                  <div>Remote Joins: {remoteJoinCount}</div>
                  <div>RTM Status: {rtmConnectionStatus}</div>
                  <div>Agent State: {agentState}</div>
                  <div>Transcript Evts: {transcriptEventCount}</div>
                  <div>Metrics Count: {agentMetricsCount}</div>
                  <div>Audio Proc: {audioProcessingMode}</div>
                  <div>Mem Messages: {memoryMessageCount}</div>
                </div>
                {lastAgentError && <p className="text-amber-500 mt-2 font-mono">Last error: {lastAgentError}</p>}
                {errorMessage && <p className="text-red-500 mt-2 font-mono">{errorMessage}</p>}
              </div>

              {/* Setup Configuration */}
              <div className="rounded-2xl border border-white/[0.06] bg-zinc-900/30 p-4 flex flex-col gap-3">
                <h2 className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">Manual Setup overrides</h2>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <label className="text-zinc-500 mb-1 block">Channel</label>
                    <input
                      value={channelName}
                      onChange={(e) => setChannelName(e.target.value)}
                      disabled={isActive || isStarting}
                      className="w-full rounded-md border border-white/[0.08] bg-zinc-950/60 px-2 py-1 text-zinc-300 font-mono outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 mb-1 block">Voice</label>
                    <select
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      disabled={isActive || isStarting}
                      className="w-full rounded-md border border-white/[0.08] bg-zinc-950/60 px-2 py-1 text-zinc-300 outline-none disabled:opacity-60"
                    >
                      {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-zinc-500 mb-1 block">User UID</label>
                    <input
                      value={userUid}
                      onChange={(e) => setUserUid(e.target.value)}
                      disabled={isActive || isStarting}
                      className="w-full rounded-md border border-white/[0.08] bg-zinc-950/60 px-2 py-1 text-zinc-300 font-mono outline-none disabled:opacity-60"
                    />
                  </div>
                  <div>
                    <label className="text-zinc-500 mb-1 block">Agent UID</label>
                    <input
                      value={agentUid}
                      onChange={(e) => setAgentUid(e.target.value)}
                      disabled={isActive || isStarting}
                      className="w-full rounded-md border border-white/[0.08] bg-zinc-950/60 px-2 py-1 text-zinc-300 font-mono outline-none disabled:opacity-60"
                    />
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-[10px] mt-1 text-zinc-500">
                  <input
                    type="checkbox"
                    checked={autoHalfDuplex}
                    onChange={(e) => onHalfDuplexToggle(e.target.checked)}
                    className="rounded text-cyan-500 focus:ring-cyan-500"
                  />
                  Auto half-duplex (mute mic when agent speaks)
                </label>
              </div>
            </div>

            {/* Action Buttons & Memory */}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={saveShortTermMemory}
                disabled={isSavingMemory || !agentId}
                className="rounded-full border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-400 transition-all disabled:opacity-50"
              >
                {isSavingMemory ? "Saving..." : "Save Memory"}
              </button>
              <button
                type="button"
                onClick={injectSavedMemory}
                disabled={isInjectingMemory || !agentId}
                className="rounded-full border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 px-4 py-2 text-xs font-semibold text-purple-400 transition-all disabled:opacity-50"
              >
                {isInjectingMemory ? "Injecting..." : "Inject Memory"}
              </button>
            </div>

            {memorySummary && (
              <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-xs text-cyan-100">
                <h2 className="font-bold uppercase tracking-wider text-cyan-400 mb-2 text-[9px] font-mono">Short-Term Memory</h2>
                <p className="leading-relaxed">{memorySummary}</p>
              </div>
            )}
          </div>
        )}

        {/* BOTTOM SECTION: CONVERSATION TRANSCRIPT STREAM */}
        {showTranscript && (
          <div className="flex-1 flex flex-col min-h-[220px] max-h-[300px] rounded-3xl border border-white/[0.06] bg-zinc-900/30 overflow-hidden shadow-sm shrink-0">
            <div className="bg-white/[0.02] px-4 py-2.5 border-b border-white/[0.05] flex justify-between items-center shrink-0">
              <h2 className="text-[9px] font-bold uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 font-mono">
                <Captions className="w-3.5 h-3.5 text-cyan-400" />
                Live Conversation Subtitles
              </h2>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3 flex flex-col bg-zinc-950/20">
              {transcript.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-xs text-zinc-500 italic">
                  No transcript available. Start a session or trigger a simulation playback.
                </div>
              ) : (
                transcript.map((line) => (
                  <div
                    key={line.id}
                    className={`rounded-2xl p-3.5 text-xs max-w-[85%] shadow-[0_5px_15px_rgba(0,0,0,0.1)] transition-all ${
                      line.speaker === "assistant"
                        ? "bg-zinc-900 border border-white/[0.04] text-zinc-100 self-start rounded-bl-sm"
                        : line.speaker === "user" 
                        ? `${
                            agentType === "sales" 
                              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-50" 
                              : "bg-purple-500/10 border-purple-500/20 text-purple-50"
                          } border self-end rounded-br-sm ml-auto`
                        : "bg-zinc-800/40 border border-white/[0.04] text-zinc-400 self-center rounded-lg text-[10px]"
                    }`}
                  >
                    <p className="mb-1 text-[8px] font-mono font-black uppercase tracking-wider opacity-40">
                      {line.speaker === "assistant" ? "AI Voice Agent" : line.speaker === "user" ? "Client Buyer" : "System Notification"}
                    </p>
                    <p className="leading-relaxed font-sans">{line.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default function AgentPage() {
  return (
    <Suspense fallback={
      <div className="h-screen w-full bg-zinc-950 text-white flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
          <span className="text-xs font-semibold text-cyan-400 tracking-widest uppercase">Loading Agent Console...</span>
        </div>
      </div>
    }>
      <AgentPageContent />
    </Suspense>
  );
}
