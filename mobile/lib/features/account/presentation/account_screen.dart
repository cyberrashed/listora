import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/data/user.dart';
import '../../auth/presentation/sign_in_prompt.dart';

class AccountScreen extends ConsumerWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return Scaffold(
      body: SafeArea(
        child: switch (auth) {
          AsyncData(:final value?) => _Profile(user: value),
          AsyncData() || AsyncError() => SignInPrompt(
            title: 'Your account',
            detail:
                'Sign in to post listings, message sellers and keep the ones '
                'you like.',
            footer: [
              const SizedBox(height: 28),
              TextButton(
                onPressed: () => context.push('/help'),
                child: const Text('Help'),
              ),
              TextButton(
                onPressed: () => context.push('/blog'),
                child: const Text('Blog'),
              ),
            ],
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _Profile extends ConsumerWidget {
  const _Profile({required this.user});

  final User user;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;

    return ListView(
      padding: const EdgeInsets.symmetric(vertical: 24),
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(user.name, style: text.headlineMedium),
              const SizedBox(height: 4),
              Text(
                user.email,
                style: text.bodyLarge?.copyWith(color: palette.muted),
              ),
              const SizedBox(height: 4),
              Text(
                [
                  if (user.phone != null) user.phone!,
                  'Member since ${user.createdAt.year}',
                ].join(' · '),
                style: text.bodyMedium?.copyWith(color: palette.muted),
              ),
            ],
          ),
        ),
        const SizedBox(height: 24),
        const Divider(),
        _Row(
          icon: LucideIcons.userPen,
          label: 'Edit profile',
          onTap: () => context.push('/account/edit'),
        ),
        const Divider(indent: 20),
        _Row(
          icon: LucideIcons.package,
          label: 'Packages',
          onTap: () => context.push('/account/packages'),
        ),
        const Divider(indent: 20),
        _Row(
          icon: LucideIcons.badgeCheck,
          label: 'Verification',
          onTap: () => context.push('/account/verification'),
        ),
        const Divider(indent: 20),
        _Row(
          icon: LucideIcons.store,
          label: 'Your public profile',
          onTap: () => context.push('/sellers/${user.id}'),
        ),
        const Divider(indent: 20),
        _Row(
          icon: LucideIcons.users,
          label: 'Following',
          onTap: () => context.push('/account/following'),
        ),
        const Divider(indent: 20),
        _Row(
          icon: LucideIcons.ban,
          label: 'Blocked people',
          onTap: () => context.push('/account/blocked'),
        ),
        const Divider(indent: 20),
        _Row(
          icon: LucideIcons.lifeBuoy,
          label: 'Help',
          onTap: () => context.push('/help'),
        ),
        const Divider(indent: 20),
        _Row(
          icon: LucideIcons.newspaper,
          label: 'Blog',
          onTap: () => context.push('/blog'),
        ),
        const Divider(indent: 20),
        _Row(
          icon: LucideIcons.logOut,
          label: 'Sign out',
          onTap: () => ref.read(authControllerProvider.notifier).signOut(),
        ),
        const Divider(indent: 20),
        _Row(
          icon: LucideIcons.trash2,
          label: 'Delete account',
          color: palette.negative,
          onTap: () => context.push('/account/delete'),
        ),
        const Divider(),
      ],
    );
  }
}

class _Row extends StatelessWidget {
  const _Row({
    required this.icon,
    required this.label,
    required this.onTap,
    this.color,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final Color? color;

  @override
  Widget build(BuildContext context) {
    final ink = color ?? context.palette.text;

    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
        child: Row(
          children: [
            Icon(icon, size: 20, color: ink),
            const SizedBox(width: 14),
            Expanded(
              child: Text(
                label,
                style: Theme.of(context).textTheme.bodyLarge
                    ?.copyWith(color: ink),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
