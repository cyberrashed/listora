import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../../core/widgets/submit_button.dart';
import '../../auth/application/auth_controller.dart';
import '../../browse/presentation/listing_feed.dart';
import '../data/seller.dart';
import '../data/sellers_api.dart';
import 'report_sheet.dart';

/// A seller as buyers see them: who they are, what they sell and what other
/// buyers say about them.
class SellerScreen extends ConsumerWidget {
  const SellerScreen({super.key, required this.sellerId});

  final String sellerId;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final profile = ref.watch(sellerProfileProvider(sellerId));
    final me = ref.watch(authControllerProvider).value?.id;

    return Scaffold(
      appBar: AppBar(
        actions: [
          if (profile.hasValue && me != sellerId)
            PopupMenuButton<void>(
              tooltip: 'More',
              icon: const Icon(LucideIcons.ellipsisVertical, size: 20),
              itemBuilder: (context) => [
                PopupMenuItem(
                  onTap: () => reportSomething(
                    context,
                    ref,
                    target: ReportTarget.user,
                    id: sellerId,
                  ),
                  child: const Text('Report this seller'),
                ),
              ],
            ),
        ],
      ),
      body: SafeArea(
        child: switch (profile) {
          AsyncData(:final value) => _Profile(
            profile: value,
            isMe: me == sellerId,
          ),
          AsyncError(:final error) => CenteredMessage(
            title: "Couldn't load this seller",
            detail: error is ApiError ? error.message : 'Try again.',
            action: OutlinedButton(
              onPressed: () => ref.invalidate(sellerProfileProvider(sellerId)),
              child: const Text('Try again'),
            ),
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _Profile extends ConsumerStatefulWidget {
  const _Profile({required this.profile, required this.isMe});

  final SellerProfile profile;
  final bool isMe;

  @override
  ConsumerState<_Profile> createState() => _ProfileState();
}

class _ProfileState extends ConsumerState<_Profile> {
  var _busy = false;

  Future<void> _toggleFollow() async {
    if (ref.read(authControllerProvider).value == null) {
      context.push('/sign-in');
      return;
    }
    final profile = widget.profile;
    final api = ref.read(sellersApiProvider);
    setState(() => _busy = true);
    try {
      await (profile.following
          ? api.unfollow(profile.id)
          : api.follow(profile.id));
      ref.invalidate(sellerProfileProvider(profile.id));
    } on ApiError catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _review() async {
    final profile = widget.profile;
    final sent = await showModalBottomSheet<bool>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) =>
          _ReviewSheet(sellerName: profile.name, listings: profile.reviewable),
    );
    if (sent ?? false) ref.invalidate(sellerProfileProvider(profile.id));
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final profile = widget.profile;
    final muted = text.bodyMedium?.copyWith(color: palette.muted);

    return ListView(
      padding: const EdgeInsets.only(bottom: 32),
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(20, 4, 20, 0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Flexible(
                    child: Text(profile.name, style: text.headlineMedium),
                  ),
                  if (profile.verified) ...[
                    const SizedBox(width: 8),
                    const VerifiedBadge(),
                  ],
                ],
              ),
              const SizedBox(height: 6),
              RatingLine(profile.rating),
              const SizedBox(height: 4),
              Text(
                [
                  'On Listora since ${formatMonthYear(profile.joinedAt)}',
                  '${profile.followers} '
                      '${profile.followers == 1 ? 'follower' : 'followers'}',
                ].join(' · '),
                style: muted,
              ),
              if (!widget.isMe) ...[
                const SizedBox(height: 16),
                Row(
                  children: [
                    Expanded(
                      child: profile.following
                          ? OutlinedButton(
                              onPressed: _busy ? null : _toggleFollow,
                              child: const Text('Following'),
                            )
                          : FilledButton(
                              onPressed: _busy ? null : _toggleFollow,
                              child: const Text('Follow'),
                            ),
                    ),
                    if (profile.reviewable.isNotEmpty) ...[
                      const SizedBox(width: 12),
                      Expanded(
                        child: OutlinedButton(
                          onPressed: _review,
                          child: const Text('Write a review'),
                        ),
                      ),
                    ],
                  ],
                ),
              ],
            ],
          ),
        ),
        _Heading('Listings', count: profile.listings.length),
        if (profile.listings.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text('Nothing for sale right now.', style: muted),
          ),
        for (final (index, listing) in profile.listings.indexed) ...[
          if (index > 0) const Divider(indent: 20),
          ListingRow(listing),
        ],
        _Heading('Reviews', count: profile.reviews.length),
        if (profile.reviews.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: Text(
              'Buyers can review a seller once they have talked about a listing.',
              style: muted,
            ),
          ),
        for (final (index, review) in profile.reviews.indexed) ...[
          if (index > 0) const Divider(indent: 20),
          _ReviewRow(review, canReport: !widget.isMe),
        ],
      ],
    );
  }
}

class _Heading extends StatelessWidget {
  const _Heading(this.title, {required this.count});

  final String title;
  final int count;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 8),
      child: Text(
        count == 0 ? title : '$title ($count)',
        style: text.titleMedium,
      ),
    );
  }
}

/// The small mark next to a verified seller's name.
class VerifiedBadge extends StatelessWidget {
  const VerifiedBadge({super.key});

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    return Tooltip(
      message: 'Verified by Listora',
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.badgeCheck, size: 18, color: palette.accent),
          const SizedBox(width: 4),
          Text(
            'Verified',
            style: Theme.of(context).textTheme.bodySmall
                ?.copyWith(color: palette.accent),
          ),
        ],
      ),
    );
  }
}

