import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:listora/app/retry.dart';
import 'package:listora/app/theme/theme.dart';
import 'package:listora/core/network/api_error.dart';
import 'package:listora/features/auth/data/auth_api.dart';
import 'package:listora/features/auth/data/user.dart';
import 'package:listora/features/browse/data/market_listing.dart';
import 'package:listora/features/listings/data/listing.dart';
import 'package:listora/features/sellers/data/seller.dart';
import 'package:listora/features/sellers/data/sellers_api.dart';
import 'package:listora/features/sellers/presentation/people_screens.dart';
import 'package:listora/features/sellers/presentation/seller_screen.dart';
import 'package:listora/features/sellers/presentation/verification_screen.dart';

final _miguel = User(
  id: 'miguel',
  name: 'Miguel Ortega',
  email: 'miguel.ortega@postbox.example',
  phone: '+1 512 555 0178',
  createdAt: DateTime(2026, 5, 12),
);

SellerProfile _dana({
  bool following = false,
  List<Reviewable> reviewable = const [],
}) => SellerProfile(
  id: 'dana',
  name: 'Dana Whitfield',
  joinedAt: DateTime(2026, 3, 2),
  verified: true,
  rating: const Rating(average: 4.5, count: 2),
  followers: 3,
  following: following,
  listings: [
    ListingCard(
      id: 'civic',
      title: '2015 Honda Civic LX, one owner',
      price: const ListingPrice(mode: PriceMode.negotiable, cents: 890000),
      city: 'Austin',
      state: 'TX',
      publishedAt: DateTime.now().subtract(const Duration(days: 3)),
    ),
    ListingCard(
      id: 'table',
      title: 'Oak dining table with six chairs',
      price: const ListingPrice(mode: PriceMode.negotiable, cents: 65000),
      city: 'Austin',
      state: 'TX',
      publishedAt: DateTime.now().subtract(const Duration(days: 6)),
    ),
  ],
  reviews: [
    SellerReview(
      id: 'r1',
      rating: 5,
      text: 'Exactly as described, and she had the service records ready.',
      reviewerName: 'Rachel Steinberg',
      listingTitle: 'Mid-century walnut dresser, six drawers',
      createdAt: DateTime.now().subtract(const Duration(days: 2)),
    ),
    SellerReview(
      id: 'r2',
      rating: 4,
      text: 'Table is solid. Pickup was an hour later than we agreed.',
      reviewerName: 'Caleb Nowak',
      listingTitle: 'Oak dining table with six chairs',
      createdAt: DateTime.now().subtract(const Duration(days: 5)),
    ),
  ],
  reviewable: reviewable,
);

class _FakeAuthApi implements AuthApi {
  _FakeAuthApi(this.restored);

  final User? restored;

