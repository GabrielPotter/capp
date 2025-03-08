export type SnippetRegistry = Record<string, Record<string, string>>;

export class SnippetRunner {
    constructor(private registry: SnippetRegistry) {}
    runSnippet(calendarName: string, snippetName: string, context: Record<string, any>): any {
        const cal = this.registry[calendarName];
        if (!cal) {
            throw new Error(`Invalid calendar name: ${calendarName}`);
        }
        const code = cal[snippetName];
        if (!code) {
            throw new Error(`Invalid snippet name: ${snippetName} (calendar: ${calendarName})`);
        }
        const extendedContext = {
            ...context,
            runSnippet: (cName: string, sName: string, ctx: Record<string, any>) => {
                return this.runSnippet(cName, sName, ctx);
            },
        };
        return runScriptEval(code, extendedContext);
    }
}

function runScriptEval(script: string, context: Record<string, any>): any {
    const keys = Object.keys(context);
    const values = Object.values(context);
    const wrappedFunction = `
    (function(${keys.join(", ")}) {
      "use strict";
      ${script}
    })
  `;
    const fn = eval(wrappedFunction);
    return fn(...values);
}
