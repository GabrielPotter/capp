// models.ts

/** Egy naptár JSON formátuma */
export interface CalendarFile {
  name: string;          // A naptár neve (pl. "Hungary")
  rules: CalendarRule[]; // A naptár szabályai
}

/** Egy szabály a naptárban: snippet neve + a .js fájl neve */
export interface CalendarRule {
  name: string;    // például "munkanap"
  file: string;    // például "munkanap.js"
}
