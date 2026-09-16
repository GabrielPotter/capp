# capp

`capp` is a Node.js + TypeScript calendar rules engine. It manages one or more **calendars**, each containing **rules** (snippets) that evaluate conditions on dates (e.g. "is it a workday?", "is it a holiday?").

1. Calendars are stored as JSON files.
2. Each calendar rule (snippet) lives in an external `.js` file.
3. Snippets are dynamically loaded and evaluated (via `eval` — see [Security](#security) below).
4. Snippets can call each other, even recursively.
5. Each calendar's content is hashed for integrity verification.
6. Calendars are rejected/skipped if their hash doesn't match an expected value in `hash.json`.
7. The package can be used as a **library**, a **CLI tester**, or an **Express-based REST server**.

---

## Table of Contents

1. [Installation](#installation)
2. [Usage](#usage)
   - [As a library](#as-a-library)
   - [As a REST server (CLI)](#as-a-rest-server-cli)
   - [Validating calendars (CLI tester)](#validating-calendars-cli-tester)
3. [Calendars and Snippets](#calendars-and-snippets)
   - [Calendar JSON Example](#calendar-json-example)
   - [Snippet JS Example](#snippet-js-example)
4. [Config File and Hashes](#config-file-and-hashes)
5. [REST API Routes](#rest-api-routes)
6. [Security](#security)
7. [Development](#development)

---

## Installation

```bash
npm install @gabrielpotter/capp
```

This gives you:
- A library entry point (`loadCalendarsWithHashCheck`, `SnippetRunner`, `createServer`, `startServer`, ...).
- Two CLI commands: `capp-server` and `capp-tester`.

---

## Usage

### As a library

```ts
import { createServer, loadCalendarsWithHashCheck, SnippetRunner } from "@gabrielpotter/capp";

// Mount the REST API into your own Express app / server lifecycle:
const app = createServer({
    calendarFolder: "./my-calendars",
    configPath: "./my-config.json",
    hashPath: "./my-hashes/hash.json",
});
app.listen(3000);

// Or use the pieces directly:
const registry = loadCalendarsWithHashCheck("./my-calendars", "./my-hashes/hash.json");
const runner = new SnippetRunner(registry);
const result = runner.runSnippet("tc1", "tc1_weekdays", { date: [new Date("2025-08-14")] });
```

`startServer(options)` is a convenience wrapper that calls `createServer` and immediately `.listen()`s.

### As a REST server (CLI)

```bash
npx capp-server -c ./my-calendars --config ./my-config.json -h ./my-hashes -p 3000
```

- `-c, --calendar <path>` — folder with calendar JSON files + snippet `.js` files.
- `--config <path>` — path to `config.json` (date format validation rules).
- `-h, --hash <path>` — folder containing `hash.json`.
- `-p, --port <port>` — port to listen on (default `3000`).

The package ships a small bundled example calendar you can point at directly to try things out:

```bash
npx capp-server -c node_modules/@gabrielpotter/capp/dist/calendars \
  --config node_modules/@gabrielpotter/capp/dist/config.json \
  -h node_modules/@gabrielpotter/capp/dist
```

### Validating calendars (CLI tester)

Before deploying a calendar, validate it against test cases and generate its hash:

```bash
npx capp-tester -c ./my-calendars -t ./my-tests -h ./my-hashes
```

- `-c, --calendar <path>` — folder with calendar JSON + snippet files.
- `-t, --test <path>` — folder with test case files (see `src/tests/test_tc1.json` for the format).
- `-h, --hash <path>` — folder where the generated `hash.json` is written.

If any test fails, the tester exits with a non-zero status and no hash is trusted. If all tests pass, it writes fresh hashes to `hash.json` — copy that alongside your calendar folder for the server to trust it.

---

## Calendars and Snippets

### Calendar JSON Example

Each `.json` file in a calendar folder describes one calendar: its name, and the rules (snippets) it exposes.

```json
{
    "name": "tc1",
    "rules": [
        { "name": "tc1_weekdays", "file": "tc1_weekdays.js" },
        { "name": "tc1_holidays", "file": "tc1_holidays.js" },
        { "name": "tc1_workdays", "file": "tc1_workdays.js" },
        { "name": "tc1_next_workday", "file": "tc1_next_workday.js" }
    ]
}
```

### Snippet JS Example

A typical snippet file, e.g. `snippet.js`:

```js
function rule(context) {
  // ... snippet body ...
  return returnValue;
}
return rule(context);
```

> The final `return rule(context)` is required so `eval` produces a non-undefined value.

> See `src/calendars` for real examples.

### A more complex example: computed holidays and cross-calendar composition

`src/calendars` also ships two calendars that go beyond fixed-date lookups, to show off two things the engine supports but `tc1` alone doesn't demonstrate:

- **`us_holidays`** — computes holidays that fall on the *nth weekday of a month* (e.g. "3rd Monday of January" for MLK Day, "last Monday of May" for Memorial Day) instead of a fixed date, and applies the US federal "observed date" rule (a holiday landing on Saturday is observed the preceding Friday; on Sunday, the following Monday):
  - `us_holidays_raw` — the actual calendar date of each holiday, unshifted.
  - `us_holidays_observed` — calls `us_holidays_raw` and shifts weekend holidays to the adjacent weekday.
- **`combined`** — a calendar that doesn't define any holidays of its own. Instead it composes rules from *both* `tc1` and `us_holidays` by calling `context.runSnippet(otherCalendarName, otherRuleName, ctx)` — since `runSnippet` takes an explicit calendar name, a snippet can call into any calendar loaded in the same registry, not just its own:
  - `combined_workday` — true only if the date is a weekday in neither calendar's holiday list (`tc1_holidays` OR `us_holidays_observed`).
  - `combined_next_workday` — walks forward day by day (like `tc1_next_workday`) but using `combined_workday`, so it skips holidays from either country.
  - `combined_add_business_days` — generalizes the same walk to advance a configurable number of business days via `context.days` (defaults to `1`). This one is only reachable through the library API, since the REST endpoint and the CLI tester only forward `date`, not arbitrary context fields:
    ```ts
    const runner = new SnippetRunner(registry);
    const threeDaysOut = runner.runSnippet("combined", "combined_add_business_days", {
        date: [new Date("2026-07-01")],
        days: 3,
    });
    ```

---

## Config File and Hashes

A `config.json` might look like:

```json
{
    "valid_input_formats": [
        "yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy", "yyyy-MM-DDTHH:mm:ss±hh:mm", "yyyy-MM-DDTHH:mm:ssZ"
    ],
    "valid_output_format": "yyyy-MM-dd"
}
```

A `hash.json` might look like:

```json
{
    "calendars": [
        { "calendarName": "tc1", "hash": "b5672b3920d796572cb98e8adfc9b458fa14c77f7ebc403c1bf2b675f5abfff4" }
    ]
}
```

- Each entry has the **calendarName** and the **hash** previously generated by `capp-tester`.
- If a loaded calendar's computed hash doesn't match, it's excluded from the registry (and logged as an error).

---

## REST API Routes

- `GET /calendars` — lists loaded calendar names (only those that passed the hash check).
- `GET /calendars/:calendarName` — lists available snippet (rule) names for that calendar.
- `GET /calendars/:calendarName/evaluate?rule=RULE&date=YYYY-MM-DD` — invokes the snippet and returns `{ "result": [...] }`.

> Example `curl` calls can be found in `src/scripts/test.sh`.

---

## Security

Rule snippets are executed with `eval`, and snippets can call each other (including recursively). This engine trusts the calendar files it's given — it does **not** sandbox snippet execution.

- Only load calendars from sources you control or have reviewed.
- Never wire an untrusted/user-uploaded calendar folder directly into `loadCalendarsWithHashCheck` or `capp-server`.
- The hash check in `hash.json` guards against *accidental drift* between a calendar and its previously-validated content — it is not a security boundary against a malicious calendar author, since anyone able to edit the calendar files can also regenerate a matching hash with `capp-tester`.

---

## Development

```bash
git clone https://github.com/GabrielPotter/capp.git
cd capp
npm install
npm run build   # compiles src/ to dist/
npm test        # runs capp-tester against src/calendars + src/tests, regenerates src/hash.json
npm start        # runs capp-server against the bundled example calendar on port 3000
```

`npm run build:bin` additionally produces standalone `capp-tester` executables (Linux/macOS/Windows) in `bin/` via [`pkg`](https://github.com/vercel/pkg), for environments without a Node.js runtime.
