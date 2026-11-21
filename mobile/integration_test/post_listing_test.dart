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

  testWidgets('a seller posts a listing, finds it in review and deletes it', (
    tester,
  ) async {
    final email = 'robin.${DateTime.now().millisecondsSinceEpoch}@example.com';
    const title = 'Honda CB500X with luggage racks';

    app.main();
    await waitFor(tester, find.text('Vehicles'));
    await tester.tap(find.text('Account'));
    await waitFor(tester, find.text('Create an account'));
    await tester.tap(find.text('Create an account'));
    await waitFor(tester, find.text('Create account'));
    await _fill(tester, ['Robin Castillo', email, 'integration test pass']);
    await tester.tap(find.text('Create account'));
    await waitFor(tester, find.text('Sign out'));

    await tester.tap(find.text('Selling'));
    await waitFor(tester, find.text('Nothing listed yet'));
    await tester.tap(find.text('Post a listing'));

    await waitFor(tester, find.text('What are you selling?'));
    await tester.tap(find.text('Vehicles'));
    await waitFor(tester, find.text('Motorcycles'));
    await tester.tap(find.text('Motorcycles'));

    await waitFor(tester, find.text('Describe it'));
    await _fill(tester, [
      title,
      'Commuter bike, serviced in the spring, new chain and sprockets. '
          'Comes with both keys.',
      '5400',
    ]);
    await tester.tap(find.text('Continue'));

    // Photos are optional; the gallery can't be driven from a test.
    await waitFor(tester, find.text('Add photos').first);
    await tester.tap(find.text('Continue'));

    // Motorcycles ask for the make, the year and the mileage.
    await waitFor(tester, find.text('A few details'));
    await _fill(tester, ['Honda', '2019', '12400']);
    await tester.tap(find.text('Continue'));

    await waitFor(tester, find.text('Where is it?'));
    await tester.enterText(find.byType(TextField), 'Austin');
    await waitFor(tester, find.text('Austin, TX'));
    await tester.tap(find.text('Austin, TX'));
    await tester.pump();
    await tester.tap(find.text('Continue'));

    await waitFor(tester, find.text('Check it over'));
    expect(find.text('Vehicles / Motorcycles'), findsOneWidget);
    expect(find.text('12,400 mi'), findsOneWidget);
    await tester.tap(find.text('Post listing'));

    // Back on the Selling tab, the listing waits for a reviewer.
    await waitFor(tester, find.text('Waiting for review'));
    await tester.tap(find.text(title));
    await waitFor(tester, find.text('Delete'));
    expect(find.text(r'$5,400'), findsWidgets);

    await tester.tap(find.text('Delete'));
    await waitFor(tester, find.text('Delete this listing?'));
    await tester.tap(find.widgetWithText(TextButton, 'Delete').last);
    await waitFor(tester, find.text('Nothing listed yet'));
  });
}