/// A star and the average, or a note that there are no reviews yet.
class RatingLine extends StatelessWidget {
  const RatingLine(this.rating, {super.key});

  final Rating rating;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    return Row(
      children: [
        Icon(
          LucideIcons.star,
          size: 16,
          color: rating.count == 0 ? palette.muted : palette.text,
        ),
        const SizedBox(width: 6),
        Text(
          rating.label,
          style: text.bodyMedium?.copyWith(
            color: rating.count == 0 ? palette.muted : palette.text,
          ),
        ),
      ],
    );
  }
}

class _ReviewRow extends ConsumerWidget {
  const _ReviewRow(this.review, {required this.canReport});

  final SellerReview review;
  final bool canReport;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 12, 8, 12),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    _Stars(review.rating),
                    const SizedBox(width: 8),
                    Text(
                      '${review.reviewerName} · ${formatAgo(review.createdAt)}',
                      style: text.bodySmall?.copyWith(color: palette.muted),
                    ),
                  ],
                ),
                if (review.text.isNotEmpty) ...[
                  const SizedBox(height: 6),
                  Text(review.text, style: text.bodyLarge),
                ],
                const SizedBox(height: 4),
                Text(
                  'For “${review.listingTitle}”',
                  style: text.bodySmall?.copyWith(color: palette.muted),
                ),
              ],
            ),
          ),
          if (canReport)
            IconButton(
              tooltip: 'Report review',
              onPressed: () => reportSomething(
                context,
                ref,
                target: ReportTarget.review,
                id: review.id,
              ),
              icon: Icon(LucideIcons.flag, size: 16, color: palette.muted),
            ),
        ],
      ),
    );
  }
}

/// A review's rating: one star and the number, readable at a glance.
class _Stars extends StatelessWidget {
  const _Stars(this.rating);

  final int rating;

  @override
  Widget build(BuildContext context) {
    return Semantics(
      label: '$rating out of 5 stars',
      excludeSemantics: true,
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(LucideIcons.star, size: 14, color: context.palette.text),
          const SizedBox(width: 4),
          Text('$rating', style: Theme.of(context).textTheme.labelLarge),
        ],
      ),
    );
  }
}

class _ReviewSheet extends ConsumerStatefulWidget {
  const _ReviewSheet({required this.sellerName, required this.listings});

  final String sellerName;
  final List<Reviewable> listings;

  @override
  ConsumerState<_ReviewSheet> createState() => _ReviewSheetState();
}

class _ReviewSheetState extends ConsumerState<_ReviewSheet> {
  final _text = TextEditingController();
  late var _listingId = widget.listings.first.id;
  var _rating = 0;
  var _sending = false;
  String? _error;

  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  Future<void> _send() async {
    if (_rating == 0) {
      setState(() => _error = 'Choose from one to five stars.');
      return;
    }
    setState(() {
      _sending = true;
      _error = null;
    });
    try {
      await ref
          .read(sellersApiProvider)
          .review(
            listingId: _listingId,
            rating: _rating,
            text: _text.text.trim(),
          );
      if (mounted) Navigator.pop(context, true);
    } on ApiError catch (error) {
      if (mounted) {
        setState(
          () => _error = error.fields.values.firstOrNull ?? error.message,
        );
      }
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;

    return SafeArea(
      child: SingleChildScrollView(
        padding: EdgeInsets.fromLTRB(
          20,
          0,
          20,
          16 + MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Review ${widget.sellerName}', style: text.titleLarge),
            const SizedBox(height: 16),
            if (widget.listings.length > 1) ...[
              Text('Which listing', style: text.labelLarge),
              const SizedBox(height: 8),
              DropdownButtonFormField<String>(
                initialValue: _listingId,
                style: text.bodyLarge,
                onChanged: (id) => setState(() => _listingId = id!),
                items: [
                  for (final listing in widget.listings)
                    DropdownMenuItem(
                      value: listing.id,
                      child: Text(
                        listing.title,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
            ] else
              Padding(
                padding: const EdgeInsets.only(bottom: 16),
                child: Text(
                  'For “${widget.listings.first.title}”',
                  style: text.bodyMedium?.copyWith(color: palette.muted),
                ),
              ),
            Text('Your rating', style: text.labelLarge),
            Row(
              children: [
                for (var star = 1; star <= 5; star++)
                  IconButton(
                    tooltip: '$star ${star == 1 ? 'star' : 'stars'}',
                    onPressed: () => setState(() {
                      _rating = star;
                      _error = null;
                    }),
                    icon: Icon(
                      LucideIcons.star,
                      size: 28,
                      color: star <= _rating ? palette.text : palette.control,
                    ),
                  ),
              ],
            ),
            const SizedBox(height: 8),
            LabeledField(
              label: 'What was it like? (optional)',
              controller: _text,
              lines: 4,
            ),
            if (_error != null) ...[
              const SizedBox(height: 12),
              Text(
                _error!,
                style: text.bodyMedium?.copyWith(color: palette.negative),
              ),
            ],
            const SizedBox(height: 16),
            SubmitButton(
              label: 'Post review',
              busy: _sending,
              onPressed: _send,
            ),
          ],
        ),
      ),
    );
  }
}
