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

  testWidgets('a new account starts with free listings and sees packages', (
    tester,
  ) async {
    final email = 'kim.${DateTime.now().millisecondsSinceEpoch}@example.com';

    app.main();
    await waitFor(tester, find.text('Latest listings'));
    // The seed features a few listings; the strip loads on its own.
    await waitFor(tester, find.text('Featured'));

    await tester.tap(find.text('Account'));
    await waitFor(tester, find.text('Create an account'));
    await tester.tap(find.text('Create an account'));
    await waitFor(tester, find.text('Create account'));
    for (final (index, value) in [
      'Kim Tran',
      email,
      'integration test pass',
    ].indexed) {
      await tester.enterText(find.byType(TextField).at(index), value);
    }
    await tester.tap(find.text('Create account'));
    await waitFor(tester, find.text('Sign out'));

    await tester.tap(find.text('Packages'));
    await waitFor(tester, find.text('Get more'));
    expect(
      find.text('Free listings this month: 3 of 3 left until '),
      findsNothing,
    );
    expect(
      find.textContaining('Free listings this month: 3 of 3'),
      findsOneWidget,
    );
    expect(find.text('Seller Plus'), findsOneWidget);
    // Buying opens Stripe's checkout in the browser, outside the app, so
    // it isn't driven from here.
    expect(find.widgetWithText(OutlinedButton, r'$9.99'), findsOneWidget);
  });
}
