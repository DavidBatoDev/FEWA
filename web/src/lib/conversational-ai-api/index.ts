import {
  CAEMessagePayload,
  ConversationalAIEventMap,
  EAgentState,
  EConversationalAIAPIEvents,
  ETranscriptHelperMode,
  IAgentMetric,
  IConversationalAIAPIEventHandler,
  IConversationalAIAPIConfig,
  IModuleError,
  ITranscriptHelperItem,
  RTMMessageEvent,
  RTMStatusEvent,
  TranscriptSpeaker,
} from "./type";
import { EventEmitter } from "./utils/events";

function normalizeAgentState(value: unknown): EAgentState {
  const raw = String(value ?? "").trim().toLowerCase();
  if (raw === EAgentState.IDLE) return EAgentState.IDLE;
  if (raw === EAgentState.SILENT) return EAgentState.SILENT;
  if (raw === EAgentState.LISTENING) return EAgentState.LISTENING;
  if (raw === EAgentState.THINKING) return EAgentState.THINKING;
  if (raw === EAgentState.SPEAKING) return EAgentState.SPEAKING;
  return EAgentState.UNKNOWN;
}

function tryParseJson(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

function normalizePayload(value: unknown): CAEMessagePayload | null {
  if (!value || typeof value !== "object") return null;
  const obj = value as Record<string, unknown>;

  if (typeof obj.data === "string") {
    const parsedData = tryParseJson(obj.data);
    if (parsedData && typeof parsedData === "object") {
      obj.data = parsedData;
    }
  }

  if (typeof obj.object === "string" || typeof obj.event_type === "string") {
    return obj as CAEMessagePayload;
  }

  const nestedCandidates = [obj.payload, obj.message, obj.data];
  for (const candidate of nestedCandidates) {
    if (typeof candidate === "string") {
      const parsed = tryParseJson(candidate);
      const normalized = normalizePayload(parsed);
      if (normalized) return normalized;
      continue;
    }
    const normalized = normalizePayload(candidate);
    if (normalized) return normalized;
  }

  return obj as CAEMessagePayload;
}

function decodeMessage(rawMessage: string | Uint8Array): CAEMessagePayload | null {
  const text =
    typeof rawMessage === "string"
      ? rawMessage
      : new TextDecoder("utf-8", { fatal: false }).decode(rawMessage);
  return normalizePayload(tryParseJson(text));
}

function joinWordsText(words: unknown): string {
  if (!Array.isArray(words)) return "";
  return words
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const word = item as Record<string, unknown>;
      if (typeof word.word === "string" && word.word.trim()) return word.word;
      if (typeof word.text === "string" && word.text.trim()) return word.text;
      return "";
    })
    .join("")
    .trim();
}

function resolveMessageText(payload: CAEMessagePayload, data: Record<string, unknown> | undefined): string {
  const topText = typeof payload.text === "string" ? payload.text : "";
  const dataText = typeof data?.text === "string" ? data.text : "";
  if (topText.trim()) return topText;
  if (dataText.trim()) return dataText;

  const topWordsText = joinWordsText(payload.words);
  if (topWordsText) return topWordsText;
  return joinWordsText(data?.words);
}

function isTurnInProgress(value: unknown): boolean {
  if (value === 0) return true;
  const raw = String(value ?? "").trim().toLowerCase();
  return raw === "0" || raw === "in_progress";
}

function buildTranscriptId(role: TranscriptSpeaker, uid: string, turnId: number): string {
  return `${role}:${uid}:${turnId}`;
}

type NormalizedTranscript = {
  item: ITranscriptHelperItem;
  sortMs: number;
};

export class ConversationalAIAPI extends EventEmitter<ConversationalAIEventMap> {
  private static instance: ConversationalAIAPI | null = null;

  static init(config: IConversationalAIAPIConfig) {
    if (!ConversationalAIAPI.instance) {
      ConversationalAIAPI.instance = new ConversationalAIAPI(config);
      return;
    }
    ConversationalAIAPI.instance.updateConfig(config);
  }

  static getInstance(): ConversationalAIAPI {
    if (!ConversationalAIAPI.instance) {
      throw new Error("ConversationalAIAPI not initialized. Call ConversationalAIAPI.init first.");
    }
    return ConversationalAIAPI.instance;
  }

  private rtmEngine: IConversationalAIAPIConfig["rtmEngine"];
  private renderMode: ETranscriptHelperMode;
  private enableLog: boolean;
  private activeChannel = "";
  private transcript = new Map<string, NormalizedTranscript>();
  private transcriptOrder: string[] = [];
  private handlers = new Set<IConversationalAIAPIEventHandler>();
  private messageHandler: ((event: unknown) => void) | null = null;
  private statusHandler: ((event: unknown) => void) | null = null;
  private lastAgentStateByUid = new Map<string, EAgentState>();

