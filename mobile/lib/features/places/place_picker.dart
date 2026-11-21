import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../app/theme/theme.dart';
import '../../core/network/api_error.dart';
import '../../core/widgets/labeled_field.dart';
import '../listings/data/listing.dart';
import '../listings/data/listings_api.dart';

/// A city or ZIP code picked from what the server knows; nothing is typed
/// freehand. Typing again clears the pick until a new one is chosen.
class PlacePicker extends ConsumerStatefulWidget {
  const PlacePicker({
    super.key,
    required this.selected,
    required this.onChanged,
    this.error,
  });

  final Place? selected;
  final ValueChanged<Place?> onChanged;
  final String? error;

  @override
  ConsumerState<PlacePicker> createState() => _PlacePickerState();
}

class _PlacePickerState extends ConsumerState<PlacePicker> {
  late final _search = TextEditingController(text: widget.selected?.label);
  late var _results = [?widget.selected];
  String? _searchError;
  Timer? _delay;

  @override
  void dispose() {
    _delay?.cancel();
    _search.dispose();
    super.dispose();
  }

  void _typed(String typed) {
    _delay?.cancel();
    if (widget.selected != null) widget.onChanged(null);

    _delay = Timer(const Duration(milliseconds: 250), () async {
      try {
        final places = await ref.read(listingsApiProvider).searchPlaces(typed);
        // An older, slower answer must not replace a newer one.
        if (mounted && _search.text == typed) {
          setState(() {
            _results = places;
            _searchError = null;
          });
        }
      } on ApiError catch (error) {
        if (mounted) setState(() => _searchError = error.message);
      }
    });
  }

  void _choose(Place place) {
    FocusScope.of(context).unfocus();
    _search.text = place.label;
    setState(() => _results = [place]);
    widget.onChanged(place);
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        LabeledField(
          label: 'City or ZIP code',
          hint: 'Austin or 78704',
          controller: _search,
          error: widget.error ?? _searchError,
          onChanged: _typed,
          textInputAction: TextInputAction.search,
        ),
        for (final place in _results) ...[
          InkWell(
            onTap: () => _choose(place),
            child: Padding(
              padding: const EdgeInsets.symmetric(vertical: 14),
              child: Row(
                children: [
                  Expanded(child: Text(place.label, style: text.bodyLarge)),
                  if (place.id == widget.selected?.id)
                    Icon(
                      LucideIcons.check,
                      size: 18,
                      color: context.palette.text,
                    ),
                ],
              ),
            ),
          ),
          const Divider(),
        ],
      ],
    );
  }
}
