# Calendar Rule Engine – README

This project is a Node.js + TypeScript application that manages one or more **calendars**, each containing **rules** (snippets) that define how to evaluate certain conditions on dates (e.g., “is it a workday?”, “is it a holiday?”, etc.). The code demonstrates:

1. Storing calendars in JSON files.  
2. Storing each calendar rule (snippet) in external `.js` files.  
3. Dynamically loading and evaluating these JavaScript snippets with `eval`.  
4. Allowing snippets to call each other (even recursively).  
5. Generating a hash of each calendar’s content (for verification).  
6. Optionally rejecting/loading calendars based on expected hash values from a `config.json` file.  
7. Providing both a **tester** (CLI) and an **Express-based** REST server for demonstration.

Below is a detailed overview of how the system is structured, configured, and used.

---

## Table of Contents

1. [Project Structure](#project-structure)  
2. [Installation & Setup](#installation--setup)  
3. [Core Components](#core-components)  
   - [Models](#models)  
   - [Calendar Loader](#calendar-loader)  
   - [Snippet Runner](#snippet-runner)  
   - [Hash Utility](#hash-utility)  
4. [Calendars and Snippets](#calendars-and-snippets)  
   - [Calendar JSON Example](#calendar-json-example)  
   - [Snippet JS Example](#snippet-js-example)  
5. [Config File with Hashes](#config-file-with-hashes)  
6. [Tester Application](#tester-application)  
7. [Express REST Server](#express-rest-server)  
   - [Routes Overview](#routes-overview)  
8. [Generating and Validating Hashes](#generating-and-validating-hashes)  
   - [Tester Hash Generation](#tester-hash-generation)  
   - [Loader Hash Check](#loader-hash-check)  
9. [Running the Project](#running-the-project)  
   - [Local Development](#local-development)  
   - [Testing Calendars](#testing-calendars)  
10. [Further Extensions](#further-extensions)

---

## Project Structure

A typical folder layout might look like this:

```
my-calendar-app/
├─ package.json
├─ tsconfig.json
├─ config.json                <-- Optional config listing calendars & expected hashes
├─ testCases.json             <-- Optional testcases used by the tester
└─ src/
   ├─ index.ts                <-- Express server entry point
   ├─ tester.ts               <-- CLI tester for snippets
   ├─ models.ts               <-- TypeScript interfaces (CalendarFile, etc.)
   ├─ hashUtil.ts             <-- Utility for generating stable JSON + hashing
   ├─ calendarLoader.ts       <-- Loads calendars + snippet code from .js files
   ├─ snippetRunner.ts        <-- The snippet "eval" runner, allowing snippet recursion
   └─ calendar/
      ├─ Hungary.json         <-- Calendar JSON
      ├─ munkanap.js         <-- rule snippet code
      ├─ hungarian_holidays.js
      └─ hungarian_workdays.js
```

In this structure:

- `src/calendar/` contains multiple `.json` files (one per calendar), plus the `.js` snippet files that each JSON references.  
- `config.json` is optional; it holds (calendarName, hash) pairs for verifying that a loaded calendar matches a tested version.  
- `testCases.json` is optional for the tester – it lists (calendarName, snippetName, date, expectedValue) tests.

---

## Installation & Setup

1. **Clone or download** this project.  
2. In the root directory, run:
   ```bash
   npm install
   ```
   This installs `express`, `typescript`, and other required dependencies/devDependencies.

3. Make sure `tsconfig.json` is in place with appropriate settings (e.g. `outDir`, `rootDir`, etc.).

---

## Core Components

### Models

```ts
// models.ts

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
```

- **CalendarFile**: the structure of each `*.json` calendar definition.  
- **ConfigCalendar** and **AppConfig**: structures for the optional `config.json` that maps calendar names to a known hash.

### Calendar Loader

```ts
// calendarLoader.ts

import fs from "fs";
import path from "path";
import { CalendarFile } from "./models";
import { SnippetRegistry } from "./snippetRunner";
import { generateCalendarHash } from "./hashUtil";
import { AppConfig } from "./models";

export function loadCalendarsWithHashCheck(
  calendarFolder: string,
  configPath: string
): SnippetRegistry {
  // 1) Read the config
  const rawConfig = fs.readFileSync(configPath, "utf8");
  const appConfig = JSON.parse(rawConfig) as AppConfig;

  // Build a map: calendarName -> expectedHash
  const configHashMap: Record<string, string> = {};
  for (const c of appConfig.calendars) {
    configHashMap[c.calendarName] = c.hash;
  }

  // 2) Load calendars
  const registry: SnippetRegistry = {};
  const files = fs.readdirSync(calendarFolder).filter((f) => f.endsWith(".json"));

  for (const file of files) {
    const fullPath = path.join(calendarFolder, file);
    const rawJson = fs.readFileSync(fullPath, "utf8");
    const calendarFile = JSON.parse(rawJson) as CalendarFile;

    // Collect snippet code
    const snippetMap: Record<string, string> = {};
    for (const rule of calendarFile.rules) {
      const snippetPath = path.join(calendarFolder, rule.file);
      const snippetCode = fs.readFileSync(snippetPath, "utf8");
      snippetMap[rule.name] = snippetCode;
    }

    // Build an object for hashing
    const calendarObjForHash = {
      name: calendarFile.name,
      snippets: snippetMap,
    };

    // Generate the hash
    const generatedHash = generateCalendarHash(calendarObjForHash);

    // Compare to config
    const expectedHash = configHashMap[calendarFile.name];
    if (!expectedHash) {
      console.error(
        `No hash found in config for calendar '${calendarFile.name}'. Removing from memory.`
      );
      continue;
    }

    if (generatedHash !== expectedHash) {
      console.error(
        `Hash mismatch for '${calendarFile.name}'. ` +
          `Expected: ${expectedHash}, got: ${generatedHash}. Removing from memory.`
      );
      continue;
    }

    // If all good, store in registry
    registry[calendarFile.name] = snippetMap;
  }

  return registry;
}
```

- This function loads each `.json` calendar, reads each rule’s `.js` file into memory, then generates a hash for the calendar’s content.  
- It compares the generated hash to what’s defined in `config.json`. If mismatched (or not found), it **excludes** that calendar from memory (the user wants them removed).  
- If you prefer to keep all, but mark them invalid, you can adapt the logic.

### Snippet Runner

```ts
// snippetRunner.ts

export type SnippetRegistry = Record<string, Record<string, string>>;

export class SnippetRunner {
  constructor(private registry: SnippetRegistry) {}

  runSnippet(calendarName: string, snippetName: string, context: Record<string, any>): any {
    const calSnippets = this.registry[calendarName];
    if (!calSnippets) {
      throw new Error(`Calendar not found: ${calendarName}`);
    }

    const code = calSnippets[snippetName];
    if (!code) {
      throw new Error(`Snippet not found: ${snippetName} (calendar: ${calendarName})`);
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
```

- We store all snippet code in memory in a nested map: `registry[calendarName][snippetName] = snippetCode`.  
- We allow a snippet to call `runSnippet("CalendarX","SomeSnippet", { ... })` from inside itself.  
- We use `eval` for quick demonstration. *In real production, `vm2` or a sandbox would be safer.*  

### Hash Utility

```ts
// hashUtil.ts
import crypto from "crypto";

export function generateCalendarHash(obj: any): string {
  const stableJson = stableStringify(obj);
  return crypto.createHash("sha256").update(stableJson, "utf8").digest("hex");
}

function stableStringify(obj: any): string {
  if (Array.isArray(obj)) {
    return "[" + obj.map((x) => stableStringify(x)).join(",") + "]";
  } else if (obj && typeof obj === "object") {
    const keys = Object.keys(obj).sort();
    const keyValuePairs = keys.map(
      (k) => JSON.stringify(k) + ":" + stableStringify(obj[k])
    );
    return "{" + keyValuePairs.join(",") + "}";
  }
  return JSON.stringify(obj);
}
```

- Recursively sorts the keys so that the JSON string is stable (consistent key order).  
- Generates a SHA-256 hash from that string.

---

## Calendars and Snippets

### Calendar JSON Example

A minimal `Hungary.json`:

```json
{
  "name": "Hungary",
  "rules": [
    { "name": "munkanap", "file": "munkanap.js" },
    { "name": "hungarian_holidays", "file": "hungarian_holidays.js" },
    { "name": "hungarian_workdays", "file": "hungarian_workdays.js" }
  ]
}
```

### Snippet JS Example

A typical snippet file: `munkanap.js`:

```js
function rule(context) {
  const date = context.date;
  const day = date.getDay(); // 0=Sunday, 1..5=Mon..Fri, 6=Saturday
  return day >= 1 && day <= 5;
}
return rule(context);
```

> Notice we do a final `return rule(context)` so that `eval` ultimately has a non-undefined value.

---

## Config File with Hashes

A `config.json` might look like:

```json
{
  "calendars": [
    {
      "calendarName": "Hungary",
      "hash": "f3de983ab1fa45e96c6eb8..." 
    },
    {
      "calendarName": "MyCalendar",
      "hash": "abcdef1234567..."
    }
  ]
}
```

- Each object has the **calendarName** and **hash** that your tester previously generated and stored.  
- If the loaded calendar’s hash does not match, the loader excludes it.

---

## Tester Application

A script to run direct tests on the snippets without using REST:

```ts
// tester.ts

import path from "path";
import fs from "fs";
import { loadCalendarsWithHashCheck } from "./calendarLoader"; 
import { SnippetRunner } from "./snippetRunner";

interface TestCase {
  calendarName: string;
  snippetName: string;
  date: string;
  expected: any;
}

const CALENDAR_FOLDER = path.join(__dirname, "calendar");
const CONFIG_PATH = path.join(__dirname, "..", "config.json");

// Load with hash check (or a simpler load function if you prefer)
const registry = loadCalendarsWithHashCheck(CALENDAR_FOLDER, CONFIG_PATH);
const runner = new SnippetRunner(registry);

const testCasesPath = path.join(__dirname, "..", "testCases.json");
const rawTestCases = fs.readFileSync(testCasesPath, "utf8");
const testCases: TestCase[] = JSON.parse(rawTestCases);

function main() {
  console.log(`=== Running ${testCases.length} test case(s) ===`);

  for (let i = 0; i < testCases.length; i++) {
    const tc = testCases[i];
    const { calendarName, snippetName, date, expected } = tc;

    console.log(`Test #${i + 1}: ${calendarName}.${snippetName} on ${date}, expecting: ${expected}`);

    try {
      const dateObj = new Date(date);
      const result = runner.runSnippet(calendarName, snippetName, { date: dateObj });

      if (result !== expected) {
        console.error(`  FAIL: got '${result}', but expected '${expected}'`);
        process.exit(1);
      }
      console.log("  OK");
    } catch (err: any) {
      console.error(`  ERROR: snippet execution threw an exception: ${err.message}`);
      process.exit(1);
    }
  }

  console.log(`All ${testCases.length} tests passed successfully!`);
  process.exit(0);
}

main();
```

- `testCases.json` might have an array of test objects:
  ```json
  [
    {
      "calendarName": "Hungary",
      "snippetName": "hungarian_workdays",
      "date": "2025-08-14",
      "expected": true
    },
    ...
  ]
  ```
- If you want to produce or update a **hash** after all tests pass, you can add logic to generate the final hash and store it somewhere.

---

## Express REST Server

You can also run an **Express** server to expose these calendars via REST:

```ts
// index.ts

import express, { Request, Response } from "express";
import path from "path";
import { loadCalendarsWithHashCheck } from "./calendarLoader";
import { SnippetRunner } from "./snippetRunner";

// 1) Load calendars with hash check
const CALENDAR_FOLDER = path.join(__dirname, "calendar");
const CONFIG_PATH = path.join(__dirname, "..", "config.json");
const registry = loadCalendarsWithHashCheck(CALENDAR_FOLDER, CONFIG_PATH);

// 2) Create snippet runner
const snippetRunner = new SnippetRunner(registry);

// 3) Express app
const app = express();
const PORT = 3000;

app.get("/calendars", (req: Request, res: Response) => {
  // Return the list of loaded calendars
  const calendarNames = Object.keys(registry);
  res.json({ calendars: calendarNames });
});

app.get("/calendars/:calendarName", (req: Request, res: Response) => {
  const { calendarName } = req.params;
  const calSnippets = registry[calendarName];
  if (!calSnippets) {
    return res.status(404).json({ error: `Calendar not found: ${calendarName}` });
  }
  const snippetNames = Object.keys(calSnippets);
  res.json({ calendar: calendarName, snippets: snippetNames });
});

/**
 * Evaluate a snippet for a given date
 * e.g. GET /calendars/Hungary/evaluate?rule=hungarian_workdays&date=2025-08-14
 */
app.get("/calendars/:calendarName/evaluate", (req: Request, res: Response) => {
  const { calendarName } = req.params;
  const { rule, date } = req.query;

  if (!rule || !date) {
    return res.status(400).json({ error: "Missing 'rule' or 'date' query param" });
  }

  try {
    const dateObj = new Date(String(date));
    const result = snippetRunner.runSnippet(calendarName, String(rule), { date: dateObj });
    res.json({ result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Calendar REST server listening on port ${PORT}...`);
});
```

### Routes Overview

- `GET /calendars`  
  Lists the loaded calendar names (only those that passed the hash check).  
- `GET /calendars/:calendarName`  
  Lists available snippet names for that calendar.  
- `GET /calendars/:calendarName/evaluate?rule=RULE&date=YYYY-MM-DD`  
  Invokes the snippet and returns `{ "result": <snippetOutput> }`.

---

## Generating and Validating Hashes

The **hash** workflow:

1. You run the **tester** or a custom script to load each calendar, produce a stable JSON structure, and do a **`SHA-256`** with sorted keys.  
2. Store that resulting hash in your `config.json` – e.g.:
   ```json
   {
     "calendars": [
       { "calendarName": "Hungary", "hash": "...calculatedSha..." }
     ]
   }
   ```
3. When the **loader** runs (in production or at server startup), it loads each calendar, recalculates the hash, and compares with `config.json`.  
4. If the hash differs, the calendar is excluded or flagged as invalid.

### Tester Hash Generation

You can easily add logic in the tester code that – after all tests pass – prints out the final hash. For example:

```ts
import { generateCalendarHash } from "./hashUtil";

const finalObj = { name: "Hungary", snippets: snippetMap };
const hash = generateCalendarHash(finalObj);
console.log("Calendar content hash:", hash);
```

### Loader Hash Check

When the server starts, it calls `loadCalendarsWithHashCheck`, which re-generates the hash in exactly the same manner. If mismatched, that calendar is not stored in the registry.

---

## Running the Project

### Local Development

1. **Build**:
   ```bash
   npx tsc
   ```
   This compiles TypeScript into `dist/`.

2. **Run the server**:
   ```bash
   node dist/index.js
   ```
   By default, it listens on port `3000`. Check console logs for messages.

### Testing Calendars

To run the CLI tester:
```bash
node dist/tester.js
```
- Reads `testCases.json`, loads calendars, checks each snippet for each date.  
- If any test fails, it exits with code `1`. Otherwise, prints success.

---

## Further Extensions

- **Sandboxing**: Instead of direct `eval`, consider `vm2` or Node’s native `vm` module if you want more security.  
- **Dynamic Updates**: Support hot-reloading or watching for file changes.  
- **Advanced Expressions**: Instead of JS snippets, you could parse a domain-specific language.  
- **Databases**: Store the snippet code in a database rather than the filesystem.  
- **Multiple Environments**: Different config files or hash sets for dev, staging, production.  

---

**Enjoy customizing your snippet-based calendar system!** This design allows truly dynamic, config-driven logic with minimal hardcoding. The hashing ensures only tested calendars are accepted at runtime, preventing unexpected changes to snippet code.