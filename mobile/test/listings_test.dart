import 'dart:convert';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker_platform_interface/image_picker_platform_interface.dart';
import 'package:listora/app/retry.dart';
import 'package:listora/app/theme/theme.dart';
import 'package:listora/core/network/api_error.dart';
import 'package:listora/features/auth/data/auth_api.dart';
import 'package:listora/features/auth/data/user.dart';
import 'package:listora/features/categories/data/categories_api.dart';
import 'package:listora/features/categories/data/category.dart';
import 'package:listora/features/listings/data/listing.dart';
import 'package:listora/features/listings/data/listings_api.dart';
import 'package:listora/features/listings/presentation/own_listing_screen.dart';
import 'package:listora/features/listings/presentation/selling_screen.dart';
import 'package:listora/features/post/presentation/post_listing_screen.dart';

final _dana = User(
  id: '1',
  name: 'Dana Whitfield',
  email: 'dana.whitfield@mailbox.example',
  phone: '+1 512 555 0142',
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
  Category(id: 'boats', name: 'Boats', slug: 'boats', parentId: 'vehicles'),
  Category(id: 'electronics', name: 'Electronics', slug: 'electronics'),
];

const _carFields = [
  ListingField(
    id: 'year',
    label: 'Year',
    type: FieldType.number,
    options: [],
    required: true,
  ),
  ListingField(
    id: 'mileage',
    label: 'Mileage',
    type: FieldType.number,
    options: [],
    unit: 'mi',
    required: true,
  ),
  ListingField(
    id: 'transmission',
    label: 'Transmission',
    type: FieldType.select,
    options: ['Automatic', 'Manual'],
    required: true,
  ),
  ListingField(
    id: 'features',
    label: 'Features',
    type: FieldType.multiselect,
    options: ['Backup camera', 'Bluetooth', 'Heated seats', 'Sunroof'],
    required: false,
  ),
  ListingField(
    id: 'clean_title',
    label: 'Clean title',
    type: FieldType.boolean,
    options: [],
    required: false,
  ),
];

const _austin = Place(id: 'austin', label: 'Austin, TX');

Listing _listing({
  required String id,
  required String title,
  required ListingStatus status,
  required int cents,
  PriceMode mode = PriceMode.fixed,
  String? rejectionReason,
  DateTime? expiresAt,
}) => Listing(
  id: id,
  title: title,
  description:
      'One owner, garage kept, all service records. New tires and brakes '
      'last spring. Selling because we moved downtown.',
  status: status,
  price: ListingPrice(mode: mode, cents: cents),
  categoryId: 'cars',
  categoryPath: const ['Vehicles', 'Cars & Trucks'],
  attributes: const [
    ListingAttribute(fieldId: 'year', label: 'Year', value: 2015),
    ListingAttribute(
      fieldId: 'mileage',
      label: 'Mileage',
      unit: 'mi',
      value: 84200,
    ),
    ListingAttribute(
      fieldId: 'transmission',
      label: 'Transmission',
      value: 'Automatic',
    ),
  ],
  placeId: 'austin',
  city: 'Austin',
  state: 'TX',
  showPhone: true,
  submittedAt: DateTime(2026, 11, 3),
  expiresAt: expiresAt,
  rejectionReason: rejectionReason,
);

final _civic = _listing(
  id: 'civic',
  title: '2015 Honda Civic LX, one owner',
  status: ListingStatus.active,
  cents: 920000,
  mode: PriceMode.negotiable,
  expiresAt: DateTime(2026, 12, 3),
);

final _own = [
  _listing(
    id: 'tacoma',
    title: '2019 Toyota Tacoma TRD Off-Road, double cab',
    status: ListingStatus.inReview,
    cents: 3150000,
  ),
  _civic,
  _listing(
    id: 'f150',
    title: 'Ford F-150 bed cover',
    status: ListingStatus.rejected,
    cents: 18000,
    rejectionReason: 'The description lists a phone number.',
  ),
  _listing(
    id: 'jetta',
    title: '2012 Volkswagen Jetta SE',
    status: ListingStatus.sold,
    cents: 480000,
  ),
];

class _FakeAuthApi implements AuthApi {
  _FakeAuthApi(this.restored);

  final User? restored;

  @override
  Future<User?> restore() async => restored;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Stands in for the server. [postError] is thrown by every post, and
/// uploads fail while [uploadsFail] is set.
class _FakeListingsApi implements ListingsApi {
  _FakeListingsApi({
    this.listings = const [],
    this.postError,
    this.uploadsFail = false,
  });

  final List<Listing> listings;
  final ApiError? postError;
  final bool uploadsFail;
  ListingDraft? posted;
  ListingDraft? revised;
  var _uploads = 0;

