import 'package:flutter/foundation.dart';
import 'package:flutter/services.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/tokens.dart';
import '../../../core/realtime/event_stream.dart';
import '../data/chat_models.dart';
import 'chat_controllers.dart';

/// Android notifications drawn by the app itself from server events. There
/// is no push service: they show while the app is running, in front or
/// behind, which is what the demo needs.
class SystemNotifications {
  final _plugin = FlutterLocalNotificationsPlugin();
  var _ready = false;
  var _nextId = 0;

  AndroidFlutterLocalNotificationsPlugin? get _android => _plugin
      .resolvePlatformSpecificImplementation<
        AndroidFlutterLocalNotificationsPlugin
      >();

  /// [onTap] gets the in-app link the notification carries.
  Future<void> init(void Function(String link) onTap) async {
    try {
      await _plugin.initialize(
        settings: const InitializationSettings(
          android: AndroidInitializationSettings('ic_notification'),
        ),
        onDidReceiveNotificationResponse: (response) {
          final link = response.payload;
          if (link != null) onTap(link);
        },
      );
    } on PlatformException catch (error) {
      // The app is still usable without notifications.
      debugPrint('Notifications are off: $error');
      return;
    }
    _ready = true;
  }

  Future<bool> get enabled async =>
      await _android?.areNotificationsEnabled() ?? false;

  Future<bool> requestPermission() async =>
      await _android?.requestNotificationsPermission() ?? false;

  Future<void> show({
    required String title,
    required String body,
    String? link,
  }) async {
    if (!_ready) return;
    await _plugin.show(
      id: _nextId++,
      title: title,
      body: body,
      payload: link,
      notificationDetails: NotificationDetails(
        android: AndroidNotificationDetails(
          'activity',
          'Messages and updates',
          channelDescription: 'New messages, offers and listing reviews.',
          importance: Importance.high,
          priority: Priority.high,
          color: Palette.light.accent,
        ),
      ),
    );
  }
}

final systemNotificationsProvider = Provider<SystemNotifications>(
  (ref) => SystemNotifications(),
);

/// Whether Android lets the app show notifications. Asked on Chats, where
/// the reason is plain, rather than on first launch.
final notificationsAllowedProvider = FutureProvider.autoDispose<bool>(
  (ref) => ref.watch(systemNotificationsProvider).enabled,
);

/// Turns server events into system notifications: a message from the other
/// person, unless that conversation is open, and every notification.
final systemAlertsProvider = Provider<void>((ref) {
  final alerts = ref.watch(systemNotificationsProvider);
  // The time of the last message shown per conversation. A conversation
  // also changes when it is read, which must not repeat the alert.
  final shown = <String, DateTime>{};

  final subscription = ref.watch(eventStreamProvider).events.listen((event) {
    switch (event.type) {
      case 'conversation':
        final conversation = Conversation.fromJson(event.data);
        final last = conversation.lastMessage;
        if (last == null ||
            last.mine ||
            last.kind != MessageKind.text ||
            conversation.unread == 0 ||
            shown[conversation.id] == last.at ||
            ref.read(openConversationProvider).id == conversation.id) {
          return;
        }
        shown[conversation.id] = last.at;
        alerts.show(
          title: conversation.otherName,
          body: last.text!,
          link: '/chats/${conversation.id}',
        );
      case 'notification':
        final notification = AppNotification.fromJson(event.data);
        alerts.show(
          title: notification.title,
          body: notification.body,
          link: notification.link,
        );
    }
  });
  ref.onDispose(subscription.cancel);
});
