import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/submit_button.dart';
import '../../auth/application/auth_controller.dart';
import '../data/seller.dart';
import '../data/sellers_api.dart';

/// Asks why something is being reported and sends it. A guest is sent to
/// sign in first. Says thanks once it is sent.
Future<void> reportSomething(
  BuildContext context,
  WidgetRef ref, {
  required ReportTarget target,
  required String id,
}) async {
  if (ref.read(authControllerProvider).value == null) {
    context.push('/sign-in');
    return;
  }
  final sent = await showModalBottomSheet<bool>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (context) => _ReportSheet(target: target, id: id),
  );
  if ((sent ?? false) && context.mounted) {
    ScaffoldMessenger.of(
      context,
    ).showSnackBar(const SnackBar(content: Text("Thanks. We'll take a look.")));
  }
}

class _ReportSheet extends ConsumerStatefulWidget {
  const _ReportSheet({required this.target, required this.id});

  final ReportTarget target;
  final String id;

  @override
  ConsumerState<_ReportSheet> createState() => _ReportSheetState();
}

class _ReportSheetState extends ConsumerState<_ReportSheet> {
  final _note = TextEditingController();
  String? _reason;
  String? _error;
  var _sending = false;

  @override
  void dispose() {
    _note.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final reason = _reason;
    if (reason == null) {
      setState(() => _error = 'Choose a reason.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(sellersApiProvider)
          .report(
            target: widget.target,
            id: widget.id,
            reason: reason,
            note: _note.text.trim(),
          );
      if (mounted) Navigator.pop(context, true);
    } on ApiError catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final what = switch (widget.target) {
      ReportTarget.listing => 'listing',
      ReportTarget.review => 'review',
      ReportTarget.user => 'person',
    };

    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          16 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Report this $what', style: text.titleLarge),
            const SizedBox(height: 4),
            Text(
              'Our team reads every report. The other person is not told who sent it.',
              style: text.bodyMedium?.copyWith(color: palette.muted),
            ),
            const SizedBox(height: 12),
            for (final MapEntry(key: reason, value: label)
                in reportReasons.entries)
              InkWell(
                onTap: () => setState(() {
                  _reason = reason;
                  _error = null;
                }),
                child: Padding(
                  padding: const EdgeInsets.symmetric(vertical: 12),
                  child: Row(
                    children: [
                      Expanded(child: Text(label, style: text.bodyLarge)),
                      if (_reason == reason)
                        Icon(LucideIcons.check, size: 18, color: palette.text),
                    ],
                  ),
                ),
              ),
            const SizedBox(height: 12),
            LabeledField(
              label: 'Anything we should know? (optional)',
              controller: _note,
              lines: 3,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: text.bodyMedium?.copyWith(color: palette.negative),
              ),
            ],
            const SizedBox(height: 16),
            SubmitButton(
              label: 'Send report',
              busy: _sending,
              onPressed: _send,
            ),
          ],
        ),
      ),
    );
  }
}
