"use client";

import { useMemo, useRef, useState } from "react";
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

  const [channelName, setChannelName] = useState(() => generateDefaultChannelName());
  const [agentUid, setAgentUid] = useState(DEFAULT_AGENT_UID);
  const [voice, setVoice] = useState("coral");
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
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [isInjectingMemory, setIsInjectingMemory] = useState(false);
  const [memorySummary, setMemorySummary] = useState("");
  const [memoryMessageCount, setMemoryMessageCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [audioProcessingMode, setAudioProcessingMode] = useState("browser-ans");

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

  return (
    <div className="dark h-screen w-full bg-background text-foreground overflow-hidden flex flex-col md:flex-row">
      {/* LEFT SIDE: Globe & Action Button */}
      <div className="relative w-full md:w-1/2 h-1/2 md:h-full flex flex-col items-center justify-center border-b md:border-b-0 md:border-r border-border/20">
        <div className="absolute inset-0 w-full h-full pointer-events-none opacity-90 flex items-center justify-center">
          <GlobeAnimation isSpeaking={isSpeaking} />
        </div>
        
        {/* Main Action Button */}
        <div className="absolute bottom-12 z-10 flex flex-col items-center gap-4">
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
            <button
              type="button"
              onClick={stopSession}
              disabled={isStopping}
              className="rounded-full border border-red-500/50 bg-red-500/10 hover:bg-red-500/20 px-8 py-4 text-lg font-bold text-red-400 transition-all shadow-[0_0_20px_rgba(239,68,68,0.2)] hover:shadow-[0_0_30px_rgba(239,68,68,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isStopping ? "Terminating..." : "Terminate Session"}
            </button>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: Controls, Stats & Conversation */}
      <div className="w-full md:w-1/2 h-1/2 md:h-full flex flex-col p-6 overflow-y-auto gap-6 bg-card/30">
        <h1 className="text-3xl font-extrabold tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 flex justify-between items-center">
          FEWA CAE System
        </h1>

        <div className="grid grid-cols-2 gap-4">
          {/* Status & Metrics */}
          <div className="rounded-xl border bg-background/50 p-4 text-xs flex flex-col gap-2 overflow-hidden">
             <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">System Status</h2>
             <div className="grid grid-cols-2 gap-2">
               <div><span className="text-muted-foreground">Status:</span> <span className="font-medium text-cyan-400">{status}</span></div>
               <div><span className="text-muted-foreground">App ID:</span> {appIdReady ? "Configured" : "Missing"}</div>
               <div><span className="text-muted-foreground">Agent ID:</span> {agentId || "-"}</div>
               <div><span className="text-muted-foreground">Remote Joins:</span> {remoteJoinCount}</div>
               <div><span className="text-muted-foreground">RTM Status:</span> {rtmConnectionStatus}</div>
               <div><span className="text-muted-foreground">Agent State:</span> {agentState}</div>
               <div><span className="text-muted-foreground">Transcript Evts:</span> {transcriptEventCount}</div>
               <div><span className="text-muted-foreground">Metrics:</span> {agentMetricsCount}</div>
               <div><span className="text-muted-foreground">Audio Proc:</span> {audioProcessingMode}</div>
               <div><span className="text-muted-foreground">Mem Msgs:</span> {memoryMessageCount}</div>
              </div>
             {lastAgentError && <p className="text-amber-500 mt-2">Last agent error: {lastAgentError}</p>}
             {errorMessage && <p className="text-red-500 mt-2">{errorMessage}</p>}
           </div>

          {/* Setup / Configuration */}
          <div className="rounded-xl border bg-background/50 p-4 flex flex-col gap-3">
             <h2 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Configuration</h2>
             
             <div className="grid grid-cols-2 gap-2 text-xs">
               <div>
                  <label className="text-muted-foreground mb-1 block">Channel</label>
                  <input
                    value={channelName}
                    onChange={(event) => setChannelName(event.target.value)}
                    disabled={isActive || isStarting}
                    className="w-full rounded-md border bg-muted/50 px-2 py-1 outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
                  />
               </div>
               <div>
                  <label className="text-muted-foreground mb-1 block">Voice</label>
                  <select
                    value={voice}
                    onChange={(event) => setVoice(event.target.value)}
                    disabled={isActive || isStarting}
                    className="w-full rounded-md border bg-muted/50 px-2 py-1 outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
                  >
                    {VOICES.map((v) => <option key={v} value={v}>{v}</option>)}
                  </select>
               </div>
               <div>
                  <label className="text-muted-foreground mb-1 block">User UID</label>
                  <input
                    value={userUid}
                    onChange={(event) => setUserUid(event.target.value)}
                    disabled={isActive || isStarting}
                    className="w-full rounded-md border bg-muted/50 px-2 py-1 outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
                  />
               </div>
               <div>
                  <label className="text-muted-foreground mb-1 block">Agent UID</label>
                  <input
                    value={agentUid}
                    onChange={(event) => setAgentUid(event.target.value)}
                    disabled={isActive || isStarting}
                    className="w-full rounded-md border bg-muted/50 px-2 py-1 outline-none focus:ring-1 focus:ring-cyan-500 disabled:opacity-60"
                  />
               </div>
             </div>

             <label className="inline-flex items-center gap-2 text-[10px] mt-1 text-muted-foreground">
                <input
                  type="checkbox"
                  checked={autoHalfDuplex}
                  onChange={(event) => onHalfDuplexToggle(event.target.checked)}
                  className="rounded text-cyan-500 focus:ring-cyan-500"
                />
                Auto half-duplex (mute mic when agent speaks)
              </label>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={interruptAgent}
              disabled={isInterrupting || !agentId}
              className="rounded-full border border-amber-500/50 bg-amber-500/10 hover:bg-amber-500/20 px-4 py-2 text-xs font-semibold text-amber-400 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isInterrupting ? "Interrupting..." : "Interrupt Agent"}
            </button>
            <button
              type="button"
              onClick={saveShortTermMemory}
              disabled={isSavingMemory || !agentId}
              className="rounded-full border border-cyan-500/50 bg-cyan-500/10 hover:bg-cyan-500/20 px-4 py-2 text-xs font-semibold text-cyan-400 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSavingMemory ? "Saving..." : "Save Memory"}
            </button>
            <button
              type="button"
              onClick={injectSavedMemory}
              disabled={isInjectingMemory || !agentId}
              className="rounded-full border border-purple-500/50 bg-purple-500/10 hover:bg-purple-500/20 px-4 py-2 text-xs font-semibold text-purple-400 transition-all disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isInjectingMemory ? "Injecting..." : "Inject Memory"}
            </button>
        </div>

        {/* Memory Box */}
        {memorySummary && (
          <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-xs text-cyan-100">
             <h2 className="font-bold uppercase tracking-wider text-cyan-400 mb-2 text-[10px]">Short-Term Memory</h2>
             <p className="leading-relaxed">{memorySummary}</p>
          </div>
        )}

        {/* Conversation */}
        <div className="flex-1 flex flex-col min-h-[250px] rounded-xl border bg-background/50 overflow-hidden shadow-sm">
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
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
