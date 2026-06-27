import { google } from "googleapis";

const oauth2Client = new google.auth.OAuth2(
  process.env.OAUTH_CLIENT_ID ?? "",
  process.env.OAUTH_CLIENT_SECRET ?? "",
  "https://developers.google.com/oauthplayground",
);

oauth2Client.setCredentials({
  refresh_token: process.env.OAUTH_REFRESH_TOKEN,
});

const gmail = google.gmail({
  version: "v1",
  auth: oauth2Client,
});

export async function sendVerificationEmail(toEmail: string, otpCode: string) {
  const fromAddress = process.env.EMAIL_USER ?? "noreply@gpfinder.com";
  const subjectText = "Your GP Finder Verification Code";
  const subjectBase64 = Buffer.from(subjectText, "utf8").toString("base64");
  const subjectHeader = `Subject: =?UTF-8?B?${subjectBase64}?=`;

  const rawMessage = [
    `From: GP Finder <${fromAddress}>`,
    `To: ${toEmail}`,
    subjectHeader,
    "MIME-Version: 1.0",
    "Content-Type: text/html; charset=utf-8",
    "",
    `<h2>Welcome!</h2><p>Your verification code is: <strong>${otpCode}</strong></p>`,
  ].join("\r\n");

  const encodedMessage = Buffer.from(rawMessage, "utf8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");

  try {
    const response = await gmail.users.messages.send({
      userId: "me",
      requestBody: { raw: encodedMessage },
    });

    console.log("Verification email sent successfully:", response.data.id);
    return true;
  } catch (error) {
    console.error("Failed to send verification email:", error);
    throw error;
  }
}
