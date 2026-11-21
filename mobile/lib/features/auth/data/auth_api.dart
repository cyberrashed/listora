import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../../core/network/session_tokens.dart';
import 'user.dart';

final authApiProvider = Provider<AuthApi>(
  (ref) =>
      AuthApi(ref.watch(apiClientProvider), ref.watch(sessionTokensProvider)),
);

typedef _Json = Map<String, dynamic>;

class AuthApi {
  AuthApi(this._dio, this._tokens);

  final Dio _dio;
  final SessionTokens _tokens;

  Future<User> _startSession(String path, _Json body) => apiCall(() async {
    final response = await _dio.post<_Json>(path, data: body);
    await _tokens.save(response.data!['tokens'] as _Json);
    return User.fromJson(response.data!['user'] as _Json);
  });

  Future<User> register({
    required String name,
    required String email,
    required String password,
  }) => _startSession('/auth/register', {
    'name': name,
    'email': email,
    'password': password,
  });

  Future<User> signIn({required String email, required String password}) =>
      _startSession('/auth/login', {'email': email, 'password': password});

  /// The user of the session stored on this device, or null when there is
  /// none or the server no longer accepts it.
  Future<User?> restore() => apiCall(() async {
    if (!await _tokens.refresh()) return null;
    final response = await _dio.get<_Json>('/me');
    return User.fromJson(response.data!);
  });

  Future<void> signOut() async {
    final refreshToken = await _tokens.refreshToken;
    await _tokens.clear();
    if (refreshToken == null) return;

    // The device is signed out either way; telling the server is best effort.
    try {
      await _dio.post<void>(
        '/auth/logout',
        data: {'refreshToken': refreshToken},
      );
    } on DioException {
      return;
    }
  }

  Future<void> requestPasswordReset(String email) => apiCall(
    () => _dio.post<void>('/auth/password/forgot', data: {'email': email}),
  );

  Future<void> resetPassword({
    required String email,
    required String code,
    required String password,
  }) => apiCall(
    () => _dio.post<void>(
      '/auth/password/reset',
      data: {'email': email, 'code': code, 'password': password},
    ),
  );

  Future<User> updateProfile({required String name, String? phone}) =>
      apiCall(() async {
        final response = await _dio.patch<_Json>(
          '/me',
          data: {'name': name, 'phone': phone},
        );
        return User.fromJson(response.data!);
      });

  Future<void> deleteAccount(String password) => apiCall(() async {
    await _dio.delete<void>('/me', data: {'password': password});
    await _tokens.clear();
  });
}
