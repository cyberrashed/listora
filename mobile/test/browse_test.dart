import 'dart:async';
import 'dart:math';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:listora/app/retry.dart';
import 'package:listora/app/theme/theme.dart';
import 'package:listora/core/location.dart';
import 'package:listora/features/auth/data/auth_api.dart';
import 'package:listora/features/auth/data/user.dart';
import 'package:listora/features/browse/data/browse_api.dart';
import 'package:listora/features/browse/data/browse_query.dart';
import 'package:listora/features/browse/data/market_listing.dart';
import 'package:listora/features/browse/presentation/area_screen.dart';
import 'package:listora/features/browse/presentation/browse_screen.dart';
import 'package:listora/features/browse/presentation/filters_screen.dart';
import 'package:listora/features/browse/presentation/listing_screen.dart';
import 'package:listora/features/browse/presentation/results_screen.dart';
import 'package:listora/features/browse/presentation/saved_screen.dart';
import 'package:listora/features/categories/data/categories_api.dart';
import 'package:listora/features/categories/data/category.dart';
import 'package:listora/features/content/data/content.dart';
import 'package:listora/features/listings/data/listing.dart';
import 'package:listora/features/listings/data/listings_api.dart';

final _dana = User(
  id: 'dana',
  name: 'Dana Whitfield',
  email: 'dana.whitfield@mailbox.example',
  createdAt: DateTime(2026, 4, 12),
);

const _catalog = [
  Category(id: 'vehicles', name: 'Vehicles', slug: 'vehicles'),
  Category(
    id: 'cars',
    name: 'Cars & Trucks',
    slug: 'cars-and-trucks',
    parentId: 'vehicles',
  ),
  Category(
    id: 'motorcycles',
    name: 'Motorcycles',
    slug: 'motorcycles',
    parentId: 'vehicles',
  ),
  Category(id: 'electronics', name: 'Electronics', slug: 'electronics'),
  Category(id: 'home', name: 'Home & Garden', slug: 'home-and-garden'),
  Category(id: 'sports', name: 'Sports & Outdoors', slug: 'sports'),
];

const _banners = [
  HomeBanner(
    id: 'b1',
    title: 'Bikes for spring',
    body: 'Road, mountain and electric bikes from riders near you.',
    link: BannerLink.search,
    target: 'bike',
  ),
  HomeBanner(
    id: 'b2',
    title: 'Sell it this weekend',
    body: 'Your first three listings each month are free.',
    link: BannerLink.post,
  ),
];

const _carFields = [
  ListingField(
    id: 'mileage',
    label: 'Mileage',
    type: FieldType.number,
    options: [],
    unit: 'mi',
    required: true,
    filterable: true,
  ),
  ListingField(
    id: 'transmission',
    label: 'Transmission',
    type: FieldType.select,
    options: ['Automatic', 'Manual'],
    required: false,
    filterable: true,
  ),
  ListingField(
    id: 'make',
    label: 'Make',
    type: FieldType.text,
    options: [],
    required: true,
    filterable: true,
  ),
];

DateTime _daysAgo(double days) =>
    DateTime.now().subtract(Duration(minutes: (days * 24 * 60).round()));

ListingCard _card(
  String id,
  String title,
  ListingPrice price,
  String city,
  double daysAgo,
) => ListingCard(
  id: id,
  title: title,
  price: price,
  city: city,
  state: 'TX',
  publishedAt: _daysAgo(daysAgo),
);

final _latest = [
  _card(
    'outback',
    '2016 Subaru Outback 2.5i Premium',
    const ListingPrice(mode: PriceMode.negotiable, cents: 1380000),
    'Round Rock',
    0.2,
  ),
  _card(
    'desk',
    'Standing desk, 60 by 30, bamboo top',
    const ListingPrice(mode: PriceMode.fixed, cents: 28000),
    'Pflugerville',
    1,
  ),
  _card(
    'boxes',
    'Moving boxes, about thirty',
    const ListingPrice(mode: PriceMode.free, cents: 0),
    'Austin',
    2,
  ),
  _card(
    'civic',
    '2015 Honda Civic LX, one owner',
    const ListingPrice(mode: PriceMode.negotiable, cents: 890000),
    'Austin',
    3,
  ),
];

