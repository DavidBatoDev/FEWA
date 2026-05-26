export type LeadTemperature = "Hot" | "Warm" | "Cold";
export type LeadStatus = "new" | "in_progress" | "qualified" | "disqualified";

export interface Lead {
  id: string;
  campaign_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company: string | null;
  industry: string | null;
  pain_point: string | null;
  current_solution: string | null;
  timeline: string | null;
  budget_readiness: string | null;
  decision_maker: string | null;
  buying_intent: string | null;
  lead_score: number;
  lead_temperature: LeadTemperature | null;
  recommended_offer: string | null;
  next_best_action: string | null;
  status: LeadStatus;
  created_at: string;
  updated_at: string;
}

export interface TranscriptEntry {
  role: "user" | "assistant";
  message: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  lead_id: string;
  transcript: TranscriptEntry[];
  summary: string | null;
  objections: string[];
  buying_signals: string[];
  created_at: string;
  updated_at: string;
}

export interface Offer {
  id: string;
  name: string;
  description: string;
  best_for: string[];
  price_range: string;
}

export interface FollowUp {
  id: string;
  lead_id: string;
  subject: string;
  body: string;
  status: "draft" | "sent";
  created_at: string;
}

export interface Campaign {
  id: string;
  name: string;
  target_industry: string;
  agent_persona: string;
  goal: string;
  language_mode: "English" | "Taglish" | "Filipino";
  qualification_rules: {
    required_fields: string[];
    hot_lead_threshold: number;
    warm_lead_threshold: number;
  };
  created_at: string;
}

export interface LeadDetail extends Lead {
  conversation?: Conversation;
  follow_up?: FollowUp;
}

export interface DashboardStats {
  total_leads: number;
  hot_leads: number;
  warm_leads: number;
  cold_leads: number;
  follow_ups_generated: number;
  top_objections: string[];
}

export interface AgentStartResponse {
  lead_id: string;
  conversation_id: string;
  greeting: string;
}

export interface AgentMessageRequest {
  lead_id: string;
  conversation_id: string;
  message: string;
}

export interface AgentMessageResponse {
  response: string;
  lead_profile: Partial<Lead>;
  lead_score: number;
  lead_temperature: LeadTemperature | null;
  recommended_offer: string | null;
  objections: string[];
  buying_signals: string[];
  next_best_action: string | null;
}
