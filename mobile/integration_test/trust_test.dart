// Runs on an emulator against the local API, on freshly seeded data:
//
//   flutter test integration_test
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:listora/main.dart' as app;

import 'wait_for.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('a buyer follows a verified seller and reports a listing', (
    tester,
  ) async {
    final email = 'sam.${DateTime.now().millisecondsSinceEpoch}@example.com';

    app.main();
    await waitFor(tester, find.text('Latest listings'));
    await tester.tap(find.text('Account'));
    await waitFor(tester, find.text('Create an account'));
    await tester.tap(find.text('Create an account'));
    await waitFor(tester, find.text('Create account'));
    for (final (index, value) in [
      'Sam Delgado',
      email,
      'integration test pass',
    ].indexed) {
      await tester.enterText(find.byType(TextField).at(index), value);
    }
    await tester.tap(find.text('Create account'));
    await waitFor(tester, find.text('Sign out'));

    await tester.tap(find.text('Browse'));
    await waitFor(tester, find.text('Search listings'));
    await tester.tap(find.text('Search listings'));
    await waitFor(tester, find.text('Filters'));
    await tester.enterText(find.byType(TextField), 'civic');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await waitFor(tester, find.text('2015 Honda Civic LX, one owner'));
    await tester.tap(find.text('2015 Honda Civic LX, one owner'));

    // Dana is verified in the seed, and has a review.
    await waitFor(tester, find.text('Message seller'));
    await scrollTo(tester, find.text('Dana Whitfield'));
    await tester.tap(find.text('Dana Whitfield'));
    await waitFor(tester, find.text('Follow'));
    expect(find.text('Verified'), findsOneWidget);
    expect(find.text('3.0 · 1 review'), findsOneWidget);
    await tester.tap(find.text('Follow'));
    await waitFor(tester, find.text('Following'));

    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.text('Message seller'));
    await tester.tap(find.byTooltip('More'));
    await waitFor(tester, find.text('Report listing'));
    await tester.tap(find.text('Report listing'));
    await waitFor(tester, find.text('Send report'));
    await tester.tap(find.text('Wrong price or details'));
    await tester.pump();
    await tester.tap(find.text('Send report'));
    await waitFor(tester, find.text("Thanks. We'll take a look."));

    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.text('Filters'));
    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.text('Latest listings'));
    await tester.tap(find.text('Account'));
    await waitFor(tester, find.text('Following'));
    await tester.tap(find.text('Following'));
    await waitFor(tester, find.text('Dana Whitfield'));
  });
}