MarketListing _civic({String sellerId = 'miguel', String? phone}) =>
    MarketListing(
      card: _latest.last,
      description:
          'Bought new in Austin and serviced at the dealer every 5,000 '
          'miles. New tires in March, brakes done last fall. No accidents.',
      categoryPath: const ['Vehicles', 'Cars & Trucks'],
      attributes: const [
        ListingAttribute(fieldId: 'make', label: 'Make', value: 'Honda'),
        ListingAttribute(fieldId: 'year', label: 'Year', value: 2015),
        ListingAttribute(
          fieldId: 'mileage',
          label: 'Mileage',
          unit: 'mi',
          value: 84250,
        ),
        ListingAttribute(
          fieldId: 'transmission',
          label: 'Transmission',
          value: 'Automatic',
        ),
      ],
      sellerId: sellerId,
      sellerName: 'Miguel Ortega',
      sellerJoinedAt: DateTime(2026, 5, 12),
      sellerPhone: phone,
    );

class _FakeAuthApi implements AuthApi {
  _FakeAuthApi(this.restored);

  final User? restored;

  @override
  Future<User?> restore() async => restored;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Stands in for the server. Every search is recorded as the query string
/// it would send. With [total] above the four sample listings, pages are
/// filled with numbered ones.
class _FakeBrowseApi implements BrowseApi {
  _FakeBrowseApi({
    this.total = 4,
    this.detail,
    this.savedCards = const [],
    this.savedLoaded,
    this.featured = const [],
  });

  final int total;
  final MarketListing? detail;
  final List<ListingCard> savedCards;

  /// What the featured strip on Browse shows.
  final List<ListingCard> featured;

  /// When given, the saved list arrives only once this completes.
  final Future<void>? savedLoaded;
  final searches = <Map<String, String>>[];
  final savedIds = <String>[];

  @override
  Future<ListingPage> search(
    BrowseQuery query, {
    BrowseArea? area,
    int page = 1,
  }) async {
    // The featured strip asks separately; tests follow the main list.
    if (query.featuredOnly) {
      return ListingPage(items: featured, total: featured.length, page: 1);
    }
    searches.add(query.parameters(area: area, page: page));
    final start = (page - 1) * 20;
    final items = total <= _latest.length
        ? _latest.take(total).toList()
        : [
            for (var index = start; index < min(start + 20, total); index++)
              _card(
                'n$index',
                'Listing number ${index + 1}',
                const ListingPrice(mode: PriceMode.fixed, cents: 10000),
                'Austin',
                1,
              ),
          ];
    return ListingPage(items: items, total: total, page: page);
  }

  @override
  Future<MarketListing> listing(String id) async => detail ?? _civic();

  @override
  Future<List<ListingCard>> saved() async {
    await savedLoaded;
    return savedCards;
  }

  @override
  Future<void> save(String id) async => savedIds.add(id);

