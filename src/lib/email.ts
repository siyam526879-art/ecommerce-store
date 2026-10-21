import { Resend } from "resend";

// ===== Resend client (graceful fallback) =====
function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export const resend = getResend();

export function isEmailConfigured(): boolean {
  return resend !== null && !!process.env.EMAIL_FROM;
}

// ===== Send email =====
interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({
  to,
  subject,
  html,
}: SendEmailParams): Promise<boolean> {
  if (!resend || !process.env.EMAIL_FROM) {
    console.warn(`[Email] Not configured. Would send to ${to}: ${subject}`);
    return false;
  }

  try {
    await resend.emails.send({
      from: process.env.EMAIL_FROM,
      to,
      subject,
      html,
    });
    return true;
  } catch (err) {
    console.error("[Email] Send failed:", err);
    return false;
  }
}

// ===== Order confirmation template =====
export function orderConfirmationHtml(params: {
  orderNumber: string;
  customerName: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}) {
  const { orderNumber, customerName, total, items } = params;

  const itemRows = items
    .map(
      (i) =>
        `<tr>
          <td style="padding: 8px 0;">${i.name}</td>
          <td style="padding: 8px 0;" align="center">${i.quantity}</td>
          <td style="padding: 8px 0;" align="right">$${i.price.toFixed(2)}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family: -apple-system, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
      <h1 style="color: #111;">Thank you, ${customerName}!</h1>
      <p>Your order <strong>${orderNumber}</strong> has been received.</p>

      <table style="width: 100%; border-collapse: collapse; margin: 24px 0;">
        <thead>
          <tr style="border-bottom: 2px solid #e5e5e5;">
            <th align="left" style="padding: 8px 0;">Item</th>
            <th align="center" style="padding: 8px 0;">Qty</th>
            <th align="right" style="padding: 8px 0;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
      </table>

      <p style="font-size: 18px; font-weight: bold; border-top: 2px solid #e5e5e5; padding-top: 12px;">
        Total: $${total.toFixed(2)}
      </p>

      <p style="color: #666; font-size: 14px;">
        We'll notify you when your order ships.
      </p>

      <p style="margin-top: 32px; color: #888; font-size: 12px;">
        This is an automated message. Please do not reply.
      </p>
    </div>
  `;
}