import crypto from "crypto";

export function generateCalendarHash(registry: any): string {
    const stableJson = stableStringify(registry);
    const hash = crypto.createHash("sha256").update(stableJson, "utf8").digest("hex");

    return hash;
}

function stableStringify(obj: any): string {
    if (Array.isArray(obj)) {
        return "[" + obj.map((x) => stableStringify(x)).join(",") + "]";
    } else if (obj && typeof obj === "object") {
        const keys = Object.keys(obj).sort();
        const keyValuePairs = keys.map((k) => JSON.stringify(k) + ":" + stableStringify(obj[k]));
        return "{" + keyValuePairs.join(",") + "}";
    } else {
        return JSON.stringify(obj);
    }
}
