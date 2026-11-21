import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/location.dart';
import '../../../core/network/api_error.dart';
import '../../listings/data/listings_api.dart';
import '../../places/place_picker.dart';
import '../data/browse_api.dart';
import '../data/browse_query.dart';

const _radii = [10, 25, 50, 100, 250];

/// Where to look: a city or ZIP code and a distance around it, or anywhere.
class AreaScreen extends ConsumerStatefulWidget {
  const AreaScreen({super.key});

  @override
  ConsumerState<AreaScreen> createState() => _AreaScreenState();
}

class _AreaScreenState extends ConsumerState<AreaScreen> {
  late final _current = ref.read(browseAreaProvider);
  late var _place = _current?.place;
  late var _radius = _current?.radius ?? 25;
  String? _error;
  var _locating = false;

  /// Bumped when the phone's location picks the place, so the picker shows it.
  var _located = 0;

  Future<void> _useMyLocation() async {
    setState(() {
      _locating = true;
      _error = null;
    });
    try {
      final point = await ref.read(currentPositionProvider)();
      // The seller may have left the screen while the phone looked.
      if (!mounted) return;
      if (point == null) {
        setState(() => _error = 'Location is off. Pick a city instead.');
        return;
      }
      final place = await ref
          .read(listingsApiProvider)
          .nearestPlace(point.lat, point.lng);
      if (!mounted) return;
      setState(() {
        _place = place;
        _located++;
      });
    } on ApiError catch (error) {
      if (mounted) setState(() => _error = error.message);
    } finally {
      if (mounted) setState(() => _locating = false);
    }
  }

  void _apply() {
    final place = _place;
    if (place == null) {
      setState(() => _error = 'Choose a city or ZIP code from the list.');
      return;
    }
    ref
        .read(browseAreaProvider.notifier)
        .set(BrowseArea(place: place, radius: _radius));
    context.pop();
  }

  void _anywhere() {
    ref.read(browseAreaProvider.notifier).set(null);
    context.pop();
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: const Text('Location')),
      body: SafeArea(
        child: Column(
          children: [
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 8, 20, 24),
                children: [
                  Text(
                    'Browsing and search show listings within this '
                    'distance.',
                    style: text.bodyLarge?.copyWith(
                      color: context.palette.muted,
                    ),
                  ),
                  const SizedBox(height: 20),
                  Align(
                    alignment: Alignment.centerLeft,
                    child: OutlinedButton.icon(
                      onPressed: _locating ? null : _useMyLocation,
                      icon: _locating
                          ? const SizedBox.square(
                              dimension: 16,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(LucideIcons.locateFixed, size: 18),
                      label: const Text('Use my current location'),
                    ),
                  ),
                  const SizedBox(height: 16),
                  PlacePicker(
                    key: ValueKey(_located),
                    selected: _place,
                    error: _error,
                    onChanged: (place) => setState(() {
                      _place = place;
                      _error = null;
                    }),
                  ),
                  const SizedBox(height: 24),
                  Text('Within', style: text.titleMedium),
                  const SizedBox(height: 10),
                  Wrap(
                    spacing: 8,
                    runSpacing: 8,
                    children: [
                      for (final miles in _radii)
                        ChoiceChip(
                          label: Text('$miles mi'),
                          selected: _radius == miles,
                          showCheckmark: false,
                          onSelected: (_) => setState(() => _radius = miles),
                        ),
                    ],
                  ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 8, 20, 16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  FilledButton(onPressed: _apply, child: const Text('Apply')),
                  const SizedBox(height: 8),
                  TextButton(
                    onPressed: _anywhere,
                    child: const Text('Search anywhere in the US'),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
