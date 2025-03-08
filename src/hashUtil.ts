// hashUtil.ts
import crypto from "crypto";

/**
 * Rekurzívan kulcs-sorrendben sorba rakott JSON-string készítése, 
 * majd abból SHA-256 hex digest generálása.
 */
export function generateCalendarHash(registry: any): string {
  const stableJson = stableStringify(registry);
  const hash = crypto.createHash("sha256")
    .update(stableJson, "utf8")
    .digest("hex");

  return hash;
}

/**
 * Egyszerű rekurzív kulcsrendezés + JSON.stringify.
 * A rekurzív kulcsrendezés azt jelenti, hogy egy 
 * objektum minden property-jét abc-sorrendben járunk be.
 */
function stableStringify(obj: any): string {
  if (Array.isArray(obj)) {
    return "[" + obj.map((x) => stableStringify(x)).join(",") + "]";
  } else if (obj && typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const keyValuePairs = keys.map(
      (k) => JSON.stringify(k) + ":" + stableStringify(obj[k])
    );
    return "{" + keyValuePairs.join(",") + "}";
  } else {
    // primitív típus (string, number, boolean, null)
    return JSON.stringify(obj);
  }
}
