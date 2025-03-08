// snippetRunner.ts

/**
 * A SnippetRegistry egyszerűen: naptárNév => (snippetNév => snippetKód).
 * Így minden naptárhoz több snippetet tárolunk.
 */
export type SnippetRegistry = Record<string, Record<string, string>>;

/**
 * A SnippetRunner feladata, hogy:
 * 1) memóriában tárolja az összes naptár snippetjeit
 * 2) lehessen runSnippet(naptárNeve, snippetNeve, context) hívást végezni
 */
export class SnippetRunner {
  constructor(private registry: SnippetRegistry) {}

  /**
   * Lefuttatja a `snippetName` nevű snippetet a `calendarName` naptárból.
   * @param calendarName 
   * @param snippetName 
   * @param context Olyan objektum, amelyet a snippet kód elér (pl. { date: new Date() })
   */
  runSnippet(calendarName: string, snippetName: string, context: Record<string, any>): any {
    const cal = this.registry[calendarName];
    if (!cal) {
      throw new Error(`Naptár nem létezik: ${calendarName}`);
    }
    const code = cal[snippetName];
    if (!code) {
      throw new Error(`Snippet nem létezik: ${snippetName} (naptár: ${calendarName})`);
    }

    // Bővítjük a context-et egy runSnippet metódussal, hogy a snippet hívhassa a többi snippetet
    const extendedContext = {
      ...context,
      runSnippet: (cName: string, sName: string, ctx: Record<string, any>) => {
        return this.runSnippet(cName, sName, ctx);
      },
    };

    // Meghívjuk az eval-lal futtató segédfüggvényt
    return runScriptEval(code, extendedContext);
  }
}

/**
 * Egy egyszerű eval futtató függvény, ami paraméterlistát generál
 */
function runScriptEval(script: string, context: Record<string, any>): any {
  const keys = Object.keys(context);
  const values = Object.values(context);

  // Létrehozunk egy wrapper function-t, aminek paraméterlistája: (date, runSnippet, ...), 
  // és a törzs maga a script.
  // Az utolsó kifejezés értéke lesz a snippet "return value"-ja.
  const wrappedFunction = `
    (function(${keys.join(", ")}) {
      "use strict";
      ${script}
    })
  `;
  // Lefordítjuk
  const fn = eval(wrappedFunction);
  // Meghívjuk a generált függvényt
  return fn(...values);
}
