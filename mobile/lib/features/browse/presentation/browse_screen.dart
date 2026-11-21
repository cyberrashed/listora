import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../auth/application/auth_controller.dart';
import '../../categories/data/categories_api.dart';
import '../../categories/data/category.dart';
import '../../chat/application/chat_controllers.dart';
import '../../content/data/content.dart';
import '../../listings/presentation/listing_photo.dart';
import '../data/browse_api.dart';
import '../data/browse_query.dart';
import 'browse_header.dart';
import 'listing_feed.dart';

/// The first tab: a way into search, the top categories and the latest
/// listings in the buyer's area.
class BrowseScreen extends ConsumerWidget {
  const BrowseScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final area = ref.watch(browseAreaProvider);
    final categories = ref.watch(categoriesProvider).value;
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    const query = BrowseQuery();

    return Scaffold(
      body: SafeArea(
        child: ListingFeed(
          key: ValueKey((query, area)),
          query: query,
          area: area,
          showCount: false,
          emptyTitle: 'Nothing listed here yet',
          emptyDetail: 'Try a wider area, or search anywhere in the US.',
          header: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 8, 8),
              child: Row(
                children: [
                  Expanded(child: Text('Browse', style: text.headlineMedium)),
                  const _Bell(),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20),
              child: InkWell(
                onTap: () => context.push('/browse/results'),
                borderRadius: BorderRadius.circular(8),
                child: InputDecorator(
                  decoration: const InputDecoration(
                    prefixIcon: Icon(LucideIcons.search, size: 18),
                  ),
                  child: Text(
                    'Search listings',
                    style: text.bodyLarge?.copyWith(color: palette.muted),
                  ),
                ),
              ),
            ),
            const _Banners(),
            const SizedBox(height: 4),
            const AreaButton(),
            if (categories != null)
              CategoryChips(categories: categories.childrenOf(null)),
            const _Featured(),
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 24, 20, 4),
              child: Text('Latest listings', style: text.titleMedium),
            ),
          ],
        ),
      ),
    );
  }
}

/// Opens the notification centre, with the count of new ones. Only for
/// someone signed in.
class _Bell extends ConsumerWidget {
  const _Bell();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    if (ref.watch(authControllerProvider).value == null) {
      return const SizedBox(height: 48);
    }
    final count = ref.watch(unreadProvider).value?.notifications ?? 0;
    final palette = context.palette;

    return IconButton(
      tooltip: 'Notifications',
      onPressed: () => context.push('/notifications'),
      icon: Badge(
        isLabelVisible: count > 0,
        label: Text('$count'),
        backgroundColor: palette.accent,
        textColor: palette.onAccent,
        child: const Icon(LucideIcons.bell, size: 22),
      ),
    );
  }
}

/// Listings sellers paid to put on top, side by side. Hidden when there are
/// none, or while they load.
class _Featured extends ConsumerWidget {
  const _Featured();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final featured = ref.watch(featuredListingsProvider).value ?? const [];
    if (featured.isEmpty) return const SizedBox.shrink();
    final text = Theme.of(context).textTheme;
    final palette = context.palette;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 24, 20, 12),
          child: Text('Featured', style: text.titleMedium),
        ),
        SizedBox(
          height: 236,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 20),
            itemCount: featured.length,
            separatorBuilder: (context, index) => const SizedBox(width: 12),
            itemBuilder: (context, index) {
              final listing = featured[index];
              return SizedBox(
                width: 200,
                child: Material(
                  color: palette.raised,
                  borderRadius: BorderRadius.circular(8),
                  clipBehavior: Clip.antiAlias,
                  child: InkWell(
                    onTap: () => context.push('/listing/${listing.id}'),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height: 136,
                          width: double.infinity,
                          child: ListingPhotoBox(listing.photoUrl, radius: 0),
                        ),
                        Padding(
                          padding: const EdgeInsets.fromLTRB(12, 10, 12, 12),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                listing.price.label,
                                style: text.titleMedium,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 2),
                              Text(
                                listing.title,
                                style: text.bodyMedium,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                              ),
                              const SizedBox(height: 4),
                              Text(
                                listing.place,
                                style: text.bodySmall?.copyWith(
                                  color: palette.muted,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

/// Staff's banners, one screen wide each. Hidden when there are none.
class _Banners extends ConsumerWidget {
  const _Banners();

  void _open(BuildContext context, WidgetRef ref, HomeBanner banner) {
    switch (banner.link) {
      case BannerLink.category:
        context.push('/browse/category/${banner.target}');
      case BannerLink.search:
        context.push(
          '/browse/results',
          extra: BrowseQuery(text: banner.target ?? ''),
        );
      case BannerLink.post:
        final signedIn = ref.read(authControllerProvider).value != null;
        context.push(signedIn ? '/selling/new' : '/sign-in');
      case BannerLink.none:
        break;
    }
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final banners = ref.watch(homeBannersProvider).value ?? const [];
    if (banners.isEmpty) return const SizedBox.shrink();
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final width = MediaQuery.sizeOf(context).width - 56;

    return Padding(
      padding: const EdgeInsets.only(top: 16),
      child: SizedBox(
        height: 104,
        child: ListView.separated(
          scrollDirection: Axis.horizontal,
          padding: const EdgeInsets.symmetric(horizontal: 20),
          itemCount: banners.length,
          separatorBuilder: (context, index) => const SizedBox(width: 12),
          itemBuilder: (context, index) {
            final banner = banners[index];
            return SizedBox(
              width: banners.length == 1 ? width + 16 : width,
              child: Material(
                color: palette.primary,
                borderRadius: BorderRadius.circular(8),
                child: InkWell(
                  borderRadius: BorderRadius.circular(8),
                  onTap: banner.link == BannerLink.none
                      ? null
                      : () => _open(context, ref, banner),
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(16, 14, 16, 14),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(
                          banner.title,
                          style: text.titleMedium?.copyWith(
                            color: palette.onPrimary,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        if (banner.body.isNotEmpty) ...[
                          const SizedBox(height: 4),
                          Text(
                            banner.body,
                            style: text.bodyMedium?.copyWith(
                              color: palette.onPrimary.withValues(alpha: 0.75),
                            ),
                            maxLines: 2,
                            overflow: TextOverflow.ellipsis,
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ),
            );
          },
        ),
      ),
    );
  }
}
