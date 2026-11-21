import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../features/chat/application/system_alerts.dart';
import 'router.dart';
import 'theme/theme.dart';

class ListoraApp extends ConsumerWidget {
  const ListoraApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    // Keeps the live connection and its system notifications running while
    // someone is signed in.
    ref.watch(systemAlertsProvider);

    return MaterialApp.router(
      title: 'Listora',
      // Screenshots of debug builds go into the portfolio; no corner ribbon.
      debugShowCheckedModeBanner: false,
      theme: buildTheme(Brightness.light),
      darkTheme: buildTheme(Brightness.dark),
      routerConfig: router,
    );
  }
}
