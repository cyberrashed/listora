import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/theme.dart';
import '../../../core/forms/form_submission.dart';
import '../../../core/widgets/form_page.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../auth/application/auth_controller.dart';

class DeleteAccountScreen extends ConsumerStatefulWidget {
  const DeleteAccountScreen({super.key});

  @override
  ConsumerState<DeleteAccountScreen> createState() =>
      _DeleteAccountScreenState();
}

class _DeleteAccountScreenState extends ConsumerState<DeleteAccountScreen>
    with FormSubmission {
  final _password = TextEditingController();

  @override
  void dispose() {
    _password.dispose();
    super.dispose();
  }

  Future<void> _delete() async {
    final deleted = await submit(
      () => ref
          .read(authControllerProvider.notifier)
          .deleteAccount(_password.text),
    );
    if (deleted && mounted) context.go('/account');
  }

  @override
  Widget build(BuildContext context) {
    final negative = context.palette.negative;

    return FormPage(
      title: 'Delete your account',
      intro:
          'This removes your profile and signs you out everywhere. It '
          "can't be undone.",
      error: formError,
      fields: [
        LabeledField(
          label: 'Password',
          controller: _password,
          error: fieldErrors['password'],
          obscure: true,
          textInputAction: TextInputAction.done,
          onSubmitted: _delete,
        ),
      ],
      actions: [
        OutlinedButton(
          onPressed: submitting ? null : _delete,
          style: OutlinedButton.styleFrom(
            foregroundColor: negative,
            side: BorderSide(color: negative),
          ),
          child: const Text('Delete my account'),
        ),
      ],
    );
  }
}
