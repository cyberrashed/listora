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

  testWidgets('a buyer narrows into a category, filters and searches', (
    tester,
  ) async {
    app.main();
    await waitFor(tester, find.text('Latest listings'));
    await waitFor(tester, find.text('Vehicles'));

    await tester.tap(find.text('Vehicles'));
    await waitFor(tester, find.text('Cars & Trucks'));
    await tester.tap(find.text('Cars & Trucks'));
    // Newest first, so the car posted yesterday leads.
    await waitFor(tester, find.text('2021 Tesla Model 3 Standard Range Plus'));

    // Only the cars with a manual gearbox are left.
    await tester.tap(find.text('Filters'));
    await waitFor(tester, find.text('Manual'));
    await tester.tap(find.text('Manual'));
    await tester.tap(find.text('Show results'));
    await waitFor(tester, find.text('Filters · 1'));
    await waitFor(tester, find.text('2012 Jeep Wrangler Sport, 6-speed'));
    expect(find.text('2010 Honda Fit Sport'), findsOneWidget);
    expect(find.text('2021 Tesla Model 3 Standard Range Plus'), findsNothing);

    await tester.enterText(find.byType(TextField), 'jeep');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await waitFor(tester, find.text('1 listing'));

    await tester.tap(find.text('2012 Jeep Wrangler Sport, 6-speed'));
    await waitFor(tester, find.text('Seller'));
    expect(find.text('Wyatt Lindgren'), findsOneWidget);
  });
}
