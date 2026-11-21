import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/widgets/detail_row.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../categories/data/category.dart';
import '../../listings/data/listing.dart';
import '../../places/place_picker.dart';

/// The heading every step opens with.
class StepHeading extends StatelessWidget {
  const StepHeading(this.title, {super.key, this.detail});

  final String title;
  final String? detail;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.only(bottom: 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: text.headlineMedium),
          if (detail != null) ...[
            const SizedBox(height: 8),
            Text(
              detail!,
              style: text.bodyLarge?.copyWith(color: context.palette.muted),
            ),
          ],
        ],
      ),
    );
  }
}

/// Walks down the category tree to a category with nothing under it.
/// Listings are always filed at the last level.
class CategoryStep extends StatelessWidget {
  const CategoryStep({
    super.key,
    required this.categories,
    required this.parentId,
    required this.selectedId,
    required this.onOpen,
    required this.onChoose,
    this.error,
  });

  final List<Category> categories;
  final String? parentId;
  final String? selectedId;
  final ValueChanged<String?> onOpen;
  final ValueChanged<Category> onChoose;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final parent = parentId == null ? null : categories.byId(parentId!);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading('What are you selling?'),
        if (error != null)
          Padding(
            padding: const EdgeInsets.only(bottom: 12),
            child: Text(
              error!,
              style: text.bodyMedium?.copyWith(color: palette.negative),
            ),
          ),
        if (parent != null)
          InkWell(
            onTap: () => onOpen(parent.parentId),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 12),
              child: Row(
                children: [
                  Icon(LucideIcons.chevronLeft, size: 18, color: palette.muted),
                  const SizedBox(width: 6),
                  Text(parent.name, style: text.labelLarge),
                ],
              ),
            ),
          ),
        for (final category in categories.childrenOf(parentId)) ...[
          const Divider(),
          InkWell(
            onTap: () => categories.childrenOf(category.id).isEmpty
                ? onChoose(category)
                : onOpen(category.id),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 16),
              child: Row(
                children: [
                  Expanded(child: Text(category.name, style: text.bodyLarge)),
                  Icon(
                    category.id == selectedId
                        ? LucideIcons.check
                        : LucideIcons.chevronRight,
                    size: 18,
                    color: category.id == selectedId
                        ? palette.text
                        : palette.muted,
                  ),
                ],
              ),
            ),
          ),
        ],
      ],
    );
  }
}

/// What the item is and what it costs.
class DetailsStep extends StatelessWidget {
  const DetailsStep({
    super.key,
    required this.title,
    required this.description,
    required this.amount,
    required this.maxAmount,
    required this.mode,
    required this.onModeChanged,
    required this.errors,
  });

  final TextEditingController title;
  final TextEditingController description;
  final TextEditingController amount;
  final TextEditingController maxAmount;
  final PriceMode mode;
  final ValueChanged<PriceMode> onModeChanged;
  final Map<String, String> errors;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    const dollars = TextInputType.numberWithOptions(decimal: true);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading('Describe it'),
        LabeledField(
          label: 'Title',
          hint: '2015 Honda Civic LX, one owner',
          controller: title,
          error: errors['title'],
        ),
        const SizedBox(height: 16),
        LabeledField(
          label: 'Description',
          hint: 'Condition, age, what is included, why you are selling.',
          controller: description,
          error: errors['description'],
          lines: 5,
        ),
        const SizedBox(height: 16),
        Text('Price', style: text.labelLarge),
        const SizedBox(height: 8),
        DropdownButtonFormField<PriceMode>(
          initialValue: mode,
          style: text.bodyLarge,
          onChanged: (value) => onModeChanged(value!),
          items: [
            for (final option in PriceMode.values)
              DropdownMenuItem(value: option, child: Text(option.label)),
          ],
        ),
        if (mode.hasAmount) ...[
          const SizedBox(height: 16),
          LabeledField(
            label: mode == PriceMode.range ? 'From' : 'Amount',
            hint: r'$',
            controller: amount,
            error: errors['price.cents'],
            keyboardType: dollars,
          ),
        ],
        if (mode == PriceMode.range) ...[
          const SizedBox(height: 16),
          LabeledField(
            label: 'To',
            hint: r'$',
            controller: maxAmount,
            error: errors['price.maxCents'],
            keyboardType: dollars,
          ),
        ],
      ],
    );
  }
}

/// The questions this category asks, built from what the dashboard
/// defines. [texts] holds a controller for each typed answer.
class FieldsStep extends StatelessWidget {
  const FieldsStep({
    super.key,
    required this.fields,
    required this.answers,
    required this.texts,
    required this.onAnswer,
    required this.errors,
  });

