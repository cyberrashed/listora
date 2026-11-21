import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:listora/core/realtime/event_stream.dart';

/// Serves `/events`. The first stream breaks off the way it does when the
/// server restarts; the ones after it stay open.
class _RestartingServer implements HttpClientAdapter {
  var connections = 0;

  static final _ready = Uint8List.fromList(
    utf8.encode('event: ready\ndata: {}\n\n'),
  );

  Stream<Uint8List> _brokenOff() async* {
    yield _ready;
    throw const HttpException('Connection closed while receiving data');
  }

  Stream<Uint8List> _open() async* {
    yield _ready;
    await Completer<void>().future;
  }

  @override
  Future<ResponseBody> fetch(
    RequestOptions options,
    Stream<Uint8List>? requestStream,
    Future<void>? cancelFuture,
  ) async {
    connections++;
    return ResponseBody(
      connections == 1 ? _brokenOff() : _open(),
      200,
      headers: {
        Headers.contentTypeHeader: ['text/event-stream'],
      },
    );
  }

  @override
  void close({bool force = false}) {}
}

void main() {
  test('connects again after the server breaks the stream off', () async {
    final server = _RestartingServer();
    final stream = EventStream(Dio()..httpClientAdapter = server);
    addTearDown(stream.close);
    final ready = <ServerEvent>[];
    stream.events.where((event) => event.type == 'ready').listen(ready.add);

    stream.restart();
    // After one failure it waits two seconds before trying again.
    await Future<void>.delayed(const Duration(seconds: 3));

    expect(server.connections, 2);
    expect(ready, hasLength(2));
  });
}
