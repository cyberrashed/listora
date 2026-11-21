import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../data/auth_api.dart';
import '../data/user.dart';

/// The signed-in user, or null for a guest.
final authControllerProvider = AsyncNotifierProvider<AuthController, User?>(
  AuthController.new,
);

class AuthController extends AsyncNotifier<User?> {
  AuthApi get _api => ref.read(authApiProvider);

  @override
  Future<User?> build() async {
    ref.read(sessionTokensProvider).onSessionEnded = () {
      state = const AsyncData(null);
    };

    try {
      return await _api.restore();
    } on ApiError {
      // Offline at launch: browse as a guest and keep the stored session.
      return null;
    }
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
  }) async {
    state = AsyncData(
      await _api.register(name: name, email: email, password: password),
    );
  }

  Future<void> signIn({required String email, required String password}) async {
    state = AsyncData(await _api.signIn(email: email, password: password));
  }

  Future<void> signOut() async {
    await _api.signOut();
    state = const AsyncData(null);
  }

  Future<void> updateProfile({required String name, String? phone}) async {
    state = AsyncData(await _api.updateProfile(name: name, phone: phone));
  }

  Future<void> deleteAccount(String password) async {
    await _api.deleteAccount(password);
    state = const AsyncData(null);
  }
}
