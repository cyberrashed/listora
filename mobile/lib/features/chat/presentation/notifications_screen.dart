import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../application/chat_controllers.dart';
import '../data/chat_models.dart';

/// Reviews of the person's listings and answers to offers. Opening the
/// screen reads them all; the ones that were new keep their mark until it
/// closes.
class NotificationsScreen extends ConsumerStatefulWidget {
  const NotificationsScreen({super.key});

  @override
  ConsumerState<NotificationsScreen> createState() =>
      _NotificationsScreenState();
}

class _NotificationsScreenState extends ConsumerState<NotificationsScreen> {
  /// What was unread when the list first showed.
  Set<String>? _fresh;

  @override
  Widget build(BuildContext context) {
    final notifications = ref.watch(notificationsProvider);
    if (notifications.value case final items? when _fresh == null) {
      _fresh = {
        for (final item in items)
          if (!item.read) item.id,
      };
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        ref
            .read(notificationsProvider.notifier)
            .markAllRead()
            .catchError((Object _) {});
      });
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Notifications')),
      body: SafeArea(
        child: RefreshIndicator(
          onRefresh: () => ref.refresh(notificationsProvider.future),
          child: switch (notifications) {
            AsyncData(:final value) when value.isEmpty => const CenteredMessage(
              title: 'Nothing new',
              detail: 'Reviews of your listings and offers show up here.',
            ),
            AsyncData(:final value) => ListView.separated(
              physics: const AlwaysScrollableScrollPhysics(),
              padding: const EdgeInsets.only(bottom: 24),
              itemCount: value.length,
              separatorBuilder: (context, index) => const Divider(indent: 20),
              itemBuilder: (context, index) => _Row(
                value[index],
                isNew:
                    !value[index].read ||
                    (_fresh?.contains(value[index].id) ?? false),
              ),
            ),
            AsyncError(:final error) => CenteredMessage(
              title: "Couldn't load notifications",
              detail: error is ApiError ? error.message : 'Try again.',
              action: OutlinedButton(
                onPressed: () => ref.invalidate(notificationsProvider),
                child: const Text('Try again'),
              ),
            ),
            AsyncLoading() => const Center(child: CircularProgressIndicator()),
          },
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  const _Row(this.notification, {required this.isNew});

  final AppNotification notification;
  final bool isNew;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final link = notification.link;

    return InkWell(
      onTap: link == null ? null : () => context.push(link),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 14, 20, 14),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 7, right: 12),
              child: Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: isNew ? palette.accent : null,
                  shape: BoxShape.circle,
                ),
              ),
            ),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(notification.title, style: text.titleMedium),
                  const SizedBox(height: 2),
                  Text(notification.body, style: text.bodyMedium),
                  const SizedBox(height: 4),
                  Text(
                    formatAgo(notification.createdAt),
                    style: text.bodySmall?.copyWith(color: palette.muted),
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
