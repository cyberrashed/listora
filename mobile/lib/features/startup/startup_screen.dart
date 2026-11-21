import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../app/theme/theme.dart';
import '../content/data/content.dart';

/// Shown while the app asks the server whether it may start. It moves on by
/// itself: to the marketplace, or to the maintenance or update notice. The
/// only thing to do here is retry when the server can't be reached.
class StartupScreen extends ConsumerWidget {
  const StartupScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final config = ref.watch(appConfigProvider);
    final version = ref.watch(appVersionProvider);

    if ((config, version) case (
      AsyncData(value: final config),
      AsyncData(value: final version),
    )) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!context.mounted) return;
        context.go(
          config.maintenance
              ? '/maintenance'
              : isOlder(version, config.minAppVersion)
              ? '/update'
              : '/browse',
        );
      });
    }
    final text = Theme.of(context).textTheme;

    return Scaffold(
      body: Center(
        child: config is AsyncError
            ? Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text("Can't reach Listora", style: text.titleLarge),
                    const SizedBox(height: 8),
                    Text(
                      'Check your connection and try again.',
                      style: text.bodyLarge?.copyWith(
                        color: context.palette.muted,
                      ),
                    ),
                    const SizedBox(height: 20),
                    OutlinedButton(
                      onPressed: () => ref.invalidate(appConfigProvider),
                      child: const Text('Try again'),
                    ),
                  ],
                ),
              )
            : const CircularProgressIndicator(),
      ),
    );
  }
}
