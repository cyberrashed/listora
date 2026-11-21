import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:listora/app/retry.dart';
import 'package:listora/app/theme/theme.dart';
import 'package:listora/core/network/api_error.dart';
import 'package:listora/features/account/presentation/account_screen.dart';
import 'package:listora/features/auth/data/auth_api.dart';
import 'package:listora/features/auth/data/user.dart';
import 'package:listora/features/auth/presentation/sign_in_screen.dart';

final _dana = User(
  id: '1',
  name: 'Dana Whitfield',
  email: 'dana.whitfield@example.com',
  phone: '+1 512 555 0142',
  createdAt: DateTime(2026, 4, 12),
);

/// Stands in for the server. [signInError] is thrown by every sign-in.
class _FakeAuthApi implements AuthApi {
  _FakeAuthApi({this.restored, this.signInError});

  final User? restored;
  final ApiError? signInError;

  @override
  Future<User?> restore() async => restored;

  @override
  Future<User> signIn({required String email, required String password}) {
    final error = signInError;
    return error == null ? Future.value(_dana) : Future.error(error);
  }

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<void> _show(
  WidgetTester tester,
  Widget screen, {
  required _FakeAuthApi api,
  Brightness brightness = Brightness.light,
}) async {
  tester.view.physicalSize = const Size(390, 780);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  await tester.pumpWidget(
    ProviderScope(
      retry: neverRetry,
      overrides: [authApiProvider.overrideWithValue(api)],
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        theme: buildTheme(brightness),
        home: screen,
      ),
    ),
  );
  await tester.pumpAndSettle();
}

Future<void> _submitSignIn(WidgetTester tester) async {
  await tester.enterText(find.byType(TextField).first, 'dana@example');
  await tester.enterText(find.byType(TextField).last, 'whatever');
  await tester.tap(find.widgetWithText(FilledButton, 'Sign in'));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('a rejected field shows the reason under that field', (
    tester,
  ) async {
    await _show(
      tester,
      const SignInScreen(),
      api: _FakeAuthApi(
        signInError: const ApiError(
          code: 'validation',
          message: 'Check the highlighted fields.',
          fields: {'email': 'Enter a valid email address.'},
        ),
      ),
    );

    await _submitSignIn(tester);

    expect(find.text('Enter a valid email address.'), findsOneWidget);
    expect(find.text('Check the highlighted fields.'), findsNothing);
  });

  testWidgets('wrong credentials show one message for the whole form', (
    tester,
  ) async {
    await _show(
      tester,
      const SignInScreen(),
      api: _FakeAuthApi(
        signInError: const ApiError(
          code: 'unauthenticated',
          message: "That email and password don't match.",
        ),
      ),
    );

    await _submitSignIn(tester);

    expect(find.text("That email and password don't match."), findsOneWidget);
  });

  for (final brightness in Brightness.values) {
    final mode = brightness.name;

    testWidgets('sign in screen in $mode', (tester) async {
      await _show(
        tester,
        const SignInScreen(),
        api: _FakeAuthApi(),
        brightness: brightness,
      );

      await expectLater(
        find.byType(SignInScreen),
        matchesGoldenFile('goldens/sign_in_$mode.png'),
      );
    });

    testWidgets('account screen for a guest in $mode', (tester) async {
      await _show(
        tester,
        const AccountScreen(),
        api: _FakeAuthApi(),
        brightness: brightness,
      );

      await expectLater(
        find.byType(AccountScreen),
        matchesGoldenFile('goldens/account_guest_$mode.png'),
      );
    });

    testWidgets('account screen when signed in, in $mode', (tester) async {
      await _show(
        tester,
        const AccountScreen(),
        api: _FakeAuthApi(restored: _dana),
        brightness: brightness,
      );

      await expectLater(
        find.byType(AccountScreen),
        matchesGoldenFile('goldens/account_signed_in_$mode.png'),
      );
    });
  }
}
