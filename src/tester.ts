#!/usr/bin/env node

import path from "path";
import fs from "fs";
import { loadCalendars } from "./calendarLoader";
import { SnippetRunner } from "./snippetRunner";
import { generateCalendarHash } from "./hashUtil";
import { ConfigCalendar } from "./models";
import { Command } from "commander";
import { format } from "date-fns";

interface TestCase {
    snippetName: string;
    date: string[];
    expected: any[];
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
    .requiredOption("-h, --hash <hash_path> ", "Specify path of hash.json");

params.parse(process.argv);
const options = params.opts();

const CALENDAR_FOLDER = path.join(process.cwd(), options.calendar);
const TEST_FOLDER = path.join(process.cwd(), options.test);
const HASH_KEYS_FILE = path.join(process.cwd(), options.hash, "hash.json");
const registry = loadCalendars(CALENDAR_FOLDER);
const runner = new SnippetRunner(registry);

const isBoolean = (value: any): boolean => typeof value === "boolean";
const isDate = (value: any): boolean => value instanceof Date;

function arraysAreEqual(arr1: (string | boolean)[], arr2: (string | boolean)[]): boolean {
    if (arr1.length !== arr2.length) return false;
    return arr1.every((value, index) => value === arr2[index]);
}

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
            const dateObj: Date[] = [];
            date.forEach((element) => {
                dateObj.push(new Date(element));
            });
            let result;
            try {
                result = runner.runSnippet(testCases.calendarName, snippetName, { date: dateObj });
            } catch (err: any) {
                console.error(`  ERROR: snippet execution threw: ${err.message}`);
                errCt++;
            }
            const converted:(string|boolean)[] = [];
            result.forEach((element: any) => {
                if (isDate(element)) {
                    converted.push(format(element, "yyyy-MM-dd"));
                } else {
                    converted.push(element);
                }
            });

            if (!arraysAreEqual(converted,expected)) {
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
    const hashKeys = JSON.stringify(config, null, 4);
    //console.log(`Calendars content hash: ${secure}`);
    fs.writeFileSync(HASH_KEYS_FILE, hashKeys, "utf8");
    console.log(`Hash keys written to ${HASH_KEYS_FILE}`);
}

main();