  @override
  Future<User?> restore() async => restored;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeSellersApi implements SellersApi {
  _FakeSellersApi({
    SellerProfile? profile,
    this.state = const VerificationState(
      verified: false,
      status: VerificationStatus.none,
    ),
    this.blockedPeople = const [],
    this.requestError,
  }) : shown = profile ?? _dana();

  SellerProfile shown;
  VerificationState state;
  final List<Person> blockedPeople;
  final ApiError? requestError;
  final follows = <String>[];
  final reviews = <(String, int, String)>[];
  final reports = <(ReportTarget, String, String)>[];
  final unblocked = <String>[];

  @override
  Future<SellerProfile> profile(String id) async => shown;

  @override
  Future<void> follow(String id) async {
    follows.add(id);
    shown = _dana(following: true);
  }

  @override
  Future<void> review({
    required String listingId,
    required int rating,
    required String text,
  }) async => reviews.add((listingId, rating, text));

  @override
  Future<void> report({
    required ReportTarget target,
    required String id,
    required String reason,
    required String note,
  }) async => reports.add((target, id, reason));

  @override
  Future<List<Person>> blocked() async => [
    for (final person in blockedPeople)
      if (!unblocked.contains(person.id)) person,
  ];

  @override
  Future<void> unblock(String id) async => unblocked.add(id);

  @override
  Future<VerificationState> verification() async => state;

  @override
  Future<VerificationState> requestVerification({
    required String legalName,
    required String phone,
    required String about,
  }) async {
    final error = requestError;
    if (error != null) throw error;
    return state = const VerificationState(
      verified: false,
      status: VerificationStatus.pending,
    );
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _open(
  WidgetTester tester,
  String location, {
  required _FakeSellersApi api,
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
        path: '/sellers/:id',
        builder: (context, state) =>
            SellerScreen(sellerId: state.pathParameters['id']!),
      ),
      GoRoute(
        path: '/blocked',
        builder: (context, state) => const BlockedScreen(),
      ),
      GoRoute(
        path: '/verification',
        builder: (context, state) => const VerificationScreen(),
      ),
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
        sellersApiProvider.overrideWithValue(api),
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
  testWidgets('a guest who follows is asked to sign in first', (tester) async {
    await _open(tester, '/sellers/dana', api: _FakeSellersApi());

    expect(find.text('Verified'), findsOneWidget);
    expect(find.text('4.5 · 2 reviews'), findsOneWidget);
    await _tap(tester, find.text('Follow'));

    expect(find.text('Sign in page'), findsOneWidget);
  });

  testWidgets('following a seller shows straight away', (tester) async {
    final api = _FakeSellersApi();
    await _open(tester, '/sellers/dana', api: api, user: _miguel);

    await _tap(tester, find.text('Follow'));

    expect(api.follows, ['dana']);
    expect(find.text('Following'), findsOneWidget);
  });

  testWidgets('a review needs stars and goes out for the chosen listing', (
    tester,
  ) async {
    final api = _FakeSellersApi(
      profile: _dana(
        reviewable: const [
          Reviewable(id: 'civic', title: '2015 Honda Civic LX, one owner'),
        ],
      ),
    );
    await _open(tester, '/sellers/dana', api: api, user: _miguel);

    await _tap(tester, find.text('Write a review'));
    await _tap(tester, find.text('Post review'));
    expect(find.text('Choose from one to five stars.'), findsOneWidget);

    await _tap(tester, find.byTooltip('4 stars'));
    await tester.enterText(find.byType(TextField), 'Quick and honest.');
    await _tap(tester, find.text('Post review'));

    expect(api.reviews, [('civic', 4, 'Quick and honest.')]);
  });

  testWidgets('a review can be reported with a reason', (tester) async {
    final api = _FakeSellersApi();
    await _open(tester, '/sellers/dana', api: api, user: _miguel);

    await _tap(tester, find.byTooltip('Report review').first);
    await _tap(tester, find.text('Send report'));
    expect(find.text('Choose a reason.'), findsOneWidget);

    await _tap(tester, find.text('Offensive or abusive'));
    await _tap(tester, find.text('Send report'));

    expect(api.reports, [(ReportTarget.review, 'r1', 'offensive')]);
    expect(find.text("Thanks. We'll take a look."), findsOneWidget);
  });

  testWidgets('someone blocked can be unblocked from the list', (tester) async {
    final api = _FakeSellersApi(
      blockedPeople: const [
        Person(
          id: 'caleb',
          name: 'Caleb Nowak',
          verified: false,
          rating: Rating(average: 0, count: 0),
        ),
      ],
    );
    await _open(tester, '/blocked', api: api, user: _miguel);

    await _tap(tester, find.text('Unblock'));

    expect(api.unblocked, ['caleb']);
    expect(find.text('No one is blocked'), findsOneWidget);
  });

  testWidgets('a verification request shows as waiting once sent', (
    tester,
  ) async {
    await _open(tester, '/verification', api: _FakeSellersApi(), user: _miguel);

    // The phone on the account is filled in already.
    expect(find.text('+1 512 555 0178'), findsOneWidget);
    await tester.enterText(find.byType(TextField).first, 'Miguel A. Ortega');
    await tester.enterText(
      find.byType(TextField).last,
      'Guitars and tools from my own workshop.',
    );
    await _tap(tester, find.text('Send request'));

    expect(find.text('We are reviewing your request'), findsOneWidget);
  });

  testWidgets('a refused request shows the reason under its field', (
    tester,
  ) async {
    await _open(
      tester,
      '/verification',
      user: _miguel,
      api: _FakeSellersApi(
        state: const VerificationState(
          verified: false,
          status: VerificationStatus.rejected,
          reason: "We couldn't reach the phone number you gave.",
        ),
        requestError: const ApiError(
          code: 'validation',
          message: 'Check the highlighted fields.',
          fields: {'about': 'Say a little more: at least 20 characters.'},
        ),
      ),
    );

    expect(
      find.text(
        "Your last request was turned down: We couldn't reach the phone "
        'number you gave.',
      ),
      findsOneWidget,
    );
    await _tap(tester, find.text('Send request'));
    expect(
      find.text('Say a little more: at least 20 characters.'),
      findsOneWidget,
    );
  });

  for (final brightness in Brightness.values) {
    final mode = brightness.name;

    testWidgets('seller screen in $mode', (tester) async {
      await _open(
        tester,
        '/sellers/dana',
        brightness: brightness,
        user: _miguel,
        api: _FakeSellersApi(
          profile: _dana(
            following: true,
            reviewable: const [
              Reviewable(id: 'civic', title: '2015 Honda Civic LX, one owner'),
            ],
          ),
        ),
      );

      await expectLater(
        find.byType(SellerScreen),
        matchesGoldenFile('goldens/seller_$mode.png'),
      );
    });

    testWidgets('verification screen in $mode', (tester) async {
      await _open(
        tester,
        '/verification',
        brightness: brightness,
        user: _miguel,
        api: _FakeSellersApi(),
      );

      await expectLater(
        find.byType(VerificationScreen),
        matchesGoldenFile('goldens/verification_$mode.png'),
      );
    });
  }
}
