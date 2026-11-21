// Saves the screenshots the tour takes into design/screens/app.
//
//   flutter drive --driver=test_driver/integration_test.dart \
//     --target=integration_test/screenshot_tour.dart \
//     --dart-define=TOUR_PASSWORD=<SEED_PASSWORD>
import 'dart:io';

import 'package:integration_test/integration_test_driver_extended.dart';

Future<void> main() => integrationDriver(
  onScreenshot: (name, bytes, [args]) async {
    final file = File('../design/screens/app/$name.png')
      ..createSync(recursive: true)
      ..writeAsBytesSync(bytes);
    stdout.writeln('saved ${file.path}');
    return true;
  },
);
