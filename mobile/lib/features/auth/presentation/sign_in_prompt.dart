import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/theme.dart';

/// What a guest sees on a tab that needs an account.
class SignInPrompt extends StatelessWidget {
  const SignInPrompt({
    super.key,
    required this.title,
    required this.detail,
    this.footer = const [],
  });

  final String title;
  final String detail;

  /// More under the buttons, like links that work without an account.
  final List<Widget> footer;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 24, 20, 24),
      children: [
        Text(title, style: text.headlineMedium),
        const SizedBox(height: 8),
        Text(
          detail,
          style: text.bodyLarge?.copyWith(color: context.palette.muted),
        ),
        const SizedBox(height: 28),
        FilledButton(
          onPressed: () => context.push('/sign-in'),
          child: const Text('Sign in'),
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () => context.push('/register'),
          child: const Text('Create an account'),
        ),
        ...footer,
      ],
    );
  }
}
