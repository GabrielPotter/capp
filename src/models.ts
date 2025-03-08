export interface CalendarFile {
    name: string;
    rules: { name: string; file: string }[];
}

export interface ConfigCalendar {
    calendarName: string;
    hash: string;
}

export interface AppConfig {
    calendars: ConfigCalendar[];
}
