// calendarLoader.ts
import fs from "fs";
import path from "path";
import { CalendarFile } from "./models";
import { SnippetRegistry } from "./snippetRunner";

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
