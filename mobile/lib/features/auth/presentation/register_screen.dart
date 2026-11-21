import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/forms/form_submission.dart';
import '../../../core/widgets/form_page.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/submit_button.dart';
import '../application/auth_controller.dart';

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen>
    with FormSubmission {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _register() async {
    final registered = await submit(
      () => ref
          .read(authControllerProvider.notifier)
          .register(
            name: _name.text,
            email: _email.text,
            password: _password.text,
          ),
    );
    if (registered && mounted) context.go('/account');
  }

  @override
  Widget build(BuildContext context) {
    return FormPage(
      title: 'Create an account',
      intro: 'Post listings, message sellers and save what you like.',
      error: formError,
      fields: [
        LabeledField(
          label: 'Name',
          controller: _name,
          error: fieldErrors['name'],
          keyboardType: TextInputType.name,
          autofillHints: const [AutofillHints.name],
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Email',
          controller: _email,
          error: fieldErrors['email'],
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.email],
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Password',
          hint: 'At least 8 characters',
          controller: _password,
          error: fieldErrors['password'],
          obscure: true,
          autofillHints: const [AutofillHints.newPassword],
          textInputAction: TextInputAction.done,
          onSubmitted: _register,
        ),
      ],
      actions: [
        SubmitButton(
          label: 'Create account',
          busy: submitting,
          onPressed: _register,
        ),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () => context.pushReplacement('/sign-in'),
          child: const Text('I already have an account'),
        ),
      ],
    );
  }
}
