#!/usr/bin/env node

import path from "path";
import { Command } from "commander";
import { startServer } from "./server";

const program = new Command();

program
    .version("1.0.0")
    .description("Calendar REST API server")
    .requiredOption("-c, --calendar <calendar_path>", "Folder containing calendar JSON + snippet files")
    .requiredOption("--config <config_path>", "Path to config.json (date format validation rules)")
    .requiredOption("-h, --hash <hash_dir>", "Folder containing hash.json")
    .option("-p, --port <port>", "Port to listen on", "3000");

program.parse(process.argv);
const options = program.opts();

startServer({
    calendarFolder: path.resolve(process.cwd(), options.calendar),
    configPath: path.resolve(process.cwd(), options.config),
    hashPath: path.join(path.resolve(process.cwd(), options.hash), "hash.json"),
    port: parseInt(options.port, 10),
});
