import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../auth/application/auth_controller.dart';
import 'seller.dart';

final sellersApiProvider = Provider<SellersApi>(
  (ref) => SellersApi(ref.watch(apiClientProvider)),
);

/// A seller's public profile, as the current viewer sees it.
final sellerProfileProvider = FutureProvider.autoDispose
    .family<SellerProfile, String>((ref, id) {
      // Following and what can be reviewed depend on who is looking.
      ref.watch(authControllerProvider.select((auth) => auth.value?.id));
      return ref.watch(sellersApiProvider).profile(id);
    });

final followingProvider = FutureProvider.autoDispose<List<Person>>(
  (ref) => ref.watch(sellersApiProvider).following(),
);

final blockedProvider = FutureProvider.autoDispose<List<Person>>(
  (ref) => ref.watch(sellersApiProvider).blocked(),
);

final verificationProvider = FutureProvider.autoDispose<VerificationState>(
  (ref) => ref.watch(sellersApiProvider).verification(),
);

typedef _Json = Map<String, dynamic>;

class SellersApi {
  SellersApi(this._dio);

  final Dio _dio;

  Future<SellerProfile> profile(String id) => apiCall(() async {
    final response = await _dio.get<_Json>('/sellers/$id');
    return SellerProfile.fromJson(response.data!);
  });

  Future<void> follow(String id) =>
      apiCall(() => _dio.put<void>('/sellers/$id/follow'));

  Future<void> unfollow(String id) =>
      apiCall(() => _dio.delete<void>('/sellers/$id/follow'));

  Future<List<Person>> following() => _people('/me/following');

  Future<List<Person>> blocked() => _people('/me/blocked');

  Future<List<Person>> _people(String path) => apiCall(() async {
    final response = await _dio.get<List<dynamic>>(path);
    return [for (final item in response.data!) Person.fromJson(item as _Json)];
  });

  Future<void> block(String id) =>
      apiCall(() => _dio.put<void>('/me/blocked/$id'));

  Future<void> unblock(String id) =>
      apiCall(() => _dio.delete<void>('/me/blocked/$id'));

  Future<void> review({
    required String listingId,
    required int rating,
    required String text,
  }) => apiCall(
    () => _dio.post<void>(
      '/reviews',
      data: {'listingId': listingId, 'rating': rating, 'text': text},
    ),
  );

  Future<void> report({
    required ReportTarget target,
    required String id,
    required String reason,
    required String note,
  }) => apiCall(
    () => _dio.post<void>(
      '/reports',
      data: {'kind': target.name, 'id': id, 'reason': reason, 'note': note},
    ),
  );

  Future<VerificationState> verification() => apiCall(() async {
    final response = await _dio.get<_Json>('/me/verification');
    return VerificationState.fromJson(response.data!);
  });

  Future<VerificationState> requestVerification({
    required String legalName,
    required String phone,
    required String about,
  }) => apiCall(() async {
    final response = await _dio.post<_Json>(
      '/me/verification',
      data: {'legalName': legalName, 'phone': phone, 'about': about},
    );
    return VerificationState.fromJson(response.data!);
  });
}
