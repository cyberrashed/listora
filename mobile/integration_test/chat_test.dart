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

  testWidgets('a buyer messages a seller and makes an offer', (tester) async {
    final email = 'alex.${DateTime.now().millisecondsSinceEpoch}@example.com';

    app.main();
    await waitFor(tester, find.text('Latest listings'));
    await tester.tap(find.text('Account'));
    await waitFor(tester, find.text('Create an account'));
    await tester.tap(find.text('Create an account'));
    await waitFor(tester, find.text('Create account'));
    for (final (index, value) in [
      'Alex Park',
      email,
      'integration test pass',
    ].indexed) {
      await tester.enterText(find.byType(TextField).at(index), value);
    }
    await tester.tap(find.text('Create account'));
    await waitFor(tester, find.text('Sign out'));

    // Dana's Civic, through search.
    await tester.tap(find.text('Browse'));
    await waitFor(tester, find.text('Search listings'));
    await tester.tap(find.text('Search listings'));
    await waitFor(tester, find.text('Filters'));
    await tester.enterText(find.byType(TextField), 'civic');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await waitFor(tester, find.text('2015 Honda Civic LX, one owner'));
    await tester.tap(find.text('2015 Honda Civic LX, one owner'));
    await waitFor(tester, find.text('Message seller'));
    await tester.tap(find.text('Message seller'));

    await waitFor(tester, find.text('Say hello'));
    await tester.enterText(
      find.byType(TextField),
      'Is the Civic still for sale?',
    );
    await tester.tap(find.byTooltip('Send'));
    await waitFor(tester, find.text('Is the Civic still for sale?'));

    // The composer's buttons wait while the message is still sending.
    final offerButton = find.byWidgetPredicate(
      (widget) =>
          widget is IconButton &&
          widget.tooltip == 'Make an offer' &&
          widget.onPressed != null,
    );
    await waitFor(tester, offerButton);
    await tester.tap(offerButton);
    await waitFor(tester, find.text('Send offer'));
    await tester.enterText(find.byType(TextField).last, '8200');
    await tester.tap(find.text('Send offer'));
    await waitFor(tester, find.text(r'You offered $8,200'));
    expect(
      find.text(r'You offered $8,200. Waiting for Dana Whitfield.'),
      findsOneWidget,
    );
    // One offer at a time.
    expect(find.byTooltip('Make an offer'), findsNothing);

    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.text('Message seller'));
    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.text('Filters'));
    await tester.tap(find.byType(BackButton));
    await waitFor(tester, find.text('Latest listings'));
    await tester.tap(find.text('Chats'));
    await waitFor(tester, find.text('Dana Whitfield'));
    expect(find.text(r'You offered $8,200'), findsOneWidget);
  });
}
