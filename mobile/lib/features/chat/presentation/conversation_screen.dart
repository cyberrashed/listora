import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../../../core/widgets/labeled_field.dart';
import '../../auth/application/auth_controller.dart';
import '../../listings/data/listing.dart';
import '../../sellers/data/seller.dart';
import '../../sellers/data/sellers_api.dart';
import '../../sellers/presentation/report_sheet.dart';
import '../application/chat_controllers.dart';
import '../data/chat_models.dart';

/// One conversation: the messages, offers and a box to write in.
class ConversationScreen extends ConsumerStatefulWidget {
  const ConversationScreen({super.key, required this.conversationId});

  final String conversationId;

  @override
  ConsumerState<ConversationScreen> createState() => _ConversationScreenState();
}

class _ConversationScreenState extends ConsumerState<ConversationScreen> {
  late final _open = ref.read(openConversationProvider);
  final _draft = TextEditingController();
  var _sending = false;

  String get _id => widget.conversationId;

  @override
  void initState() {
    super.initState();
    _open.id = _id;
  }

  @override
  void dispose() {
    if (_open.id == _id) _open.id = null;
    _draft.dispose();
    super.dispose();
  }

  /// Runs a request that adds to the conversation, showing why if it fails.
  Future<bool> _run(
    Future<void> Function(MessagesController chat) request,
  ) async {
    setState(() => _sending = true);
    try {
      await request(ref.read(messagesProvider(_id).notifier));
      return true;
    } on ApiError catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
      return false;
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  Future<void> _send() async {
    final text = _draft.text.trim();
    if (text.isEmpty) return;
    if (await _run((chat) => chat.send(text))) _draft.clear();
  }

  Future<void> _offer(Conversation conversation) async {
    final cents = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      builder: (context) => _OfferSheet(listing: conversation.listing!),
    );
    if (cents != null) await _run((chat) => chat.offer(cents));
  }

