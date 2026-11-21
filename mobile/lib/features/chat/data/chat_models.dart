import '../../../core/format.dart';
import '../../listings/data/listing.dart';

enum ChatRole {
  buying('buying', 'Buying'),
  selling('selling', 'Selling');

  const ChatRole(this.wire, this.label);

  final String wire;
  final String label;
}

enum MessageKind {
  text('text'),
  offer('offer'),
  offerAccepted('offer_accepted'),
  offerDeclined('offer_declined');

  const MessageKind(this.wire);

  final String wire;

  static MessageKind parse(String wire) =>
      values.firstWhere((kind) => kind.wire == wire);
}

enum OfferStatus { pending, accepted, declined }

class Offer {
  const Offer({required this.cents, required this.status});

  final int cents;
  final OfferStatus status;

  factory Offer.fromJson(Map<String, dynamic> json) => Offer(
    cents: json['cents'] as int,
    status: OfferStatus.values.byName(json['status'] as String),
  );
}

class ChatMessage {
  const ChatMessage({
    required this.id,
    required this.conversationId,
    required this.senderId,
    required this.kind,
    required this.createdAt,
    this.text,
    this.cents,
    this.read = false,
  });

  final String id;
  final String conversationId;
  final String senderId;
  final MessageKind kind;
  final String? text;
  final int? cents;
  final DateTime createdAt;
  final bool read;

  factory ChatMessage.fromJson(Map<String, dynamic> json) => ChatMessage(
    id: json['id'] as String,
    conversationId: json['conversationId'] as String,
    senderId: json['senderId'] as String,
    kind: MessageKind.parse(json['kind'] as String),
    text: json['text'] as String?,
    cents: json['cents'] as int?,
    createdAt: DateTime.parse(json['createdAt'] as String),
    read: json['read'] as bool? ?? false,
  );
}

/// The last thing said, as a one-line preview for the list of chats.
class LastMessage {
  const LastMessage({
    required this.kind,
    required this.at,
    required this.mine,
    this.text,
    this.cents,
  });

  final MessageKind kind;
  final String? text;
  final int? cents;
  final DateTime at;
  final bool mine;

  factory LastMessage.fromJson(Map<String, dynamic> json) => LastMessage(
    kind: MessageKind.parse(json['kind'] as String),
    text: json['text'] as String?,
    cents: json['cents'] as int?,
    at: DateTime.parse(json['at'] as String),
    mine: json['mine'] as bool,
  );

  String get preview => switch (kind) {
    MessageKind.text => mine ? 'You: $text' : text!,
    MessageKind.offer =>
      mine
          ? 'You offered ${formatDollars(cents!)}'
          : 'Offered ${formatDollars(cents!)}',
    MessageKind.offerAccepted => 'Offer of ${formatDollars(cents!)} accepted',
    MessageKind.offerDeclined => 'Offer of ${formatDollars(cents!)} declined',
  };
}

/// The listing a conversation is about, as it stands now.
class ChatListing {
  const ChatListing({
    required this.id,
    required this.title,
    required this.status,
    required this.price,
  });

  final String id;
  final String title;
  final ListingStatus status;
  final ListingPrice price;

  factory ChatListing.fromJson(Map<String, dynamic> json) => ChatListing(
    id: json['id'] as String,
    title: json['title'] as String,
    status: ListingStatus.parse(json['status'] as String),
    price: ListingPrice.fromJson(json['price'] as Map<String, dynamic>),
  );
}

class Conversation {
  const Conversation({
    required this.id,
    required this.role,
    required this.otherId,
    required this.otherName,
    required this.unread,
    this.otherBlocked = false,
    required this.updatedAt,
    this.listing,
    this.lastMessage,
    this.offer,
  });

  final String id;
  final ChatRole role;

  /// Null once the seller has deleted the listing.
  final ChatListing? listing;
  final String otherId;
  final String otherName;

  /// Whether the viewer has blocked the other person.
  final bool otherBlocked;
  final LastMessage? lastMessage;
  final int unread;
  final Offer? offer;
  final DateTime updatedAt;

  /// A buyer can offer while the listing is up and has a price, unless an
  /// offer is waiting for an answer or was already accepted.
  bool get canOffer =>
      !otherBlocked &&
      role == ChatRole.buying &&
      listing?.status == ListingStatus.active &&
      listing?.price.mode != PriceMode.free &&
      (offer == null || offer!.status == OfferStatus.declined);

  factory Conversation.fromJson(Map<String, dynamic> json) {
    final listing = json['listing'] as Map<String, dynamic>?;
    final other = json['other'] as Map<String, dynamic>;
    final last = json['lastMessage'] as Map<String, dynamic>?;
    final offer = json['offer'] as Map<String, dynamic>?;

    return Conversation(
      id: json['id'] as String,
      role: ChatRole.values.byName(json['role'] as String),
      listing: listing == null ? null : ChatListing.fromJson(listing),
      otherId: other['id'] as String,
      otherName: other['name'] as String,
      otherBlocked: other['blocked'] as bool? ?? false,
      lastMessage: last == null ? null : LastMessage.fromJson(last),
      unread: json['unread'] as int,
      offer: offer == null ? null : Offer.fromJson(offer),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
    );
  }
}

class AppNotification {
  const AppNotification({
    required this.id,
    required this.title,
    required this.body,
    required this.read,
    required this.createdAt,
    this.link,
  });

  final String id;
  final String title;
  final String body;

  /// Where tapping it goes in the app.
  final String? link;
  final bool read;
  final DateTime createdAt;

  AppNotification asRead() => AppNotification(
    id: id,
    title: title,
    body: body,
    link: link,
    read: true,
    createdAt: createdAt,
  );

  factory AppNotification.fromJson(Map<String, dynamic> json) =>
      AppNotification(
        id: json['id'] as String,
        title: json['title'] as String,
        body: json['body'] as String,
        link: json['link'] as String?,
        read: json['read'] as bool,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class UnreadCounts {
  const UnreadCounts({this.messages = 0, this.notifications = 0});

  final int messages;
  final int notifications;
}
