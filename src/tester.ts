#!/usr/bin/env node

import path from "path";
import fs from "fs";
import { loadCalendars } from "./calendarLoader";
import { SnippetRunner } from "./snippetRunner";
import { generateCalendarHash } from "./hashUtil";
import { ConfigCalendar } from "./models";
import { Command } from "commander";

interface TestCase {
    snippetName: string;
    date: string;
    expected: any;
}
interface TestDesc {
    calendarName: string;
    tests: TestCase[];
}

const params = new Command();

params
    .version("1.0.0")
    .description("Calendar tester")
    .requiredOption("-c, --calendar <calendar_path>", "Specify calendar folder")
    .requiredOption("-t, --test <test_path>", "Specify test folder")
    .requiredOption("-f, --config <config_path> ", "Specify config path");

params.parse(process.argv);
const options = params.opts();

const CALENDAR_FOLDER = path.join(process.cwd(), options.calendar);
const TEST_FOLDER = path.join(process.cwd(), options.test);
const registry = loadCalendars(CALENDAR_FOLDER);
const runner = new SnippetRunner(registry);

function main() {
    const files = fs.readdirSync(TEST_FOLDER).filter((f) => f.endsWith(".json") && f.startsWith("test_"));
    let errCt = 0;
    for (const file of files) {
        const fullPath = path.join(TEST_FOLDER, file);
        const rawTestCases = fs.readFileSync(fullPath, "utf8");
        const testCases: TestDesc = JSON.parse(rawTestCases);
        console.log(`=== Running ${testCases.tests.length} test case(s) ===`);
        for (let i = 0; i < testCases.tests.length; i++) {
            const tc = testCases.tests[i];
            const { snippetName, date, expected } = tc;
            console.log(`Test #${i + 1}: ${testCases.calendarName}.${snippetName} on ${date}, expecting: ${expected}`);
            const dateObj = new Date(date);
            let result;
            try {
                result = runner.runSnippet(testCases.calendarName, snippetName, { date: dateObj });
            } catch (err: any) {
                console.error(`  ERROR: snippet execution threw: ${err.message}`);
                errCt++;
            }
            if (result !== expected) {
                console.error(`  FAIL: got '${result}', but expected '${expected}'`);
                errCt++;
            }
            console.log("  OK");
        }
    }
    if (errCt !== 0) {
        console.error(`Test ${errCt} failed`);
        process.exit(1);
    }
    const calendarNames = Object.keys(registry);
    const config: {
        calendars: ConfigCalendar[];
    } = { calendars: [] };
    calendarNames.forEach((name) => {
        const hash = generateCalendarHash(registry[name]);
        config.calendars.push({ calendarName: name, hash: hash });
    });

    console.log(`All tests passed successfully!`);
    console.log(`Calendars content hash: ${JSON.stringify(config, null, 4)}`);
}

main();
