import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:math';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../features/auth/application/auth_controller.dart';
import '../network/api_client.dart';

/// One server-sent event: its name and its JSON body.
class ServerEvent {
  const ServerEvent(this.type, this.data);

  final String type;
  final Map<String, dynamic> data;
}

/// The live connection to `/events`, open while someone is signed in.
/// Screens listen to [EventStream.events]; a `ready` event follows every
/// (re)connection, and is the moment to fetch whatever was missed.
final eventStreamProvider = Provider<EventStream>((ref) {
  final stream = EventStream(ref.watch(apiClientProvider));
  ref.onDispose(stream.close);
  ref.listen(
    authControllerProvider.select((auth) => auth.value?.id),
    (_, userId) => userId == null ? stream.stop() : stream.restart(),
    fireImmediately: true,
  );
  return stream;
});

class EventStream {
  EventStream(this._dio);

  final Dio _dio;
  final _events = StreamController<ServerEvent>.broadcast();
  CancelToken? _cancel;
  Timer? _retry;
  var _running = false;
  var _failures = 0;

  Stream<ServerEvent> get events => _events.stream;

  /// Opens a fresh connection, for a newly signed-in person.
  void restart() {
    stop();
    _running = true;
    _connect();
  }

  void stop() {
    _running = false;
    _retry?.cancel();
    _cancel?.cancel();
  }

  void close() {
    stop();
    _events.close();
  }

  Future<void> _connect() async {
    final cancel = _cancel = CancelToken();
    try {
      final response = await _dio.get<ResponseBody>(
        '/events',
        cancelToken: cancel,
        options: Options(
          responseType: ResponseType.stream,
          // The server writes a ping every 20 seconds, so a longer silence
          // means the connection is gone.
          receiveTimeout: const Duration(seconds: 45),
        ),
      );

      var type = 'message';
      final data = StringBuffer();
      final lines = response.data!.stream
          .cast<List<int>>()
          .transform(utf8.decoder)
          .transform(const LineSplitter());
      await for (final line in lines) {
        if (line.isEmpty) {
          if (data.isNotEmpty && !_events.isClosed) {
            _events.add(
              ServerEvent(
                type,
                jsonDecode(data.toString()) as Map<String, dynamic>,
              ),
            );
            _failures = 0;
          }
          type = 'message';
          data.clear();
        } else if (line.startsWith('event:')) {
          type = line.substring(6).trim();
        } else if (line.startsWith('data:')) {
          data.write(line.substring(5).trim());
        }
      }
    } on DioException {
      // Handled below: the connection is gone either way.
    } on IOException {
      // The server closed the stream partway, as it does when it restarts.
    }

    if (!_running || cancel.isCancelled) return;
    // Try again, waiting longer after each failure, up to half a minute.
    _failures++;
    _retry = Timer(
      Duration(seconds: min(30, 1 << min(_failures, 5))),
      _connect,
    );
  }
}
