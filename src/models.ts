// models.ts

export interface CalendarFile {
  name: string;  // "Hungary", "MyCalendar" stb.
  rules: { name: string; file: string }[];
}

export interface ConfigCalendar {
  calendarName: string;
  hash: string;
}

export interface AppConfig {
  calendars: ConfigCalendar[];
}
