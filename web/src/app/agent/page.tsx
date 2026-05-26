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

type ConvoEventPayload = {
  object?: string;
  event_type?: string;
  text?: string;
  turn_id?: number;
  final?: boolean;
  turn_status?: number;
  message?: string;
  data?: {
    text?: string;
    turn_id?: number;
    final?: boolean;
    turn_status?: number;
    message?: string;
    [key: string]: unknown;
  };
  [key: string]: unknown;
};

type RtmMessageEvent = {
  channelName: string;
  customType?: string;
  message: string | Uint8Array;
  publisher: string;
};

type RtmStatusEvent = {
  newState?: string;
  reason?: string;
};

type RtmClientLike = {
  login: (options?: { token?: string }) => Promise<unknown>;
  logout: () => Promise<unknown>;
  subscribe: (
    channelName: string,
    options?: {
      withMessage?: boolean;
      withPresence?: boolean;
      withMetadata?: boolean;
      withLock?: boolean;
      beQuiet?: boolean;
    },
  ) => Promise<unknown>;
  unsubscribe: (channelName: string) => Promise<unknown>;
  addEventListener: (eventName: "message" | "status", listener: (event: unknown) => void) => void;
  removeEventListener: (eventName: "message" | "status", listener: (event: unknown) => void) => void;
};

const DEFAULT_CHANNEL = "workflow-ph-cae";
const DEFAULT_AGENT_UID = "1001";
const VOICES = ["alloy", "ash", "ballad", "coral", "echo", "sage", "shimmer", "verse"];

