import 'package:flutter/widgets.dart';
import 'package:go_router/go_router.dart';

import '../features/account/presentation/account_screen.dart';
import '../features/account/presentation/delete_account_screen.dart';
import '../features/account/presentation/edit_profile_screen.dart';
import '../features/auth/presentation/forgot_password_screen.dart';
import '../features/auth/presentation/register_screen.dart';
import '../features/auth/presentation/reset_password_screen.dart';
import '../features/auth/presentation/sign_in_screen.dart';
import '../features/browse/data/browse_query.dart';
import '../features/browse/presentation/area_screen.dart';
import '../features/browse/presentation/browse_screen.dart';
import '../features/browse/presentation/filters_screen.dart';
import '../features/browse/presentation/listing_screen.dart';
import '../features/browse/presentation/results_screen.dart';
import '../features/browse/presentation/saved_screen.dart';
import '../features/chat/presentation/chats_screen.dart';
import '../features/chat/presentation/conversation_screen.dart';
import '../features/chat/presentation/notifications_screen.dart';
import '../features/content/presentation/reading_screens.dart';
import '../features/listings/presentation/own_listing_screen.dart';
import '../features/listings/presentation/selling_screen.dart';
import '../features/packages/presentation/packages_screen.dart';
import '../features/post/presentation/post_listing_screen.dart';
import '../features/sellers/presentation/people_screens.dart';
import '../features/sellers/presentation/seller_screen.dart';
import '../features/sellers/presentation/verification_screen.dart';
import '../features/startup/gate_screens.dart';
import '../features/startup/startup_screen.dart';
import 'app_shell.dart';

// Forms open above the tabs, on the root navigator, so the tab bar is out of
// the way while one is being filled in.
final _root = GlobalKey<NavigatorState>();

final router = GoRouter(
  navigatorKey: _root,
  routes: [
    GoRoute(path: '/', builder: (context, state) => const StartupScreen()),
    StatefulShellRoute.indexedStack(
      builder: (context, state, shell) => AppShell(shell: shell),
      branches: [
        StatefulShellBranch(
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
                    initial: BrowseQuery(
                      categoryId: state.pathParameters['id'],
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/saved',
              builder: (context, state) => const SavedScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/selling',
              builder: (context, state) => const SellingScreen(),
              routes: [
                GoRoute(
                  path: 'new',
                  parentNavigatorKey: _root,
                  builder: (context, state) => const PostListingScreen(),
                ),
                GoRoute(
                  path: ':id',
                  builder: (context, state) =>
                      OwnListingScreen(listingId: state.pathParameters['id']!),
                  routes: [
                    GoRoute(
                      path: 'edit',
                      parentNavigatorKey: _root,
                      builder: (context, state) => PostListingScreen(
                        listingId: state.pathParameters['id'],
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/chats',
              builder: (context, state) => const ChatsScreen(),
            ),
          ],
        ),
        StatefulShellBranch(
          routes: [
            GoRoute(
              path: '/account',
              builder: (context, state) => const AccountScreen(),
              routes: [
                GoRoute(
                  path: 'edit',
                  parentNavigatorKey: _root,
                  builder: (context, state) => const EditProfileScreen(),
                ),
                GoRoute(
                  path: 'delete',
                  parentNavigatorKey: _root,
                  builder: (context, state) => const DeleteAccountScreen(),
                ),
                GoRoute(
                  path: 'packages',
                  parentNavigatorKey: _root,
                  builder: (context, state) => const PackagesScreen(),
                ),
                GoRoute(
                  path: 'verification',
                  parentNavigatorKey: _root,
                  builder: (context, state) => const VerificationScreen(),
                ),
                GoRoute(
                  path: 'following',
                  parentNavigatorKey: _root,
                  builder: (context, state) => const FollowingScreen(),
                ),
                GoRoute(
                  path: 'blocked',
                  parentNavigatorKey: _root,
                  builder: (context, state) => const BlockedScreen(),
                ),
              ],
            ),
          ],
        ),
      ],
    ),
    GoRoute(
      path: '/listing/:id',
      builder: (context, state) =>
          ListingScreen(listingId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/maintenance',
      builder: (context, state) => const MaintenanceScreen(),
    ),
    GoRoute(path: '/update', builder: (context, state) => const UpdateScreen()),
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
    GoRoute(
      path: '/sellers/:id',
      builder: (context, state) =>
          SellerScreen(sellerId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/chats/:id',
      builder: (context, state) =>
          ConversationScreen(conversationId: state.pathParameters['id']!),
    ),
    GoRoute(
      path: '/notifications',
      builder: (context, state) => const NotificationsScreen(),
    ),
    GoRoute(
      path: '/filters',
      builder: (context, state) =>
          FiltersScreen(query: state.extra! as BrowseQuery),
    ),
    GoRoute(path: '/area', builder: (context, state) => const AreaScreen()),
    GoRoute(
      path: '/sign-in',
      builder: (context, state) => const SignInScreen(),
    ),
    GoRoute(
      path: '/register',
      builder: (context, state) => const RegisterScreen(),
    ),
    GoRoute(
      path: '/forgot-password',
      builder: (context, state) => const ForgotPasswordScreen(),
    ),
    GoRoute(
      path: '/reset-password',
      builder: (context, state) =>
          ResetPasswordScreen(email: state.extra! as String),
    ),
  ],
);
