// calendarLoader.ts
import fs from "fs";
import path from "path";
import { CalendarFile, AppConfig } from "./models";
import { SnippetRegistry } from "./snippetRunner";
import { generateCalendarHash } from "./hashUtil";


/**
 * Betölti a `folder` könyvtárban található összes .json naptárdefiníciót,
 * és a naptár 'rules' mezőjében szereplő .js fájlokat is beolvassa.
 * Visszaad egy SnippetRegistry-t: 
 *    { [calendarName]: { [snippetName]: snippetCode } }
 */
export function loadCalendars(folder: string): SnippetRegistry {
  const registry: SnippetRegistry = {};

  // Olvassuk be a mappában a .json fájlokat
  const files = fs.readdirSync(folder).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const fullPath = path.join(folder, file);
    const rawJson = fs.readFileSync(fullPath, "utf8");
    const calendarFile = JSON.parse(rawJson) as CalendarFile;

    // Minden naptár (calendarFile) tartalmazhat több rule-t 
    const snippetMap: Record<string, string> = {};
    for (const rule of calendarFile.rules) {
      // A rule.file jelöli, melyik .js fájlból töltsük be a snippet kódot
      const snippetPath = path.join(folder, rule.file);
      const snippetCode = fs.readFileSync(snippetPath, "utf8");
      snippetMap[rule.name] = snippetCode;
    }

    // Végül betesszük a registry-be
    registry[calendarFile.name] = snippetMap;
  }

  return registry;
}

/**
 * Betölt egy config.json-t, és a calendar mappából a naptárakat,
 * majd ellenőrzi, hogy a generált hash egyezik-e a configban szereplővel.
 * Ha nem, törli a memóriából az adott naptárt.
 */
export function loadCalendarsWithHashCheck(
  calendarFolder: string,
  configPath: string
): SnippetRegistry {
  // 1) Beolvassuk a config.json-t
  const rawConfig = fs.readFileSync(configPath, "utf8");
  const appConfig = JSON.parse(rawConfig) as AppConfig;

  // Csinálunk egy Map-et, hogy gyorsan megtaláljuk: map[calendarName] => elvárt hash
  const configHashMap: Record<string, string> = {};
  for (const c of appConfig.calendars) {
    configHashMap[c.calendarName] = c.hash;
  }

  // 2) Beolvassuk a naptárakat (ugyanaz, mint korábban) 
  const registry: SnippetRegistry = {};

  // Minden .json a calendarFolderben
  const files = fs.readdirSync(calendarFolder).filter(f => f.endsWith(".json"));
  for (const file of files) {
    const fullPath = path.join(calendarFolder, file);
    const rawJson = fs.readFileSync(fullPath, "utf8");
    const calendarFile = JSON.parse(rawJson) as CalendarFile;

    // Először összegyűjtjük a snippetek kódját
    const snippetMap: Record<string, string> = {};
    for (const rule of calendarFile.rules) {
      const snippetPath = path.join(calendarFolder, rule.file);
      const snippetCode = fs.readFileSync(snippetPath, "utf8");
      snippetMap[rule.name] = snippetCode;
    }

    // Létrehozunk egy belső objektumot, ami reprezentálja a naptár "logikai" tartalmát 
    // a hash-számításhoz (név + snippetek)
    // Pl. { name: "Hungary", snippets: { munkanap: "function rule...", ... } }
    // const calendarObjForHash = {
    //   name: calendarFile.name,
    //   snippets: snippetMap
    // };

    registry[calendarFile.name] = snippetMap;

    // Kiszámoljuk a hash-t
    const generatedHash = generateCalendarHash(snippetMap);

    // Megnézzük, hogy a configban van-e egy bejegyzés erre a naptárra
    const expectedHash = configHashMap[calendarFile.name];
    if (!expectedHash) {
      // Ha nincs bejegyzés, akár hiba, vagy eldöntheted, hogy implicit elveted, 
      // itt dobjunk hibát
      console.error(`No hash found in config for calendar '${calendarFile.name}'. Removing from memory.`);
      continue; // nem kerül be a registry-be
    }

    if (generatedHash !== expectedHash) {
      console.error(
        `Hash mismatch for calendar '${calendarFile.name}'. ` +
        `Expected: ${expectedHash}, got: ${generatedHash}. Removing from memory.`
      );
      continue; // szintén nem tesszük be a registry-be
    }

    // Ha ide eljutunk, a hash egyezik, mehet a registry-be
    registry[calendarFile.name] = snippetMap;
  }

  return registry;
}