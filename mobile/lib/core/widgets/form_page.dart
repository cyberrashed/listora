import 'package:flutter/material.dart';

import '../../app/theme/theme.dart';

/// The frame every form screen shares: a back bar, a title, one line of
/// context, the fields, then the actions. A refused form shows its reason
/// between the two, next to the button that was pressed.
class FormPage extends StatelessWidget {
  const FormPage({
    super.key,
    required this.title,
    required this.fields,
    required this.actions,
    this.intro,
    this.error,
  });

  final String title;
  final String? intro;
  final String? error;
  final List<Widget> fields;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: AutofillGroup(
          child: SingleChildScrollView(
            padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text(title, style: text.headlineMedium),
                if (intro != null) ...[
                  const SizedBox(height: 8),
                  Text(
                    intro!,
                    style: text.bodyLarge?.copyWith(color: palette.muted),
                  ),
                ],
                const SizedBox(height: 28),
                ...fields,
                const SizedBox(height: 24),
                if (error != null) ...[
                  Text(
                    error!,
                    style: text.bodyMedium?.copyWith(color: palette.negative),
                  ),
                  const SizedBox(height: 12),
                ],
                ...actions,
              ],
            ),
          ),
        ),
      ),
    );
  }
}
