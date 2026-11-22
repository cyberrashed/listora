import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

/// Pumps until [finder] matches. A spinner never lets pumpAndSettle return,
/// so screens that load are waited on this way. On a timeout the failure
/// lists the text on screen, which is usually enough to see what happened.
Future<void> waitFor(WidgetTester tester, Finder finder) async {
  for (var attempt = 0; attempt < 100; attempt++) {
    await tester.pump(const Duration(milliseconds: 200));
    if (finder.evaluate().isNotEmpty) return;
  }

  final onScreen = find
      .byType(Text)
      .evaluate()
      .map((element) => (element.widget as Text).data)
      .nonNulls
      .join(' | ');
  fail('Timed out waiting for $finder\nOn screen: $onScreen');
}

/// Scrolls the page down until [finder] is built and on screen. A listing's
/// seller sits below its photos, out of view until the page scrolls. Only
/// the page is scrolled: the photo gallery inside it scrolls sideways.
Future<void> scrollTo(WidgetTester tester, Finder finder) async {
  await tester.scrollUntilVisible(
    finder,
    300,
    scrollable: find
        .byWidgetPredicate(
          (widget) =>
              widget is Scrollable &&
              widget.axisDirection == AxisDirection.down,
        )
        .first,
  );
  await tester.pump();
}