export default function AgentPage() {
  const appId = process.env.NEXT_PUBLIC_AGORA_APP_ID ?? "";

  const agoraRtcModuleRef = useRef<(typeof import("agora-rtc-sdk-ng")) | null>(null);
  const agoraRtmModuleRef = useRef<(typeof import("agora-rtm-sdk")) | null>(null);
  const clientRef = useRef<IAgoraRTCClient | null>(null);
  const rtmClientRef = useRef<RtmClientLike | null>(null);
  const rtmMessageHandlerRef = useRef<((event: unknown) => void) | null>(null);
  const rtmStatusHandlerRef = useRef<((event: unknown) => void) | null>(null);
  const activeChannelRef = useRef<string>("");
  const micTrackRef = useRef<IMicrophoneAudioTrack | null>(null);
  const remoteAgentAudioRef = useRef<IRemoteAudioTrack | null>(null);
  const subscribedAudioUidsRef = useRef<Set<string>>(new Set());
  const subscribeInFlightUidsRef = useRef<Set<string>>(new Set());
  const lastPlayedTrackByUidRef = useRef<Map<string, string>>(new Map());
  const lastSubscribeAtMsByUidRef = useRef<Map<string, number>>(new Map());
  const micHalfDuplexMutedRef = useRef(false);
  const micUnmuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const micHalfDuplexMuteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [channelName, setChannelName] = useState(DEFAULT_CHANNEL);
  const [agentUid, setAgentUid] = useState(DEFAULT_AGENT_UID);
  const [voice, setVoice] = useState("coral");
  const [userUid, setUserUid] = useState(() => `${1000 + Number(Date.now().toString().slice(-3))}`);

  const [agentId, setAgentId] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [status, setStatus] = useState("Idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [transcript, setTranscript] = useState<TranscriptItem[]>([]);
  const [remoteJoinCount, setRemoteJoinCount] = useState(0);
  const [rtmMessageCount, setRtmMessageCount] = useState(0);
  const [rtmConnectionStatus, setRtmConnectionStatus] = useState("unknown");
  const [autoHalfDuplex, setAutoHalfDuplex] = useState(false);
  const [isInterrupting, setIsInterrupting] = useState(false);
  const [isSavingMemory, setIsSavingMemory] = useState(false);
  const [isInjectingMemory, setIsInjectingMemory] = useState(false);
  const [memorySummary, setMemorySummary] = useState("");
  const [memoryMessageCount, setMemoryMessageCount] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);

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

  function decodeRtmPayload(rawMessage: string | Uint8Array): ConvoEventPayload | null {
    const text =
      typeof rawMessage === "string"
        ? rawMessage
        : new TextDecoder("utf-8", { fatal: false }).decode(rawMessage);
    try {
      return JSON.parse(text) as ConvoEventPayload;
    } catch {
      return null;
    }
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

  function handleTranscriptMessage(event: RtmMessageEvent) {
    if (!activeChannelRef.current) {
      return;
    }

    setRtmMessageCount((prev) => prev + 1);
    const payload = decodeRtmPayload(event.message);
    if (!payload) {
      const preview =
        typeof event.message === "string"
          ? event.message.slice(0, 80)
          : Array.from(event.message.slice(0, 20))
              .map((n) => n.toString(16).padStart(2, "0"))
              .join(" ");
      upsertTranscriptLine(
        `system-${Date.now()}-${Math.random()}`,
        "system",
        `Unparsed RTM message (${event.customType ?? "unknown"}): ${preview}`,
      );
      return;
    }

    const data = payload.data && typeof payload.data === "object" ? payload.data : undefined;
    const objectName = String(payload.object ?? payload.event_type ?? event.customType ?? "");
    const turnId = Number(payload.turn_id ?? data?.turn_id ?? 0);
    const safeTurnId = Number.isFinite(turnId) ? turnId : 0;
    const text = (
      typeof payload.text === "string" ? payload.text : typeof data?.text === "string" ? data.text : ""
    ).trim();

    if (objectName === "user.transcription") {
      if (!text) return;
      const final = payload.final === true || data?.final === true;
      const suffix = final ? "" : " (partial)";
      upsertTranscriptLine(`user-${safeTurnId || Date.now()}`, "user", `${text}${suffix}`);
      return;
    }

    if (objectName === "assistant.transcription") {
      if (!text) return;
      const turnStatus = Number(payload.turn_status ?? data?.turn_status ?? 0);
      setIsSpeaking(turnStatus === 0);
      const suffix = turnStatus === 2 ? " (interrupted)" : turnStatus === 0 ? " (partial)" : "";
      upsertTranscriptLine(`assistant-${safeTurnId || Date.now()}`, "assistant", `${text}${suffix}`);
      return;
    }

    if (objectName === "message.interrupt") {
      upsertTranscriptLine(
        `system-${safeTurnId || Date.now()}`,
        "system",
        `Agent response interrupted (turn ${safeTurnId || "?"}).`,
      );
      return;
    }

    if (objectName === "message.error") {
      const msg = (
        typeof payload.message === "string"
          ? payload.message
          : typeof data?.message === "string"
            ? data.message
            : "Agent error"
      ).trim();
      upsertTranscriptLine(`system-${Date.now()}-${Math.random()}`, "system", `Agent error: ${msg}`);
      return;
    }

    if (objectName) {
      upsertTranscriptLine(
        `system-${Date.now()}-${Math.random()}`,
        "system",
        `RTM event received: ${objectName}`,
      );
    }
  }

  async function cleanupRtm() {
    const rtmClient = rtmClientRef.current;
    const rtmMessageHandler = rtmMessageHandlerRef.current;
    const rtmStatusHandler = rtmStatusHandlerRef.current;
    const activeChannel = activeChannelRef.current;

    if (!rtmClient) {
      activeChannelRef.current = "";
      setRtmConnectionStatus("disconnected");
      return;
    }

    try {
      if (rtmMessageHandler) {
        rtmClient.removeEventListener("message", rtmMessageHandler);
      }
      if (rtmStatusHandler) {
        rtmClient.removeEventListener("status", rtmStatusHandler);
      }
      if (activeChannel) {
        await rtmClient.unsubscribe(activeChannel);
      }
      await rtmClient.logout();
    } catch {
      // best effort cleanup
    } finally {
      rtmClientRef.current = null;
      rtmMessageHandlerRef.current = null;
      rtmStatusHandlerRef.current = null;
      activeChannelRef.current = "";
      setRtmConnectionStatus("disconnected");
    }
  }

  async function cleanupRtc() {
    const micTrack = micTrackRef.current;
    const client = clientRef.current;

    try {
      clearMicUnmuteTimer();
      clearHalfDuplexMuteTimer();
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
      lastSubscribeAtMsByUidRef.current.clear();
    }
  }

  async function cleanupSession() {
    await cleanupRtc();
    await cleanupRtm();
  }

  function scheduleHalfDuplexMute() {
    if (!autoHalfDuplex || !micTrackRef.current) return;
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
    setRtmMessageCount(0);
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
      }) as RtmClientLike;
      const statusHandler = (event: unknown) => {
        const statusEvent = event as RtmStatusEvent;
        const connectionText = `${statusEvent.newState ?? "unknown"}${statusEvent.reason ? ` (${statusEvent.reason})` : ""}`;
        setRtmConnectionStatus(connectionText);
      };
      rtmClient.addEventListener("status", statusHandler);
      await rtmClient.login({ token: user_token });
      setRtmConnectionStatus("CONNECTED");
      await rtmClient.subscribe(channel_name, {
        withMessage: true,
        withPresence: false,
        withMetadata: false,
        withLock: false,
        beQuiet: true,
      });
      const messageHandler = (event: unknown) => handleTranscriptMessage(event as RtmMessageEvent);
      rtmClient.addEventListener("message", messageHandler);
      rtmClientRef.current = rtmClient;
      rtmMessageHandlerRef.current = messageHandler;
      rtmStatusHandlerRef.current = statusHandler;
      activeChannelRef.current = channel_name;

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

        if (!alreadySubscribed && now - lastSubscribeTs < 400) {
          return;
        }

        if (!alreadySubscribed) {
          if (subscribeInFlightUidsRef.current.has(uidKey)) return;
          subscribeInFlightUidsRef.current.add(uidKey);
          try {
            await client.subscribe(remoteUser, "audio");
            subscribedAudioUidsRef.current.add(uidKey);
            lastSubscribeAtMsByUidRef.current.set(uidKey, Date.now());
          } finally {
            subscribeInFlightUidsRef.current.delete(uidKey);
          }
        }

        const audioTrack = remoteUser.audioTrack;
        if (!audioTrack) return;

        clearMicUnmuteTimer();
        remoteAgentAudioRef.current = audioTrack;
        scheduleHalfDuplexMute();

        const nextTrackId = audioTrack.getTrackId();
        const lastTrackId = lastPlayedTrackByUidRef.current.get(uidKey);
        if (lastTrackId !== nextTrackId) {
          audioTrack.play();
          lastPlayedTrackByUidRef.current.set(uidKey, nextTrackId);
        }
        setStatus(`Agent connected (${remoteUser.uid})`);
      });

      client.on("user-joined", (remoteUser: IAgoraRTCRemoteUser) => {
        setRemoteJoinCount((prev) => prev + 1);
        setStatus(`Remote joined (${remoteUser.uid})`);
      });

      client.on("user-unpublished", (remoteUser: IAgoraRTCRemoteUser, mediaType: "audio" | "video" | "datachannel") => {
        if (mediaType === "audio") {
          clearHalfDuplexMuteTimer();
          if (autoHalfDuplex && micTrackRef.current) {
            clearMicUnmuteTimer();
            micUnmuteTimerRef.current = setTimeout(() => {
              void setHalfDuplexMicMuted(false);
            }, 2000);
          }
          setStatus(`Agent audio unpublished (${remoteUser.uid})`);
        }
      });

      client.on("user-left", (remoteUser: IAgoraRTCRemoteUser) => {
        const uidKey = String(remoteUser.uid);
        subscribedAudioUidsRef.current.delete(uidKey);
        subscribeInFlightUidsRef.current.delete(uidKey);
        lastPlayedTrackByUidRef.current.delete(uidKey);
        lastSubscribeAtMsByUidRef.current.delete(uidKey);
        setStatus(`Remote left (${remoteUser.uid})`);
      });

      await client.join(appId, channel_name, user_token, joinUid);

      const micTrack = await AgoraRTC.createMicrophoneAudioTrack({
        encoderConfig: "speech_standard",
        AEC: true,
        ANS: true,
        AGC: true,
      });
      micTrackRef.current = micTrack;
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
      await cleanupSession();
    } finally {
      setIsStarting(false);
    }
  }

  function onHalfDuplexToggle(nextValue: boolean) {
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
      clearMicUnmuteTimer();
      setTranscript([]);
      setUserUid(`${1000 + Number(Date.now().toString().slice(-3))}`);
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
               <div><span className="text-muted-foreground">RTM Msgs:</span> {rtmMessageCount}</div>
               <div><span className="text-muted-foreground">Mem Msgs:</span> {memoryMessageCount}</div>
             </div>
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
