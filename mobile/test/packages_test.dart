import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:listora/app/retry.dart';
import 'package:listora/app/theme/theme.dart';
import 'package:listora/core/network/api_error.dart';
import 'package:listora/core/open_link.dart';
import 'package:listora/features/auth/data/auth_api.dart';
import 'package:listora/features/auth/data/user.dart';
import 'package:listora/features/chat/data/chat_api.dart';
import 'package:listora/features/chat/data/chat_models.dart';
import 'package:listora/features/listings/data/listing.dart';
import 'package:listora/features/listings/data/listings_api.dart';
import 'package:listora/features/listings/presentation/own_listing_screen.dart';
import 'package:listora/features/packages/data/packages.dart';
import 'package:listora/features/packages/presentation/packages_screen.dart';

final _dana = User(
  id: 'dana',
  name: 'Dana Whitfield',
  email: 'dana.whitfield@mailbox.example',
  createdAt: DateTime(2026, 4, 12),
);

const _forSale = [
  SalePackage(
    id: 'plus',
    name: 'Seller Plus',
    kind: PackageKind.listing,
    priceCents: 999,
    quantity: 10,
    days: 30,
  ),
  SalePackage(
    id: 'pro',
    name: 'Seller Pro',
    kind: PackageKind.listing,
    priceCents: 2499,
    quantity: 30,
    days: 60,
  ),
  SalePackage(
    id: 'spotlight',
    name: 'Spotlight',
    kind: PackageKind.featured,
    priceCents: 499,
    quantity: 1,
    days: 30,
    featureDays: 7,
  ),
];

final _mine = MyPackages(
  credits: [
    Credit(
      id: 'free',
      name: 'Free listings this month',
      kind: PackageKind.listing,
      total: 3,
      remaining: 1,
      expiresAt: DateTime(2026, 12, 1),
    ),
    Credit(
      id: 'c1',
      name: 'Seller Pro',
      kind: PackageKind.listing,
      total: 30,
      remaining: 24,
      expiresAt: DateTime(2027, 1, 10),
    ),
    Credit(
      id: 'c2',
      name: 'Spotlight 5-pack',
      kind: PackageKind.featured,
      total: 5,
      remaining: 3,
      expiresAt: DateTime(2027, 1, 16),
    ),
  ],
  receipts: [
    Receipt(
      id: 'r1',
      packageName: 'Seller Pro',
      amountCents: 2499,
      paidAt: DateTime(2026, 10, 9),
    ),
  ],
);

