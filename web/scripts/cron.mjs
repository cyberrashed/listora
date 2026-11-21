// Runs the scheduled jobs on the local server once a minute, the way a
// hosted scheduler would. Needs CRON_SECRET in .env.local.
//
//   npm run cron
const url = `${process.env.CRON_URL ?? "http://localhost:3100"}/api/cron/run`;
const secret = process.env.CRON_SECRET;
if (!secret) throw new Error("Set CRON_SECRET in .env.local first.");

async function tick() {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { authorization: `Bearer ${secret}` },
    });
    const body = await response.json();
    console.log(new Date().toLocaleTimeString(), response.status, body);
  } catch (error) {
    console.error(
      new Date().toLocaleTimeString(),
      "unreachable:",
      error.message,
    );
  }
}

await tick();
setInterval(tick, 60_000);
