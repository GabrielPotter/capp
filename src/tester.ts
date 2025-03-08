// tester.ts

import path from "path";
import fs from "fs";
import { loadCalendars } from "./calendarLoader";
import { SnippetRunner } from "./snippetRunner";
import { generateCalendarHash } from "./hashUtil"; // a fent készített modul

interface TestCase{
  snippetName: string;
  date: string;
  expected: any;
}
interface TestDesc {
  calendarName: string;
  tests: TestCase[];
}

// 1) Betöltjük a snippeteket
const CALENDAR_FOLDER = path.join(__dirname, "calendars");
const registry = loadCalendars(CALENDAR_FOLDER);
const runner = new SnippetRunner(registry);

// 2) Beolvassuk a testCases.json-t
const testCasesPath = path.join(__dirname, "tests", "testCases.json");
const rawTestCases = fs.readFileSync(testCasesPath, "utf8");
const testCases: TestDesc = JSON.parse(rawTestCases);

function main() {
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
      process.exit(1);
    }

    if (result !== expected) {
      console.error(`  FAIL: got '${result}', but expected '${expected}'`);
      process.exit(1);
    }
    console.log("  OK");
  }

  // Ha minden teszt sikeresen lefutott, generálunk egy hash-t a registry-ről
  const hash = generateCalendarHash(registry[testCases.calendarName]);
  console.log(`All ${testCases.tests.length} tests passed successfully!`);
  console.log(`Calendar content hash: ${hash}`);
}

main();
