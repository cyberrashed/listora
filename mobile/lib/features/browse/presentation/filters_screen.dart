import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../listings/data/listing.dart';
import '../../listings/data/listings_api.dart';
import '../data/browse_query.dart';

/// Order, price and the category's own questions. Closing with "Show
/// results" hands the new query back to the results screen.
class FiltersScreen extends ConsumerStatefulWidget {
  const FiltersScreen({super.key, required this.query});

  final BrowseQuery query;

  @override
  ConsumerState<FiltersScreen> createState() => _FiltersScreenState();
}

class _FiltersScreenState extends ConsumerState<FiltersScreen> {
  late var _sort = widget.query.sort;
  late final _minPrice = TextEditingController(
    text: typedDollars(widget.query.minCents),
  );
  late final _maxPrice = TextEditingController(
    text: typedDollars(widget.query.maxCents),
  );

  /// Picked choices and switches by field id. Typed ranges live in
  /// [_ranges] until the query is built.
  late final _picked = {
    for (final MapEntry(:key, :value) in widget.query.filters.entries)
      if (value is! NumberRange) key: value,
  };
  final _ranges = <String, (TextEditingController, TextEditingController)>{};
  String? _priceError;

  @override
  void dispose() {
    for (final controller in [
      _minPrice,
      _maxPrice,
      for (final (min, max) in _ranges.values) ...[min, max],
    ]) {
      controller.dispose();
    }
    super.dispose();
  }

  (TextEditingController, TextEditingController) _range(String fieldId) =>
      _ranges.putIfAbsent(fieldId, () {
        final saved = widget.query.filters[fieldId];
        final range = saved is NumberRange ? saved : const NumberRange();
        return (
          TextEditingController(text: range.min?.toString() ?? ''),
          TextEditingController(text: range.max?.toString() ?? ''),
        );
      });

  BrowseQuery _build() {
    final filters = <String, Object>{..._picked};
    for (final MapEntry(:key, value: (min, max)) in _ranges.entries) {
      final range = NumberRange(
        min: num.tryParse(min.text.replaceAll(',', '')),
        max: num.tryParse(max.text.replaceAll(',', '')),
      );
      if (range.min != null || range.max != null) filters[key] = range;
    }

    return BrowseQuery(
      text: widget.query.text,
      categoryId: widget.query.categoryId,
      minCents: parseDollars(_minPrice.text),
      maxCents: parseDollars(_maxPrice.text),
      filters: filters,
      sort: _sort,
    );
  }

  void _apply() {
    final query = _build();
    final (min, max) = (query.minCents, query.maxCents);
    if (min != null && max != null && min > max) {
      setState(() => _priceError = 'Make this higher than the minimum.');
      return;
    }
    context.pop(query);
  }

  void _clear() => context.pop(
    BrowseQuery(text: widget.query.text, categoryId: widget.query.categoryId),
  );

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final categoryId = widget.query.categoryId;
    final fields = categoryId == null
        ? null
        : ref.watch(categoryFieldsProvider(categoryId));
    final searching = widget.query.text.isNotEmpty;

    return Scaffold(
      appBar: AppBar(
        title: const Text('Filters'),
        actions: [
          TextButton(onPressed: _clear, child: const Text('Clear all')),
          const SizedBox(width: 8),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  _Section('Sort by'),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final (order, label) in [
                        (null, searching ? 'Best match' : 'Newest first'),
                        if (searching) (SortOrder.newest, 'Newest first'),
                        (SortOrder.priceLow, SortOrder.priceLow.label),
                        (SortOrder.priceHigh, SortOrder.priceHigh.label),
                      ])
                        ChoiceChip(
                          label: Text(label),
                          selected: _sort == order,
                          showCheckmark: false,
                          onSelected: (_) => setState(() => _sort = order),
                        ),
                    ],
                  ),
                  _Section('Price'),
                  _RangeInputs(
                    min: _minPrice,
                    max: _maxPrice,
                    icon: LucideIcons.dollarSign,
                    decimal: true,
                    error: _priceError,
                  ),
                  ...switch (fields) {
                    null => [
                      const SizedBox(height: 24),
                      Text(
                        'Pick a category to filter by its details, like '
                        'mileage or size.',
                        style: text.bodyMedium?.copyWith(
                          color: context.palette.muted,
                        ),
                      ),
                    ],
                    AsyncData(:final value) => [
                      for (final field in value)
                        if (field.filterable && field.type != FieldType.text)
                          ..._fieldFilter(field),
                    ],
                    AsyncError() => [
                      const SizedBox(height: 24),
                      Text(
                        "Couldn't load this category's details.",
                        style: text.bodyMedium?.copyWith(
                          color: context.palette.negative,
                        ),
                      ),
                    ],
                    AsyncLoading() => [
                      const Padding(
                        padding: EdgeInsets.all(24),
                        child: Center(child: CircularProgressIndicator()),
                      ),
                    ],
                  },
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _apply,
                  child: const Text('Show results'),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  List<Widget> _fieldFilter(ListingField field) {
    switch (field.type) {
      case FieldType.select:
      case FieldType.multiselect:
        final chosen = (_picked[field.id] as List<String>?) ?? const [];
        return [
          _Section(field.label),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: [
              for (final option in field.options)
                FilterChip(
                  label: Text(option),
                  selected: chosen.contains(option),
                  onSelected: (selected) => setState(() {
                    final next = selected
                        ? [...chosen, option]
                        : chosen.where((item) => item != option).toList();
                    next.isEmpty
                        ? _picked.remove(field.id)
                        : _picked[field.id] = next;
                  }),
                ),
            ],
          ),
        ];
      case FieldType.number:
        final (min, max) = _range(field.id);
        return [
          _Section(field.label),
          _RangeInputs(min: min, max: max, suffix: field.unit),
        ];
      case FieldType.boolean:
        return [
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: Text(
                  field.label,
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
              ),
              Switch(
                value: _picked[field.id] == true,
                onChanged: (on) => setState(
                  () =>
                      on ? _picked[field.id] = true : _picked.remove(field.id),
                ),
              ),
            ],
          ),
        ];
      case FieldType.text:
        return const [];
    }
  }
}

class _Section extends StatelessWidget {
  const _Section(this.title);

  final String title;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 24, bottom: 10),
    child: Text(title, style: Theme.of(context).textTheme.titleMedium),
  );
}

/// Two boxes for the bottom and top of a range. Either can stay empty.
class _RangeInputs extends StatelessWidget {
  const _RangeInputs({
    required this.min,
    required this.max,
    this.icon,
    this.suffix,
    this.decimal = false,
    this.error,
  });

  final TextEditingController min;
  final TextEditingController max;
  final IconData? icon;
  final String? suffix;
  final bool decimal;
  final String? error;

  @override
  Widget build(BuildContext context) {
    Widget box(TextEditingController controller, String hint, {String? e}) =>
        Expanded(
          child: TextField(
            controller: controller,
            keyboardType: TextInputType.numberWithOptions(decimal: decimal),
            decoration: InputDecoration(
              hintText: hint,
              prefixIcon: icon == null ? null : Icon(icon, size: 16),
              suffixText: suffix,
              errorText: e,
              errorMaxLines: 2,
            ),
          ),
        );

    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        box(min, 'No min'),
        const SizedBox(width: 12),
        box(max, 'No max', e: error),
      ],
    );
  }
}
