import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:go_router/go_router.dart';
import 'package:listora/app/retry.dart';
import 'package:listora/app/theme/theme.dart';
import 'package:listora/core/realtime/event_stream.dart';
import 'package:listora/features/auth/data/auth_api.dart';
import 'package:listora/features/auth/data/user.dart';
import 'package:listora/features/chat/application/system_alerts.dart';
import 'package:listora/features/chat/data/chat_api.dart';
import 'package:listora/features/chat/data/chat_models.dart';
import 'package:listora/features/chat/presentation/chats_screen.dart';
import 'package:listora/features/chat/presentation/conversation_screen.dart';
import 'package:listora/features/chat/presentation/notifications_screen.dart';
import 'package:listora/features/listings/data/listing.dart';

final _dana = User(
  id: 'dana',
  name: 'Dana Whitfield',
  email: 'dana.whitfield@mailbox.example',
  createdAt: DateTime(2026, 4, 12),
);

DateTime _minutesAgo(int minutes) =>
    DateTime.now().subtract(Duration(minutes: minutes));

const _civic = ChatListing(
  id: 'civic',
  title: '2015 Honda Civic LX, one owner',
  status: ListingStatus.active,
  price: ListingPrice(mode: PriceMode.negotiable, cents: 890000),
);

Conversation _conversation({
  String id = 'c1',
  ChatRole role = ChatRole.selling,
  String otherName = 'Miguel Ortega',
  ChatListing listing = _civic,
  String text = 'I could come by on Saturday.',
  bool mine = false,
  int unread = 0,
  Offer? offer,
  int minutesAgo = 5,
}) => Conversation(
  id: id,
  role: role,
  listing: listing,
  otherId: 'other',
  otherName: otherName,
  lastMessage: LastMessage(
    kind: MessageKind.text,
    text: text,
    mine: mine,
    at: _minutesAgo(minutesAgo),
  ),
  unread: unread,
  offer: offer,
  updatedAt: _minutesAgo(minutesAgo),
);

ChatMessage _message(
  String id,
  String senderId,
  String text, {
  required DateTime at,
  MessageKind kind = MessageKind.text,
  int? cents,
}) => ChatMessage(
  id: id,
  conversationId: 'c1',
  senderId: senderId,
  kind: kind,
  text: kind == MessageKind.text ? text : null,
  cents: cents,
  createdAt: at,
);

final _thread = [
  _message(
    'm1',
    'other',
    'Hi, is the Civic still available?',
    at: DateTime(2026, 11, 14, 18, 6),
  ),
  _message(
    'm2',
    'dana',
    'It is. It is parked at my place in Austin.',
    at: DateTime(2026, 11, 14, 18, 8),
  ),
  _message(
    'm3',
    'other',
    '',
    at: DateTime(2026, 11, 15, 9, 41),
    kind: MessageKind.offer,
    cents: 820000,
  ),
  _message(
    'm4',
    'other',
    'I could come by on Saturday.',
    at: DateTime(2026, 11, 15, 9, 42),
  ),
];

class _FakeAuthApi implements AuthApi {
  @override
  Future<User?> restore() async => _dana;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

/// Stands in for the server's event stream; tests push events through it.
class _FakeEvents implements EventStream {
  final _controller = StreamController<ServerEvent>.broadcast();

  @override
  Stream<ServerEvent> get events => _controller.stream;

  void push(String type, Map<String, dynamic> data) =>
      _controller.add(ServerEvent(type, data));

  @override
  dynamic noSuchMethod(Invocation invocation) => null;
}

class _FakeChatApi implements ChatApi {
  _FakeChatApi({
    this.buying = const [],
    this.selling = const [],
    Conversation? conversation,
    this.thread = const [],
    this.alerts = const [],
  }) : conversationShown = conversation ?? _conversation();

  final List<Conversation> buying;
  final List<Conversation> selling;
  final Conversation conversationShown;
  final List<ChatMessage> thread;
  final List<AppNotification> alerts;

  /// What arrived while the app was disconnected, handed back on catch-up.
  var missed = <ChatMessage>[];
  String? caughtUpAfter;
  final sent = <String>[];
  final offers = <int>[];
  final answers = <bool>[];
  var reads = 0;
  var notificationsRead = false;

  ChatMessage _mine(MessageKind kind, {String? text, int? cents}) =>
      ChatMessage(
        id: 'new${sent.length + offers.length + answers.length}',
        conversationId: conversationShown.id,
        senderId: 'dana',
        kind: kind,
        text: text,
        cents: cents,
        createdAt: DateTime.now(),
      );

  @override
  Future<List<Conversation>> conversations(ChatRole role) async =>
      role == ChatRole.buying ? buying : selling;

  @override
  Future<Conversation> conversation(String id) async => conversationShown;

  @override
  Future<List<ChatMessage>> messages(String id, {String? after}) async {
    if (after == null) return thread;
    caughtUpAfter = after;
    return missed;
  }

  @override
  Future<ChatMessage> send(String id, String text) async {
    sent.add(text);
    return _mine(MessageKind.text, text: text);
  }

