const ALLOWED_DOMAIN = "eng.asu.edu.eg";

export class UserValidationService {
  validateEmailDomain(email: string): { valid: boolean; error?: string } {
    const lower = email.toLowerCase().trim();
    const parts = lower.split("@");
    if (parts.length !== 2) {
      return { valid: false, error: "Invalid email format" };
    }
    const domain = parts[1];
    if (domain !== ALLOWED_DOMAIN) {
      return {
        valid: false,
        error: `Signups are restricted to @${ALLOWED_DOMAIN} email addresses`,
      };
    }
    return { valid: true };
  }

  validateSignupPayload(payload: {
    name?: unknown;
    email?: unknown;
    password?: unknown;
    major?: unknown;
    skills?: unknown;
  }): { valid: boolean; error?: string } {
    if (!payload.name || typeof payload.name !== "string" || payload.name.trim().length < 2) {
      return { valid: false, error: "Name must be at least 2 characters" };
    }
    if (!payload.email || typeof payload.email !== "string") {
      return { valid: false, error: "Email is required" };
    }
    const domainCheck = this.validateEmailDomain(payload.email);
    if (!domainCheck.valid) return domainCheck;

    if (!payload.password || typeof payload.password !== "string" || payload.password.length < 8) {
      return { valid: false, error: "Password must be at least 8 characters" };
    }
    if (!payload.major || typeof payload.major !== "string") {
      return { valid: false, error: "Major is required" };
    }
    if (!Array.isArray(payload.skills)) {
      return { valid: false, error: "Skills must be an array" };
    }
    return { valid: true };
  }
}
