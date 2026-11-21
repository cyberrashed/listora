// Runs on an emulator against the local API, on freshly seeded data:
//
//   flutter test integration_test
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:listora/main.dart' as app;

import 'wait_for.dart';

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();

  testWidgets('a guest reads the banners, help and the blog', (tester) async {
    app.main();
    await waitFor(tester, find.text('Latest listings'));
    // The seed's first banner.
    await waitFor(tester, find.text('Sell it this weekend'));

    await tester.tap(find.text('Account'));
    await waitFor(tester, find.text('Help'));
    await tester.tap(find.text('Help'));
    await waitFor(tester, find.text('Is posting a listing free?'));
    await tester.tap(find.text('Is posting a listing free?'));
    await waitFor(
      tester,
      find.textContaining('three listings a month for free'),
    );

    await tester.tap(find.text('Safety tips'));
    await waitFor(tester, find.textContaining('busy public place'));
    await tester.pageBack();
    await waitFor(tester, find.text('Help'));
    await tester.pageBack();

    await waitFor(tester, find.text('Blog'));
    await tester.tap(find.text('Blog'));
    await waitFor(tester, find.text('Five rules for a safe meetup'));
    await tester.tap(find.text('Five rules for a safe meetup'));
    await waitFor(tester, find.textContaining('safe exchange spot'));
  });
}
