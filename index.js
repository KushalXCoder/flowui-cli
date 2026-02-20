#!/usr/bin/env node

import { program } from "commander";
import axios from "axios";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import util from "util";

const execPromise = util.promisify(exec);

const FLOWUI_REPO_RAW_BASE = "https://raw.githubusercontent.com/KushalXCoder/flowui/main/";
const REGISTRY_URL = `${FLOWUI_REPO_RAW_BASE}public/flow/registry.json`;

program
  .name("theflowui")
  .description("This is the official CLI for the FlowUI library.")
  .version("1.0.0");

program
  .command("add <components...>")
  .description("Add one or more FlowUI components to your project")
  .action(async (components) => {
    try {
      console.log("Fetching registry...");
      const { data: registry } = await axios.get(REGISTRY_URL);

      // Ensure components folder exists in user's project
      const targetDir = path.join(process.cwd(), "components/flowui");
      await fs.ensureDir(targetDir);

      for (const compName of components) {
        const comp = registry.items.find(c => c.name === compName);
        if (!comp) {
          console.log(`Component "${compName}" not found in registry.`);
          continue;
        }

        const filePath = comp.files.path || comp.path;
        const type = "tsx";

        const url = `${FLOWUI_REPO_RAW_BASE}${filePath}`;
        console.log(`Fetching "${compName}" from ${url}...`);

        try {
          const response = await axios.get(url);
          const localPath = path.join(targetDir, `${compName}.${type}`);

          // Save component file locally    
          await fs.writeFile(localPath, response.data);
          console.log(`"${compName}" saved to ${localPath}`);

          // Install dependencies if any
          if (comp.dependencies?.length) {
            console.log(
              `Installing dependencies for "${compName}": ${comp.dependencies.join(
                ", "
              )}`
            );
            await execPromise(
              `npm install ${comp.dependencies.join(" ")} --save`
            );
          }
        } catch (err) {
          console.log(`Failed to fetch "${compName}" from repo.`);
        }
      }

      console.log("\n Components added successfully!");
    } catch (err) {
      console.log("Failed to fetch registry or process components.", err);
    }
  });

program.parse(process.argv);