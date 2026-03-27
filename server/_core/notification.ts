import { TRPCError } from "@trpc/server";
import { Resend } from "resend";

export type NotificationPayload = {
  title: string;
  content: string;
};

const TITLE_MAX_LENGTH = 1200;
const CONTENT_MAX_LENGTH = 20000;

const OWNER_EMAIL = process.env.OWNER_EMAIL || "hello@baylio.io";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const trimValue = (value: string): string => value.trim();
const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const validatePayload = (input: NotificationPayload): NotificationPayload => {
  if (!isNonEmptyString(input.title)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification title is required.",
    });
  }
  if (!isNonEmptyString(input.content)) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Notification content is required.",
    });
  }

  const title = trimValue(input.title);
  const content = trimValue(input.content);

  if (title.length > TITLE_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification title must be at most ${TITLE_MAX_LENGTH} characters.`,
    });
  }

  if (content.length > CONTENT_MAX_LENGTH) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Notification content must be at most ${CONTENT_MAX_LENGTH} characters.`,
    });
  }

  return { title, content };
};

/**
 * Dispatches a project-owner notification via email (Resend).
 * Returns `true` if the email was sent, `false` if it could not be delivered.
 * Falls back to console logging when RESEND_API_KEY is not set.
 */
export async function notifyOwner(
  payload: NotificationPayload
): Promise<boolean> {
  const { title, content } = validatePayload(payload);

  if (!resend) {
    console.log(`[Notification] RESEND_API_KEY not set — logging instead:`);
    console.log(`  Title: ${title}`);
    console.log(`  Content: ${content}`);
    return true;
  }

  try {
    await resend.emails.send({
      from: "Baylio Notifications <hello@baylio.io>",
      to: [OWNER_EMAIL],
      subject: title,
      text: content,
    });
    return true;
  } catch (error) {
    console.warn("[Notification] Failed to send email notification:", error);
    return false;
  }
}
