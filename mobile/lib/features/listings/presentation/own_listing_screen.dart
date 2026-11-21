import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/forms/form_submission.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../../../core/widgets/detail_row.dart';
import '../data/listing.dart';
import '../data/listings_api.dart';
import 'listing_photo.dart';
import 'status_pill.dart';

/// One of the seller's own listings: how it reads, where it stands and what
/// they can still do with it.
class OwnListingScreen extends ConsumerWidget {
  const OwnListingScreen({super.key, required this.listingId});

  final String listingId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listings = ref.watch(ownListingsProvider);

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: switch (listings) {
          AsyncData(:final value) => switch (value
              .where((listing) => listing.id == listingId)
              .firstOrNull) {
            final listing? => _Detail(listing: listing),
            null => const CenteredMessage(
              title: 'This listing is gone',
              detail: 'It was deleted, so there is nothing left to show.',
            ),
          },
          AsyncError(:final error) => CenteredMessage(
            title: "Couldn't load this listing",
            detail: error is ApiError ? error.message : 'Try again.',
            action: OutlinedButton(
              onPressed: () => ref.invalidate(ownListingsProvider),
              child: const Text('Try again'),
            ),
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _Detail extends ConsumerStatefulWidget {
  const _Detail({required this.listing});

  final Listing listing;

  @override
  ConsumerState<_Detail> createState() => _DetailState();
}

class _DetailState extends ConsumerState<_Detail> with FormSubmission {
  Listing get _listing => widget.listing;

  Future<bool> _confirm({
    required String title,
    required String detail,
    required String action,
  }) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: Text(detail),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context, false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(context, true),
            child: Text(action),
          ),
        ],
      ),
    );
    return confirmed ?? false;
  }

  Future<void> _markSold() async {
    final confirmed = await _confirm(
      title: 'Mark as sold?',
      detail: 'Buyers stop seeing it, and it cannot be put back up.',
      action: 'Mark as sold',
    );
    if (!confirmed) return;

    final api = ref.read(listingsApiProvider);
    if (await submit(() => api.markSold(_listing.id))) {
      ref.invalidate(ownListingsProvider);
    }
  }

  /// Spends a credit on the listing. Out of credits, the way to get more is
  /// one tap away.
  Future<void> _spend(Future<void> Function() request) async {
    if (await submit(request)) {
      ref.invalidate(ownListingsProvider);
    } else if (errorCode == 'payment_required' && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(formError ?? 'You need a package for that.'),
          action: SnackBarAction(
            label: 'Packages',
            onPressed: () => context.push('/account/packages'),
          ),
        ),
      );
    }
  }

  Future<void> _delete() async {
    final confirmed = await _confirm(
      title: 'Delete this listing?',
      detail: 'It is removed for good.',
      action: 'Delete',
    );
    if (!confirmed) return;

    final api = ref.read(listingsApiProvider);
    if (await submit(() => api.delete(_listing.id)) && mounted) {
      // Leave first: once the list reloads this listing is no longer in it.
      context.pop();
      ref.invalidate(ownListingsProvider);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final listing = _listing;
    void edit() => context.push('/selling/${listing.id}/edit');

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 24),
      children: [
        if (listing.photos.isNotEmpty) ...[
          PhotoGallery(listing.photos),
          const SizedBox(height: 16),
        ],
        Align(
          alignment: Alignment.centerLeft,
          child: StatusPill(listing.status),
        ),
        const SizedBox(height: 12),
        Text(listing.title, style: text.titleLarge),
        const SizedBox(height: 4),
        Text(listing.price.label, style: text.titleMedium),
        const SizedBox(height: 4),
        Text(
          '${listing.place} · Sent ${formatDate(listing.submittedAt)}',
          style: text.bodyMedium?.copyWith(color: palette.muted),
        ),
        if (_standing(listing) case final standing?) ...[
          const SizedBox(height: 16),
          DecoratedBox(
            decoration: BoxDecoration(
              color: palette.raised,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Text(standing, style: text.bodyMedium),
            ),
          ),
        ],
        const SizedBox(height: 24),
        Text(listing.description, style: text.bodyLarge),
        const SizedBox(height: 16),
        const Divider(),
        DetailRow(label: 'Category', value: listing.categoryPath.join(' / ')),
        for (final attribute in listing.attributes) ...[
          const Divider(),
          DetailRow(label: attribute.label, value: attribute.text),
        ],
        const Divider(),
        DetailRow(
          label: 'Phone',
          value: listing.showPhone ? 'Shown to buyers' : 'Hidden',
        ),
        const Divider(),
        const SizedBox(height: 24),
        if (formError != null) ...[
          Text(
            formError!,
            style: text.bodyMedium?.copyWith(color: palette.negative),
          ),
          const SizedBox(height: 12),
        ],
        if (listing.status == ListingStatus.active) ...[
          FilledButton(
            onPressed: submitting ? null : _markSold,
            child: const Text('Mark as sold'),
          ),
          const SizedBox(height: 12),
          OutlinedButton.icon(
            onPressed: submitting
                ? null
                : () => _spend(
                    () => ref.read(listingsApiProvider).feature(listing.id),
                  ),
            icon: const Icon(LucideIcons.sparkles, size: 18),
            label: Text(
              listing.featuredUntil == null
                  ? 'Feature on top'
                  : 'Featured until ${formatDate(listing.featuredUntil!)}',
            ),
          ),
          const SizedBox(height: 12),
          OutlinedButton(
            onPressed: submitting ? null : edit,
            child: const Text('Edit'),
          ),
        ] else if (listing.status == ListingStatus.expired)
          FilledButton(
            onPressed: submitting
                ? null
                : () => _spend(
                    () => ref.read(listingsApiProvider).renew(listing.id),
                  ),
            child: const Text('Renew for 30 days'),
          )
        else if (listing.canEdit)
          FilledButton(
            onPressed: submitting ? null : edit,
            child: const Text('Edit'),
          ),
        const SizedBox(height: 12),
        TextButton(
          onPressed: submitting ? null : _delete,
          style: TextButton.styleFrom(foregroundColor: palette.negative),
          child: const Text('Delete'),
        ),
      ],
    );
  }
}

/// The one thing the seller should know about where the listing stands, or
/// null when the status says it all.
String? _standing(Listing listing) {
  final reason = listing.rejectionReason;
  final expiresAt = listing.expiresAt;

  return switch (listing.status) {
    ListingStatus.inReview =>
      'We review every listing before it goes live, usually within a day.',
    ListingStatus.rejected when listing.rejectionIsFinal =>
      'Not approved: $reason\n\nThis decision is final.',
    ListingStatus.rejected =>
      'Not approved: $reason\n\n'
          'Edit the listing to send it back for review.',
    ListingStatus.active when expiresAt != null =>
      'Live until ${formatDate(expiresAt)}.',
    ListingStatus.expired =>
      'This listing ran its 30 days and is no longer shown to buyers.',
    _ => null,
  };
}
