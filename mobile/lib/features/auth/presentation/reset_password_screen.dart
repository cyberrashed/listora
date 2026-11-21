import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/forms/form_submission.dart';
import '../../../core/widgets/form_page.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/submit_button.dart';
import '../application/auth_controller.dart';
import '../data/auth_api.dart';

class ResetPasswordScreen extends ConsumerStatefulWidget {
  const ResetPasswordScreen({super.key, required this.email});

  final String email;

  @override
  ConsumerState<ResetPasswordScreen> createState() =>
      _ResetPasswordScreenState();
}

class _ResetPasswordScreenState extends ConsumerState<ResetPasswordScreen>
    with FormSubmission {
  final _code = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _code.dispose();
    _password.dispose();
    super.dispose();
  }

  // A successful reset signs every device out, so sign this one back in with
  // the password that was just chosen.
  Future<void> _reset() async {
    final done = await submit(() async {
      await ref
          .read(authApiProvider)
          .resetPassword(
            email: widget.email,
            code: _code.text.trim(),
            password: _password.text,
          );
      await ref
          .read(authControllerProvider.notifier)
          .signIn(email: widget.email, password: _password.text);
    });
    if (done && mounted) context.go('/account');
  }

  @override
  Widget build(BuildContext context) {
    return FormPage(
      title: 'Choose a new password',
      intro:
          'If ${widget.email} has an account, a code is on its way. '
          'It expires in 15 minutes.',
      error: formError,
      fields: [
        LabeledField(
          label: 'Code',
          controller: _code,
          error: fieldErrors['code'],
          keyboardType: TextInputType.number,
          autofillHints: const [AutofillHints.oneTimeCode],
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'New password',
          hint: 'At least 8 characters',
          controller: _password,
          error: fieldErrors['password'],
          obscure: true,
          autofillHints: const [AutofillHints.newPassword],
          textInputAction: TextInputAction.done,
          onSubmitted: _reset,
        ),
      ],
      actions: [
        SubmitButton(
          label: 'Save password',
          busy: submitting,
          onPressed: _reset,
        ),
      ],
    );
  }
}
