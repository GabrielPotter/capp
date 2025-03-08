// index.ts
import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";

import { loadCalendars } from "./calendarLoader";
import { SnippetRunner } from "./snippetRunner";

// 1) Betöltjük a naptárakat (snippeteket) a src/calendar mappából
const CALENDAR_FOLDER = path.join(__dirname, "calendars");
const registry = loadCalendars(CALENDAR_FOLDER);

// 2) Példányosítunk egy SnippetRunner-t
const snippetRunner = new SnippetRunner(registry);

// 3) Express app
const app = express();
app.use(cors());
app.use(express.json());

/**
 *  GET /calendars
 *    -> visszaadja a naptárak listáját (azaz a registry kulcsait)
 */
app.get("/calendars", (req: Request, res: Response) => {
  const calendarNames = Object.keys(registry);
  res.json({ calendars: calendarNames });
});

/**
 *  GET /calendars/:calendarName
 *    -> visszaadja az adott naptár snippetjeinek listáját
 */
app.get("/calendars/:calendarName", (req: Request, res: Response) => {
  const { calendarName } = req.params;
  const cal = registry[calendarName];
  if (!cal) {
    return res.status(404).json({ error: `Calendar not found: ${calendarName}` });
  }
  const snippetNames = Object.keys(cal);
  res.json({ calendar: calendarName, snippets: snippetNames });
});

/**
 *  GET /calendars/:calendarName/evaluate?rule=RULE&date=YYYY-MM-DD
 *    -> lefuttatja a snippetet a megadott naptárban,
 *       date paramétert átadja a context-be
 */
app.get("/calendars/:calendarName/evaluate", (req: Request, res: Response) => {
  const { calendarName } = req.params;
  const { rule, date } = req.query;
  if (!rule || !date) {
    return res.status(400).json({ error: "Missing query param 'rule' or 'date'." });
  }

  const cal = registry[calendarName];
  if (!cal) {
    return res.status(404).json({ error: `Calendar not found: ${calendarName}` });
  }

  try {
    const dateObj = new Date(date.toString());
    const result = snippetRunner.runSnippet(
      calendarName,
      rule.toString(),
      { date: dateObj } // context
    );
    console.log(result);
    res.json({ result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Indítsuk a szervert
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Calendar REST server listening on port ${PORT}...`);
});
