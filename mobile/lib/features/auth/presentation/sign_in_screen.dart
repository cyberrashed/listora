import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/forms/form_submission.dart';
import '../../../core/widgets/form_page.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/submit_button.dart';
import '../application/auth_controller.dart';

class SignInScreen extends ConsumerStatefulWidget {
  const SignInScreen({super.key});

  @override
  ConsumerState<SignInScreen> createState() => _SignInScreenState();
}

class _SignInScreenState extends ConsumerState<SignInScreen>
    with FormSubmission {
  final _email = TextEditingController();
  final _password = TextEditingController();

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signIn() async {
    final signedIn = await submit(
      () => ref
          .read(authControllerProvider.notifier)
          .signIn(email: _email.text, password: _password.text),
    );
    if (signedIn && mounted) context.go('/account');
  }

  @override
  Widget build(BuildContext context) {
    return FormPage(
      title: 'Sign in',
      intro: 'Welcome back.',
      error: formError,
      fields: [
        LabeledField(
          label: 'Email',
          controller: _email,
          error: fieldErrors['email'],
          keyboardType: TextInputType.emailAddress,
          autofillHints: const [AutofillHints.username],
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Password',
          controller: _password,
          error: fieldErrors['password'],
          obscure: true,
          autofillHints: const [AutofillHints.password],
          textInputAction: TextInputAction.done,
          onSubmitted: _signIn,
        ),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => context.push('/forgot-password'),
            child: const Text('Forgot password?'),
          ),
        ),
      ],
      actions: [
        SubmitButton(label: 'Sign in', busy: submitting, onPressed: _signIn),
        const SizedBox(height: 12),
        OutlinedButton(
          onPressed: () => context.pushReplacement('/register'),
          child: const Text('Create an account'),
        ),
      ],
    );
  }
}