  final List<ListingField> fields;
  final Map<String, Object> answers;
  final Map<String, TextEditingController> texts;
  final void Function(String fieldId, Object? answer) onAnswer;
  final Map<String, String> errors;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(
          'A few details',
          detail:
              'Buyers filter by these, so they help the right people '
              'find it.',
        ),
        for (final field in fields) ...[
          _FieldInput(
            field: field,
            answer: answers[field.id],
            controller: texts[field.id],
            onAnswer: (answer) => onAnswer(field.id, answer),
            error: errors['attributes.${field.id}'],
          ),
          const SizedBox(height: 16),
        ],
      ],
    );
  }
}

class _FieldInput extends StatelessWidget {
  const _FieldInput({
    required this.field,
    required this.answer,
    required this.controller,
    required this.onAnswer,
    this.error,
  });

  final ListingField field;
  final Object? answer;
  final TextEditingController? controller;
  final ValueChanged<Object?> onAnswer;
  final String? error;

  String get _label =>
      field.required ? field.label : '${field.label} (optional)';

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;

    Widget withLabel(Widget input) => Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(_label, style: text.labelLarge),
        const SizedBox(height: 8),
        input,
        if (error != null) ...[
          const SizedBox(height: 6),
          Text(
            error!,
            style: text.bodySmall?.copyWith(color: palette.negative),
          ),
        ],
      ],
    );

    switch (field.type) {
      case FieldType.text:
      case FieldType.number:
        return LabeledField(
          label: _label,
          controller: controller!,
          error: error,
          suffix: field.unit,
          keyboardType: field.type == FieldType.number
              ? TextInputType.number
              : null,
        );
      case FieldType.select:
        return withLabel(
          DropdownButtonFormField<String>(
            initialValue: answer as String?,
            style: text.bodyLarge,
            hint: const Text('Choose'),
            onChanged: onAnswer,
            items: [
              for (final option in field.options)
                DropdownMenuItem(value: option, child: Text(option)),
            ],
          ),
        );
      case FieldType.multiselect:
        final chosen = (answer as List<String>?) ?? const <String>[];
        return withLabel(
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final option in field.options)
                FilterChip(
                  label: Text(option),
                  selected: chosen.contains(option),
                  onSelected: (selected) => onAnswer(
                    selected
                        ? [...chosen, option]
                        : chosen.where((item) => item != option).toList(),
                  ),
                ),
            ],
          ),
        );
      case FieldType.boolean:
        return Row(
          children: [
            Expanded(child: Text(field.label, style: text.labelLarge)),
            Switch(value: answer == true, onChanged: onAnswer),
          ],
        );
    }
  }
}

/// Where the item is.
class LocationStep extends StatelessWidget {
  const LocationStep({
    super.key,
    required this.selected,
    required this.onSelect,
    required this.showPhone,
    required this.onShowPhoneChanged,
    this.error,
  });

  final Place? selected;
  final ValueChanged<Place?> onSelect;

  /// Null when the seller has no phone number on their account.
  final bool? showPhone;
  final ValueChanged<bool> onShowPhoneChanged;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(
          'Where is it?',
          detail: 'Buyers see the city, never your address.',
        ),
        PlacePicker(selected: selected, onChanged: onSelect, error: error),
        if (showPhone != null) ...[
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  'Show my phone number on this listing',
                  style: text.bodyLarge,
                ),
              ),
              Switch(value: showPhone!, onChanged: onShowPhoneChanged),
            ],
          ),
        ],
      ],
    );
  }
}

/// The last step: everything as the reviewer will read it.
class ReviewStep extends StatelessWidget {
  const ReviewStep({
    super.key,
    required this.rows,
    required this.description,
    required this.editing,
    this.error,
    this.onSeePackages,
  });

  /// Label and value pairs, in the order they were entered.
  final List<(String, String)> rows;
  final String description;
  final bool editing;

  /// Set when posting was refused for lack of a listing credit.
  final VoidCallback? onSeePackages;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        StepHeading(
          'Check it over',
          detail: editing
              ? 'Saving sends the listing back for review before it is '
                    'live again.'
              : 'We review every listing before it goes live, usually '
                    'within a day.',
        ),
        for (final (label, value) in rows) ...[
          DetailRow(label: label, value: value),
          const Divider(),
        ],
        const SizedBox(height: 12),
        Text(description, style: text.bodyLarge),
        if (error != null) ...[
          const SizedBox(height: 16),
          Text(
            error!,
            style: text.bodyMedium?.copyWith(color: palette.negative),
          ),
          if (onSeePackages != null) ...[
            const SizedBox(height: 8),
            Align(
              alignment: Alignment.centerLeft,
              child: OutlinedButton(
                onPressed: onSeePackages,
                child: const Text('See packages'),
              ),
            ),
          ],
        ],
      ],
    );
  }
}
