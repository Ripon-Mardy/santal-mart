const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "BazarX";

function layout(title: string, bodyHtml: string, ctaText?: string, ctaUrl?: string) {
  return `
  <div style="font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;color:#111827">
    <div style="font-size:20px;font-weight:700;letter-spacing:-0.02em;color:#4f46e5;margin-bottom:24px">${APP_NAME}</div>
    <h1 style="font-size:18px;margin:0 0 16px">${title}</h1>
    <div style="font-size:14px;line-height:1.6;color:#374151">${bodyHtml}</div>
    ${
      ctaText && ctaUrl
        ? `<a href="${ctaUrl}" style="display:inline-block;margin-top:24px;background:#4f46e5;color:#fff;text-decoration:none;padding:10px 20px;border-radius:8px;font-size:14px;font-weight:600">${ctaText}</a>`
        : ""
    }
    <p style="margin-top:32px;font-size:12px;color:#9ca3af">© ${new Date().getFullYear()} ${APP_NAME}. One Marketplace. Thousands of Stores.</p>
  </div>`;
}

export const emailTemplates = {
  welcome: (name: string) => ({
    subject: `Welcome to ${APP_NAME}, ${name}!`,
    html: layout(`Welcome, ${name} 👋`, `Your ${APP_NAME} account is ready. Start exploring thousands of stores.`, "Start shopping", APP_URL),
  }),

  verifyEmail: (name: string, token: string) => ({
    subject: `Verify your ${APP_NAME} email address`,
    html: layout(
      `Hi ${name}, confirm your email`,
      `Click the button below to verify your email address and activate your account.`,
      "Verify email",
      `${APP_URL}/verify-email?token=${token}`
    ),
  }),

  passwordReset: (name: string, token: string) => ({
    subject: `Reset your ${APP_NAME} password`,
    html: layout(
      `Hi ${name}, reset your password`,
      `We received a request to reset your password. This link expires in 1 hour. If you didn't request this, you can ignore this email.`,
      "Reset password",
      `${APP_URL}/reset-password?token=${token}`
    ),
  }),

  orderConfirmation: (name: string, orderNumber: string, total: string) => ({
    subject: `Order ${orderNumber} confirmed`,
    html: layout(
      `Thanks for your order, ${name}!`,
      `Your order <strong>${orderNumber}</strong> (${total}) has been placed and is being processed.`,
      "Track order",
      `${APP_URL}/orders`
    ),
  }),

  paymentConfirmation: (orderNumber: string, amount: string) => ({
    subject: `Payment received for order ${orderNumber}`,
    html: layout(`Payment confirmed`, `We've received your payment of ${amount} for order <strong>${orderNumber}</strong>.`),
  }),

  orderShipped: (orderNumber: string, trackingNumber?: string) => ({
    subject: `Order ${orderNumber} has shipped`,
    html: layout(
      `Your order is on its way 🚚`,
      `Order <strong>${orderNumber}</strong> has shipped.${trackingNumber ? ` Tracking number: <strong>${trackingNumber}</strong>.` : ""}`,
      "Track order",
      `${APP_URL}/orders`
    ),
  }),

  orderDelivered: (orderNumber: string) => ({
    subject: `Order ${orderNumber} delivered`,
    html: layout(`Delivered! 📦`, `Order <strong>${orderNumber}</strong> has been delivered. We hope you love it — leave a review!`, "Write a review", `${APP_URL}/orders`),
  }),

  orderCancelled: (orderNumber: string, reason?: string) => ({
    subject: `Order ${orderNumber} cancelled`,
    html: layout(`Order cancelled`, `Order <strong>${orderNumber}</strong> has been cancelled.${reason ? ` Reason: ${reason}` : ""}`),
  }),

  sellerApproved: (storeName: string) => ({
    subject: `Your store "${storeName}" is approved!`,
    html: layout(`Congratulations! 🎉`, `Your store <strong>${storeName}</strong> has been approved. You can now list products on ${APP_NAME}.`, "Go to dashboard", `${APP_URL}/seller/dashboard`),
  }),

  sellerRejected: (storeName: string, reason: string) => ({
    subject: `Your seller application was not approved`,
    html: layout(`Application update`, `Your application for <strong>${storeName}</strong> was not approved.<br/>Reason: ${reason}`),
  }),

  productApproved: (productName: string) => ({
    subject: `"${productName}" is now live`,
    html: layout(`Product approved ✅`, `Your product <strong>${productName}</strong> has been approved and is now visible to customers.`, "Manage products", `${APP_URL}/seller/products`),
  }),

  productRejected: (productName: string, reason: string) => ({
    subject: `"${productName}" needs changes`,
    html: layout(`Product not approved`, `Your product <strong>${productName}</strong> was rejected.<br/>Reason: ${reason}`, "Edit product", `${APP_URL}/seller/products`),
  }),

  payoutProcessed: (amount: string) => ({
    subject: `Payout of ${amount} processed`,
    html: layout(`Payout sent 💸`, `Your payout of <strong>${amount}</strong> has been processed.`, "View earnings", `${APP_URL}/seller/payouts`),
  }),
};
