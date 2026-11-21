import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_error.dart';
import '../../../core/realtime/event_stream.dart';
import '../../auth/application/auth_controller.dart';
import '../data/chat_api.dart';
import '../data/chat_models.dart';

/// Runs [onEvent] for each server event while the provider is alive.
void _follow(Ref ref, FutureOr<void> Function(ServerEvent event) onEvent) {
  final subscription = ref
      .watch(eventStreamProvider)
      .events
      .listen(
        (event) => Future.sync(() => onEvent(event)).catchError(
          // A failed catch-up waits for the next event or reconnection.
          (Object _) {},
          test: (error) => error is ApiError,
        ),
      );
  ref.onDispose(subscription.cancel);
}

String? _userId(Ref ref) =>
    ref.watch(authControllerProvider.select((auth) => auth.value?.id));

/// Conversations on one side, latest first. Kept current by server events.
final conversationsProvider =
    AsyncNotifierProvider.family<
      ConversationsController,
      List<Conversation>,
      ChatRole
    >(ConversationsController.new);

class ConversationsController extends AsyncNotifier<List<Conversation>> {
  ConversationsController(this.role);

  final ChatRole role;

  @override
  Future<List<Conversation>> build() async {
    if (_userId(ref) == null) return const [];
    final api = ref.watch(chatApiProvider);

    _follow(ref, (event) async {
      switch (event.type) {
        case 'conversation':
          final conversation = Conversation.fromJson(event.data);
          final current = state.value;
          if (conversation.role != role ||
              conversation.lastMessage == null ||
              current == null) {
            return;
          }
          state = AsyncData(
            [
              conversation,
              ...current.where((item) => item.id != conversation.id),
            ]..sort((a, b) => b.updatedAt.compareTo(a.updatedAt)),
          );
        case 'ready':
          state = AsyncData(await api.conversations(role));
      }
    });
    return api.conversations(role);
  }
}

/// The conversation open on screen, if any. Its messages don't need a
/// system notification. A plain holder rather than state: the screen sets it
/// as it opens and closes, when providers may not change.
final openConversationProvider = Provider<OpenConversation>(
  (ref) => OpenConversation(),
);

class OpenConversation {
  String? id;
}

/// One conversation's header: who, which listing, where an offer stands.
final conversationProvider = AsyncNotifierProvider.autoDispose
    .family<ConversationController, Conversation, String>(
      ConversationController.new,
    );

class ConversationController extends AsyncNotifier<Conversation> {
  ConversationController(this.id);

  final String id;

  @override
  Future<Conversation> build() async {
    final api = ref.watch(chatApiProvider);
    _follow(ref, (event) async {
      switch (event.type) {
        case 'conversation' when event.data['id'] == id:
          state = AsyncData(Conversation.fromJson(event.data));
        case 'ready':
          state = AsyncData(await api.conversation(id));
      }
    });
    return api.conversation(id);
  }
}

/// One conversation's messages, oldest first. While it is watched, the
/// conversation is open on screen, so what arrives is marked read.
final messagesProvider = AsyncNotifierProvider.autoDispose
    .family<MessagesController, List<ChatMessage>, String>(
      MessagesController.new,
    );

class MessagesController extends AsyncNotifier<List<ChatMessage>> {
  MessagesController(this.id);

  final String id;

  ChatApi get _api => ref.read(chatApiProvider);

  @override
  Future<List<ChatMessage>> build() async {
    final me = _userId(ref);
    final api = ref.watch(chatApiProvider);

    _follow(ref, (event) async {
      switch (event.type) {
        case 'message' when event.data['conversationId'] == id:
          final message = ChatMessage.fromJson(event.data);
          _add([message]);
          if (message.senderId != me) await api.markRead(id);
        case 'ready':
          final last = state.value?.lastOrNull;
          _add(await api.messages(id, after: last?.id));
          await api.markRead(id);
      }
    });

    final messages = await api.messages(id);
    unawaited(api.markRead(id).catchError((Object _) {}));
    return messages;
  }

  // Each message can arrive twice, from the request that sent it and from
  // the event stream, so they are merged by id.
  void _add(List<ChatMessage> messages) {
    final current = state.value;
    if (current == null || messages.isEmpty) return;
    final byId = {for (final message in current) message.id: message};
    for (final message in messages) {
      byId[message.id] = message;
    }
    state = AsyncData(
      byId.values.toList()..sort((a, b) => a.createdAt.compareTo(b.createdAt)),
    );
  }

  Future<void> send(String text) async => _add([await _api.send(id, text)]);

  Future<void> offer(int cents) async => _add([await _api.offer(id, cents)]);

  Future<void> answer({required bool accept}) async =>
      _add([await _api.answer(id, accept: accept)]);
}

/// The counts on the Chats tab and the bell.
final unreadProvider = AsyncNotifierProvider<UnreadController, UnreadCounts>(
  UnreadController.new,
);

class UnreadController extends AsyncNotifier<UnreadCounts> {
  @override
  Future<UnreadCounts> build() async {
    if (_userId(ref) == null) return const UnreadCounts();
    final api = ref.watch(chatApiProvider);

    _follow(ref, (event) async {
      if (const [
        'conversation',
        'notification',
        'ready',
      ].contains(event.type)) {
        state = AsyncData(await api.unread());
      }
    });
    return api.unread();
  }
}

/// The notification centre, newest first.
final notificationsProvider =
    AsyncNotifierProvider<NotificationsController, List<AppNotification>>(
      NotificationsController.new,
    );

class NotificationsController extends AsyncNotifier<List<AppNotification>> {
  @override
  Future<List<AppNotification>> build() async {
    if (_userId(ref) == null) return const [];
    final api = ref.watch(chatApiProvider);

    _follow(ref, (event) async {
      switch (event.type) {
        case 'notification':
          state = AsyncData([
            AppNotification.fromJson(event.data),
            ...?state.value,
          ]);
        case 'ready':
          state = AsyncData(await api.notifications());
      }
    });
    return api.notifications();
  }

  Future<void> markAllRead() async {
    final current = state.value;
    if (current == null || current.every((item) => item.read)) return;
    await ref.read(chatApiProvider).markNotificationsRead();
    state = AsyncData([for (final item in current) item.asRead()]);
    ref.invalidate(unreadProvider);
  }
}
