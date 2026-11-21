import { execSync } from "node:child_process";

export default function resetDatabase() {
  execSync("npm run seed", { stdio: "inherit" });
}
