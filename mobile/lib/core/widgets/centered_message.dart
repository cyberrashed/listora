import 'package:flutter/material.dart';

import '../../app/theme/theme.dart';

/// A centred note for the empty and failed states. It scrolls, so pulling
/// down to refresh works here too.
class CenteredMessage extends StatelessWidget {
  const CenteredMessage({
    super.key,
    required this.title,
    required this.detail,
    this.action,
  });

  final String title;
  final String detail;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return LayoutBuilder(
      builder: (context, constraints) => SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        child: ConstrainedBox(
          constraints: BoxConstraints(
            minWidth: constraints.maxWidth,
            minHeight: constraints.maxHeight,
          ),
          child: Padding(
            padding: const EdgeInsets.all(32),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Text(
                  title,
                  style: text.titleLarge,
                  textAlign: TextAlign.center,
                ),
                const SizedBox(height: 8),
                Text(
                  detail,
                  style: text.bodyLarge?.copyWith(color: context.palette.muted),
                  textAlign: TextAlign.center,
                ),
                if (action != null) ...[const SizedBox(height: 20), action!],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
