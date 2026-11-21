import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import 'chat_models.dart';

final chatApiProvider = Provider<ChatApi>(
  (ref) => ChatApi(ref.watch(apiClientProvider)),
);

typedef _Json = Map<String, dynamic>;

class ChatApi {
  ChatApi(this._dio);

  final Dio _dio;

  Future<List<Conversation>> conversations(ChatRole role) => apiCall(() async {
    final response = await _dio.get<List<dynamic>>(
      '/me/conversations',
      queryParameters: {'role': role.wire},
    );
    return [
      for (final item in response.data!) Conversation.fromJson(item as _Json),
    ];
  });

  Future<Conversation> conversation(String id) => apiCall(() async {
    final response = await _dio.get<_Json>('/conversations/$id');
    return Conversation.fromJson(response.data!);
  });

  /// The buyer's conversation about a listing, opened if it is new.
  Future<Conversation> start(String listingId) => apiCall(() async {
    final response = await _dio.post<_Json>(
      '/conversations',
      data: {'listingId': listingId},
    );
    return Conversation.fromJson(response.data!);
  });

  /// The latest messages, or with [after] only those that came since.
  Future<List<ChatMessage>> messages(String id, {String? after}) => apiCall(
    () async {
      final response = await _dio.get<List<dynamic>>(
        '/conversations/$id/messages',
        queryParameters: {'after': ?after},
      );
      return [
        for (final item in response.data!) ChatMessage.fromJson(item as _Json),
      ];
    },
  );

  Future<ChatMessage> send(String id, String text) =>
      _post('/conversations/$id/messages', {'text': text});

  Future<ChatMessage> offer(String id, int cents) =>
      _post('/conversations/$id/offer', {'cents': cents});

  Future<ChatMessage> answer(String id, {required bool accept}) =>
      _post('/conversations/$id/offer/answer', {'accept': accept});

  Future<ChatMessage> _post(String path, _Json body) => apiCall(() async {
    final response = await _dio.post<_Json>(path, data: body);
    return ChatMessage.fromJson(response.data!);
  });

  Future<void> markRead(String id) =>
      apiCall(() => _dio.post<void>('/conversations/$id/read'));

  Future<UnreadCounts> unread() => apiCall(() async {
    final response = await _dio.get<_Json>('/me/unread');
    return UnreadCounts(
      messages: response.data!['messages'] as int,
      notifications: response.data!['notifications'] as int,
    );
  });

  Future<List<AppNotification>> notifications() => apiCall(() async {
    final response = await _dio.get<_Json>('/me/notifications');
    return [
      for (final item in response.data!['items'] as List<dynamic>)
        AppNotification.fromJson(item as _Json),
    ];
  });

  Future<void> markNotificationsRead() =>
      apiCall(() => _dio.post<void>('/me/notifications/read'));
}
