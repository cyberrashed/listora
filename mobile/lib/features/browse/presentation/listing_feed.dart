import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/network/api_error.dart';
import '../../listings/presentation/listing_photo.dart';
import '../data/browse_api.dart';
import '../data/browse_query.dart';
import '../data/market_listing.dart';

/// One listing in a list of them. Opens the listing.
class ListingRow extends StatelessWidget {
  const ListingRow(this.listing, {super.key});

  final ListingCard listing;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return InkWell(
      onTap: () => context.push('/listing/${listing.id}'),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Row(
          children: [
            SizedBox.square(
              dimension: 88,
              child: ListingPhotoBox(listing.photoUrl),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Flexible(
                        child: Text(
                          listing.price.label,
                          style: text.titleMedium,
                        ),
                      ),
                      if (listing.featured) ...[
                        const SizedBox(width: 8),
                        const FeaturedMark(),
                      ],
                    ],
                  ),
                  const SizedBox(height: 2),
                  Text(
                    listing.title,
                    style: text.bodyLarge,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    '${listing.place} · ${formatAgo(listing.publishedAt)}',
                    style: text.bodySmall?.copyWith(
                      color: context.palette.muted,
                    ),
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

/// Results for a query, a page at a time as the buyer scrolls, under
/// [header]. Give it a key made of the query and area: a new one starts
/// over from the first page.
class ListingFeed extends ConsumerStatefulWidget {
  const ListingFeed({
    super.key,
    required this.query,
    required this.area,
    this.header = const [],
    this.showCount = true,
    this.emptyTitle = 'Nothing matches',
    this.emptyDetail = 'Try other words, fewer filters or a wider area.',
  });

  final BrowseQuery query;
  final BrowseArea? area;
  final List<Widget> header;
  final bool showCount;
  final String emptyTitle;
  final String emptyDetail;

  @override
  ConsumerState<ListingFeed> createState() => _ListingFeedState();
}

class _ListingFeedState extends ConsumerState<ListingFeed> {
  final _items = <ListingCard>[];
  var _total = 0;
  var _page = 0;
  var _loading = true;
  String? _error;

  /// Bumped by a pull to refresh, so a page still on its way for the old
  /// list is dropped when it lands.
  var _generation = 0;

  bool get _hasMore => _items.length < _total;

  @override
  void initState() {
    super.initState();
    _fetch();
  }

  Future<void> _fetch() async {
    final generation = _generation;
    bool current() => mounted && generation == _generation;
    try {
      final page = await ref
          .read(browseApiProvider)
          .search(widget.query, area: widget.area, page: _page + 1);
      if (!current()) return;
      setState(() {
        _items.addAll(page.items);
        _total = page.total;
        _page = page.page;
      });
    } on ApiError catch (error) {
      if (current()) setState(() => _error = error.message);
    } finally {
      if (current()) setState(() => _loading = false);
    }
  }

  void _more() {
    if (_loading || !_hasMore || _error != null) return;
    setState(() => _loading = true);
    _fetch();
  }

  void _retry() {
    setState(() {
      _error = null;
      _loading = true;
    });
    _fetch();
  }

  Future<void> _reload() {
    setState(() {
      _generation++;
      _items.clear();
      _total = 0;
      _page = 0;
      _error = null;
      _loading = true;
    });
    return _fetch();
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final muted = text.bodyMedium?.copyWith(color: context.palette.muted);

    return RefreshIndicator(
      onRefresh: _reload,
      child: NotificationListener<ScrollUpdateNotification>(
        onNotification: (update) {
          if (update.metrics.extentAfter < 600) _more();
          return false;
        },
        child: CustomScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          slivers: [
            SliverList.list(children: widget.header),
            if (_items.isEmpty)
              SliverFillRemaining(
                hasScrollBody: false,
                child: Padding(
                  padding: const EdgeInsets.all(32),
                  child: Center(
                    child: _loading
                        ? const CircularProgressIndicator()
                        : _Note(
                            title: _error == null
                                ? widget.emptyTitle
                                : "Couldn't load listings",
                            detail: _error ?? widget.emptyDetail,
                            onRetry: _error == null ? null : _retry,
                          ),
                  ),
                ),
              )
            else ...[
              if (widget.showCount)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(20, 16, 20, 4),
                    child: Text(
                      _total == 1
                          ? '1 listing'
                          : '${formatCount(_total)} listings',
                      style: muted,
                    ),
                  ),
                ),
              SliverList.separated(
                itemCount: _items.length,
                itemBuilder: (context, index) => ListingRow(_items[index]),
                separatorBuilder: (context, index) => const Divider(indent: 20),
              ),
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 16, 20, 32),
                  child: Center(
                    child: _loading
                        ? const SizedBox.square(
                            dimension: 24,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : _error != null
                        ? TextButton(
                            onPressed: _retry,
                            child: const Text("Couldn't load more. Try again"),
                          )
                        : const SizedBox.shrink(),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _Note extends StatelessWidget {
  const _Note({required this.title, required this.detail, this.onRetry});

  final String title;
  final String detail;
  final VoidCallback? onRetry;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        Text(title, style: text.titleLarge, textAlign: TextAlign.center),
        const SizedBox(height: 8),
        Text(
          detail,
          style: text.bodyLarge?.copyWith(color: context.palette.muted),
          textAlign: TextAlign.center,
        ),
        if (onRetry != null) ...[
          const SizedBox(height: 20),
          OutlinedButton(onPressed: onRetry, child: const Text('Try again')),
        ],
      ],
    );
  }
}

/// The small mark on a listing a seller has put on top.
class FeaturedMark extends StatelessWidget {
  const FeaturedMark({super.key});

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        Icon(LucideIcons.sparkles, size: 14, color: palette.accent),
        const SizedBox(width: 4),
        Text(
          'Featured',
          style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(color: palette.accent),
        ),
      ],
    );
  }
}
