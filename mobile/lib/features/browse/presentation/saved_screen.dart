import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/presentation/sign_in_prompt.dart';
import '../data/browse_api.dart';
import 'listing_feed.dart';

/// Listings the buyer kept to come back to. One that sells or runs out
/// drops off by itself.
class SavedScreen extends ConsumerWidget {
  const SavedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final auth = ref.watch(authControllerProvider);

    return Scaffold(
      body: SafeArea(
        child: switch (auth) {
          AsyncData(value: _?) => const _Saved(),
          AsyncData() || AsyncError() => const SignInPrompt(
            title: 'Saved',
            detail: 'Sign in to keep listings you like and come back to them.',
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _Saved extends ConsumerWidget {
  const _Saved();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final saved = ref.watch(savedListingsProvider);
    final text = Theme.of(context).textTheme;

    return RefreshIndicator(
      onRefresh: () => ref.refresh(savedListingsProvider.future),
      child: switch (saved) {
        AsyncData(:final value) when value.isEmpty => const CenteredMessage(
          title: 'Nothing saved yet',
          detail: 'Tap Save on a listing to keep it here.',
        ),
        AsyncData(:final value) => ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          itemCount: value.length + 1,
          separatorBuilder: (context, index) =>
              index == 0 ? const SizedBox.shrink() : const Divider(indent: 20),
          itemBuilder: (context, index) => index == 0
              ? Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 8),
                  child: Text('Saved', style: text.headlineMedium),
                )
              : ListingRow(value[index - 1]),
        ),
        AsyncError(:final error) => CenteredMessage(
          title: "Couldn't load your saved listings",
          detail: error is ApiError ? error.message : 'Try again.',
          action: OutlinedButton(
            onPressed: () => ref.invalidate(savedListingsProvider),
            child: const Text('Try again'),
          ),
        ),
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}
