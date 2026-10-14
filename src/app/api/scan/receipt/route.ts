import { Resend } from "resend";

export const maxDuration = 15;

export async function POST(request: Request) {
  const { name, email, isFree } = await request.json().catch(() => ({
    name: "",
    email: "",
    isFree: false,
  }));

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return Response.json({ ok: true }); // No valid email — skip silently
  }

  const firstName = name ? name.split(" ")[0] : "";
  const resend = new Resend(process.env.RESEND_API_KEY);

  await resend.emails.send({
    from: "Natasha Berness | SoliVana Wellness <natasha@solivana.com>",
    to: email,
    replyTo: "natasha@solivana.com",
    subject: "Your voice scan is reserved — three short steps to your report",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#F0EDED;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 20px;">

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:#331D01;border-radius:12px;padding:28px 24px;text-align:center;">
          <p style="color:#EC9247 !important;font-size:12px;letter-spacing:0.10em;text-transform:uppercase;margin:0 0 10px 0;font-weight:700;">SoliVana Wellness</p>
          <p style="color:#ffffff !important;font-size:22px;font-weight:300;margin:0;line-height:1.4;">
            ${isFree ? "Your complimentary scan is reserved" : "Your voice scan is reserved"}
          </p>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#ffffff;border-radius:12px;padding:28px 24px;">
          <p style="color:#786455;font-size:15px;line-height:1.7;margin:0 0 16px 0;">Hi${firstName ? ` ${firstName}` : ""},</p>
          <p style="color:#786455;font-size:15px;line-height:1.7;margin:0 0 20px 0;">
            ${isFree ? "Your complimentary scan is reserved — thank you for being here." : "Thank you. Your scan is reserved and ready when you are."}
            Here are the four short steps that take you from voice recording to your personalized report:
          </p>

          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            ${[
              ["1", "Log in or create your E4L account", `Go to <a href="https://portal.e4l.com/user/create/SDRzSUFBQUFBQUFFQUROa01HSXdZekJoTUdjQUFBTCtQcDRLQUFBQQ__" style="color:#EC9247;text-decoration:none;">portal.e4l.com</a>. New clients can create a free account in under a minute.`],
              ["2", "Complete your Voice Scan", "The voice scan takes about 10 seconds and can be done from any phone or computer."],
              ["3", "Download your PDF scan report", "Once your scan is done, download the PDF report from your E4L portal."],
              ["4", "Upload your PDF for your interpreted report", `Go to <a href="https://scan.solivana.ai/report" style="color:#EC9247;text-decoration:none;">scan.solivana.ai/report</a> — enter your name and email, drop in your PDF, and your personalized report will be in your inbox within minutes.`],
            ].map(([num, title, desc]) => `
            <tr>
              <td style="padding:0 0 16px 0;">
                <table width="100%" cellpadding="0" cellspacing="0" border="0">
                  <tr>
                    <td width="32" style="vertical-align:top;padding-top:2px;">
                      <div style="width:26px;height:26px;background-color:#EC9247;border-radius:50%;text-align:center;line-height:26px;color:#ffffff;font-size:12px;font-weight:700;">${num}</div>
                    </td>
                    <td style="padding-left:12px;">
                      <p style="color:#331D01;font-size:14px;font-weight:600;margin:0 0 4px 0;">${title}</p>
                      <p style="color:#786455;font-size:13px;line-height:1.6;margin:0;">${desc}</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>`).join("")}
          </table>
        </td>
      </tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:20px;">
      <tr>
        <td style="background-color:#FFF8F0;border-radius:12px;padding:20px 24px;border:1px solid rgba(236,146,71,0.2);">
          <p style="color:#331D01;font-size:14px;font-weight:600;margin:0 0 6px 0;">Questions?</p>
          <p style="color:#786455;font-size:13px;line-height:1.6;margin:0;">
            Reply to this email or call <strong style="color:#331D01;">(650) 564-4325</strong>. I'm always happy to help you get started.
          </p>
          <p style="color:#786455;font-size:13px;margin:6px 0 0 0;">— Natasha</p>
        </td>
      </tr>
    </table>

    <p style="color:#B49F90;font-size:11px;text-align:center;margin:0;line-height:1.6;">
      SoliVana Wellness · Redwood City, CA · (650) 564-4325 · natasha@solivana.com<br>
      This email is for wellness purposes only and does not constitute medical advice.
    </p>

  </div>
</body>
</html>
    `.trim(),
  }).catch((err) => console.error("Receipt email error:", err));

  return Response.json({ ok: true });
}
