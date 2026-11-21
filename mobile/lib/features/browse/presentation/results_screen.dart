import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../categories/data/categories_api.dart';
import '../../categories/data/category.dart';
import '../data/browse_api.dart';
import '../data/browse_query.dart';
import 'browse_header.dart';
import 'listing_feed.dart';

/// Search results, or everything in a category. The search box and the
/// filters change what is shown here, in place.
class ResultsScreen extends ConsumerStatefulWidget {
  const ResultsScreen({
    super.key,
    this.initial = const BrowseQuery(),
    this.focusSearch = false,
  });

  final BrowseQuery initial;

  /// Opened from the search box: ready to type.
  final bool focusSearch;

  @override
  ConsumerState<ResultsScreen> createState() => _ResultsScreenState();
}

class _ResultsScreenState extends ConsumerState<ResultsScreen> {
  late var _query = widget.initial;
  late final _search = TextEditingController(text: widget.initial.text);

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  Future<void> _openFilters() async {
    final next = await context.push<BrowseQuery>('/filters', extra: _query);
    if (next != null && mounted) setState(() => _query = next);
  }

  @override
  Widget build(BuildContext context) {
    final area = ref.watch(browseAreaProvider);
    final categories = ref.watch(categoriesProvider).value ?? const [];
    final categoryId = _query.categoryId;
    final category = categoryId == null ? null : categories.byId(categoryId);
    final filters = _query.filterCount;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: TextField(
          controller: _search,
          autofocus: widget.focusSearch,
          textInputAction: TextInputAction.search,
          onSubmitted: (typed) =>
              setState(() => _query = _query.withText(typed)),
          decoration: InputDecoration(
            isDense: true,
            hintText: category == null
                ? 'Search listings'
                : 'Search in ${category.name}',
            prefixIcon: const Icon(LucideIcons.search, size: 18),
          ),
        ),
        actions: [
          TextButton.icon(
            onPressed: _openFilters,
            icon: const Icon(LucideIcons.slidersHorizontal, size: 18),
            label: Text(filters == 0 ? 'Filters' : 'Filters · $filters'),
          ),
          const SizedBox(width: 8),
        ],
      ),
      body: ListingFeed(
        key: ValueKey((_query, area)),
        query: _query,
        area: area,
        header: [
          if (category != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 12, 20, 0),
              child: Text(
                category.name,
                style: Theme.of(context).textTheme.headlineMedium,
              ),
            ),
          const AreaButton(),
          if (categories.childrenOf(categoryId) case final children
              when category != null && children.isNotEmpty)
            CategoryChips(categories: children),
        ],
      ),
    );
  }
}
