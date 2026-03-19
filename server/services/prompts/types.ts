// ─────────────────────────────────────────────
// SHOP PROFILE
// ─────────────────────────────────────────────
export interface ShopProfile {
  shopName: string;
  shopPhone: string;
  shopAddress: string;
  shopHours: string;
  serviceCatalog: string;
  pricingPolicy: string;
  bookingLink: string;
  specialOffers: string;
  emergencyContact: string;
  towingPartner?: string;        // For Emergency/Towing persona
  googleReviewLink?: string;     // For Review/Feedback persona
  fleetAccountManager?: string;  // For VIP/Fleet persona
}

// ─────────────────────────────────────────────
// CALLER CONTEXT
// ─────────────────────────────────────────────
export interface CallerContext {
  callerName?: string;
  callerPhone?: string;
  vehicleHistory?: string;
  previousVisits?: string;
  currentIssue?: string;

  // After-Hours / Emergency
  urgencyLevel?: 'low' | 'medium' | 'high' | 'emergency';
  callerLocation?: string;

  // Appointment Reminder
  appointmentDate?: string;
  appointmentTime?: string;
  appointmentService?: string;

  // Estimate Follow-Up
  estimateAmount?: string;
  estimateService?: string;
  estimateDate?: string;

  // VIP / Fleet
  fleetAccountName?: string;
  fleetVehicleCount?: string;
  fleetPriorityLevel?: string;

  // Review / Feedback
  lastServiceDate?: string;
  lastServiceType?: string;
  technicianName?: string;

  // Bilingual
  preferredLanguage?: 'en' | 'es' | 'auto';
}

// ─────────────────────────────────────────────
// PERSONA CONFIG
// ─────────────────────────────────────────────
export type PersonaRole =
  | 'service_advisor'
  | 'sales_closer'
  | 'friendly_receptionist'
  | 'after_hours_agent'
  | 'missed_call_followup'
  | 'bilingual_agent'
  | 'appointment_reminder'
  | 'estimate_followup'
  | 'emergency_towing'
  | 'vip_fleet'
  | 'review_feedback'
  | 'spanish_native_agent';

export interface PersonaConfig {
  role: PersonaRole;
  tone: string;
  pacing: string;
  primaryGoal: string;
}

// ─────────────────────────────────────────────
// MASTER VARIABLES OBJECT
// ─────────────────────────────────────────────
export interface PromptVariables {
  shop: ShopProfile;
  caller: CallerContext;
  persona: PersonaConfig;
}
