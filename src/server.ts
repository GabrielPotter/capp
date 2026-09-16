import express, { Request, Response } from "express";
import cors from "cors";
import * as fs from "fs";
import { Server } from "http";
import { parse, format, isValid } from "date-fns";
import { loadCalendarsWithHashCheck } from "./calendarLoader";
import { SnippetRunner } from "./snippetRunner";

export interface ServerOptions {
    /** Folder containing calendar JSON files and their snippet .js files */
    calendarFolder: string;
    /** Path to config.json (date format validation rules) */
    configPath: string;
    /** Path to hash.json (expected calendar content hashes) */
    hashPath: string;
}

function isDateMatchingFormat(dateString: string, formatString: string): boolean {
    const parsedDate = parse(dateString, formatString, new Date());
    return isValid(parsedDate) && format(parsedDate, formatString) === dateString;
}
function isDateMatchingAnyFormat(dateString: string, formats: string[]): boolean {
    return formats.some((formatStr) => isDateMatchingFormat(dateString, formatStr));
}
const isBoolean = (value: any): boolean => typeof value === "boolean";
const isDate = (value: any): boolean => value instanceof Date;

export function createServer(options: ServerOptions): express.Express {
    const registry = loadCalendarsWithHashCheck(options.calendarFolder, options.hashPath);
    const snippetRunner = new SnippetRunner(registry);

    const rawData = fs.readFileSync(options.configPath, "utf8");
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
        const converted: Date[] = [];
        for (const d of dparam) {
            if (!isDateMatchingAnyFormat(d.toString(), config.valid_input_formats)) {
                return res.status(400).json({ error: `Invalid input date '${d}'` });
            }
            converted.push(new Date(d.toString()));
        }

        const result = snippetRunner.runSnippet(calendarName, rule.toString(), { date: converted });
        const rconverted: (string | boolean)[] = [];
        result.forEach((r: any) => {
            if (isBoolean(r)) {
                rconverted.push(r);
            }
            if (isDate(r)) {
                rconverted.push(format(r, config.valid_output_format));
            }
        });

        res.json({ result: rconverted });
    });

    return app;
}

export function startServer(options: ServerOptions & { port?: number }): Server {
    const app = createServer(options);
    const port = options.port ?? 3000;
    return app.listen(port, () => {
        console.log(`Calendar REST server listening on port ${port}...`);
    });
}
