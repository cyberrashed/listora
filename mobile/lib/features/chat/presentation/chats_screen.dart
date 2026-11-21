import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../../auth/application/auth_controller.dart';
import '../../auth/presentation/sign_in_prompt.dart';
import '../application/chat_controllers.dart';
import '../application/system_alerts.dart';
import '../data/chat_models.dart';

/// Conversations as a buyer and as a seller, one side at a time.
class ChatsScreen extends ConsumerStatefulWidget {
  const ChatsScreen({super.key});

  @override
  ConsumerState<ChatsScreen> createState() => _ChatsScreenState();
}

class _ChatsScreenState extends ConsumerState<ChatsScreen> {
  var _role = ChatRole.buying;

  @override
  Widget build(BuildContext context) {
    final auth = ref.watch(authControllerProvider);
    final text = Theme.of(context).textTheme;

    return Scaffold(
      body: SafeArea(
        child: switch (auth) {
          AsyncData(value: _?) => Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
                child: Text('Chats', style: text.headlineMedium),
              ),
              Padding(
                padding: const EdgeInsets.symmetric(horizontal: 20),
                child: SegmentedButton<ChatRole>(
                  showSelectedIcon: false,
                  segments: [
                    for (final role in ChatRole.values)
                      ButtonSegment(value: role, label: Text(role.label)),
                  ],
                  selected: {_role},
                  onSelectionChanged: (picked) =>
                      setState(() => _role = picked.single),
                ),
              ),
              const _AlertsBanner(),
              const SizedBox(height: 8),
              Expanded(child: _Conversations(role: _role)),
            ],
          ),
          AsyncData() || AsyncError() => const SignInPrompt(
            title: 'Chats',
            detail: 'Sign in to message sellers and answer buyers.',
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

/// Asks for Android's permission to notify, with the reason beside it.
class _AlertsBanner extends ConsumerWidget {
  const _AlertsBanner();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final allowed = ref.watch(notificationsAllowedProvider);
    if (allowed case AsyncData(value: true) || AsyncLoading() || AsyncError()) {
      return const SizedBox.shrink();
    }
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 16, 20, 0),
      child: DecoratedBox(
        decoration: BoxDecoration(
          color: context.palette.raised,
          borderRadius: BorderRadius.circular(8),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 4, 4, 4),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  'Get a notification when someone writes or makes an offer.',
                  style: text.bodyMedium,
                ),
              ),
              TextButton(
                onPressed: () async {
                  await ref
                      .read(systemNotificationsProvider)
                      .requestPermission();
                  ref.invalidate(notificationsAllowedProvider);
                },
                child: const Text('Turn on'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Conversations extends ConsumerWidget {
  const _Conversations({required this.role});

  final ChatRole role;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversations = ref.watch(conversationsProvider(role));

    return RefreshIndicator(
      onRefresh: () => ref.refresh(conversationsProvider(role).future),
      child: switch (conversations) {
        AsyncData(:final value) when value.isEmpty => CenteredMessage(
          title: role == ChatRole.buying
              ? 'No chats yet'
              : 'No buyers have written yet',
          detail: role == ChatRole.buying
              ? 'Message a seller from any listing.'
              : 'When someone asks about your listings, it shows up here.',
        ),
        AsyncData(:final value) => ListView.separated(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.only(bottom: 24),
          itemCount: value.length,
          separatorBuilder: (context, index) => const Divider(indent: 20),
          itemBuilder: (context, index) => _Row(value[index]),
        ),
        AsyncError(:final error) => CenteredMessage(
          title: "Couldn't load your chats",
          detail: error is ApiError ? error.message : 'Try again.',
          action: OutlinedButton(
            onPressed: () => ref.invalidate(conversationsProvider(role)),
            child: const Text('Try again'),
          ),
        ),
        AsyncLoading() => const Center(child: CircularProgressIndicator()),
      },
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.conversation);

  final Conversation conversation;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final unread = conversation.unread > 0;
    final last = conversation.lastMessage!;

    return InkWell(
      onTap: () => context.push('/chats/${conversation.id}'),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    conversation.otherName,
                    style: text.bodyLarge?.copyWith(
                      fontWeight: unread ? FontWeight.w600 : null,
                    ),
                  ),
                  Text(
                    conversation.listing?.title ?? 'Listing removed',
                    style: text.bodySmall?.copyWith(color: palette.muted),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    last.preview,
                    style: text.bodyMedium?.copyWith(
                      color: unread ? palette.text : palette.muted,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  formatAgo(last.at),
                  style: text.bodySmall?.copyWith(color: palette.muted),
                ),
                if (unread) ...[
                  const SizedBox(height: 6),
                  Badge(
                    label: Text('${conversation.unread}'),
                    backgroundColor: palette.accent,
                    textColor: palette.onAccent,
                  ),
                ],
              ],
            ),
          ],
        ),
      ),
    );
  }
}