  @override
  Future<ListingPhoto> uploadPhoto(Uint8List bytes, String contentType) async {
    if (uploadsFail) {
      throw const ApiError(code: 'network', message: 'No connection.');
    }
    final id = 'p${++_uploads}';
    return ListingPhoto(
      id: id,
      url: 'http://photos.test/$id/full',
      thumbUrl: 'http://photos.test/$id/thumb',
    );
  }

  @override
  Future<List<Listing>> own() async => listings;

  @override
  Future<List<ListingField>> fieldsFor(String categoryId) async =>
      categoryId == 'cars' ? _carFields : const [];

  @override
  Future<List<Place>> searchPlaces(String query) async => const [_austin];

  @override
  Future<Listing> post(ListingDraft draft) {
    final error = postError;
    if (error != null) return Future.error(error);
    posted = draft;
    return Future.value(_civic);
  }

  @override
  Future<Listing> revise(String id, ListingDraft draft) async {
    revised = draft;
    return _civic;
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Opens the app's selling routes at [location], signed in as [user].
Future<void> _open(
  WidgetTester tester,
  String location, {
  required _FakeListingsApi api,
  User? user,
  Brightness brightness = Brightness.light,
}) async {
  tester.view.physicalSize = const Size(390, 780);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final router = GoRouter(
    initialLocation: location,
    routes: [
      GoRoute(
        path: '/selling',
        builder: (context, state) => const SellingScreen(),
        routes: [
          GoRoute(
            path: 'new',
            builder: (context, state) => const PostListingScreen(),
          ),
          GoRoute(
            path: ':id',
            builder: (context, state) =>
                OwnListingScreen(listingId: state.pathParameters['id']!),
            routes: [
              GoRoute(
                path: 'edit',
                builder: (context, state) =>
                    PostListingScreen(listingId: state.pathParameters['id']),
              ),
            ],
          ),
        ],
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      retry: neverRetry,
      overrides: [
        authApiProvider.overrideWithValue(_FakeAuthApi(user)),
        listingsApiProvider.overrideWithValue(api),
        categoriesProvider.overrideWith((ref) async => _catalog),
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

Future<void> _continue(WidgetTester tester) async {
  await tester.tap(find.text('Continue'));
  await tester.pumpAndSettle();
}

/// Walks the form from the first step to the summary, for a car in Austin.
Future<void> _fillIn(WidgetTester tester) async {
  await tester.tap(find.text('Vehicles'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Cars & Trucks'));
  await tester.pumpAndSettle();

  await tester.enterText(
    find.byType(TextField).at(0),
    '2015 Honda Civic LX, one owner',
  );
  await tester.enterText(
    find.byType(TextField).at(1),
    'One owner, garage kept, all service records.',
  );
  await tester.enterText(find.byType(TextField).at(2), '9,200');
  await _continue(tester);
  // No photos this time.
  await _continue(tester);

  await tester.enterText(find.byType(TextField).at(0), '2015');
  await tester.enterText(find.byType(TextField).at(1), '84200');
  await tester.tap(find.text('Choose'));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Automatic').last);
  await tester.pumpAndSettle();
  await tester.tap(find.text('Bluetooth'));
  await tester.pump();
  await _continue(tester);

  await _pickAustin(tester);
}

/// Hands the form [count] picked photos, as the gallery would.
class _FakePicker extends ImagePickerPlatform {
  _FakePicker(this.count);

  final int count;

  // A one-pixel PNG: enough for the tile to draw.
  static final _pixel = base64Decode(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAj'
    'CB0C8AAAAASUVORK5CYII=',
  );

  XFile _file() => XFile.fromData(_pixel, mimeType: 'image/png');

  @override
  Future<List<XFile>> getMultiImageWithOptions({
    MultiImagePickerOptions options = const MultiImagePickerOptions(),
  }) async => [for (var i = 0; i < count; i++) _file()];

  @override
  Future<XFile?> getImageFromSource({
    required ImageSource source,
    ImagePickerOptions options = const ImagePickerOptions(),
  }) async => _file();
}

/// Picks a category with no questions and describes the item, landing on
/// the photos step.
Future<void> _describeATv(WidgetTester tester) async {
  await tester.tap(find.text('Electronics'));
  await tester.pumpAndSettle();
  await tester.enterText(
    find.byType(TextField).at(0),
    'Samsung 55-inch QLED TV',
  );
  await tester.enterText(
    find.byType(TextField).at(1),
    'Bought last year, wall mount and remote included.',
  );
  await tester.enterText(find.byType(TextField).at(2), '450');
  await _continue(tester);
}

Future<void> _addPhotos(WidgetTester tester) async {
  await tester.tap(find.text('Add photos').last);
  await tester.pumpAndSettle();
  await tester.tap(find.text('Choose from the gallery'));
  await tester.pumpAndSettle();
}

Future<void> _pickAustin(WidgetTester tester) async {
  await tester.enterText(find.byType(TextField), 'aus');
  await tester.pump(const Duration(milliseconds: 300));
  await tester.pumpAndSettle();
  await tester.tap(find.text('Austin, TX'));
  await tester.pumpAndSettle();
  await _continue(tester);
}

/// What the text field at [index] on the open step holds.
String _typed(WidgetTester tester, int index) =>
    tester.widget<TextField>(find.byType(TextField).at(index)).controller!.text;

void main() {
  testWidgets('a guest is asked to sign in before selling', (tester) async {
    await _open(tester, '/selling', api: _FakeListingsApi());

    expect(find.text('Sign in'), findsOneWidget);
    expect(find.text('Post a listing'), findsNothing);
  });

  testWidgets('a seller with nothing posted is pointed at the form', (
    tester,
  ) async {
    await _open(tester, '/selling', api: _FakeListingsApi(), user: _dana);

    expect(find.text('Nothing listed yet'), findsOneWidget);

    await tester.tap(find.text('Post a listing'));
    await tester.pumpAndSettle();

    expect(find.text('What are you selling?'), findsOneWidget);
  });

  testWidgets('a step with mistakes says what to fix and stays open', (
    tester,
  ) async {
    await _open(tester, '/selling/new', api: _FakeListingsApi(), user: _dana);

    await _continue(tester);
    expect(find.text('Choose a category.'), findsOneWidget);

    await tester.tap(find.text('Electronics'));
    await tester.pumpAndSettle();
    await tester.enterText(find.byType(TextField).at(0), 'TV');
    await _continue(tester);

    expect(find.text('Describe it'), findsOneWidget);
    expect(find.text('Use at least 5 characters.'), findsOneWidget);
    expect(
      find.text('Say a little more: at least 20 characters.'),
      findsOneWidget,
    );
    expect(find.text('Enter a price.'), findsOneWidget);
  });

  testWidgets('a category without questions skips that step', (tester) async {
    await _open(tester, '/selling/new', api: _FakeListingsApi(), user: _dana);

    await tester.tap(find.text('Electronics'));
    await tester.pumpAndSettle();

    expect(find.text('2 of 5'), findsOneWidget);
  });

  testWidgets('photos upload as they are picked and post in the order chosen', (
    tester,
  ) async {
    ImagePickerPlatform.instance = _FakePicker(2);
    final api = _FakeListingsApi();
    await _open(tester, '/selling/new', api: api, user: _dana);
    await _describeATv(tester);

    await _addPhotos(tester);
    expect(find.bySemanticsLabel('Photo 1, cover'), findsOneWidget);
    expect(find.bySemanticsLabel('Photo 2'), findsOneWidget);

    await tester.tap(find.bySemanticsLabel('Photo 2'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Make it the cover'));
    await tester.pumpAndSettle();
    expect(find.bySemanticsLabel('Photo 1, cover'), findsOneWidget);

    await _continue(tester);
    await _pickAustin(tester);
    expect(find.text('Photos'), findsOneWidget);
    await tester.tap(find.text('Post listing'));
    await tester.pumpAndSettle();

    expect(api.posted!.photoIds, ['p2', 'p1']);
  });

  testWidgets("a photo that didn't upload holds the step until it is removed", (
    tester,
  ) async {
    ImagePickerPlatform.instance = _FakePicker(1);
    final api = _FakeListingsApi(uploadsFail: true);
    await _open(tester, '/selling/new', api: api, user: _dana);
    await _describeATv(tester);

    await _addPhotos(tester);
    expect(
      find.bySemanticsLabel("Photo 1, cover, didn't upload"),
      findsOneWidget,
    );

    await _continue(tester);
    expect(find.textContaining("Some photos didn't upload."), findsOneWidget);

    await tester.tap(find.bySemanticsLabel(RegExp('Photo 1')));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Remove'));
    await tester.pumpAndSettle();
    await _continue(tester);

    expect(find.text('Where is it?'), findsOneWidget);
  });

  testWidgets('the summary repeats the answers and posting sends them', (
    tester,
  ) async {
    final api = _FakeListingsApi();
    await _open(tester, '/selling/new', api: api, user: _dana);

    await _fillIn(tester);

    expect(find.text('Vehicles / Cars & Trucks'), findsOneWidget);
    expect(find.text(r'$9,200'), findsOneWidget);
    expect(find.text('84,200 mi'), findsOneWidget);
    expect(find.text('2015'), findsOneWidget);

    await tester.tap(find.text('Post listing'));
    await tester.pumpAndSettle();

    expect(api.posted!.toJson(), {
      'title': '2015 Honda Civic LX, one owner',
      'description': 'One owner, garage kept, all service records.',
      'categoryId': 'cars',
      'price': {'mode': 'fixed', 'cents': 920000},
      'attributes': {
        'year': 2015,
        'mileage': 84200,
        'transmission': 'Automatic',
        'features': ['Bluetooth'],
        'clean_title': false,
      },
      'placeId': 'austin',
      'showPhone': false,
      'photoIds': <String>[],
    });
    // Posting closes the form.
    expect(find.text('Check it over'), findsNothing);
  });

  testWidgets('an answer the server refuses reopens the step it is on', (
    tester,
  ) async {
    await _open(
      tester,
      '/selling/new',
      api: _FakeListingsApi(
        postError: const ApiError(
          code: 'validation',
          message: 'Check the highlighted fields.',
          fields: {'attributes.mileage': 'Enter a number.'},
        ),
      ),
      user: _dana,
    );

    await _fillIn(tester);
    await tester.tap(find.text('Post listing'));
    await tester.pumpAndSettle();

    expect(find.text('A few details'), findsOneWidget);
    expect(find.text('Enter a number.'), findsOneWidget);
  });

  testWidgets('posting without credits points to the packages', (tester) async {
    await _open(
      tester,
      '/selling/new',
      api: _FakeListingsApi(
        postError: const ApiError(
          code: 'payment_required',
          message:
              "You've used your 3 free listings this month. Get a listing "
              'package to post more.',
        ),
      ),
      user: _dana,
    );

    await _fillIn(tester);
    await tester.tap(find.text('Post listing'));
    await tester.pumpAndSettle();

    expect(find.textContaining('free listings this month'), findsOneWidget);
    expect(find.text('See packages'), findsOneWidget);
  });

  testWidgets('editing opens on the details, filled in, and saves', (
    tester,
  ) async {
    final api = _FakeListingsApi(listings: _own);
    await _open(tester, '/selling/civic/edit', api: api, user: _dana);

    expect(find.text('Edit listing'), findsOneWidget);
    expect(_typed(tester, 0), '2015 Honda Civic LX, one owner');
    expect(_typed(tester, 2), '9200');

    await _continue(tester);
    await _continue(tester);
    expect(_typed(tester, 1), '84200');
    await _continue(tester);
    await _continue(tester);
    await tester.tap(find.text('Save changes'));
    await tester.pumpAndSettle();

    expect(api.revised!.toJson()['price'], {
      'mode': 'negotiable',
      'cents': 920000,
    });
    expect(api.revised!.placeId, 'austin');
  });

  testWidgets('a rejected listing shows why and can be edited', (tester) async {
    await _open(
      tester,
      '/selling/f150',
      api: _FakeListingsApi(listings: _own),
      user: _dana,
    );

    expect(
      find.textContaining('The description lists a phone number.'),
      findsOneWidget,
    );
    expect(find.text('Edit'), findsOneWidget);
    expect(find.text('Mark as sold'), findsNothing);
  });

  for (final brightness in Brightness.values) {
    final mode = brightness.name;

    testWidgets('selling screen in $mode', (tester) async {
      await _open(
        tester,
        '/selling',
        api: _FakeListingsApi(listings: _own),
        user: _dana,
        brightness: brightness,
      );

      await expectLater(
        find.byType(SellingScreen),
        matchesGoldenFile('goldens/selling_$mode.png'),
      );
    });

    testWidgets('own listing screen in $mode', (tester) async {
      await _open(
        tester,
        '/selling/civic',
        api: _FakeListingsApi(listings: _own),
        user: _dana,
        brightness: brightness,
      );

      await expectLater(
        find.byType(OwnListingScreen),
        matchesGoldenFile('goldens/own_listing_$mode.png'),
      );
    });

    testWidgets('category questions step in $mode', (tester) async {
      await _open(
        tester,
        '/selling/civic/edit',
        api: _FakeListingsApi(listings: _own),
        user: _dana,
        brightness: brightness,
      );
      await _continue(tester);

      await expectLater(
        find.byType(PostListingScreen),
        matchesGoldenFile('goldens/post_photos_$mode.png'),
      );

      await _continue(tester);
      await expectLater(
        find.byType(PostListingScreen),
        matchesGoldenFile('goldens/post_fields_$mode.png'),
      );
    });

    testWidgets('summary step in $mode', (tester) async {
      await _open(
        tester,
        '/selling/civic/edit',
        api: _FakeListingsApi(listings: _own),
        user: _dana,
        brightness: brightness,
      );
      for (var step = 0; step < 4; step++) {
        await _continue(tester);
      }

      await expectLater(
        find.byType(PostListingScreen),
        matchesGoldenFile('goldens/post_review_$mode.png'),
      );
    });
  }
}
