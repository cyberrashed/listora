import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/forms/form_submission.dart';
import '../../../core/widgets/form_page.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/submit_button.dart';
import '../../auth/application/auth_controller.dart';

class EditProfileScreen extends ConsumerStatefulWidget {
  const EditProfileScreen({super.key});

  @override
  ConsumerState<EditProfileScreen> createState() => _EditProfileScreenState();
}

class _EditProfileScreenState extends ConsumerState<EditProfileScreen>
    with FormSubmission {
  late final TextEditingController _name;
  late final TextEditingController _phone;

  @override
  void initState() {
    super.initState();
    final user = ref.read(authControllerProvider).value;
    _name = TextEditingController(text: user?.name);
    _phone = TextEditingController(text: user?.phone);
  }

  @override
  void dispose() {
    _name.dispose();
    _phone.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final phone = _phone.text.trim();
    final saved = await submit(
      () => ref
          .read(authControllerProvider.notifier)
          .updateProfile(name: _name.text, phone: phone.isEmpty ? null : phone),
    );
    if (saved && mounted) context.pop();
  }

  @override
  Widget build(BuildContext context) {
    return FormPage(
      title: 'Edit profile',
      error: formError,
      fields: [
        LabeledField(
          label: 'Name',
          controller: _name,
          error: fieldErrors['name'],
          keyboardType: TextInputType.name,
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Phone (optional)',
          hint: '+1 512 555 0142',
          controller: _phone,
          error: fieldErrors['phone'],
          keyboardType: TextInputType.phone,
          textInputAction: TextInputAction.done,
          onSubmitted: _save,
        ),
      ],
      actions: [
        SubmitButton(label: 'Save', busy: submitting, onPressed: _save),
      ],
    );
  }
}