  @override
  Future<ChatMessage> offer(String id, int cents) async {
    offers.add(cents);
    return _mine(MessageKind.offer, cents: cents);
  }

  @override
  Future<ChatMessage> answer(String id, {required bool accept}) async {
    answers.add(accept);
    return _mine(
      accept ? MessageKind.offerAccepted : MessageKind.offerDeclined,
      cents: conversationShown.offer!.cents,
    );
  }

  @override
  Future<void> markRead(String id) async => reads++;

  @override
  Future<UnreadCounts> unread() async => const UnreadCounts();

  @override
  Future<List<AppNotification>> notifications() async => alerts;

  @override
  Future<void> markNotificationsRead() async => notificationsRead = true;

  @override
  dynamic noSuchMethod(Invocation invocation) => super.noSuchMethod(invocation);
}

Future<_FakeEvents> _open(
  WidgetTester tester,
  String location, {
  required _FakeChatApi api,
  Brightness brightness = Brightness.light,
}) async {
  tester.view.physicalSize = const Size(390, 780);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.reset);

  final events = _FakeEvents();
  final router = GoRouter(
    initialLocation: location,
    routes: [
      GoRoute(path: '/chats', builder: (context, state) => const ChatsScreen()),
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
        path: '/selling/:id',
        builder: (context, state) =>
            Text('Listing ${state.pathParameters['id']}'),
      ),
    ],
  );
  addTearDown(router.dispose);

  await tester.pumpWidget(
    ProviderScope(
      retry: neverRetry,
      overrides: [
        authApiProvider.overrideWithValue(_FakeAuthApi()),
        chatApiProvider.overrideWithValue(api),
        eventStreamProvider.overrideWithValue(events),
        notificationsAllowedProvider.overrideWith((ref) async => true),
      ],
      child: MaterialApp.router(
        debugShowCheckedModeBanner: false,
        theme: buildTheme(brightness),
        routerConfig: router,
      ),
    ),
  );
  await tester.pumpAndSettle();
  return events;
}

Map<String, dynamic> _conversationJson({
  required String id,
  required String text,
  required int unread,
}) => {
  'id': id,
  'role': 'selling',
  'listing': {
    'id': 'boxes',
    'title': 'Moving boxes, about thirty',
    'status': 'active',
    'price': {'mode': 'free', 'cents': 0, 'maxCents': null},
  },
  'other': {'id': 'hannah', 'name': 'Hannah Brooks'},
  'lastMessage': {
    'kind': 'text',
    'text': text,
    'cents': null,
    'at': DateTime.now().toUtc().toIso8601String(),
    'mine': false,
  },
  'unread': unread,
  'offer': null,
  'updatedAt': DateTime.now().toUtc().toIso8601String(),
};

