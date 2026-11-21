# Listora app

The Android app for Listora, a classifieds marketplace for the US. People browse and search listings, post their own, chat with sellers and make offers, and buy listing and featured packages. It is built with Flutter, Riverpod, go_router and dio, and talks to the API that `../web` serves under `/api/v1`.

## Running

You need Flutter 3.47+ and the API running on port 3100. The README at the project root shows how to start it.

On an Android emulator:

```bash
flutter run
```

The app reaches the API at `http://10.0.2.2:3100`, the emulator's address for the host machine. To point it elsewhere, pass `--dart-define=API_BASE_URL=<url>/api/v1`.

## Checks

```bash
flutter analyze && flutter test
```

The widget tests include golden images, kept in `test/goldens`.

The end-to-end tests drive the app on an emulator against the running API, on freshly seeded data:

```bash
flutter test integration_test
```

The emulator sometimes stalls when all the files run in one go. Running them one at a time is reliable:

```bash
for f in integration_test/*_test.dart; do flutter test "$f"; done
```

## Screenshots

`integration_test/screenshot_tour.dart` signs in as the seeded seller and saves each main screen to `../design/screens/app`. Seed the database, start the server, then on the emulator:

```bash
flutter drive --driver=test_driver/integration_test.dart --target=integration_test/screenshot_tour.dart --dart-define=TOUR_PASSWORD=<SEED_PASSWORD>
```

Switch the emulator to dark mode and add `--dart-define=TOUR_MODE=dark` for the dark set.
