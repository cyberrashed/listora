import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../../../core/widgets/detail_row.dart';
import '../../../core/widgets/submit_button.dart';
import '../../auth/application/auth_controller.dart';
import '../../chat/data/chat_api.dart';
import '../../listings/presentation/listing_photo.dart';
import '../../sellers/data/seller.dart';
import '../../sellers/presentation/report_sheet.dart';
import '../../sellers/presentation/seller_screen.dart';
import '../data/browse_api.dart';
import '../data/market_listing.dart';

/// A listing as buyers see it.
class ListingScreen extends ConsumerWidget {
  const ListingScreen({super.key, required this.listingId});

  final String listingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listing = ref.watch(marketListingProvider(listingId));
    final viewerId = ref.watch(authControllerProvider).value?.id;

    return Scaffold(
      appBar: AppBar(
        actions: [
          if (listing case AsyncData(:final value))
            if (value.sellerId != viewerId) ...[
              _SaveButton(value.card),
              PopupMenuButton<void>(
                tooltip: 'More',
                icon: const Icon(LucideIcons.ellipsisVertical, size: 20),
                itemBuilder: (context) => [
                  PopupMenuItem(
                    onTap: () => reportSomething(
                      context,
                      ref,
                      target: ReportTarget.listing,
                      id: listingId,
                    ),
                    child: const Text('Report listing'),
                  ),
                ],
              ),
            ],
          const SizedBox(width: 8),
        ],
      ),
      bottomNavigationBar: switch (listing) {
        AsyncData(:final value) when value.sellerId != viewerId =>
          _MessageSeller(value.card.id),
        _ => null,
      },
      body: SafeArea(
        child: switch (listing) {
          AsyncData(:final value) => _Detail(
            listing: value,
            isOwn: value.sellerId == viewerId,
          ),
          AsyncError(:final error) => CenteredMessage(
            title: error is ApiError && error.code == 'not_found'
                ? 'No longer available'
                : "Couldn't load this listing",
            detail: error is ApiError && error.code == 'not_found'
                ? 'It sold, ran out or was taken down.'
                : error is ApiError
                ? error.message
                : 'Try again.',
            action: OutlinedButton(
              onPressed: () => ref.invalidate(marketListingProvider(listingId)),
              child: const Text('Try again'),
            ),
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _SaveButton extends ConsumerWidget {
  const _SaveButton(this.listing);

  final ListingCard listing;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final signedIn = ref.watch(authControllerProvider).value != null;
    final saved =
        ref
            .watch(savedListingsProvider)
            .value
            ?.any((item) => item.id == listing.id) ??
        false;

    return TextButton.icon(
      onPressed: () async {
        if (!signedIn) {
          context.push('/sign-in');
          return;
        }
        try {
          await ref.read(savedListingsProvider.notifier).toggle(listing);
        } on ApiError catch (error) {
          if (context.mounted) {
            ScaffoldMessenger.of(context)
                .showSnackBar(SnackBar(content: Text(error.message)));
          }
        }
      },
      icon: Icon(
        saved ? LucideIcons.bookmarkCheck : LucideIcons.bookmark,
        size: 18,
      ),
      label: Text(saved ? 'Saved' : 'Save'),
    );
  }
}

/// Opens the buyer's conversation with the seller, starting it if needed.
class _MessageSeller extends ConsumerStatefulWidget {
  const _MessageSeller(this.listingId);

  final String listingId;

  @override
  ConsumerState<_MessageSeller> createState() => _MessageSellerState();
}

class _MessageSellerState extends ConsumerState<_MessageSeller> {
  var _busy = false;

  Future<void> _open() async {
    if (ref.read(authControllerProvider).value == null) {
      context.push('/sign-in');
      return;
    }
    setState(() => _busy = true);
    try {
      final conversation = await ref
          .read(chatApiProvider)
          .start(widget.listingId);
      if (mounted) context.push('/chats/${conversation.id}');
    } on ApiError catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 8, 20, 12),
        child: SubmitButton(
          label: 'Message seller',
          busy: _busy,
          onPressed: _open,
        ),
      ),
    );
  }
}

class _Detail extends StatelessWidget {
  const _Detail({required this.listing, required this.isOwn});

  final MarketListing listing;
  final bool isOwn;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final card = listing.card;
    final muted = text.bodyMedium?.copyWith(color: palette.muted);
    final phone = listing.sellerPhone;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
      children: [
        if (listing.photos.isNotEmpty) ...[
          PhotoGallery(listing.photos),
          const SizedBox(height: 16),
        ],
        Text(listing.categoryPath.join(' / '), style: muted),
        const SizedBox(height: 6),
        Text(card.title, style: text.titleLarge),
        const SizedBox(height: 4),
        Text(card.price.label, style: text.titleMedium),
        const SizedBox(height: 4),
        Text(
          '${card.place} · Posted ${formatAgo(card.publishedAt)}',
          style: muted,
        ),
        if (isOwn) ...[
          const SizedBox(height: 16),
          DecoratedBox(
            decoration: BoxDecoration(
              color: palette.raised,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text(
                'This is your listing. Manage it from the Selling tab.',
                style: text.bodyMedium,
              ),
            ),
          ),
        ],
        const SizedBox(height: 24),
        Text(listing.description, style: text.bodyLarge),
        if (listing.attributes.isNotEmpty) ...[
          const SizedBox(height: 16),
          for (final attribute in listing.attributes) ...[
            const Divider(),
            DetailRow(label: attribute.label, value: attribute.text),
          ],
          const Divider(),
        ],
        const SizedBox(height: 28),
        Text('Seller', style: text.titleMedium),
        const SizedBox(height: 4),
        InkWell(
          onTap: () => context.push('/sellers/${listing.sellerId}'),
          child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Flexible(
                            child: Text(
                              listing.sellerName,
                              style: text.bodyLarge,
                            ),
                          ),
                          if (listing.sellerVerified) ...[
                            const SizedBox(width: 8),
                            const VerifiedBadge(),
                          ],
                        ],
                      ),
                      const SizedBox(height: 2),
                      RatingLine(listing.sellerRating),
                      Text(
                        'On Listora since '
                        '${formatMonthYear(listing.sellerJoinedAt)}',
                        style: muted,
                      ),
                    ],
                  ),
                ),
                Icon(LucideIcons.chevronRight, size: 18, color: palette.muted),
              ],
            ),
          ),
        ),
        const SizedBox(height: 24),
        InkWell(
          onTap: () => context.push('/pages/safety-tips'),
          borderRadius: BorderRadius.circular(8),
          child: DecoratedBox(
            decoration: BoxDecoration(
              color: palette.raised,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Row(
                children: [
                  Icon(LucideIcons.shieldCheck, size: 18, color: palette.muted),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'Meet in a public place and check the item before you pay.',
                      style: text.bodyMedium,
                    ),
                  ),
                  Text('Safety tips', style: text.labelLarge),
                ],
              ),
            ),
          ),
        ),
        if (phone != null) ...[
          const SizedBox(height: 16),
          OutlinedButton.icon(
            onPressed: () async {
              await Clipboard.setData(ClipboardData(text: phone));
              if (context.mounted) {
                ScaffoldMessenger.of(context)
                    .showSnackBar(SnackBar(content: Text('Copied $phone')));
              }
            },
            icon: const Icon(LucideIcons.phone, size: 18),
            label: Text(phone),
          ),
        ],
      ],
    );
  }
}
