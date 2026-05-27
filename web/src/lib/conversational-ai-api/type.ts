export enum ETranscriptHelperMode {
  TEXT = "text",
  WORD = "word",
  CHUNK = "chunk",
}

export enum EConversationalAIAPIEvents {
  TRANSCRIPT_UPDATED = "transcript_updated",
  AGENT_STATE_CHANGED = "agent_state_changed",
  AGENT_LISTENING_CHANGED = "agent_listening_changed",
  AGENT_THINKING_CHANGED = "agent_thinking_changed",
  AGENT_SPEAKING_CHANGED = "agent_speaking_changed",
  AGENT_INTERRUPTED = "agent_interrupted",
  AGENT_METRICS = "agent_metrics",
  AGENT_ERROR = "agent_error",
  RTM_STATE_CHANGED = "rtm_state_changed",
  DEBUG_LOG = "debug_log",
}

export enum EAgentState {
  IDLE = "idle",
  SILENT = "silent",
  LISTENING = "listening",
  THINKING = "thinking",
  SPEAKING = "speaking",
  UNKNOWN = "unknown",
}

export type TranscriptSpeaker = "user" | "assistant";

export type ITranscriptHelperItem = {
  id: string;
  uid: string;
  turn_id: number;
  role: TranscriptSpeaker;
  text: string;
  final: boolean;
  updated_at_ms: number;
};

export type IModuleError = {
  type?: string;
  code?: string | number;
  message: string;
  payload?: unknown;
};

export type IAgentMetric = {
  type?: string;
  name?: string;
  value?: number;
  payload?: unknown;
};

export type IAgentInterruptEvent = {
  turn_id?: number;
  payload?: unknown;
};

export type IAgentStateEvent = {
  state: EAgentState;
  raw?: unknown;
};

export type IRtmStateEvent = {
  state: string;
  reason?: string;
};

export type ITranscription = {
  items: ITranscriptHelperItem[];
};

export type IConversationalAIAPIEventHandler = {
  onTranscriptUpdated?: (agentUserId: string, transcription: ITranscription) => void;
  onAgentStateChanged?: (agentUserId: string, event: IAgentStateEvent) => void;
  onAgentListeningChanged?: (agentUserId: string, listening: boolean) => void;
  onAgentThinkingChanged?: (agentUserId: string, thinking: boolean) => void;
  onAgentSpeakingChanged?: (agentUserId: string, speaking: boolean) => void;
  onAgentInterrupted?: (agentUserId: string, event: IAgentInterruptEvent) => void;
  onAgentMetrics?: (agentUserId: string, metric: IAgentMetric) => void;
  onAgentError?: (agentUserId: string, error: IModuleError) => void;
  onRTMStateChanged?: (event: IRtmStateEvent) => void;
};

export type CAEMessagePayload = {
  object?: string;
  event_type?: string;
  text?: string;
  turn_id?: number;
  final?: boolean;
  turn_status?: number;
  state?: string;
  message?: string;
  data?: {
    text?: string;
    turn_id?: number;
    final?: boolean;
    turn_status?: number;
    state?: string;
    message?: string;
    words?: Array<{
      word?: string;
      text?: string;
      [key: string]: unknown;
    }>;
    metrics?: unknown;
    [key: string]: unknown;
  };
  words?: Array<{
    word?: string;
    text?: string;
    [key: string]: unknown;
  }>;
  metrics?: unknown;
  [key: string]: unknown;
};

export type RTMMessageEvent = {
  channelName: string;
  customType?: string;
  message: string | Uint8Array;
  publisher: string;
};

export type RTMStatusEvent = {
  newState?: string;
  reason?: string;
};

export type RTMClientLike = {
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

export type IConversationalAIAPIConfig = {
  rtmEngine: RTMClientLike;
  renderMode?: ETranscriptHelperMode;
  enableLog?: boolean;
};

export type ConversationalAIEventMap = {
  [EConversationalAIAPIEvents.TRANSCRIPT_UPDATED]: (items: ITranscriptHelperItem[]) => void;
  [EConversationalAIAPIEvents.AGENT_STATE_CHANGED]: (agentUserId: string, event: IAgentStateEvent) => void;
  [EConversationalAIAPIEvents.AGENT_LISTENING_CHANGED]: (agentUserId: string, listening: boolean) => void;
  [EConversationalAIAPIEvents.AGENT_THINKING_CHANGED]: (agentUserId: string, thinking: boolean) => void;
  [EConversationalAIAPIEvents.AGENT_SPEAKING_CHANGED]: (agentUserId: string, speaking: boolean) => void;
  [EConversationalAIAPIEvents.AGENT_INTERRUPTED]: (agentUserId: string, event: IAgentInterruptEvent) => void;
  [EConversationalAIAPIEvents.AGENT_METRICS]: (agentUserId: string, metric: IAgentMetric) => void;
  [EConversationalAIAPIEvents.AGENT_ERROR]: (agentUserId: string, error: IModuleError) => void;
  [EConversationalAIAPIEvents.RTM_STATE_CHANGED]: (event: IRtmStateEvent) => void;
  [EConversationalAIAPIEvents.DEBUG_LOG]: (message: string) => void;
};