  @override
  Widget build(BuildContext context) {
    final conversation = ref.watch(conversationProvider(_id));
    final messages = ref.watch(messagesProvider(_id));
    final me = ref.watch(authControllerProvider).value?.id;
    final current = conversation.value;

    return Scaffold(
      appBar: AppBar(
        titleSpacing: 0,
        title: current == null ? null : _Title(current),
        actions: [if (current != null) _menu(current)],
      ),
      body: SafeArea(
        child: switch ((conversation, messages)) {
          (AsyncData(value: final about), AsyncData(value: final list)) =>
            Column(
              children: [
                ?_standing(about),
                Expanded(
                  child: list.isEmpty
                      ? CenteredMessage(
                          title: 'Say hello',
                          detail: about.role == ChatRole.buying
                              ? 'Ask ${about.otherName} anything about the '
                                    'listing, or make an offer.'
                              : 'Answer ${about.otherName} here.',
                        )
                      : _Thread(
                          messages: list,
                          me: me,
                          otherName: about.otherName,
                        ),
                ),
                if (!about.otherBlocked)
                  _Composer(
                    draft: _draft,
                    busy: _sending,
                    onSend: _send,
                    onOffer: about.canOffer ? () => _offer(about) : null,
                  ),
              ],
            ),
          (AsyncError(:final error), _) ||
          (_, AsyncError(:final error)) => CenteredMessage(
            title: "Couldn't open this chat",
            detail: error is ApiError ? error.message : 'Try again.',
            action: OutlinedButton(
              onPressed: () {
                ref.invalidate(conversationProvider(_id));
                ref.invalidate(messagesProvider(_id));
              },
              child: const Text('Try again'),
            ),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }

  Future<void> _setBlocked(Conversation conversation, bool blocked) async {
    final api = ref.read(sellersApiProvider);
    try {
      await (blocked
          ? api.block(conversation.otherId)
          : api.unblock(conversation.otherId));
      ref.invalidate(conversationProvider(_id));
    } on ApiError catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    }
  }

  Widget _menu(Conversation conversation) {
    return PopupMenuButton<void>(
      tooltip: 'More',
      icon: const Icon(LucideIcons.ellipsisVertical, size: 20),
      itemBuilder: (context) => [
        PopupMenuItem(
          onTap: () => context.push('/sellers/${conversation.otherId}'),
          child: const Text('View profile'),
        ),
        PopupMenuItem(
          onTap: () => _setBlocked(conversation, !conversation.otherBlocked),
          child: Text(
            conversation.otherBlocked
                ? 'Unblock ${conversation.otherName}'
                : 'Block ${conversation.otherName}',
          ),
        ),
        PopupMenuItem(
          onTap: () => reportSomething(
            context,
            ref,
            target: ReportTarget.user,
            id: conversation.otherId,
          ),
          child: Text('Report ${conversation.otherName}'),
        ),
      ],
    );
  }

  /// What sits above the messages: a block, an offer waiting for an answer,
  /// or why the listing can't be bought any more.
  Widget? _standing(Conversation conversation) {
    final offer = conversation.offer;

    if (conversation.otherBlocked) {
      return _Strip(
        text:
            "You blocked ${conversation.otherName}. Neither of you can "
            'write here.',
        actions: [
          TextButton(
            onPressed: () => _setBlocked(conversation, false),
            child: const Text('Unblock'),
          ),
        ],
      );
    }
    final listing = conversation.listing;

    if (offer?.status == OfferStatus.pending) {
      final amount = formatDollars(offer!.cents);
      return _Strip(
        text: conversation.role == ChatRole.selling
            ? '${conversation.otherName} offered $amount.'
            : 'You offered $amount. Waiting for ${conversation.otherName}.',
        actions: conversation.role == ChatRole.selling
            ? [
                TextButton(
                  onPressed: _sending
                      ? null
                      : () => _run((chat) => chat.answer(accept: false)),
                  child: const Text('Decline'),
                ),
                FilledButton(
                  onPressed: _sending
                      ? null
                      : () => _run((chat) => chat.answer(accept: true)),
                  style: FilledButton.styleFrom(
                    minimumSize: const Size(64, 36),
                  ),
                  child: const Text('Accept'),
                ),
              ]
            : const [],
      );
    }
    if (listing == null) return const _Strip(text: 'This listing was removed.');
    return switch (listing.status) {
      ListingStatus.sold => const _Strip(text: 'This listing has sold.'),
      ListingStatus.expired => const _Strip(text: 'This listing has ended.'),
      _ => null,
    };
  }
}

class _Title extends StatelessWidget {
  const _Title(this.conversation);

  final Conversation conversation;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final listing = conversation.listing;

    return InkWell(
      onTap: listing?.status == ListingStatus.active
          ? () => context.push('/listing/${listing!.id}')
          : null,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(conversation.otherName, style: text.titleMedium),
          if (listing != null)
            Text(
              '${listing.title} · ${listing.price.label}',
              style: text.bodySmall?.copyWith(color: context.palette.muted),
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
            ),
        ],
      ),
    );
  }
}

class _Strip extends StatelessWidget {
  const _Strip({required this.text, this.actions = const []});

  final String text;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: context.palette.raised,
        border: Border(bottom: BorderSide(color: context.palette.border)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 10, 12, 10),
        child: Row(
          children: [
            Expanded(
              child: Text(text, style: Theme.of(context).textTheme.bodyMedium),
            ),
            for (final action in actions) ...[const SizedBox(width: 8), action],
          ],
        ),
      ),
    );
  }
}

/// The messages, newest at the bottom, with a heading where the day changes.
class _Thread extends StatelessWidget {
  const _Thread({
    required this.messages,
    required this.me,
    required this.otherName,
  });

  final List<ChatMessage> messages;
  final String? me;
  final String otherName;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final rows = <Widget>[];
    String? day;
    for (final message in messages) {
      final label = formatDay(message.createdAt);
      if (label != day) {
        day = label;
        rows.add(
          Padding(
            padding: const EdgeInsets.only(top: 12, bottom: 6),
            child: Center(
              child: Text(
                label,
                style: text.bodySmall?.copyWith(color: context.palette.muted),
              ),
            ),
          ),
        );
      }
      rows.add(
        _Message(
          message: message,
          mine: message.senderId == me,
          otherName: otherName,
        ),
      );
    }

    // Reversed, so the list starts scrolled to the newest message.
    return ListView(
      reverse: true,
      padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
      children: rows.reversed.toList(),
    );
  }
}

class _Message extends StatelessWidget {
  const _Message({
    required this.message,
    required this.mine,
    required this.otherName,
  });

  final ChatMessage message;
  final bool mine;
  final String otherName;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;
    final time = formatTime(message.createdAt);

