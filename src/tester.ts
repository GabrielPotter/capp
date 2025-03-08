import path from "path";
import fs from "fs";
import { loadCalendars } from "./calendarLoader";
import { SnippetRunner } from "./snippetRunner";
import { generateCalendarHash } from "./hashUtil";

interface TestCase {
  snippetName: string;
  date: string;
  expected: any;
}
interface TestDesc {
  calendarName: string;
  tests: TestCase[];
}

const CALENDAR_FOLDER = path.join(__dirname, "calendars");
const registry = loadCalendars(CALENDAR_FOLDER);
const runner = new SnippetRunner(registry);
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
  const hash = generateCalendarHash(registry[testCases.calendarName]);
  console.log(`All ${testCases.tests.length} tests passed successfully!`);
  console.log(`${testCases.calendarName} calendar content hash: ${hash}`);
}

main();
