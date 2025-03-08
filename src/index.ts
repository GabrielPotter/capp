import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";

import { loadCalendarsWithHashCheck } from "./calendarLoader";
import { SnippetRunner } from "./snippetRunner";

const CALENDAR_FOLDER = path.join(__dirname, "calendars");
const CONFIG_PATH = path.join(__dirname, "config.json");
const HASH_PATH = path.join(__dirname,"hash.json")
const registry = loadCalendarsWithHashCheck(CALENDAR_FOLDER, HASH_PATH);
const snippetRunner = new SnippetRunner(registry);

const app = express();
app.use(cors());
app.use(express.json());

app.get("/calendars", (req: Request, res: Response) => {
    const calendarNames = Object.keys(registry);
    res.json({ calendars: calendarNames });
});

app.get("/calendars/:calendarName", (req: Request, res: Response) => {
    const { calendarName } = req.params;
    const cal = registry[calendarName];
    if (!cal) {
        return res.status(404).json({ error: `Calendar not found: ${calendarName}` });
    }
    const snippetNames = Object.keys(cal);
    res.json({ calendar: calendarName, snippets: snippetNames });
});

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

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Calendar REST server listening on port ${PORT}...`);
});