    if (message.kind != MessageKind.text) {
      final amount = formatDollars(message.cents!);
      final who = mine ? 'You' : otherName;
      final (icon, line) = switch (message.kind) {
        MessageKind.offerAccepted => (
          LucideIcons.circleCheck,
          '$who accepted the $amount offer',
        ),
        MessageKind.offerDeclined => (
          LucideIcons.circleX,
          '$who declined the $amount offer',
        ),
        _ => (LucideIcons.tag, '$who offered $amount'),
      };
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 10),
        child: Column(
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(icon, size: 16, color: palette.muted),
                const SizedBox(width: 6),
                Flexible(child: Text(line, style: text.labelLarge)),
              ],
            ),
            Text(time, style: text.bodySmall?.copyWith(color: palette.muted)),
          ],
        ),
      );
    }

    return Align(
      alignment: mine ? Alignment.centerRight : Alignment.centerLeft,
      child: ConstrainedBox(
        constraints: BoxConstraints(
          maxWidth: MediaQuery.sizeOf(context).width * 0.78,
        ),
        child: Container(
          margin: const EdgeInsets.symmetric(vertical: 3),
          padding: const EdgeInsets.fromLTRB(12, 8, 12, 6),
          decoration: BoxDecoration(
            color: mine ? palette.primary : palette.raised,
            borderRadius: BorderRadius.only(
              topLeft: const Radius.circular(16),
              topRight: const Radius.circular(16),
              bottomLeft: Radius.circular(mine ? 16 : 4),
              bottomRight: Radius.circular(mine ? 4 : 16),
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                message.text!,
                style: text.bodyLarge?.copyWith(
                  color: mine ? palette.onPrimary : palette.text,
                ),
              ),
              Text(
                mine && message.read ? '$time · Read' : time,
                style: text.bodySmall?.copyWith(
                  color: mine
                      ? palette.onPrimary.withValues(alpha: 0.7)
                      : palette.muted,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _Composer extends StatelessWidget {
  const _Composer({
    required this.draft,
    required this.busy,
    required this.onSend,
    this.onOffer,
  });

  final TextEditingController draft;
  final bool busy;
  final VoidCallback onSend;

  /// Null when an offer can't be made right now.
  final VoidCallback? onOffer;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(top: BorderSide(color: context.palette.border)),
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(8, 8, 8, 8),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.end,
          children: [
            if (onOffer != null)
              IconButton(
                onPressed: busy ? null : onOffer,
                tooltip: 'Make an offer',
                icon: const Icon(LucideIcons.tag, size: 20),
              ),
            Expanded(
              child: TextField(
                controller: draft,
                minLines: 1,
                maxLines: 4,
                textCapitalization: TextCapitalization.sentences,
                decoration: const InputDecoration(hintText: 'Message'),
              ),
            ),
            IconButton(
              onPressed: busy ? null : onSend,
              tooltip: 'Send',
              icon: const Icon(LucideIcons.sendHorizontal, size: 20),
            ),
          ],
        ),
      ),
    );
  }
}

class _OfferSheet extends StatefulWidget {
  const _OfferSheet({required this.listing});

  final ChatListing listing;

  @override
  State<_OfferSheet> createState() => _OfferSheetState();
}

class _OfferSheetState extends State<_OfferSheet> {
  final _amount = TextEditingController();
  String? _error;

  @override
  void dispose() {
    _amount.dispose();
    super.dispose();
  }

  void _submit() {
    final cents = parseDollars(_amount.text);
    if (cents == null || cents == 0) {
      setState(() => _error = 'Enter an amount.');
      return;
    }
    Navigator.pop(context, cents);
  }

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        20,
        0,
        20,
        16 + MediaQuery.viewInsetsOf(context).bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text('Make an offer', style: text.titleLarge),
          const SizedBox(height: 4),
          Text(
            'Asking ${widget.listing.price.label}. The seller can accept '
            'or decline.',
            style: text.bodyMedium?.copyWith(color: context.palette.muted),
          ),
          const SizedBox(height: 20),
          LabeledField(
            label: 'Your offer',
            hint: r'$',
            controller: _amount,
            error: _error,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            textInputAction: TextInputAction.done,
            onSubmitted: _submit,
          ),
          const SizedBox(height: 20),
          FilledButton(onPressed: _submit, child: const Text('Send offer')),
        ],
      ),
    );
  }
}
