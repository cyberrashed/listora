import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../app/theme/theme.dart';
import '../content/data/content.dart';

/// Shown instead of the marketplace while staff have it in maintenance.
class MaintenanceScreen extends ConsumerWidget {
  const MaintenanceScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final message = ref.watch(appConfigProvider).value?.maintenanceMessage;
    return _Gate(
      icon: LucideIcons.wrench,
      title: 'Back soon',
      detail: message ?? 'Listora is down for a short update.',
      action: OutlinedButton(
        onPressed: () {
          ref.invalidate(appConfigProvider);
          context.go('/');
        },
        child: const Text('Try again'),
      ),
    );
  }
}

/// Shown when this build is older than staff allow.
class UpdateScreen extends StatelessWidget {
  const UpdateScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return const _Gate(
      icon: LucideIcons.download,
      title: 'Update Listora',
      detail:
          'This version is no longer supported. Install the latest one to keep '
          'buying and selling.',
    );
  }
}

class _Gate extends StatelessWidget {
  const _Gate({
    required this.icon,
    required this.title,
    required this.detail,
    this.action,
  });

  final IconData icon;
  final String title;
  final String detail;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(icon, size: 32, color: context.palette.accent),
              const SizedBox(height: 20),
              Text(
                title,
                style: text.headlineMedium,
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 8),
              Text(
                detail,
                style: text.bodyLarge?.copyWith(color: context.palette.muted),
                textAlign: TextAlign.center,
              ),
              if (action != null) ...[const SizedBox(height: 24), action!],
            ],
          ),
        ),
      ),
    );
  }
}
