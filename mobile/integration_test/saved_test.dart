// Runs on an emulator against the local API, on freshly seeded data:
//
//   flutter test integration_test
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:listora/features/browse/presentation/listing_feed.dart';
import 'package:listora/main.dart' as app;

import 'wait_for.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('a saved listing shows up on the Saved tab', (tester) async {
    final email = 'jordan.${DateTime.now().millisecondsSinceEpoch}@example.com';

    app.main();
    await waitFor(tester, find.text('Latest listings'));
    await tester.tap(find.text('Account'));
    await waitFor(tester, find.text('Create an account'));
    await tester.tap(find.text('Create an account'));
    await waitFor(tester, find.text('Create account'));
    for (final (index, value) in [
      'Jordan Reyes',
      email,
      'integration test pass',
    ].indexed) {
      await tester.enterText(find.byType(TextField).at(index), value);
    }
    await tester.tap(find.text('Create account'));
    await waitFor(tester, find.text('Sign out'));

    await tester.tap(find.text('Browse'));
    await waitFor(tester, find.byType(ListingRow));
    final first = find.byType(ListingRow).first;
    final title = tester.widget<ListingRow>(first).listing.title;

    // Below the featured cards it starts under the tab bar.
    await tester.ensureVisible(first);
    await tester.pumpAndSettle();
    await tester.tap(first);
    await waitFor(tester, find.text('Save'));
    await tester.tap(find.text('Save'));
    await waitFor(tester, find.text('Saved'));

    await tester.tap(find.byType(BackButton));
    // The heading scrolled away; the rows are what's on screen now.
    await waitFor(tester, find.byType(ListingRow));
    await tester.tap(find.text('Saved'));
    await waitFor(tester, find.text(title));
  });
}
