import { PromptVariables } from './types';
import { serviceAdvisorPrompt } from './serviceAdvisor';
import { salesCloserPrompt } from './salesCloser';
import { friendlyReceptionistPrompt } from './friendlyReceptionist';
import { afterHoursAgentPrompt } from './afterHoursAgent';
import { missedCallFollowupPrompt } from './missedCallFollowup';
import { bilingualAgentPrompt } from './bilingualAgent';
import { appointmentReminderPrompt } from './appointmentReminder';
import { estimateFollowupPrompt } from './estimateFollowup';
import { emergencyTowingPrompt } from './emergencyTowing';
import { vipFleetPrompt } from './vipFleet';
import { reviewFeedbackPrompt } from './reviewFeedback';
import { spanishNativeAgentPrompt } from './spanishNativeAgent';

/**
 * Replaces all {{VARIABLE_NAME}} placeholders in a template string
 * with the corresponding values from the variables map.
 * Any unreplaced placeholder defaults to "Not provided".
 */
function populateTemplate(template: string, variables: Record<string, string>): string {
  let populated = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    populated = populated.replace(regex, value || 'Not provided');
  }
  // Catch any remaining unpopulated variables and default them
  populated = populated.replace(/{{[A-Z_]+}}/g, 'Not provided');
  return populated;
}

/**
 * Flattens the nested PromptVariables object into a flat dictionary
 * suitable for template replacement. Covers all 12 personas.
 */
function flattenVariables(vars: PromptVariables): Record<string, string> {
  return {
    // Shop Profile
    SHOP_NAME:             vars.shop.shopName,
    SHOP_PHONE:            vars.shop.shopPhone,
    SHOP_ADDRESS:          vars.shop.shopAddress,
    SHOP_HOURS:            vars.shop.shopHours,
    SERVICE_CATALOG:       vars.shop.serviceCatalog,
    PRICING_POLICY:        vars.shop.pricingPolicy,
    BOOKING_LINK:          vars.shop.bookingLink,
    SPECIAL_OFFERS:        vars.shop.specialOffers,
    EMERGENCY_CONTACT:     vars.shop.emergencyContact,
    TOWING_PARTNER:        vars.shop.towingPartner        || 'Not provided',
    GOOGLE_REVIEW_LINK:    vars.shop.googleReviewLink     || 'Not provided',
    FLEET_ACCOUNT_MANAGER: vars.shop.fleetAccountManager  || 'Not provided',

    // Caller Context
    CALLER_NAME:           vars.caller.callerName         || 'Customer',
    CALLER_PHONE:          vars.caller.callerPhone        || 'Unknown',
    VEHICLE_HISTORY:       vars.caller.vehicleHistory     || 'No history on file',
    PREVIOUS_VISITS:       vars.caller.previousVisits     || 'First time caller',
    CURRENT_ISSUE:         vars.caller.currentIssue       || 'Unknown issue',
    CALLER_LOCATION:       vars.caller.callerLocation     || 'Unknown location',
    PREFERRED_LANGUAGE:    vars.caller.preferredLanguage  || 'auto',

    // Appointment Reminder
    APPOINTMENT_DATE:      vars.caller.appointmentDate    || 'Not scheduled',
    APPOINTMENT_TIME:      vars.caller.appointmentTime    || 'Not scheduled',
    APPOINTMENT_SERVICE:   vars.caller.appointmentService || 'General service',

    // Estimate Follow-Up
    ESTIMATE_AMOUNT:       vars.caller.estimateAmount     || 'Not provided',
    ESTIMATE_SERVICE:      vars.caller.estimateService    || 'Not provided',
    ESTIMATE_DATE:         vars.caller.estimateDate       || 'Not provided',

    // VIP / Fleet
    FLEET_ACCOUNT_NAME:    vars.caller.fleetAccountName   || 'Not provided',
    FLEET_PRIORITY_LEVEL:  vars.caller.fleetPriorityLevel || 'Standard',

    // Review / Feedback
    LAST_SERVICE_DATE:     vars.caller.lastServiceDate    || 'Not provided',
    LAST_SERVICE_TYPE:     vars.caller.lastServiceType    || 'recent service',
    TECHNICIAN_NAME:       vars.caller.technicianName     || 'our technician',
  };
}

/**
 * Builds the final Claude system prompt based on the selected persona
 * and the provided shop/caller context. Supports all 12 Baylio personas.
 */
export function buildClaudePrompt(variables: PromptVariables): string {
  const flatVars = flattenVariables(variables);

  const templateMap: Record<string, string> = {
    service_advisor:         serviceAdvisorPrompt,
    sales_closer:            salesCloserPrompt,
    friendly_receptionist:   friendlyReceptionistPrompt,
    after_hours_agent:       afterHoursAgentPrompt,
    missed_call_followup:    missedCallFollowupPrompt,
    bilingual_agent:         bilingualAgentPrompt,
    appointment_reminder:    appointmentReminderPrompt,
    estimate_followup:       estimateFollowupPrompt,
    emergency_towing:        emergencyTowingPrompt,
    vip_fleet:               vipFleetPrompt,
    review_feedback:         reviewFeedbackPrompt,
    spanish_native_agent:    spanishNativeAgentPrompt,
  };

  const template = templateMap[variables.persona.role];

  if (!template) {
    throw new Error(
      `Unknown persona role: "${variables.persona.role}". Available: ${Object.keys(templateMap).join(', ')}`
    );
  }

  return populateTemplate(template, flatVars);
}
