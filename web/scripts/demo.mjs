// Everything the demo needs, in one terminal: fresh demo data, then the
// server and the scheduled jobs side by side. Stop both with Ctrl+C.
//
//   npm run demo
//
// MongoDB must be up first: docker compose up -d
import { spawn } from "node:child_process";

const run = (command, name) =>
  spawn(command, { shell: true, stdio: ["ignore", "pipe", "pipe"] }).on(
    "spawn",
    () => console.log(`[${name}] ${command}`),
  );

function prefix(child, name) {
  for (const stream of [child.stdout, child.stderr]) {
    stream.setEncoding("utf8");
    stream.on("data", (chunk) => {
      for (const line of chunk.split(/\r?\n/)) {
        if (line.trim()) console.log(`[${name}] ${line}`);
      }
    });
  }
  return child;
}

const seed = prefix(run("npm run seed", "seed"), "seed");
const seeded = await new Promise((resolve) => seed.on("exit", resolve));
if (seeded !== 0) {
  console.error(
    "Seeding failed. Is MongoDB running? Try: docker compose up -d",
  );
  process.exit(1);
}

const children = [
  prefix(run("npm run dev", "web"), "web"),
  prefix(run("npm run cron", "cron"), "cron"),
];

const stop = () => {
  for (const child of children) child.kill();
  process.exit(0);
};
process.on("SIGINT", stop);
process.on("SIGTERM", stop);
for (const child of children) child.on("exit", stop);
