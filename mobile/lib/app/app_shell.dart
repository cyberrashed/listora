import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../features/chat/application/chat_controllers.dart';
import 'theme/theme.dart';

/// The tabs at the bottom of the app. Each keeps its own place while
/// another is open.
class AppShell extends ConsumerWidget {
  const AppShell({super.key, required this.shell});

  final StatefulNavigationShell shell;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final unread = ref.watch(unreadProvider).value?.messages ?? 0;
    final palette = context.palette;

    return Scaffold(
      body: shell,
      bottomNavigationBar: NavigationBar(
        selectedIndex: shell.currentIndex,
        // Tapping the tab you are on goes back to its first screen.
        onDestinationSelected: (index) =>
            shell.goBranch(index, initialLocation: index == shell.currentIndex),
        destinations: [
          const NavigationDestination(
            icon: Icon(LucideIcons.layoutGrid),
            label: 'Browse',
          ),
          const NavigationDestination(
            icon: Icon(LucideIcons.bookmark),
            label: 'Saved',
          ),
          const NavigationDestination(
            icon: Icon(LucideIcons.tag),
            label: 'Selling',
          ),
          NavigationDestination(
            icon: Badge(
              isLabelVisible: unread > 0,
              label: Text('$unread'),
              backgroundColor: palette.accent,
              textColor: palette.onAccent,
              child: const Icon(LucideIcons.messageCircle),
            ),
            label: 'Chats',
          ),
          const NavigationDestination(
            icon: Icon(LucideIcons.user),
            label: 'Account',
          ),
        ],
      ),
    );
  }
}
