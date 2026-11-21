import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'session_tokens.dart';

// 10.0.2.2 is how the Android emulator reaches the host machine.
const _baseUrl = String.fromEnvironment(
  'API_BASE_URL',
  defaultValue: 'http://10.0.2.2:3100/api/v1',
);

/// An address the API gives as a path, like a photo's, made whole.
String apiUrl(String path) => Uri.parse(_baseUrl).resolve(path).toString();

Dio _newDio() => Dio(
  BaseOptions(
    baseUrl: _baseUrl,
    connectTimeout: const Duration(seconds: 10),
    receiveTimeout: const Duration(seconds: 15),
  ),
);

// A client with no interceptors. Refreshing and retrying go through it, so
// neither can end up waiting in the queue it was started from.
final _plainClientProvider = Provider<Dio>((ref) {
  final dio = _newDio();
  ref.onDispose(dio.close);
  return dio;
});

final sessionTokensProvider = Provider<SessionTokens>(
  (ref) => SessionTokens(
    const FlutterSecureStorage(),
    ref.watch(_plainClientProvider),
  ),
);

final apiClientProvider = Provider<Dio>((ref) {
  final dio = _newDio();
  dio.interceptors.add(
    _AuthInterceptor(
      ref.watch(sessionTokensProvider),
      ref.watch(_plainClientProvider),
    ),
  );
  ref.onDispose(dio.close);
  return dio;
});

/// Signs requests with the access token and, when it has expired, refreshes
/// it once and sends the request again. Queued, so several requests that fail
/// together share one refresh.
class _AuthInterceptor extends QueuedInterceptor {
  _AuthInterceptor(this._tokens, this._plain);

  final SessionTokens _tokens;
  final Dio _plain;

  static const _retried = 'retried';

  @override
  void onRequest(RequestOptions options, RequestInterceptorHandler handler) {
    final token = _tokens.accessToken;
    if (token != null) options.headers['Authorization'] = 'Bearer $token';
    handler.next(options);
  }

  @override
  Future<void> onError(
    DioException error,
    ErrorInterceptorHandler handler,
  ) async {
    final request = error.requestOptions;
    final expired =
        error.response?.statusCode == 401 &&
        request.extra[_retried] != true &&
        !request.path.startsWith('/auth/');
    if (!expired) return handler.next(error);

    try {
      // An earlier request in the queue may already have refreshed.
      final sentWith = request.headers['Authorization'];
      final current = _tokens.accessToken;
      final alreadyRefreshed = current != null && sentWith != 'Bearer $current';
      if (!alreadyRefreshed && !await _tokens.refresh()) {
        return handler.next(error);
      }

      request.extra[_retried] = true;
      request.headers['Authorization'] = 'Bearer ${_tokens.accessToken}';
      handler.resolve(await _plain.fetch<dynamic>(request));
    } on DioException catch (retryError) {
      handler.next(retryError);
    }
  }
}
