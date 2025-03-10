# Calendar Rule Engine – README

This project is a Node.js + TypeScript application that manages one or more **calendars**, each containing **rules** (snippets) that define how to evaluate certain conditions on dates (e.g., “is it a workday?”, “is it a holiday?”, etc.). 
1. Storing calendars in JSON files.  
2. Storing each calendar rule (snippet) in external `.js` files.  
3. Dynamically loading and evaluating these JavaScript snippets with `eval`.  
4. Allowing snippets to call each other (even recursively).  
5. Generating a hash of each calendar’s content (for verification).  
6. Optionally rejecting/loading calendars based on expected hash values from a `hash.json` file.  
7. Providing both a **tester** (CLI) and an **Express-based** REST server.

Below is a detailed overview of how the system is structured, configured, and used.

---

## Table of Contents

1. [Project Structure](#project-structure)  
2. [Installation & Setup](#installation--setup)  
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
   
---

## Project Structure

A typical folder layout might look like this:

```
capp/
├─ package.json
├─ tsconfig.json
├─ config.json                <-- Optional config listing calendars & expected hashes
├─ hash.json
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
   ├─ tests/                     <-- Optional testcases used by the tester
      └─ test_tc1.json

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
## Calendars and Snippets

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

- If you want to produce or update a **hash** after all tests pass, you can add logic to generate the final hash and store it somewhere.

---

## Express REST Server

You can also run an **Express** server to expose these calendars via REST:


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

