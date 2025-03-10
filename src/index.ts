import express, { Request, Response } from "express";
import cors from "cors";
import path from "path";
import * as fs from "fs";
import { parse, format,isValid } from "date-fns";
import { loadCalendarsWithHashCheck } from "./calendarLoader";
import { SnippetRunner } from "./snippetRunner";
import { error } from "console";

const CALENDAR_FOLDER = path.join(__dirname, "calendars");
const CONFIG_PATH = path.join(__dirname, "config.json");
const HASH_PATH = path.join(__dirname, "hash.json");
const registry = loadCalendarsWithHashCheck(CALENDAR_FOLDER, HASH_PATH);
const snippetRunner = new SnippetRunner(registry);

function isDateMatchingFormat(dateString: string, formatString: string): boolean {
    const parsedDate = parse(dateString, formatString, new Date());
    return isValid(parsedDate) && format(parsedDate, formatString) === dateString;
}
function isDateMatchingAnyFormat(dateString: string, formats: string[]): boolean {
    return formats.some((formatStr) => isDateMatchingFormat(dateString, formatStr));
}
const isBoolean = (value: any): boolean => typeof value === "boolean";
const isDate = (value: any): boolean => value instanceof Date;

// Read config
const rawData = fs.readFileSync(CONFIG_PATH, "utf8");
const config: Record<string, any> = JSON.parse(rawData);

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
    const snippet = cal[rule.toString()];
    if (!snippet) {
        return res.status(404).json({ error: `Rule not found: ${rule}` });
    }
    let dparam = date;
    if (!Array.isArray(dparam)) {
        dparam = dparam ? [dparam] : [];
    }
    let converted: Date[] = [];
    for(const d of dparam) {
        if(!isDateMatchingAnyFormat(d.toString(), config.valid_input_formats)) {
            return res.status(400).json({error: `Invalid input date '${d}'`});
        }
        converted.push(new Date(d.toString()));
    };

    const result = snippetRunner.runSnippet(
        calendarName,
        rule.toString(),
        { date: converted } // context
    );
    let rconverted:string[] = [];
    result.forEach((r:any) => {
        if(isBoolean(r)){
            rconverted.push(r);
        }
        if(isDate(r)){
            rconverted.push(format(r, config.valid_output_format));
        }
    })

    console.log(rconverted);
    res.json({ result: rconverted });
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Calendar REST server listening on port ${PORT}...`);
});
