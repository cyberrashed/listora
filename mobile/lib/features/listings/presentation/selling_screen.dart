import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/theme.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/presentation/sign_in_prompt.dart';
import '../data/listing.dart';
import '../data/listings_api.dart';
import 'listing_photo.dart';
import 'status_pill.dart';

/// The seller's side of the app: what they have posted and where each
/// listing stands.
class SellingScreen extends ConsumerWidget {
  const SellingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return Scaffold(
      body: SafeArea(
        child: switch (auth) {
          AsyncData(value: _?) => const _OwnListings(),
          AsyncData() || AsyncError() => const SignInPrompt(
            title: 'Selling',
            detail:
                'Sign in to post a listing and keep track of the ones you '
                'have up.',
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _OwnListings extends ConsumerWidget {
  const _OwnListings();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final listings = ref.watch(ownListingsProvider);
    final post = FilledButton(
      onPressed: () => context.push('/selling/new'),
      child: const Text('Post a listing'),
    );

    return RefreshIndicator(
      onRefresh: () => ref.refresh(ownListingsProvider.future),
      child: switch (listings) {
        AsyncData(:final value) when value.isEmpty => CenteredMessage(
          title: 'Nothing listed yet',
          detail: 'Post something and follow it here from review to sold.',
          action: post,
        ),
        AsyncData(:final value) => _List(listings: value, post: post),
        AsyncError(:final error) => CenteredMessage(
          title: "Couldn't load your listings",
          detail: error is ApiError ? error.message : 'Try again.',
          action: OutlinedButton(
            onPressed: () => ref.invalidate(ownListingsProvider),
            child: const Text('Try again'),
          ),
        ),
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _List extends StatelessWidget {
  const _List({required this.listings, required this.post});

  final List<Listing> listings;
  final Widget post;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return ListView.separated(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.only(bottom: 24),
      itemCount: listings.length + 1,
      separatorBuilder: (context, index) =>
          index == 0 ? const Divider() : const Divider(indent: 20),
      itemBuilder: (context, index) {
        if (index == 0) {
          return Padding(
            padding: const EdgeInsets.fromLTRB(20, 24, 20, 20),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text('Selling', style: text.headlineMedium),
                const SizedBox(height: 16),
                post,
              ],
            ),
          );
        }

        final listing = listings[index - 1];
        return InkWell(
          onTap: () => context.push('/selling/${listing.id}'),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
            child: Row(
              children: [
                SizedBox.square(
                  dimension: 56,
                  child: ListingPhotoBox(
                    listing.photos.firstOrNull?.thumbUrl,
                    radius: 6,
                  ),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        listing.title,
                        style: text.bodyLarge,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        '${listing.price.label} · ${listing.place}',
                        style: text.bodyMedium?.copyWith(
                          color: context.palette.muted,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 12),
                StatusPill(listing.status),
              ],
            ),
          ),
        );
      },
    );
  }
}