  private constructor(config: IConversationalAIAPIConfig) {
    super();
    this.rtmEngine = config.rtmEngine;
    this.renderMode = config.renderMode ?? ETranscriptHelperMode.WORD;
    this.enableLog = Boolean(config.enableLog);
  }

  private updateConfig(config: IConversationalAIAPIConfig) {
    this.rtmEngine = config.rtmEngine;
    this.renderMode = config.renderMode ?? ETranscriptHelperMode.WORD;
    this.enableLog = Boolean(config.enableLog);
  }

  private log(...args: unknown[]) {
    if (!this.enableLog) return;
    this.emit(EConversationalAIAPIEvents.DEBUG_LOG, `[conversational-ai-api] ${args.map(String).join(" ")}`);
  }

  async subscribeMessage(channelName: string) {
    const normalized = channelName.trim();
    if (!normalized) throw new Error("channelName is required");
    if (this.activeChannel === normalized) return;

    if (this.activeChannel) {
      await this.unsubscribeMessage(this.activeChannel);
    }

    await this.rtmEngine.subscribe(normalized, {
      withMessage: true,
      withPresence: false,
      withMetadata: false,
      withLock: false,
      beQuiet: true,
    });

    this.messageHandler = (event: unknown) => this.handleMessage(event as RTMMessageEvent);
    this.statusHandler = (event: unknown) => this.handleStatus(event as RTMStatusEvent);
    this.rtmEngine.addEventListener("message", this.messageHandler);
    this.rtmEngine.addEventListener("status", this.statusHandler);
    this.activeChannel = normalized;
    this.log("subscribed", normalized, this.renderMode);
  }

  async unsubscribeMessage(channelName: string) {
    const normalized = channelName.trim();
    if (!normalized) return;

    if (this.messageHandler) {
      this.rtmEngine.removeEventListener("message", this.messageHandler);
      this.messageHandler = null;
    }
    if (this.statusHandler) {
      this.rtmEngine.removeEventListener("status", this.statusHandler);
      this.statusHandler = null;
    }

    try {
      await this.rtmEngine.unsubscribe(normalized);
    } catch {
      // best effort
    }

    if (this.activeChannel === normalized) {
      this.activeChannel = "";
    }
    this.log("unsubscribed", normalized);
  }

  addHandler(handler: IConversationalAIAPIEventHandler) {
    this.handlers.add(handler);
    return this;
  }

  removeHandler(handler: IConversationalAIAPIEventHandler) {
    this.handlers.delete(handler);
    return this;
  }

  destroy() {
    if (this.activeChannel) {
      void this.unsubscribeMessage(this.activeChannel);
    }
    this.transcript.clear();
    this.transcriptOrder = [];
    this.lastAgentStateByUid.clear();
    this.handlers.clear();
    this.removeAllListeners();
    ConversationalAIAPI.instance = null;
  }

  private upsertTranscript(
    role: TranscriptSpeaker,
    uid: string,
    turnId: number,
    text: string,
    final: boolean,
  ) {
    const normalizedText = text.trim();
    if (!normalizedText) return;

    const id = buildTranscriptId(role, uid, turnId);
    const now = Date.now();
    const existing = this.transcript.get(id);
    const item: ITranscriptHelperItem = {
      id,
      uid,
      turn_id: turnId,
      role,
      text: normalizedText,
      final,
      updated_at_ms: now,
    };

    this.transcript.set(id, { item, sortMs: existing?.sortMs ?? now });
    if (!existing) {
      this.transcriptOrder.push(id);
    }

    if (this.transcriptOrder.length > 120) {
      const overflow = this.transcriptOrder.splice(0, this.transcriptOrder.length - 120);
      overflow.forEach((key) => this.transcript.delete(key));
    }

    const ordered = this.transcriptOrder
      .map((key) => this.transcript.get(key))
      .filter((entry): entry is NormalizedTranscript => Boolean(entry))
      .map((entry) => entry.item);

    this.emit(EConversationalAIAPIEvents.TRANSCRIPT_UPDATED, ordered);
    this.handlers.forEach((handler) => {
      handler.onTranscriptUpdated?.(uid, { items: ordered });
    });
  }

