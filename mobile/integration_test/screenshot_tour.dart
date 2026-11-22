// A walk through the app as Dana, the seeded seller, taking a screenshot of
// each main screen. Not a test: run it with flutter drive (see
// test_driver/integration_test.dart) on freshly seeded data.
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:listora/main.dart' as app;

import 'wait_for.dart';

const _password = String.fromEnvironment('TOUR_PASSWORD');
// "dark" when the emulator is in dark mode, so both sets can sit side by side.
const _mode = String.fromEnvironment('TOUR_MODE', defaultValue: 'light');

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('screenshot tour', (tester) async {
    var count = 0;
    Future<void> shot(String name) async {
      // Let images, fonts and the last animation settle.
      for (var frame = 0; frame < 10; frame++) {
        await tester.pump(const Duration(milliseconds: 100));
      }
      count++;
      await binding.takeScreenshot(
        '${count.toString().padLeft(2, '0')}-$name-$_mode',
      );
    }

    Future<void> back() async {
      await tester.pageBack();
      await tester.pump(const Duration(milliseconds: 600));
    }

    app.main();
    await binding.convertFlutterSurfaceToImage();
    await waitFor(tester, find.text('Latest listings'));
    await waitFor(tester, find.text('Featured'));
    await shot('browse');

    // Signed in as Dana from here on.
    await tester.tap(find.text('Account'));
    await waitFor(tester, find.widgetWithText(FilledButton, 'Sign in'));
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await waitFor(tester, find.text('Welcome back.'));
    await tester.enterText(
      find.byType(TextField).at(0),
      'dana.whitfield@mailbox.example',
    );
    await tester.enterText(find.byType(TextField).at(1), _password);
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await waitFor(tester, find.text('Sign out'));
    await shot('account');

    await tester.tap(find.text('Browse'));
    await waitFor(tester, find.text('Vehicles'));
    await tester.tap(find.text('Vehicles'));
    await waitFor(tester, find.text('Cars & Trucks'));
    await tester.tap(find.text('Cars & Trucks'));
    await waitFor(tester, find.text('2021 Tesla Model 3 Standard Range Plus'));
    await shot('cars');

    await tester.tap(find.text('Filters'));
    await waitFor(tester, find.text('Manual'));
    await tester.tap(find.text('Automatic'));
    await shot('filters');
    await back();
    await back();
    await back();

    await waitFor(tester, find.text('Latest listings'));
    await tester.tap(find.text('Search listings'));
    await waitFor(tester, find.text('Filters'));
    await tester.enterText(find.byType(TextField), 'bike');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await waitFor(tester, find.text('Specialized Allez road bike, 56 cm'));
    await tester.tap(find.text('Specialized Allez road bike, 56 cm'));
    await waitFor(tester, find.text('Message seller'));
    await shot('listing');

    await scrollTo(tester, find.text('Wyatt Lindgren'));
    await tester.tap(find.text('Wyatt Lindgren'));
    await waitFor(tester, find.textContaining('On Listora since'));
    await shot('seller');
    await back();
    await back();
    await back();

    await waitFor(tester, find.text('Latest listings'));
    await tester.tap(find.text('Chats'));
    await waitFor(tester, find.text('Selling'));
    // "Selling" is both the chats' segment (first) and the bottom tab (last).
    await tester.tap(find.text('Selling').first);
    await waitFor(tester, find.text('Miguel Ortega'));
    await shot('chats');

    await tester.tap(find.text('Miguel Ortega'));
    await waitFor(tester, find.text('Accept'));
    await shot('conversation');
    await back();

    await tester.tap(find.text('Selling').last);
    await waitFor(tester, find.text('Post a listing'));
    await shot('selling');

    await tester.tap(find.text('2015 Honda Civic LX, one owner'));
    await waitFor(tester, find.textContaining('Live until'));
    await shot('own-listing');
    await back();

    await tester.tap(find.text('Post a listing'));
    await waitFor(tester, find.text('What are you selling?'));
    await tester.tap(find.text('Vehicles'));
    await waitFor(tester, find.text('Cars & Trucks'));
    await tester.tap(find.text('Cars & Trucks'));
    await waitFor(tester, find.text('Describe it'));
    await tester.enterText(
      find.byType(TextField).at(0),
      '2016 Subaru Forester Premium',
    );
    await tester.enterText(
      find.byType(TextField).at(1),
      'One owner, all-wheel drive, new brakes this summer. Clean title.',
    );
    await tester.enterText(find.byType(TextField).at(2), '14500');
    await tester.tap(find.text('Continue'));
    await waitFor(tester, find.text('Add photos').first);
    await tester.tap(find.text('Continue'));
    await waitFor(tester, find.text('A few details'));
    await shot('post-details');
    await back();
    await back();
    await back();
    await back();

    await waitFor(tester, find.text('Post a listing'));
    await tester.tap(find.text('Account'));
    await waitFor(tester, find.text('Packages'));
    await tester.tap(find.text('Packages'));
    await waitFor(tester, find.text('Get more'));
    await shot('packages');
    await back();

    await tester.tap(find.text('Browse'));
    await waitFor(tester, find.byTooltip('Notifications'));
    await tester.tap(find.byTooltip('Notifications'));
    await waitFor(tester, find.text('Notifications'));
    await waitFor(tester, find.textContaining('Your listing'));
    await shot('notifications');
  });
}
