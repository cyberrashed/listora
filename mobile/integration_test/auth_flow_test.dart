// Runs on an emulator against the local API:
//
//   flutter test integration_test
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:listora/main.dart' as app;

import 'wait_for.dart';

Future<void> _fill(WidgetTester tester, List<String> values) async {
  for (final (index, value) in values.indexed) {
    await tester.enterText(find.byType(TextField).at(index), value);
  }
  await tester.pump();
}

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('a new customer registers, signs out and signs back in', (
    tester,
  ) async {
    final email = 'casey.${DateTime.now().millisecondsSinceEpoch}@example.com';
    const password = 'integration test pass';

    app.main();
    // The Browse tab opens first; a category shows it has loaded.
    await waitFor(tester, find.text('Vehicles'));
    await tester.tap(find.text('Account'));
    await waitFor(tester, find.text('Your account'));

    await tester.tap(find.text('Create an account'));
    await waitFor(tester, find.text('Create account'));
    await _fill(tester, ['Casey Morgan', email, password]);
    await tester.tap(find.text('Create account'));
    // The profile is the only screen with a sign-out row.
    await waitFor(tester, find.text('Sign out'));
    expect(find.text('Casey Morgan'), findsOneWidget);
    expect(find.text(email), findsOneWidget);

    await tester.tap(find.text('Sign out'));
    await waitFor(tester, find.text('Your account'));

    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await waitFor(tester, find.text('Welcome back.'));
    await _fill(tester, [email, 'the wrong password']);
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await waitFor(tester, find.text("That email and password don't match."));

    await _fill(tester, [email, password]);
    await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
    await waitFor(tester, find.text('Sign out'));
    expect(find.text('Casey Morgan'), findsOneWidget);
  });
}
