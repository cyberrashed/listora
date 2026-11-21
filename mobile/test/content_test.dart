import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:listora/app/retry.dart';
import 'package:listora/app/theme/theme.dart';
import 'package:listora/features/content/data/content.dart';
import 'package:listora/features/content/presentation/reading_screens.dart';
import 'package:listora/features/startup/gate_screens.dart';
import 'package:listora/features/startup/startup_screen.dart';

const _config = AppConfig(
  maintenance: false,
  maintenanceMessage: 'Listora is down for a short update. Back by 9 PM.',
  minAppVersion: '0.1.0',
  supportEmail: 'help@listora.example',
);

class _FakeContentApi implements ContentApi {
  _FakeContentApi({this.settings = _config});

  final AppConfig settings;

  @override
  Future<AppConfig> config() async => settings;

  @override
  Future<Help> help() async => const Help(
    questions: [
      Question(
        question: 'Is posting a listing free?',
        answer: 'Every account posts three listings a month for free.',
      ),
      Question(
        question: 'Why is my listing waiting for review?',
        answer: 'Our team reads every listing before it goes live.',
      ),
    ],
    pages: [
      PageLink(slug: 'safety-tips', title: 'Safety tips'),
      PageLink(slug: 'terms', title: 'Terms of use'),
    ],
  );

  @override
  Future<Article> page(String slug) async => const Article(
    title: 'Safety tips',
    body:
        'Meet in a busy public place during the day.\n\nBring a friend if '
        'you can, and tell someone where you are going.',
  );

  @override
  Future<List<PostCard>> posts() async => [
    PostCard(
      slug: 'five-rules-for-a-safe-meetup',
      title: 'Five rules for a safe meetup',
      excerpt: 'Where to meet, when to go and what to check first.',
      publishedAt: DateTime(2026, 11, 14),
    ),
  ];

  @override
  Future<Article> post(String slug) async => Article(
    title: 'Five rules for a safe meetup',
    excerpt: 'Where to meet, when to go and what to check first.',
    date: DateTime(2026, 11, 14),
    body:
        'Most sales go smoothly, and a few habits keep it that way.\n\n'
        'Pick a busy public place, in daylight. Many police stations have a '
        'marked safe exchange spot.\n\nCheck the item before you pay.',
  );

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _open(
  WidgetTester tester,
  String location, {
  _FakeContentApi? api,
  String version = '0.1.0',
  Brightness brightness = Brightness.light,
}) async {
  tester.view.physicalSize = const Size(390, 780);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final router = GoRouter(
    initialLocation: location,
    routes: [
      GoRoute(path: '/', builder: (context, state) => const StartupScreen()),
      GoRoute(
        path: '/browse',
        builder: (context, state) => const Text('Browse'),
      ),
      GoRoute(
        path: '/maintenance',
        builder: (context, state) => const MaintenanceScreen(),
      ),
      GoRoute(
        path: '/update',
        builder: (context, state) => const UpdateScreen(),
      ),
      GoRoute(path: '/help', builder: (context, state) => const HelpScreen()),
      GoRoute(
        path: '/pages/:slug',
        builder: (context, state) =>
            PageScreen(slug: state.pathParameters['slug']!),
      ),
      GoRoute(path: '/blog', builder: (context, state) => const BlogScreen()),
      GoRoute(
        path: '/blog/:slug',
        builder: (context, state) =>
            PostScreen(slug: state.pathParameters['slug']!),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      retry: neverRetry,
      overrides: [
        contentApiProvider.overrideWithValue(api ?? _FakeContentApi()),
        appVersionProvider.overrideWith((ref) async => version),
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

void main() {
  test('versions compare part by part', () {
    expect(isOlder('0.1.0', '0.2.0'), isTrue);
    expect(isOlder('0.10.0', '0.9.3'), isFalse);
    expect(isOlder('1.2.0+7', '1.2.0'), isFalse);
    expect(isOlder('1.2', '1.2.1'), isTrue);
  });

  testWidgets('the app opens on the marketplace when nothing stops it', (
    tester,
  ) async {
    await _open(tester, '/');
    expect(find.text('Browse'), findsOneWidget);
  });

  testWidgets('maintenance shows the staff message instead', (tester) async {
    await _open(
      tester,
      '/',
      api: _FakeContentApi(
        settings: const AppConfig(
          maintenance: true,
          maintenanceMessage:
              'Listora is down for a short update. Back by 9 PM.',
          minAppVersion: '0.1.0',
          supportEmail: 'help@listora.example',
        ),
      ),
    );

    expect(find.text('Back soon'), findsOneWidget);
    expect(
      find.text('Listora is down for a short update. Back by 9 PM.'),
      findsOneWidget,
    );
  });

  testWidgets('an older build is asked to update', (tester) async {
    await _open(
      tester,
      '/',
      version: '0.1.0',
      api: _FakeContentApi(
        settings: const AppConfig(
          maintenance: false,
          maintenanceMessage: 'Back soon.',
          minAppVersion: '0.3.0',
          supportEmail: 'help@listora.example',
        ),
      ),
    );

    expect(find.text('Update Listora'), findsOneWidget);
  });

  testWidgets('help answers questions and opens the longer pages', (
    tester,
  ) async {
    await _open(tester, '/help');

    await tester.tap(find.text('Is posting a listing free?'));
    await tester.pumpAndSettle();
    expect(
      find.text('Every account posts three listings a month for free.'),
      findsOneWidget,
    );

    await tester.tap(find.text('Safety tips'));
    await tester.pumpAndSettle();
    expect(
      find.text('Meet in a busy public place during the day.'),
      findsOneWidget,
    );
    expect(
      find.text(
        'Bring a friend if you can, and tell someone where you are going.',
      ),
      findsOneWidget,
    );
  });

  testWidgets('a blog post reads in paragraphs', (tester) async {
    await _open(tester, '/blog');

    await tester.tap(find.text('Five rules for a safe meetup'));
    await tester.pumpAndSettle();

    expect(find.text('Check the item before you pay.'), findsOneWidget);
  });

  for (final brightness in Brightness.values) {
    final mode = brightness.name;

    testWidgets('help screen in $mode', (tester) async {
      await _open(tester, '/help', brightness: brightness);
      await expectLater(
        find.byType(HelpScreen),
        matchesGoldenFile('goldens/help_$mode.png'),
      );
    });

    testWidgets('blog post in $mode', (tester) async {
      await _open(
        tester,
        '/blog/five-rules-for-a-safe-meetup',
        brightness: brightness,
      );
      await expectLater(
        find.byType(PostScreen),
        matchesGoldenFile('goldens/post_$mode.png'),
      );
    });
  }

  testWidgets('maintenance screen', (tester) async {
    await _open(tester, '/maintenance');
    await expectLater(
      find.byType(MaintenanceScreen),
      matchesGoldenFile('goldens/maintenance_light.png'),
    );
  });
}
