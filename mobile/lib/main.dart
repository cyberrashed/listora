import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'app/app.dart';
import 'app/retry.dart';
import 'app/router.dart';
import 'features/chat/application/system_alerts.dart';

Future<void> main() async {
  WidgetsFlutterBinding.ensureInitialized();
  LicenseRegistry.addLicense(() async* {
    yield LicenseEntryWithLineBreaks([
      'IBM Plex Sans',
    ], await rootBundle.loadString('assets/fonts/IBMPlexSans-LICENSE.txt'));
  });

  // Tapping a notification opens what it is about.
  final notifications = SystemNotifications();
  await notifications.init((link) => router.push(link));

  runApp(
    ProviderScope(
      retry: neverRetry,
      overrides: [systemNotificationsProvider.overrideWithValue(notifications)],
      child: const ListoraApp(),
    ),
  );
}
