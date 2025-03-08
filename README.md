# capp

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
3. [Calendars and Snippets](#calendars-and-snippets)  
   - [Calendar JSON Example](#calendar-json-example)  
   - [Snippet JS Example](#snippet-js-example)  
4. [Config File and Hashes](#config-file-and-hashes)  
5. [Express REST Server](#express-rest-server)  
   - [Routes Overview](#routes-overview)  
6. [Generating and Validating Hashes](#generating-and-validating-hashes)  
7. [Running the Project](#running-the-project)  
   - [Local Development](#local-development)  
   - [Testing Calendars](#testing-calendars)  

---

## Project Structure

- The `src/calendar/` directory serves testing and demo purposes, containing multiple .json files (one per calendar), along with the .js snippet files referenced by each JSON.
- The `src/tests/` folder contains test .json files used for testing the calendars. The tester application utilizes these files to validate the calendars. See the [Tester Application](#tester-application) section for more details.
- The `src/scripts/` folder contains Bash scripts for testing the application via the REST API. These scripts use curl commands to test the API endpoints and also serve as documentation for REST API calls.
- The `config.json` file defines the validation rules for date-type data when making REST API calls and specifies the date format conversion in the API responses.
- The `hash.json` file contains the hash keys for validated calendars.

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
## Calendar JSON Example
Inside the /calendars/ folder, each .json file represents a calendar. The calendar descriptor includes the calendar name and references to the JavaScript snippet files associated with the calendar.

Each reference consists of:

- A symbolic name (rule name) used to refer to the rule.
- A file name pointing to the .js file that contains the corresponding rule snippet code.

```json
{
    "name": "tc1",
    "rules": [
        {
            "name": "workdays",
            "file": "workdays.js"
        },
        {
            "name": "tc1_holidays",
            "file": "tc1_holidays.js"
        },
        {
            "name": "tc1_workdays",
            "file": "tc1_workdays.js"
        },
        {
            "name": "next_workday",
            "file": "next_workday.js"
        }
    ]
}
```

### Snippet JS Example

A typical snippet file: `snipet.js`:

```js
function rule(context) {
  ... snipet body code ...
  return return value;
}
return rule(context);
```

> Notice we do a final `return rule(context)` so that `eval` ultimately has a non-undefined value.

> you can examine a lot of example snipets in `src/calendar`

Naming conventions

---

## Config File and Hashes

A `config.json` might look like:

```json
{
    "valid_input_formats": [
        "yyyy-MM-dd", "MM/dd/yyyy", "dd/MM/yyyy","yyyy-MM-DDTHH:mm:ss±hh:mm","yyyy-MM-DDTHH:mm:ssZ"
    ],
    "valid_output_format": "yyyy-MM-dd"
}
```

A `hash.json` might look like

```json
{
    "calendars": [
        {
            "calendarName": "tc1",
            "hash": "b5672b3920d796572cb98e8adfc9b458fa14c77f7ebc403c1bf2b675f5abfff4"
        }
    ]
}
```
- Each object has the **calendarName** and **hash** that your tester previously generated and stored.  
- If the loaded calendar’s hash does not match, the loader excludes it.

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
> Examples of REST API calls can be found in the `src/tests/` folder.
---

## Generating and Validating Hashes

The tester application allows verifying whether the rules (snippets) written for each calendar function correctly.
```bash
bin/tester-linux -c ./src/calendars -t ./src/tests -s ./src 
```
- -c --calendar <calendar_path> The folder where the JSON files describing the calendars and their corresponding JavaScript snippet files are located.
- -t --test <tester_path> The folder where the test files are located.
- -h --hash <hash_folder> The folder where the hash.json file located.

Run the tester application with the prepared calendars and test files. The application reads all test files from the tests folder and executes all test steps.

- If a test fails, an error will be logged in the console.
- If all tests pass successfully, the application generates a verification hash key for each calendar found in the calendar_path folder.
- The generated hash keys are written to the hash.json file inside the hash_folder.

**Final Steps**

- If everything is correct, copy the contents of calendar_path into the application's calendars/ folder.
- Move the hash.json file from hash_folder to the application's root directory.

Start the application. 
``` bash
node <app root folder>/index.js
```

When the server starts, it calls `loadCalendarsWithHashCheck`, which re-generates the hash in exactly the same manner. If mismatched, that calendar is not stored in the registry.

---

## Running the Project

### Local Development

1. **Build**:
   ```bash
   npm run build
   ```
   This compiles TypeScript into `dist/`.

   Compiles tester into `/bin`

2. **Run the server**:
   ```bash
   node dist/index.js
   ```
   By default, it listens on port `3000`. Check console logs for messages.

### Testing Calendars

To run the CLI tester:
```bash
bin/tester_linux --help
```

