import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

export const sendVerificationEmail = async (to: string, code: string) => {
  try {
    await transporter.sendMail({
      from: '"GP Finder" <noreply@gpfinder.com>',
      to,
      subject: "Your GP Finder Verification Code",
      html: `<h2>Welcome!</h2><p>Your verification code is: <strong>${code}</strong></p>`,
    });
    return true;
  } catch (error) {
    console.error("Mailer failed:", error);
    console.log("=== FALLBACK OTP FOR TESTING: ", code, " ===");
    return false;
  }
};
