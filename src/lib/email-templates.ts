import { APP_NAME, APP_URL } from "./constants";
import { formatPrice } from "./utils";

export function orderConfirmationEmail(params: {
  customerName: string;
  orderNumber: string;
  total: number;
  items: Array<{ name: string; quantity: number; price: number }>;
}): { subject: string; html: string } {
  const { customerName, orderNumber, total, items } = params;

  const itemsHtml = items
    .map(
      (i) => `
      <tr>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee;">
          ${i.name}  ${i.quantity}
        </td>
        <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">
          ${formatPrice(i.price * i.quantity)}
        </td>
      </tr>`
    )
    .join("");

  return {
    subject: `${APP_NAME}  Order ${orderNumber} confirmed`,
    html: `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden;">
    <div style="background: #111; color: white; padding: 24px; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">${APP_NAME}</h1>
    </div>
    <div style="padding: 32px;">
      <h2 style="margin: 0 0 16px;">Thank you, ${customerName}!</h2>
      <p style="color: #666; margin: 0 0 24px;">
        Your order <strong>${orderNumber}</strong> has been confirmed and is being processed.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
        ${itemsHtml}
        <tr>
          <td style="padding: 16px 0 0; font-weight: bold;">Total</td>
          <td style="padding: 16px 0 0; font-weight: bold; text-align: right;">${formatPrice(total)}</td>
        </tr>
      </table>
      <a href="${APP_URL}/account/orders" style="display: inline-block; background: #111; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 500;">
        View your order
      </a>
    </div>
    <div style="background: #f7f7f7; padding: 20px; text-align: center; font-size: 12px; color: #999;">
       ${APP_NAME}. All rights reserved.
    </div>
  </div>
</body>
</html>`,
  };
}

export function shippingUpdateEmail(params: {
  customerName: string;
  orderNumber: string;
  status: string;
}): { subject: string; html: string } {
  return {
    subject: `${APP_NAME}  Order ${params.orderNumber} update`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h2>Order update</h2>
    <p>Hi ${params.customerName},</p>
    <p>Your order <strong>${params.orderNumber}</strong> is now: <strong>${params.status}</strong>.</p>
    <a href="${APP_URL}/account/orders" style="display: inline-block; background: #111; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      Track your order
    </a>
  </div>
</body>
</html>`,
  };
}

export function refundConfirmationEmail(params: {
  customerName: string;
  orderNumber: string;
  amount: number;
}): { subject: string; html: string } {
  return {
    subject: `${APP_NAME}  Refund processed for order ${params.orderNumber}`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h2>Refund processed</h2>
    <p>Hi ${params.customerName},</p>
    <p>A refund of <strong>${formatPrice(params.amount)}</strong> has been issued for order <strong>${params.orderNumber}</strong>.</p>
    <p style="color: #666;">Please allow 5-10 business days for the refund to appear on your statement.</p>
  </div>
</body>
</html>`,
  };
}

export function passwordResetEmail(params: {
  customerName: string;
  resetUrl: string;
}): { subject: string; html: string } {
  return {
    subject: `${APP_NAME}  Reset your password`,
    html: `
<!DOCTYPE html>
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f7f7f7; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 32px;">
    <h2>Password reset</h2>
    <p>Hi ${params.customerName},</p>
    <p>Click the link below to reset your password. This link expires in 1 hour.</p>
    <a href="${params.resetUrl}" style="display: inline-block; background: #111; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px;">
      Reset password
    </a>
    <p style="color: #666; font-size: 12px; margin-top: 24px;">
      If you didn't request this, you can safely ignore this email.
    </p>
  </div>
</body>
</html>`,
  };
}