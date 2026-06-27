const EGYPTIAN_PHONE_RE = /^01[0-2,5]{1}[0-9]{8}$/;
const UNIVERSITY_ID_RE = /^\d{7,8}$/;
const VALID_TRACKS = [
  "Software Engineering",
  "Hardware Design",
  "Networks and Cybersecurity",
  "AI",
  "Embedded",
  "Other",
] as const;
const VALID_BYLAWS = ["2018", "2023"] as const;
const VALID_GENDERS = ["Male", "Female"] as const;

export class UserValidationService {
  validateEmail(email: string): { valid: boolean; error?: string } {
    const lower = email.toLowerCase().trim();
    const parts = lower.split("@");
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return { valid: false, error: "Invalid email format" };
    }
    return { valid: true };
  }

  validateUniversityId(universityId: string): { valid: boolean; error?: string } {
    if (!UNIVERSITY_ID_RE.test(universityId)) {
      return { valid: false, error: "ID must be 7-8 digits" };
    }
    return { valid: true };
  }

  validatePhone(phone: string): { valid: boolean; error?: string } {
    if (!EGYPTIAN_PHONE_RE.test(phone)) {
      return {
        valid: false,
        error:
          "Phone must be a valid Egyptian mobile number (e.g. 01012345678)",
      };
    }
    return { valid: true };
  }

  validateSignupPayload(payload: Record<string, unknown>): {
    valid: boolean;
    error?: string;
  } {
    if (
      !payload.name ||
      typeof payload.name !== "string" ||
      payload.name.trim().length < 2
    ) {
      return { valid: false, error: "Name must be at least 2 characters" };
    }
    if (!payload.email || typeof payload.email !== "string") {
      return { valid: false, error: "Email is required" };
    }
    const emailCheck = this.validateEmail(payload.email);
    if (!emailCheck.valid) return emailCheck;

    if (!payload.universityId || typeof payload.universityId !== "string") {
      return { valid: false, error: "University ID is required" };
    }
    const universityIdCheck = this.validateUniversityId(payload.universityId);
    if (!universityIdCheck.valid) return universityIdCheck;

    if (
      !payload.password ||
      typeof payload.password !== "string" ||
      payload.password.length < 8
    ) {
      return { valid: false, error: "Password must be at least 8 characters" };
    }

    if (!Array.isArray(payload.skills) || payload.skills.length === 0) {
      return { valid: false, error: "At least one skill is required" };
    }

    if (!payload.phone || typeof payload.phone !== "string") {
      return { valid: false, error: "Phone is required" };
    }
    const phoneCheck = this.validatePhone(payload.phone);
    if (!phoneCheck.valid) return phoneCheck;

    if (payload.gpa === undefined || payload.gpa === null) {
      return { valid: false, error: "GPA is required" };
    }
    const gpa = Number(payload.gpa);
    if (isNaN(gpa) || gpa < 0 || gpa > 4.0) {
      return { valid: false, error: "GPA must be between 0.0 and 4.0" };
    }

    if (
      !payload.bylaw ||
      !VALID_BYLAWS.includes(payload.bylaw as (typeof VALID_BYLAWS)[number])
    ) {
      return { valid: false, error: "Bylaw must be '2018' or '2023'" };
    }

    if (
      !payload.track ||
      !VALID_TRACKS.includes(payload.track as (typeof VALID_TRACKS)[number])
    ) {
      return { valid: false, error: "Invalid track value" };
    }

    if (payload.track === "Other") {
      if (
        !payload.customTrack ||
        typeof payload.customTrack !== "string" ||
        payload.customTrack.trim().length === 0
      ) {
        return {
          valid: false,
          error: "Custom track is required when track is 'Other'",
        };
      }
    }

    if (
      !payload.cvLink ||
      typeof payload.cvLink !== "string" ||
      payload.cvLink.trim().length === 0
    ) {
      return { valid: false, error: "CV link is required" };
    }

    try {
      const url = new URL(payload.cvLink.trim());
      if (url.protocol !== "http:" && url.protocol !== "https:") {
        return { valid: false, error: "CV link must be a valid URL" };
      }
    } catch {
      return { valid: false, error: "CV link must be a valid URL" };
    }

    if (
      !payload.bio ||
      typeof payload.bio !== "string" ||
      payload.bio.trim().length < 20
    ) {
      return { valid: false, error: "Bio must be at least 20 characters" };
    }

    if (payload.bio.trim().length > 500) {
      return { valid: false, error: "Bio must be at most 500 characters" };
    }

    if (
      !payload.gender ||
      !VALID_GENDERS.includes(
        payload.gender as (typeof VALID_GENDERS)[number]
      )
    ) {
      return { valid: false, error: "Gender must be 'Male' or 'Female'" };
    }

    return { valid: true };
  }
}
