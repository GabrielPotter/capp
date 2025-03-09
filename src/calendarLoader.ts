import fs from "fs";
import path from "path";
import { CalendarFile, AppConfig } from "./models";
import { SnippetRegistry } from "./snippetRunner";
import { generateCalendarHash } from "./hashUtil";

export function loadCalendars(folder: string): SnippetRegistry {
    const registry: SnippetRegistry = {};
    const files = fs.readdirSync(folder).filter((f) => f.endsWith(".json"));
    for (const file of files) {
        const fullPath = path.join(folder, file);
        const rawJson = fs.readFileSync(fullPath, "utf8");
        const calendarFile = JSON.parse(rawJson) as CalendarFile;

        const snippetMap: Record<string, string> = {};
        for (const rule of calendarFile.rules) {
            const snippetPath = path.join(folder, rule.file);
            const snippetCode = fs.readFileSync(snippetPath, "utf8");
            snippetMap[rule.name] = snippetCode;
        }
        registry[calendarFile.name] = snippetMap;
    }
    return registry;
}

export function loadCalendarsWithHashCheck(calendarFolder: string, configPath: string): SnippetRegistry {
    const rawConfig = fs.readFileSync(configPath, "utf8");
    const appConfig = JSON.parse(rawConfig) as AppConfig;
    const configHashMap: Record<string, string> = {};
    for (const c of appConfig.calendars) {
        configHashMap[c.calendarName] = c.hash;
    }
    const registry: SnippetRegistry = {};
    const files = fs.readdirSync(calendarFolder).filter((f) => f.endsWith(".json"));
    for (const file of files) {
        const fullPath = path.join(calendarFolder, file);
        const rawJson = fs.readFileSync(fullPath, "utf8");
        const calendarFile = JSON.parse(rawJson) as CalendarFile;
        const snippetMap: Record<string, string> = {};
        for (const rule of calendarFile.rules) {
            const snippetPath = path.join(calendarFolder, rule.file);
            const snippetCode = fs.readFileSync(snippetPath, "utf8");
            snippetMap[rule.name] = snippetCode;
        }
        registry[calendarFile.name] = snippetMap;
        const generatedHash = generateCalendarHash(snippetMap);
        const expectedHash = configHashMap[calendarFile.name];
        if (!expectedHash) {
            console.error(`No hash found in config for calendar '${calendarFile.name}'. Removing from memory.`);
            continue;
        }
        if (generatedHash !== expectedHash) {
            console.error(
                `Hash mismatch for calendar '${calendarFile.name}'. ` +
                    `Expected: ${expectedHash}, got: ${generatedHash}. Removing from memory.`
            );
            continue;
        }
        registry[calendarFile.name] = snippetMap;
    }
    return registry;
}