void main() {
  testWidgets('chats are split by side, with what is new marked', (
    tester,
  ) async {
    await _open(
      tester,
      '/chats',
      api: _FakeChatApi(
        buying: [
          _conversation(
            id: 'b1',
            role: ChatRole.buying,
            otherName: 'Wyatt Lindgren',
            text: 'Sure, the bike is still here.',
          ),
        ],
        selling: [_conversation(unread: 2)],
      ),
    );

    expect(find.text('Wyatt Lindgren'), findsOneWidget);
    await tester.tap(find.text('Selling'));
    await tester.pumpAndSettle();

    expect(find.text('Miguel Ortega'), findsOneWidget);
    expect(find.text('2'), findsOneWidget);
    expect(find.text('Wyatt Lindgren'), findsNothing);
  });

  testWidgets('a new message moves its chat to the top as it arrives', (
    tester,
  ) async {
    final events = await _open(
      tester,
      '/chats',
      api: _FakeChatApi(selling: [_conversation()]),
    );
    await tester.tap(find.text('Selling'));
    await tester.pumpAndSettle();

    events.push(
      'conversation',
      _conversationJson(id: 'c2', text: 'Are the boxes still free?', unread: 1),
    );
    await tester.pumpAndSettle();

    expect(
      tester.getTopLeft(find.text('Hannah Brooks')).dy,
      lessThan(tester.getTopLeft(find.text('Miguel Ortega')).dy),
    );
    expect(find.text('Are the boxes still free?'), findsOneWidget);
  });

  testWidgets('sending adds the message, and replies arrive live', (
    tester,
  ) async {
    final api = _FakeChatApi(thread: _thread);
    final events = await _open(tester, '/chats/c1', api: api);

    await tester.enterText(find.byType(TextField), 'Saturday works.');
    await tester.tap(find.byTooltip('Send'));
    await tester.pumpAndSettle();
    expect(api.sent, ['Saturday works.']);
    expect(find.text('Saturday works.'), findsOneWidget);

    final readsBefore = api.reads;
    events.push('message', {
      'id': 'm9',
      'conversationId': 'c1',
      'senderId': 'other',
      'kind': 'text',
      'text': 'Great, see you at 10.',
      'cents': null,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
      'read': false,
    });
    await tester.pumpAndSettle();

    expect(find.text('Great, see you at 10.'), findsOneWidget);
    // It is on screen, so it counts as read straight away.
    expect(api.reads, readsBefore + 1);
  });

  testWidgets('a reconnection fetches what was said while it was down', (
    tester,
  ) async {
    final api = _FakeChatApi(thread: _thread);
    final events = await _open(tester, '/chats/c1', api: api);

    api.missed = [
      _message(
        'm5',
        'other',
        'Did you get my last message?',
        at: DateTime(2026, 11, 15, 9, 50),
      ),
    ];
    events.push('ready', {});
    await tester.pumpAndSettle();

    expect(api.caughtUpAfter, 'm4');
    expect(find.text('Did you get my last message?'), findsOneWidget);
  });

  testWidgets('the seller answers an offer from the strip above the chat', (
    tester,
  ) async {
    final api = _FakeChatApi(
      thread: _thread,
      conversation: _conversation(
        offer: const Offer(cents: 820000, status: OfferStatus.pending),
      ),
    );
    await _open(tester, '/chats/c1', api: api);

    expect(find.text(r'Miguel Ortega offered $8,200.'), findsOneWidget);
    await tester.tap(find.text('Accept'));
    await tester.pumpAndSettle();

    expect(api.answers, [true]);
    expect(find.text(r'You accepted the $8,200 offer'), findsOneWidget);
  });

  testWidgets('a buyer makes an offer from the composer', (tester) async {
    final api = _FakeChatApi(
      conversation: _conversation(role: ChatRole.buying),
    );
    await _open(tester, '/chats/c1', api: api);

    await tester.tap(find.byTooltip('Make an offer'));
    await tester.pumpAndSettle();
    expect(
      find.text(
        r'Asking $8,900 or best offer. The seller can accept or decline.',
      ),
      findsOneWidget,
    );
    await tester.enterText(find.byType(TextField).last, '8,000');
    await tester.tap(find.text('Send offer'));
    await tester.pumpAndSettle();

    expect(api.offers, [800000]);
    expect(find.text(r'You offered $8,000'), findsOneWidget);
  });

  testWidgets('no offer can be made on a free listing', (tester) async {
    await _open(
      tester,
      '/chats/c1',
      api: _FakeChatApi(
        conversation: _conversation(
          role: ChatRole.buying,
          listing: const ChatListing(
            id: 'boxes',
            title: 'Moving boxes, about thirty',
            status: ListingStatus.active,
            price: ListingPrice(mode: PriceMode.free, cents: 0),
          ),
        ),
      ),
    );

    expect(find.byTooltip('Make an offer'), findsNothing);
  });

  testWidgets('notifications open what they are about and count as read', (
    tester,
  ) async {
    final api = _FakeChatApi(
      alerts: [
        AppNotification(
          id: 'n1',
          title: 'Your listing is live',
          body: '“2015 Honda Civic LX, one owner” is on Listora for the next 30 days.',
          link: '/selling/civic',
          read: false,
          createdAt: _minutesAgo(20),
        ),
      ],
    );
    await _open(tester, '/notifications', api: api);

    await tester.tap(find.text('Your listing is live'));
    await tester.pumpAndSettle();

    expect(find.text('Listing civic'), findsOneWidget);
    expect(api.notificationsRead, isTrue);
  });

  for (final brightness in Brightness.values) {
    final mode = brightness.name;

    testWidgets('chats screen in $mode', (tester) async {
      await _open(
        tester,
        '/chats',
        brightness: brightness,
        api: _FakeChatApi(
          buying: [
            _conversation(
              id: 'b1',
              role: ChatRole.buying,
              otherName: 'Wyatt Lindgren',
              listing: const ChatListing(
                id: 'allez',
                title: 'Specialized Allez road bike, 56 cm',
                status: ListingStatus.active,
                price: ListingPrice(mode: PriceMode.fixed, cents: 62000),
              ),
              text: 'Yes, it fits riders around 5\'10".',
              unread: 1,
              minutesAgo: 3,
            ),
            _conversation(
              id: 'b2',
              role: ChatRole.buying,
              otherName: 'Caleb Nowak',
              listing: const ChatListing(
                id: 'tent',
                title: 'REI Half Dome 2 Plus tent',
                status: ListingStatus.sold,
                price: ListingPrice(mode: PriceMode.fixed, cents: 14000),
              ),
              text: 'Thanks, enjoy it!',
              minutesAgo: 60 * 26,
            ),
          ],
        ),
      );

      await expectLater(
        find.byType(ChatsScreen),
        matchesGoldenFile('goldens/chats_$mode.png'),
      );
    });

    testWidgets('conversation screen in $mode', (tester) async {
      await _open(
        tester,
        '/chats/c1',
        brightness: brightness,
        api: _FakeChatApi(
          thread: _thread,
          conversation: _conversation(
            offer: const Offer(cents: 820000, status: OfferStatus.pending),
          ),
        ),
      );

      await expectLater(
        find.byType(ConversationScreen),
        matchesGoldenFile('goldens/conversation_$mode.png'),
      );
    });
  }
}
