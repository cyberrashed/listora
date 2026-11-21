import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/theme.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../data/seller.dart';
import '../data/sellers_api.dart';
import 'seller_screen.dart';

/// The sellers the person follows. Each opens their profile.
class FollowingScreen extends ConsumerWidget {
  const FollowingScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _PeopleScreen(
      title: 'Following',
      people: ref.watch(followingProvider),
      onRetry: () => ref.invalidate(followingProvider),
      emptyTitle: 'Not following anyone',
      emptyDetail: 'Follow a seller from their profile to find them here.',
      trailing: (person) => null,
    );
  }
}

/// The people the person has blocked, with a way to unblock each.
class BlockedScreen extends ConsumerWidget {
  const BlockedScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return _PeopleScreen(
      title: 'Blocked people',
      people: ref.watch(blockedProvider),
      onRetry: () => ref.invalidate(blockedProvider),
      emptyTitle: 'No one is blocked',
      emptyDetail: "Block someone from a chat and they can't message you.",
      trailing: (person) => TextButton(
        onPressed: () async {
          try {
            await ref.read(sellersApiProvider).unblock(person.id);
            ref.invalidate(blockedProvider);
          } on ApiError catch (error) {
            if (context.mounted) {
              ScaffoldMessenger.of(context)
                  .showSnackBar(SnackBar(content: Text(error.message)));
            }
          }
        },
        child: const Text('Unblock'),
      ),
    );
  }
}

class _PeopleScreen extends StatelessWidget {
  const _PeopleScreen({
    required this.title,
    required this.people,
    required this.onRetry,
    required this.emptyTitle,
    required this.emptyDetail,
    required this.trailing,
  });

  final String title;
  final AsyncValue<List<Person>> people;
  final VoidCallback onRetry;
  final String emptyTitle;
  final String emptyDetail;
  final Widget? Function(Person person) trailing;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Scaffold(
      appBar: AppBar(title: Text(title)),
      body: SafeArea(
        child: switch (people) {
          AsyncData(:final value) when value.isEmpty => CenteredMessage(
            title: emptyTitle,
            detail: emptyDetail,
          ),
          AsyncData(:final value) => ListView.separated(
            padding: const EdgeInsets.only(bottom: 24),
            itemCount: value.length,
            separatorBuilder: (context, index) => const Divider(indent: 20),
            itemBuilder: (context, index) {
              final person = value[index];
              return InkWell(
                onTap: () => context.push('/sellers/${person.id}'),
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(20, 12, 12, 12),
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
                                    person.name,
                                    style: text.bodyLarge,
                                  ),
                                ),
                                if (person.verified) ...[
                                  const SizedBox(width: 8),
                                  const VerifiedBadge(),
                                ],
                              ],
                            ),
                            const SizedBox(height: 2),
                            Text(
                              person.rating.label,
                              style: text.bodySmall?.copyWith(
                                color: context.palette.muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                      ?trailing(person),
                    ],
                  ),
                ),
              );
            },
          ),
          AsyncError(:final error) => CenteredMessage(
            title: "Couldn't load this list",
            detail: error is ApiError ? error.message : 'Try again.',
            action: OutlinedButton(
              onPressed: onRetry,
              child: const Text('Try again'),
            ),
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}
