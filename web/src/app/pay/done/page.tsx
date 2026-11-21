import { Suspense } from "react";
import { confirmCheckout } from "@/server/packages/checkout";
import { Mark } from "@/ui/mark";

export const metadata = { title: "Payment · Listora" };

// Where Stripe sends the buyer back. Plain, outside the dashboard.
export default function PaymentDonePage({
  searchParams,
}: PageProps<"/pay/done">) {
  return (
    <main className="bg-ground grid min-h-dvh place-items-center p-6">
      <div className="bg-surface rounded-sheet border-line w-full max-w-sm border p-8 text-center">
        <div className="mb-6 flex justify-center">
          <Mark size={28} />
        </div>
        {/* The outcome is in the address, which is only known per request. */}
        <Suspense>
          <Outcome searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Outcome({
  searchParams,
}: {
  searchParams: PageProps<"/pay/done">["searchParams"];
}) {
  const { session_id: sessionId } = await searchParams;
  if (typeof sessionId !== "string") {
    return (
      <Message title="Payment cancelled">
        Nothing was charged. You can close this page and go back to the app.
      </Message>
    );
  }

  return (await confirmCheckout(sessionId)) ? (
    <Message title="Payment received">
      Your package is in the app now. You can close this page.
    </Message>
  ) : (
    <Message title="Waiting for Stripe">
      Stripe hasn&apos;t confirmed this payment yet. If you paid, the package
      shows up in the app as soon as it does.
    </Message>
  );
}

function Message({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <>
      <h1 className="text-title font-semibold tracking-[-0.01em]">{title}</h1>
      <p className="text-muted mt-2">{children}</p>
    </>
  );
}