  @override
  Future<void> unsave(String id) async => savedIds.remove(id);

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeListingsApi implements ListingsApi {
  @override
  Future<List<ListingField>> fieldsFor(String categoryId) async =>
      categoryId == 'cars' ? _carFields : const [];

  @override
  Future<Place> nearestPlace(double lat, double lng) async =>
      const Place(id: 'denver', label: 'Denver, CO');

  @override
  Future<List<Place>> searchPlaces(String query) async => const [
    Place(id: 'austin', label: 'Austin, TX'),
    Place(id: 'austin-mn', label: 'Austin, MN'),
  ];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _open(
  WidgetTester tester,
  String location, {
  required _FakeBrowseApi api,
  User? user,
  ({double lat, double lng})? located,
  Brightness brightness = Brightness.light,
}) async {
  tester.view.physicalSize = const Size(390, 780);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final router = GoRouter(
    initialLocation: location,
    routes: [
      GoRoute(
        path: '/browse',
        builder: (context, state) => const BrowseScreen(),
        routes: [
          GoRoute(
            path: 'results',
            builder: (context, state) => switch (state.extra) {
              final BrowseQuery query => ResultsScreen(initial: query),
              _ => const ResultsScreen(focusSearch: true),
            },
          ),
          GoRoute(
            path: 'category/:id',
            builder: (context, state) => ResultsScreen(
              initial: BrowseQuery(categoryId: state.pathParameters['id']),
            ),
          ),
        ],
      ),
      GoRoute(path: '/saved', builder: (context, state) => const SavedScreen()),
      GoRoute(
        path: '/listing/:id',
        builder: (context, state) =>
            ListingScreen(listingId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/filters',
        builder: (context, state) =>
            FiltersScreen(query: state.extra! as BrowseQuery),
      ),
      GoRoute(path: '/area', builder: (context, state) => const AreaScreen()),
      GoRoute(
        path: '/sign-in',
        builder: (context, state) => const Text('Sign in page'),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      retry: neverRetry,
      overrides: [
        authApiProvider.overrideWithValue(_FakeAuthApi(user)),
        browseApiProvider.overrideWithValue(api),
        listingsApiProvider.overrideWithValue(_FakeListingsApi()),
        categoriesProvider.overrideWith((ref) async => _catalog),
        homeBannersProvider.overrideWith((ref) async => _banners),
        currentPositionProvider.overrideWithValue(() async => located),
      ],
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: buildTheme(brightness),
        routerConfig: router,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _tap(WidgetTester tester, Finder finder) async {
  await tester.ensureVisible(finder);
  await tester.pumpAndSettle();
  await tester.tap(finder);
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('browse shows the top categories and the latest listings', (
    tester,
  ) async {
    final api = _FakeBrowseApi();
    await _open(tester, '/browse', api: api);

    expect(find.text('Vehicles'), findsOneWidget);
    expect(find.text('Cars & Trucks'), findsNothing);
    expect(find.text('2016 Subaru Outback 2.5i Premium'), findsOneWidget);
    expect(api.searches.single, {'page': '1'});

    await _tap(tester, find.text('Vehicles'));

    expect(api.searches.last, {'categoryId': 'vehicles', 'page': '1'});
    expect(find.text('Cars & Trucks'), findsOneWidget);
    expect(find.text('4 listings'), findsOneWidget);
  });

  testWidgets('a banner opens what staff pointed it at', (tester) async {
    final api = _FakeBrowseApi();
    await _open(tester, '/browse', api: api);

    await _tap(tester, find.text('Bikes for spring'));

    expect(api.searches.last, {'q': 'bike', 'page': '1'});
  });

  testWidgets('the next page loads as the list nears its end', (tester) async {
    final api = _FakeBrowseApi(total: 45);
    await _open(tester, '/browse', api: api);

    for (var scroll = 0; scroll < 6; scroll++) {
      await tester.drag(find.byType(CustomScrollView), const Offset(0, -900));
      await tester.pumpAndSettle();
    }

    expect(api.searches.map((search) => search['page']), ['1', '2', '3']);
    expect(find.text('Listing number 45'), findsOneWidget);
  });

  testWidgets('a search keeps its words when filters are added', (
    tester,
  ) async {
    final api = _FakeBrowseApi();
    await _open(tester, '/browse/results', api: api);

    await tester.enterText(find.byType(TextField), '  honda ');
    await tester.testTextInput.receiveAction(TextInputAction.search);
    await tester.pumpAndSettle();
    expect(api.searches.last, {'q': 'honda', 'page': '1'});

    await _tap(tester, find.text('Filters'));
    // A search is ordered by best match until another order is picked.
    expect(find.text('Best match'), findsOneWidget);
    await _tap(tester, find.text('Price: low to high'));
    await _tap(tester, find.text('Show results'));

    expect(api.searches.last, {'q': 'honda', 'sort': 'price_low', 'page': '1'});
    expect(find.text('Filters · 1'), findsOneWidget);
  });

  testWidgets("a category's questions narrow its results", (tester) async {
    final api = _FakeBrowseApi();
    await _open(tester, '/browse/category/cars', api: api);

    await _tap(tester, find.text('Filters'));
    // Typed answers like the make are searched for, not filtered.
    expect(find.text('Make'), findsNothing);

    await _tap(tester, find.text('Manual'));
    await tester.enterText(
      find.widgetWithText(TextField, 'No max').at(1),
      '50000',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'No min').first,
      '2,000',
    );
    await _tap(tester, find.text('Show results'));

    expect(api.searches.last, {
      'categoryId': 'cars',
      'minCents': '200000',
      'filters': '{"transmission":["Manual"],"mileage":{"max":50000}}',
      'page': '1',
    });
    expect(find.text('Filters · 3'), findsOneWidget);
  });

  testWidgets('a price range upside down is pointed out', (tester) async {
    await _open(tester, '/browse/category/cars', api: _FakeBrowseApi());

    await _tap(tester, find.text('Filters'));
    await tester.enterText(
      find.widgetWithText(TextField, 'No min').first,
      '500',
    );
    await tester.enterText(
      find.widgetWithText(TextField, 'No max').first,
      '100',
    );
    await _tap(tester, find.text('Show results'));

    expect(find.text('Make this higher than the minimum.'), findsOneWidget);
  });

  testWidgets('an area keeps every list to a distance around a city', (
    tester,
  ) async {
    final api = _FakeBrowseApi();
    await _open(tester, '/browse', api: api);

    await _tap(tester, find.text('Anywhere in the US'));
    await tester.enterText(find.byType(TextField), 'aus');
    await tester.pump(const Duration(milliseconds: 300));
    await tester.pumpAndSettle();
    await _tap(tester, find.text('Austin, TX'));
    await _tap(tester, find.text('50 mi'));
    await _tap(tester, find.text('Apply'));

    expect(find.text('Austin, TX · 50 mi'), findsOneWidget);
    expect(api.searches.last, {
      'placeId': 'austin',
      'radius': '50',
      'page': '1',
    });
  });

  testWidgets("the phone's location picks the nearest city", (tester) async {
    final api = _FakeBrowseApi();
    await _open(
      tester,
      '/browse',
      api: api,
      located: (lat: 39.74, lng: -104.99),
    );

    await _tap(tester, find.text('Anywhere in the US'));
    await _tap(tester, find.text('Use my current location'));
    await _tap(tester, find.text('Apply'));

    expect(find.text('Denver, CO · 25 mi'), findsOneWidget);
    expect(api.searches.last['placeId'], 'denver');
  });

  testWidgets('with location off, it says so', (tester) async {
    await _open(tester, '/area', api: _FakeBrowseApi());

    await _tap(tester, find.text('Use my current location'));

    expect(find.text('Location is off. Pick a city instead.'), findsOneWidget);
  });

  testWidgets('a guest is sent to sign in before saving', (tester) async {
    await _open(tester, '/listing/civic', api: _FakeBrowseApi());

    await _tap(tester, find.text('Save'));

    expect(find.text('Sign in page'), findsOneWidget);
  });

  testWidgets('saving a listing puts it on the Saved tab', (tester) async {
    final api = _FakeBrowseApi();
    await _open(tester, '/listing/civic', api: api, user: _dana);

    await _tap(tester, find.text('Save'));

    expect(find.text('Saved'), findsOneWidget);
    expect(api.savedIds, ['civic']);
  });

  testWidgets('a save tapped before the saved list has loaded still holds', (
    tester,
  ) async {
    final loaded = Completer<void>();
    final api = _FakeBrowseApi(savedLoaded: loaded.future);
    await _open(tester, '/listing/civic', api: api, user: _dana);

    await tester.tap(find.text('Save'));
    await tester.pump();
    loaded.complete();
    await tester.pumpAndSettle();

    expect(find.text('Saved'), findsOneWidget);
    expect(api.savedIds, ['civic']);
  });

  testWidgets('a seller viewing their own listing has nothing to save', (
    tester,
  ) async {
    await _open(
      tester,
      '/listing/civic',
      api: _FakeBrowseApi(detail: _civic(sellerId: 'dana')),
      user: _dana,
    );

    expect(find.textContaining('This is your listing.'), findsOneWidget);
    expect(find.text('Save'), findsNothing);
  });

  testWidgets('the Saved tab lists what was saved', (tester) async {
    await _open(
      tester,
      '/saved',
      api: _FakeBrowseApi(savedCards: [_latest[3], _latest[1]]),
      user: _dana,
    );

    expect(find.text('2015 Honda Civic LX, one owner'), findsOneWidget);
    expect(find.text('Standing desk, 60 by 30, bamboo top'), findsOneWidget);
  });

  for (final brightness in Brightness.values) {
    final mode = brightness.name;

    testWidgets('browse screen in $mode', (tester) async {
      await _open(
        tester,
        '/browse',
        api: _FakeBrowseApi(
          featured: [
            ListingCard(
              id: 'allez',
              title: 'Specialized Allez road bike, 56 cm',
              price: const ListingPrice(mode: PriceMode.fixed, cents: 62000),
              city: 'Denver',
              state: 'CO',
              publishedAt: _daysAgo(2),
              featured: true,
            ),
            ListingCard(
              id: 'table',
              title: 'Oak dining table with six chairs',
              price: const ListingPrice(
                mode: PriceMode.negotiable,
                cents: 65000,
              ),
              city: 'Austin',
              state: 'TX',
              publishedAt: _daysAgo(6),
              featured: true,
            ),
          ],
        ),
        brightness: brightness,
      );

      await expectLater(
        find.byType(BrowseScreen),
        matchesGoldenFile('goldens/browse_$mode.png'),
      );
    });

    testWidgets('listing screen in $mode', (tester) async {
      await _open(
        tester,
        '/listing/civic',
        api: _FakeBrowseApi(detail: _civic(phone: '+1 512 555 0178')),
        user: _dana,
        brightness: brightness,
      );

      await expectLater(
        find.byType(ListingScreen),
        matchesGoldenFile('goldens/listing_$mode.png'),
      );
    });

    testWidgets('filters screen in $mode', (tester) async {
      await _open(
        tester,
        '/browse/category/cars',
        api: _FakeBrowseApi(),
        brightness: brightness,
      );
      await _tap(tester, find.text('Filters'));
      await _tap(tester, find.text('Automatic'));

      await expectLater(
        find.byType(FiltersScreen),
        matchesGoldenFile('goldens/filters_$mode.png'),
      );
    });
  }
}
