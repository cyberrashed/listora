import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/forms/form_submission.dart';
import '../../../core/widgets/form_page.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/submit_button.dart';
import '../data/auth_api.dart';

class ForgotPasswordScreen extends ConsumerStatefulWidget {
  const ForgotPasswordScreen({super.key});

  @override
  ConsumerState<ForgotPasswordScreen> createState() =>
      _ForgotPasswordScreenState();
}

class _ForgotPasswordScreenState extends ConsumerState<ForgotPasswordScreen>
    with FormSubmission {
  final _email = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    super.dispose();
  }

  Future<void> _sendCode() async {
    final email = _email.text.trim();
    final sent = await submit(
      () => ref.read(authApiProvider).requestPasswordReset(email),
    );
    if (sent && mounted) {
      context.pushReplacement('/reset-password', extra: email);
    }
  }

  @override
  Widget build(BuildContext context) {
    return FormPage(
      title: 'Reset your password',
      intro: "Enter your email and we'll send you a 6-digit code.",
      error: formError,
      fields: [
        LabeledField(
          label: 'Email',
          controller: _email,
          error: fieldErrors['email'],
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
          textInputAction: TextInputAction.done,
          onSubmitted: _sendCode,
        ),
      ],
      actions: [
        SubmitButton(
          label: 'Send code',
          busy: submitting,
          onPressed: _sendCode,
        ),
      ],
    );
  }
}
