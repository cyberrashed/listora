import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import '../../auth/application/auth_controller.dart';
import 'browse_query.dart';
import 'market_listing.dart';

final browseApiProvider = Provider<BrowseApi>(
  (ref) => BrowseApi(ref.watch(apiClientProvider)),
);

/// Where the buyer is looking, shared by every screen that lists results.
/// Null searches the whole country.
final browseAreaProvider = NotifierProvider<BrowseAreaController, BrowseArea?>(
  BrowseAreaController.new,
);

class BrowseAreaController extends Notifier<BrowseArea?> {
  @override
  BrowseArea? build() => null;

  void set(BrowseArea? area) => state = area;
}

/// What sellers paid to put on top, for the strip on Browse.
final featuredListingsProvider = FutureProvider.autoDispose<List<ListingCard>>((
  ref,
) async {
  final area = ref.watch(browseAreaProvider);
  final page = await ref
      .watch(browseApiProvider)
      .search(const BrowseQuery(featuredOnly: true), area: area);
  return page.items;
});

final marketListingProvider = FutureProvider.autoDispose
    .family<MarketListing, String>(
      (ref, id) => ref.watch(browseApiProvider).listing(id),
    );

/// The buyer's saved listings, latest first. A guest has none.
final savedListingsProvider =
    AsyncNotifierProvider<SavedListings, List<ListingCard>>(SavedListings.new);

class SavedListings extends AsyncNotifier<List<ListingCard>> {
  @override
  Future<List<ListingCard>> build() async {
    final userId = ref.watch(
      authControllerProvider.select((auth) => auth.value?.id),
    );
    return userId == null ? const [] : ref.watch(browseApiProvider).saved();
  }

  /// Saves or unsaves at once, and puts it back if the server refuses.
  Future<void> toggle(ListingCard listing) async {
    // The first load must land before the change does, or its answer,
    // asked for earlier, would overwrite it.
    final before = await future;
    final saved = before.any((item) => item.id == listing.id);
    state = AsyncData(
      saved
          ? before.where((item) => item.id != listing.id).toList()
          : [listing, ...before],
    );

    final api = ref.read(browseApiProvider);
    try {
      await (saved ? api.unsave(listing.id) : api.save(listing.id));
    } on ApiError {
      state = AsyncData(before);
      rethrow;
    }
  }
}

typedef _Json = Map<String, dynamic>;

class BrowseApi {
  BrowseApi(this._dio);

  final Dio _dio;

  Future<ListingPage> search(
    BrowseQuery query, {
    BrowseArea? area,
    int page = 1,
  }) => apiCall(() async {
    final response = await _dio.get<_Json>(
      '/listings',
      queryParameters: query.parameters(area: area, page: page),
    );
    return ListingPage.fromJson(response.data!);
  });

  Future<MarketListing> listing(String id) => apiCall(() async {
    final response = await _dio.get<_Json>('/listings/$id');
    return MarketListing.fromJson(response.data!);
  });

  Future<List<ListingCard>> saved() => apiCall(() async {
    final response = await _dio.get<List<dynamic>>('/me/favorites');
    return [
      for (final item in response.data!) ListingCard.fromJson(item as _Json),
    ];
  });

  Future<void> save(String id) =>
      apiCall(() => _dio.put<void>('/me/favorites/$id'));

  Future<void> unsave(String id) =>
      apiCall(() => _dio.delete<void>('/me/favorites/$id'));
}