  private emitAgentState(agentUid: string, nextState: EAgentState, raw: unknown) {
    const prev = this.lastAgentStateByUid.get(agentUid);
    if (prev === nextState) return;
    this.lastAgentStateByUid.set(agentUid, nextState);

    this.emit(EConversationalAIAPIEvents.AGENT_STATE_CHANGED, agentUid, { state: nextState, raw });
    this.emit(EConversationalAIAPIEvents.AGENT_LISTENING_CHANGED, agentUid, nextState === EAgentState.LISTENING);
    this.emit(EConversationalAIAPIEvents.AGENT_THINKING_CHANGED, agentUid, nextState === EAgentState.THINKING);
    this.emit(EConversationalAIAPIEvents.AGENT_SPEAKING_CHANGED, agentUid, nextState === EAgentState.SPEAKING);
    this.handlers.forEach((handler) => {
      handler.onAgentStateChanged?.(agentUid, { state: nextState, raw });
      handler.onAgentListeningChanged?.(agentUid, nextState === EAgentState.LISTENING);
      handler.onAgentThinkingChanged?.(agentUid, nextState === EAgentState.THINKING);
      handler.onAgentSpeakingChanged?.(agentUid, nextState === EAgentState.SPEAKING);
    });
  }

  private handleMessage(event: RTMMessageEvent) {
    if (!this.activeChannel || event.channelName !== this.activeChannel) return;

    const payload = decodeMessage(event.message);
    if (!payload) {
      this.emit(EConversationalAIAPIEvents.DEBUG_LOG, "invalid rtm payload");
      return;
    }

    const object = String(payload.object ?? payload.event_type ?? event.customType ?? "").trim();
    const data = payload.data && typeof payload.data === "object" ? payload.data : undefined;
    const text = resolveMessageText(payload, data);
    const turnIdValue = payload.turn_id ?? data?.turn_id;
    const turnId = Number.isFinite(Number(turnIdValue)) ? Number(turnIdValue) : 0;
    const speakerUid = String(event.publisher || "");

    if (object === "user.transcription") {
      this.upsertTranscript("user", speakerUid, turnId || Date.now(), text, Boolean(payload.final ?? data?.final));
      this.emitAgentState(speakerUid, EAgentState.LISTENING, payload);
      return;
    }

    if (object === "assistant.transcription") {
      const turnStatus = payload.turn_status ?? data?.turn_status;
      const inProgress = isTurnInProgress(turnStatus);
      const final = !inProgress;
      this.upsertTranscript("assistant", speakerUid, turnId || Date.now(), text, final);
      if (inProgress) {
        this.emitAgentState(speakerUid, EAgentState.SPEAKING, payload);
      } else {
        this.emitAgentState(speakerUid, EAgentState.SILENT, payload);
      }
      return;
    }

    if (object === "message.interrupt") {
      const interruptEvent = {
        turn_id: turnId || undefined,
        payload,
      };
      this.emit(EConversationalAIAPIEvents.AGENT_INTERRUPTED, speakerUid, {
        turn_id: turnId || undefined,
        payload,
      });
      this.handlers.forEach((handler) => {
        handler.onAgentInterrupted?.(speakerUid, interruptEvent);
      });
      this.emitAgentState(speakerUid, EAgentState.SILENT, payload);
      return;
    }

    if (object === "message.metrics") {
      const metricPayload = (payload.metrics ?? data?.metrics ?? payload.data) as IAgentMetric | undefined;
      const metric = metricPayload ?? { payload };
      this.emit(EConversationalAIAPIEvents.AGENT_METRICS, speakerUid, metric);
      this.handlers.forEach((handler) => {
        handler.onAgentMetrics?.(speakerUid, metric);
      });
      return;
    }

    if (object === "message.error") {
      const message =
        typeof payload.message === "string"
          ? payload.message
          : typeof data?.message === "string"
            ? data.message
            : "Agent error";
      const errorEvent: IModuleError = {
        message,
        payload,
      };
      this.emit(EConversationalAIAPIEvents.AGENT_ERROR, speakerUid, {
        message,
        payload,
      });
      this.handlers.forEach((handler) => {
        handler.onAgentError?.(speakerUid, errorEvent);
      });
      return;
    }

    if (object === "message.agent_state") {
      const state = normalizeAgentState(payload.state ?? data?.state);
      this.emitAgentState(speakerUid, state, payload);
      return;
    }

    if (object.includes("thinking")) {
      this.emitAgentState(speakerUid, EAgentState.THINKING, payload);
      return;
    }
  }

  private handleStatus(event: RTMStatusEvent) {
    const state = String(event.newState ?? "unknown");
    const reason = event.reason ? String(event.reason) : undefined;
    const statusEvent = { state, reason };
    this.emit(EConversationalAIAPIEvents.RTM_STATE_CHANGED, statusEvent);
    this.handlers.forEach((handler) => {
      handler.onRTMStateChanged?.(statusEvent);
    });
  }
}
