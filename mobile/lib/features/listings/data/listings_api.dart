import 'dart:typed_data';

import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../auth/application/auth_controller.dart';
import 'listing.dart';

final listingsApiProvider = Provider<ListingsApi>(
  (ref) => ListingsApi(ref.watch(apiClientProvider)),
);

/// The signed-in seller's listings, newest first. A guest has none.
final ownListingsProvider = FutureProvider<List<Listing>>((ref) async {
  final userId = ref.watch(
    authControllerProvider.select((auth) => auth.value?.id),
  );
  return userId == null ? const [] : ref.watch(listingsApiProvider).own();
});

/// The questions a category asks, inherited ones included.
final categoryFieldsProvider = FutureProvider.autoDispose
    .family<List<ListingField>, String>(
      (ref, categoryId) => ref.watch(listingsApiProvider).fieldsFor(categoryId),
    );

typedef _Json = Map<String, dynamic>;

class ListingsApi {
  ListingsApi(this._dio);

  final Dio _dio;

  Future<List<Listing>> own() => apiCall(() async {
    final response = await _dio.get<List<dynamic>>('/me/listings');
    return [for (final item in response.data!) Listing.fromJson(item as _Json)];
  });

  Future<Listing> post(ListingDraft draft) => apiCall(() async {
    final response = await _dio.post<_Json>('/listings', data: draft.toJson());
    return Listing.fromJson(response.data!);
  });

  Future<Listing> revise(String id, ListingDraft draft) => apiCall(() async {
    final response = await _dio.patch<_Json>(
      '/listings/$id',
      data: draft.toJson(),
    );
    return Listing.fromJson(response.data!);
  });

  /// Sends one photo ahead of the listing, which claims it when posted.
  Future<ListingPhoto> uploadPhoto(Uint8List bytes, String contentType) =>
      apiCall(() async {
        final response = await _dio.post<_Json>(
          '/photos',
          data: Stream.value(bytes),
          options: Options(
            contentType: contentType,
            headers: {Headers.contentLengthHeader: bytes.length},
            // A photo on a slow connection takes longer than a page of JSON.
            sendTimeout: const Duration(seconds: 60),
            receiveTimeout: const Duration(seconds: 60),
          ),
        );
        return ListingPhoto.fromJson(response.data!);
      });

  Future<void> markSold(String id) =>
      apiCall(() => _dio.post<void>('/listings/$id/sold'));

  Future<void> feature(String id) =>
      apiCall(() => _dio.post<void>('/listings/$id/feature'));

  Future<void> renew(String id) =>
      apiCall(() => _dio.post<void>('/listings/$id/renew'));

  Future<void> delete(String id) =>
      apiCall(() => _dio.delete<void>('/listings/$id'));

  Future<List<ListingField>> fieldsFor(String categoryId) => apiCall(() async {
    final response = await _dio.get<List<dynamic>>(
      '/categories/$categoryId/fields',
    );
    return [
      for (final item in response.data!) ListingField.fromJson(item as _Json),
    ];
  });

  /// The city a point is in.
  Future<Place> nearestPlace(double lat, double lng) => apiCall(() async {
    final response = await _dio.get<_Json>(
      '/places/nearest',
      queryParameters: {'lat': '$lat', 'lng': '$lng'},
    );
    return Place.fromJson(response.data!);
  });

  Future<List<Place>> searchPlaces(String query) => apiCall(() async {
    final response = await _dio.get<List<dynamic>>(
      '/places',
      queryParameters: {'q': query},
    );
    return [for (final item in response.data!) Place.fromJson(item as _Json)];
  });
}
