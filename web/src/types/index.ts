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
  conversation_summary: string | null;
  objections: string[];
  buying_signals: string[];
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

// ─────────────────────────────────────────────────────────────────────────────
// B2C Commerce Agent (Maya)
// ─────────────────────────────────────────────────────────────────────────────

export type CustomerStatus =
  | "browsing"
  | "comparing"
  | "ordering"
  | "verified"
  | "checkout_ready"
  | "abandoned";

export interface Preferences {
  category: string | null;
  budget: number | null;
  size: string | null;
  brand: string | null;
  use_case: string | null;
  priorities: string[];
}

export interface SelectedProduct {
  product_id: string;
  name: string;
  brand: string | null;
  unit_price: number;
  quantity: number;
}

export interface Customer {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  delivery_address: string | null;
  preferences: Preferences;
  viewed_products: string[];
  comparison_pairs: string[][];
  selected_product: SelectedProduct | null;
  order_reference: string | null;
  order_id: string | null;
  status: CustomerStatus;
  conversation_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  currency: string;
  description: string;
  sizes: string[];
  image_url: string;
  use_cases: string[];
  priorities: string[];
  stock: number;
}

export interface OrderDelivery {
  name: string | null;
  phone: string | null;
  address: string | null;
}

export interface Order {
  id: string;
  customer_id: string;
  reference: string;
  product_id: string;
  product_name: string;
  brand: string | null;
  unit_price: number;
  quantity: number;
  total_amount: number;
  currency: string;
  delivery: OrderDelivery;
  payment_method: string | null;
  payment_status: "awaiting_payment" | "paid" | "cancelled";
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommerceStartResponse {
  customer_id: string;
  conversation_id: string;
  greeting: string;
}

export interface CommerceMessageResponse {
  response: string;
  customer_profile: Partial<Customer>;
}
