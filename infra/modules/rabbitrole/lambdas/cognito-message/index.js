// Cognito Custom Message trigger: brand the OTP / verification email with the
// rabbitrole logo + styling, replacing Cognito's plain-text default.
//
// Fires for the CustomMessage_* sources (passwordless email-OTP sign-in, sign-up,
// admin-create, resend, forgot-password). Any message that carries a code gets the
// branded HTML; anything else passes through untouched. Cognito substitutes the
// real code into the {####} placeholder we echo from event.request.codeParameter.
//
// triggerSource is logged so you can confirm in CloudWatch exactly which source the
// email-OTP sign-in uses (and branch the copy per source later if you want).
//
// The logo is a TEXT wordmark, not an <img>: email clients block remote images by
// default (and a hosted PNG showed as a broken icon), so text is the reliable choice
// — it always renders, matching the app's "rabbit"+"role" brand. APP_URL (from the
// Lambda env, auth_message.tf) is just the footer link. Runtime: nodejs20.x.

const APP_URL = process.env.APP_URL || "";

exports.handler = async (event) => {
  console.log("CustomMessage triggerSource:", event.triggerSource);

  const code = event.request && event.request.codeParameter;
  if (!code) {
    return event; // no code to deliver in this flow — leave Cognito's message as-is
  }

  event.response.emailSubject = "Your rabbitrole sign-in code";
  event.response.emailMessage = render(code);
  return event;
};

function render(code) {
  const footer = APP_URL
    ? `<p style="text-align:center;margin:16px 0 0;font-size:12px;color:#94a3b8"><a href="${APP_URL}" style="color:#10b981;text-decoration:none">rabbitrole.com</a></p>`
    : "";
  return `
  <div style="background:#f1f5f9;padding:32px 0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <div style="max-width:440px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;text-align:center;box-shadow:0 1px 3px rgba(0,0,0,0.08)">
      <div style="font-size:26px;font-weight:700;letter-spacing:-0.02em;margin:0 0 12px">
        <span style="color:#0f172a">rabbit</span><span style="color:#10b981">role</span>
      </div>
      <h1 style="margin:8px 0 4px;font-size:20px;font-weight:600;color:#0f172a">Your sign-in code</h1>
      <p style="margin:0 0 20px;font-size:14px;color:#64748b">Enter this code to continue to rabbitrole.</p>
      <div style="font-size:32px;font-weight:700;letter-spacing:8px;color:#0f172a;background:#f1f5f9;border-radius:12px;padding:16px 0">${code}</div>
      <p style="margin:20px 0 0;font-size:12px;color:#94a3b8">This code expires shortly. If you didn't request it, you can ignore this email.</p>
    </div>
    ${footer}
  </div>`;
}
