import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/forms/form_submission.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/submit_button.dart';
import '../../auth/application/auth_controller.dart';
import '../data/seller.dart';
import '../data/sellers_api.dart';

/// Where the person's verification stands, and the request form when they
/// can send one.
class VerificationScreen extends ConsumerWidget {
  const VerificationScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final state = ref.watch(verificationProvider);
    // The form starts from the account's phone number, so it waits for it.
    final account = ref.watch(authControllerProvider);

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: switch (account.isLoading
            ? const AsyncLoading<VerificationState>()
            : state) {
          AsyncData(:final value) when value.verified => const _Note(
            icon: LucideIcons.badgeCheck,
            title: "You're verified",
            detail:
                'Buyers see a verified badge on your profile and next to '
                'your name on every listing.',
          ),
          AsyncData(:final value)
              when value.status == VerificationStatus.pending =>
            const _Note(
              icon: LucideIcons.clock,
              title: 'We are reviewing your request',
              detail:
                  'This usually takes a day or two. You get a notification '
                  'when it is decided.',
            ),
          AsyncData(:final value) => _RequestForm(lastReason: value.reason),
          AsyncError(:final error) => CenteredMessage(
            title: "Couldn't load your verification",
            detail: error is ApiError ? error.message : 'Try again.',
            action: OutlinedButton(
              onPressed: () => ref.invalidate(verificationProvider),
              child: const Text('Try again'),
            ),
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.icon, required this.title, required this.detail});

  final IconData icon;
  final String title;
  final String detail;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        Icon(icon, size: 32, color: context.palette.accent),
        const SizedBox(height: 16),
        Text(title, style: text.headlineMedium),
        const SizedBox(height: 8),
        Text(
          detail,
          style: text.bodyLarge?.copyWith(color: context.palette.muted),
        ),
      ],
    );
  }
}

class _RequestForm extends ConsumerStatefulWidget {
  const _RequestForm({this.lastReason});

  /// Why the last request was turned down, if one was.
  final String? lastReason;

  @override
  ConsumerState<_RequestForm> createState() => _RequestFormState();
}

class _RequestFormState extends ConsumerState<_RequestForm>
    with FormSubmission {
  final _legalName = TextEditingController();
  late final _phone = TextEditingController(
    text: ref.read(authControllerProvider).value?.phone,
  );
  final _about = TextEditingController();

  @override
  void dispose() {
    _legalName.dispose();
    _phone.dispose();
    _about.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    final api = ref.read(sellersApiProvider);
    final sent = await submit(
      () => api.requestVerification(
        legalName: _legalName.text.trim(),
        phone: _phone.text.trim(),
        about: _about.text.trim(),
      ),
    );
    if (sent) ref.invalidate(verificationProvider);
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final reason = widget.lastReason;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        Text('Get verified', style: text.headlineMedium),
        const SizedBox(height: 8),
        Text(
          'Verified sellers get a badge buyers trust. Our team checks who you '
          'are and how you sell before approving.',
          style: text.bodyLarge?.copyWith(color: palette.muted),
        ),
        if (reason != null) ...[
          const SizedBox(height: 16),
          DecoratedBox(
            decoration: BoxDecoration(
              color: palette.raised,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                'Your last request was turned down: $reason',
                style: text.bodyMedium,
              ),
            ),
          ),
        ],
        const SizedBox(height: 28),
        LabeledField(
          label: 'Full legal name',
          controller: _legalName,
          error: fieldErrors['legalName'],
          autofillHints: const [AutofillHints.name],
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Phone number',
          controller: _phone,
          error: fieldErrors['phone'],
          keyboardType: TextInputType.phone,
          autofillHints: const [AutofillHints.telephoneNumber],
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'What and how you sell',
          hint:
              'For example: furniture I restore at home, a few pieces a month.',
          controller: _about,
          error: fieldErrors['about'],
          lines: 4,
        ),
        const SizedBox(height: 24),
        if (formError != null) ...[
          Text(
            formError!,
            style: text.bodyMedium?.copyWith(color: palette.negative),
          ),
          const SizedBox(height: 12),
        ],
        SubmitButton(label: 'Send request', busy: submitting, onPressed: _send),
      ],
    );
  }
}
