import { requireUser, route } from "@/server/http";
import { type AppEvent, ready, subscribe } from "@/server/realtime/hub";

const encoder = new TextEncoder();

/**
 * Server-sent events for the signed-in person: new messages, conversation
 * changes and notifications, for as long as the app keeps it open.
 */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  let stop = () => {};

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (text: string) => {
        try {
          controller.enqueue(encoder.encode(text));
        } catch {
          stop();
        }
      };
      const send = (event: AppEvent) =>
        write(`event: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`);

      const unsubscribe = subscribe(user.id as string, send);
      // Phones and proxies drop a connection that stays quiet for long.
      const heartbeat = setInterval(() => write(": ping\n\n"), 20_000);
      stop = () => {
        clearInterval(heartbeat);
        unsubscribe();
      };
      request.signal.addEventListener("abort", () => {
        stop();
        try {
          controller.close();
        } catch {
          // Already closed by the other side.
        }
      });
      // From here on nothing is missed, so this is when the app fetches
      // whatever changed while it was away.
      void ready().then(() => write("event: ready\ndata: {}\n\n"));
    },
    cancel() {
      stop();
    },
  });

  return new Response(body, {
    headers: {
      "content-type": "text/event-stream; charset=utf-8",
      // no-transform keeps compression from holding events back.
      "cache-control": "no-cache, no-transform",
    },
  });
});
