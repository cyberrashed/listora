import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Holds the signed-in device's tokens. The access token lives in memory; the
/// refresh token is kept in the platform keystore so a session survives a
/// restart.
class SessionTokens {
  SessionTokens(this._storage, this._dio);

  static const _key = 'refresh_token';

  final FlutterSecureStorage _storage;
  final Dio _dio;

  String? accessToken;

  /// Called when the server stops accepting the session, so the app can show
  /// the signed-out state.
  void Function()? onSessionEnded;

  Future<String?> get refreshToken => _storage.read(key: _key);

  Future<void> save(Map<String, dynamic> tokens) async {
    accessToken = tokens['accessToken'] as String;
    await _storage.write(key: _key, value: tokens['refreshToken'] as String);
  }

  Future<void> clear() async {
    accessToken = null;
    await _storage.delete(key: _key);
  }

  /// Trades the refresh token for a new pair. Returns false, and forgets the
  /// session, when the server no longer accepts it. A network failure throws
  /// and leaves the session in place.
  Future<bool> refresh() async {
    final token = await refreshToken;
    if (token == null) return false;

    try {
      final response = await _dio.post<Map<String, dynamic>>(
        '/auth/refresh',
        data: {'refreshToken': token},
      );
      await save(response.data!);
      return true;
    } on DioException catch (error) {
      if (error.response?.statusCode != 401) rethrow;
      await clear();
      onSessionEnded?.call();
      return false;
    }
  }
}
