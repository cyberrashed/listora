# Listora

A classifieds marketplace for the US market: an Android app built with Flutter, and a Next.js back office that also serves the app's API. Data lives in MongoDB.

The back office and the API run at [listora-xi.vercel.app](https://listora-xi.vercel.app), with the data on MongoDB Atlas.

## What it does

In the app, people:

- browse the latest listings, featured ones and staff banners, by category or by search, narrowed by price, by the category's own details (mileage, size, storage...) and by distance from a city, a ZIP code or where the phone is;
- post a listing in six steps, with up to 10 photos and questions that depend on the category, and follow it from review to sold;
- chat with sellers in real time, make offers the seller accepts or declines, and get Android notifications for messages, offers and review decisions;
- save listings, follow and review sellers, report what breaks the rules, block people, and ask to be verified;
- buy listing and featured packages on Stripe (test mode), beyond three free listings a month.

In the dashboard, staff:

- work the review queue and take listings down;
- settle reports, hide reviews, verify sellers, suspend accounts, and read a reported chat (each read is logged);
- edit categories and their fields, packages, home-screen banners, help pages, the blog and the marketplace settings, including maintenance mode and a forced app update;
- send notifications to every customer or to one;
- see the numbers on the Overview, payments, and every decision the team made in the activity log.

Every staff action goes through roles and permissions, checked in the service that does the work, not only in the page that shows the button.

## How it is built

- Next.js route handlers serve the app (`/api/v1`) and server components run the dashboard. Both call the same services in `web/src/server`, which hold every rule and are tested against a real MongoDB.
- Photos go to S3 through the server. The app sends each photo as it is picked. The server turns it upright, drops the camera's metadata (including where it was taken), makes two WebP sizes and stores them in a private bucket, with a key that can reach that bucket and nothing else. The API serves them with year-long caching, since a photo never changes under its address. The scheduled job clears photos uploaded for a listing that was never posted.
- Real time needs no third-party service. Each signed-in phone keeps one server-sent events connection, and a single MongoDB change stream per server process routes new messages, conversation changes and notifications to whoever is connected. After a dropped connection the app fetches what it missed.
- Prices are whole cents. Each package credit is spent with one conditional update, so two posts at once can't spend the same credit. A package is handed over only when Stripe confirms the payment, and only once, however many times the confirmation arrives.
- The listing lifecycle is a small state machine (`web/src/server/listings/lifecycle.ts`), and nothing else in the code changes a listing's status.
- The dashboard and the app share colours from one set of tokens (`design/tokens.json`), generated into CSS and Dart. The dashboard screens were checked at phone, tablet and desktop widths, and the screenshots are in `design/screens`.

## Screenshots

- `design/screens/app` walks through the app as a seller, in light and dark: browsing, filters, a listing, a seller's profile, chats with an offer, posting, packages and notifications.
- `design/screens/dashboard` has the main dashboard screens, from the Overview to the activity log, and the Overview on a phone.

The app set is taken by a script, so it can be retaken after a change. Seed the database, start the server, then on the emulator:

```bash
cd mobile
flutter drive --driver=test_driver/integration_test.dart --target=integration_test/screenshot_tour.dart --dart-define=TOUR_PASSWORD=<SEED_PASSWORD>
```

Switch the emulator to dark mode and add `--dart-define=TOUR_MODE=dark` for the dark set.

## Layout

- `web/` is the Next.js project: the admin dashboard, the `/api/v1` routes the app calls, and the services in `web/src/server` that both go through.
- `mobile/` is the Flutter app.
- `design/` holds the colour tokens both projects are generated from, and the screenshots.

US cities and ZIP codes come from Census Bureau files (public domain). The processed data is checked in under `web/src/seed/data`, and `web/scripts/build-places.mjs` rebuilds it.

## Running locally

You need Node 22+, Flutter 3.47+ and Docker.

Start MongoDB. It runs as a single-node replica set, which change streams require:

```bash
docker compose up -d
```

Set up the web project:

```bash
cd web
cp .env.example .env.local
npm install
```

Edit `.env.local`: give `JWT_SECRET` at least 32 random characters and `CRON_SECRET` at least 16, and choose a `SEED_PASSWORD`. Then load the demo data and start the server on port 3100:

```bash
npm run seed
```

```bash
npm run dev
```

Or do both, plus the scheduled jobs, in one terminal (MongoDB must be up):

```bash
npm run demo
```

Run the app on an Android emulator:

```bash
cd mobile
flutter run
```

The app reaches the API at `http://10.0.2.2:3100`, the emulator's address for the host machine. To point it elsewhere, pass `--dart-define=API_BASE_URL=<url>/api/v1`.

To try it on a phone, build an APK that points at your computer on the same Wi-Fi, then install `mobile/build/app/outputs/flutter-apk/app-release.apk`:

```bash
flutter build apk --release --dart-define=API_BASE_URL=http://<your-computer-ip>:3100/api/v1
```

The computer's firewall has to let the phone reach port 3100. The release build is signed with the debug key, which is fine for sideloading but not for the Play Store.

## Signing in

`npm run seed` resets the database to a known state. Every seeded account uses the `SEED_PASSWORD` from `.env.local`.

| Where | Email | Role |
| --- | --- | --- |
| Dashboard | `priya.raman@listora.test` | Owner, can do everything |
| Dashboard | `marcus.bell@listora.test` | Moderator: reviews listings, handles reports, reviews and verification |
| Dashboard | `elena.vasquez@listora.test` | Support: sees customers, payments and the email log |
| App | `dana.whitfield@mailbox.example` | Customer |

## Photos

Photos are stored in an Amazon S3 bucket. Create a private bucket and an IAM user whose policy allows `s3:PutObject`, `s3:GetObject` and `s3:DeleteObject` on that bucket only, then add the bucket and the user's key to `web/.env.local`:

```bash
AWS_REGION=us-east-1
S3_BUCKET=your-bucket-name
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
```

Without them everything else works, and adding a photo says storage isn't set up.

## Email and notifications

No email is really sent. Each message the system would send is recorded and shown under Notifications in the dashboard, which is where a password reset code can be read.

Push notifications work the same way, without Firebase: the app keeps one live connection to `/api/v1/events` while someone is signed in, and shows Android notifications itself when a message, an offer or a review decision arrives. On Android 13 and later, open Chats and tap Turn on to allow them.

## Scheduled jobs

Listings end after 30 days, and sellers get a heads-up three days before. Photos uploaded for a listing that was never posted are deleted after a day. A job does this on `/api/cron/run`, protected by `CRON_SECRET` in `.env.local`. Locally, keep this running next to the server:

```bash
cd web && npm run cron
```

The job only touches what is due, so running it more often does no harm. On Vercel, `web/vercel.json` runs it once a day.

## Payments

Every account posts 3 listings a month for free. Packages sell more listings, or put listings on top (Featured), and are paid by card on Stripe in test mode. Without Stripe keys everything else works, and buying says payments aren't set up.

To turn payments on, add the secret test key from your Stripe dashboard to `web/.env.local`:

```bash
STRIPE_SECRET_KEY=sk_test_...
```

Pay with the test card `4242 4242 4242 4242`, any future date and any CVC. The package is handed over only once Stripe confirms the payment. The server asks Stripe when the buyer lands back on the payment page, and also listens on a signed webhook. Whichever comes first hands the package over, and the other finds it done.

The webhook isn't needed locally. To try it anyway, forward Stripe's events with the Stripe CLI, and put the `whsec_` secret it prints in `.env.local` as `STRIPE_WEBHOOK_SECRET`:

```bash
stripe listen --forward-to localhost:3100/api/webhooks/stripe
```

## Checks

The web tests run against the MongoDB container, in a separate `listora_test` database:

```bash
cd web && npm run lint && npm run typecheck && npm test
```

```bash
cd mobile && flutter analyze && flutter test
```

The dashboard has browser tests that run in the installed Chrome against the dev server. They reseed the database first:

```bash
cd web && npm run test:e2e
```

The app has end-to-end tests that drive it on an emulator against the running API, on freshly seeded data:

```bash
cd mobile && flutter test integration_test
```

The emulator sometimes stalls when all the files run in one go. Running them one at a time is reliable:

```bash
cd mobile && for f in integration_test/*_test.dart; do flutter test "$f"; done
```
