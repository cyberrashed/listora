import 'package:flutter/material.dart';

/// A text field with its label above it, where the label stays readable
/// while the field is filled in.
class LabeledField extends StatelessWidget {
  const LabeledField({
    super.key,
    required this.label,
    required this.controller,
    this.error,
    this.hint,
    this.suffix,
    this.obscure = false,
    this.lines = 1,
    this.keyboardType,
    this.autofillHints,
    this.textInputAction = TextInputAction.next,
    this.onChanged,
    this.onSubmitted,
  });

  final String label;
  final TextEditingController controller;
  final String? error;
  final String? hint;

  /// A unit shown after what is typed, like "mi".
  final String? suffix;
  final bool obscure;
  final int lines;
  final TextInputType? keyboardType;
  final Iterable<String>? autofillHints;
  final TextInputAction textInputAction;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onSubmitted;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: text.labelLarge),
        const SizedBox(height: 8),
        TextField(
          controller: controller,
          obscureText: obscure,
          minLines: lines,
          maxLines: lines,
          keyboardType: lines > 1 ? TextInputType.multiline : keyboardType,
          autofillHints: autofillHints,
          textInputAction: lines > 1
              ? TextInputAction.newline
              : textInputAction,
          onChanged: onChanged,
          onSubmitted: (_) => onSubmitted?.call(),
          decoration: InputDecoration(
            hintText: hint,
            errorText: error,
            suffixText: suffix,
          ),
        ),
      ],
    );
  }
}
