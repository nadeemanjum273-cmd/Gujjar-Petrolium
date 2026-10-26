/**
 * Formatting Utilities for PKR Currency, Asia/Karachi Dates, and Phone Numbers.
 * Gujjar Petrolium Kot Gujjran
 */

/**
 * Format monetary amount into consistent Pakistani Rupee representation.
 * Handles string, number, and undefined values cleanly.
 */
export function formatPKR(
  amount: number | string | undefined | null,
  options?: { showUrduSuffix?: boolean; showSymbol?: boolean }
): string {
  if (amount === undefined || amount === null || amount === "") {
    return options?.showUrduSuffix ? "0 روپے" : "PKR 0";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) return "PKR 0";

  // Pakistani comma separation style (thousands, lakhs)
  const formattedNumber = new Intl.NumberFormat("en-PK", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);

  if (options?.showUrduSuffix) {
    return `${formattedNumber} روپے`;
  }

  if (options?.showSymbol === false) {
    return formattedNumber;
  }

  return `PKR ${formattedNumber}`;
}

/**
 * Format ISO datetime string or Date object in Asia/Karachi timezone.
 */
export function formatKarachiDateTime(
  dateInput: string | Date | undefined | null,
  formatStyle: "full" | "dateOnly" | "timeOnly" = "full"
): string {
  if (!dateInput) return "—";

  try {
    const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(date.getTime())) return "—";

    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Asia/Karachi",
    };

    if (formatStyle === "dateOnly") {
      options.day = "2-digit";
      options.month = "short";
      options.year = "numeric";
    } else if (formatStyle === "timeOnly") {
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = true;
    } else {
      options.day = "2-digit";
      options.month = "short";
      options.year = "numeric";
      options.hour = "2-digit";
      options.minute = "2-digit";
      options.hour12 = true;
    }

    return new Intl.DateTimeFormat("en-GB", options).format(date);
  } catch {
    return "—";
  }
}

/**
 * Format ISO date or Date object to date-only string in Asia/Karachi timezone.
 */
export function formatKarachiDate(dateInput: string | Date | undefined | null): string {
  return formatKarachiDateTime(dateInput, "dateOnly");
}

/**
 * Format Pakistani phone numbers into readable separated groups.
 * e.g. "+923000000001" -> "+92 300 0000001" or "0300-0000001"
 */
export function formatPakistaniPhone(phone: string, localFormat: boolean = false): string {
  if (!phone) return "";
  const cleaned = phone.replace(/[^\d+]/g, "");

  if (localFormat) {
    // Convert to 03XX-XXXXXXX
    if (cleaned.startsWith("+92")) {
      const sub = cleaned.substring(3);
      return `0${sub.substring(0, 3)}-${sub.substring(3)}`;
    }
  }

  // International format: +92 300 0000001
  if (cleaned.startsWith("+92") && cleaned.length === 13) {
    return `${cleaned.substring(0, 3)} ${cleaned.substring(3, 6)} ${cleaned.substring(6)}`;
  }

  return phone;
}