class _FakeAuthApi implements AuthApi {
  @override
  Future<User?> restore() async => _dana;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakePackagesApi implements PackagesApi {
  _FakePackagesApi({this.checkoutError});

  final ApiError? checkoutError;
  final checkouts = <String>[];

  @override
  Future<List<SalePackage>> forSale() async => _forSale;

  @override
  Future<MyPackages> mine() async => _mine;

  @override
  Future<Uri> checkout(String packageId) async {
    final error = checkoutError;
    if (error != null) throw error;
    checkouts.add(packageId);
    return Uri.parse('https://checkout.stripe.com/c/pay/cs_test_$packageId');
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

class _FakeChatApi implements ChatApi {
  @override
  Future<List<AppNotification>> notifications() async => const [];

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

final _table = Listing(
  id: 'table',
  title: 'Oak dining table with six chairs',
  description:
      'Seats eight with the leaf in. Chairs were reupholstered two years '
      'ago. Solid and heavy, bring help.',
  status: ListingStatus.active,
  price: const ListingPrice(mode: PriceMode.negotiable, cents: 65000),
  categoryId: 'furniture',
  categoryPath: const ['Home & Garden', 'Furniture'],
  attributes: const [],
  placeId: 'austin',
  city: 'Austin',
  state: 'TX',
  showPhone: false,
  submittedAt: DateTime(2026, 11, 3),
  expiresAt: DateTime(2026, 12, 3),
);

class _FakeListingsApi implements ListingsApi {
  _FakeListingsApi(this.listing);

  final Listing listing;

  @override
  Future<List<Listing>> own() async => [listing];

  @override
  Future<void> feature(String id) => Future.error(
    const ApiError(
      code: 'payment_required',
      message: 'Get a featured package to put this listing on top.',
    ),
  );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<List<Uri>> _open(
  WidgetTester tester,
  String location, {
  _FakePackagesApi? packages,
  Listing? listing,
  Brightness brightness = Brightness.light,
}) async {
  tester.view.physicalSize = const Size(390, 780);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final opened = <Uri>[];
  final router = GoRouter(
    initialLocation: location,
    routes: [
      GoRoute(
        path: '/account/packages',
        builder: (context, state) => const PackagesScreen(),
      ),
      GoRoute(
        path: '/selling/:id',
        builder: (context, state) =>
            OwnListingScreen(listingId: state.pathParameters['id']!),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      retry: neverRetry,
      overrides: [
        authApiProvider.overrideWithValue(_FakeAuthApi()),
        packagesApiProvider.overrideWithValue(packages ?? _FakePackagesApi()),
        chatApiProvider.overrideWithValue(_FakeChatApi()),
        listingsApiProvider.overrideWithValue(
          _FakeListingsApi(listing ?? _table),
        ),
        openLinkProvider.overrideWithValue((page) async {
          opened.add(page);
          return true;
        }),
      ],
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: buildTheme(brightness),
        routerConfig: router,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return opened;
}

void main() {
  testWidgets('credits are added up by kind', (tester) async {
    await _open(tester, '/account/packages');

    expect(find.text('25'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
    expect(
      find.text('Seller Pro: 24 of 30 left until Jan 10, 2027'),
      findsOneWidget,
    );
  });

  testWidgets('buying opens Stripe checkout in the browser', (tester) async {
    final packages = _FakePackagesApi();
    final opened = await _open(tester, '/account/packages', packages: packages);

    await tester.tap(find.widgetWithText(OutlinedButton, r'$24.99'));
    await tester.pumpAndSettle();

    expect(packages.checkouts, ['pro']);
    expect(opened.single.host, 'checkout.stripe.com');
  });

  testWidgets('a server without Stripe says so', (tester) async {
    await _open(
      tester,
      '/account/packages',
      packages: _FakePackagesApi(
        checkoutError: const ApiError(
          code: 'conflict',
          message: "Payments aren't set up on this server yet.",
        ),
      ),
    );

    await tester.tap(find.text(r'$4.99'));
    await tester.pumpAndSettle();

    expect(
      find.text("Payments aren't set up on this server yet."),
      findsOneWidget,
    );
  });

  testWidgets('featuring without credits points to the packages', (
    tester,
  ) async {
    await _open(tester, '/selling/table');

    await tester.ensureVisible(find.text('Feature on top'));
    await tester.tap(find.text('Feature on top'));
    await tester.pumpAndSettle();

    expect(
      find.text('Get a featured package to put this listing on top.'),
      findsWidgets,
    );
    expect(find.text('Packages'), findsOneWidget);
  });

  testWidgets('an ended listing offers renewing instead of editing', (
    tester,
  ) async {
    final ended = Listing(
      id: 'table',
      title: _table.title,
      description: _table.description,
      status: ListingStatus.expired,
      price: _table.price,
      categoryId: _table.categoryId,
      categoryPath: _table.categoryPath,
      attributes: const [],
      placeId: 'austin',
      city: 'Austin',
      state: 'TX',
      showPhone: false,
      submittedAt: _table.submittedAt,
    );
    await _open(tester, '/selling/table', listing: ended);

    expect(find.text('Renew for 30 days'), findsOneWidget);
    expect(find.text('Edit'), findsNothing);
  });

  for (final brightness in Brightness.values) {
    testWidgets('packages screen in ${brightness.name}', (tester) async {
      await _open(tester, '/account/packages', brightness: brightness);

      await expectLater(
        find.byType(PackagesScreen),
        matchesGoldenFile('goldens/packages_${brightness.name}.png'),
      );
    });
  }
}
