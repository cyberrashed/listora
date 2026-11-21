import '../../browse/data/market_listing.dart';

/// A seller's average star rating and how many reviews it comes from.
class Rating {
  const Rating({required this.average, required this.count});

  final double average;
  final int count;

  factory Rating.fromJson(Map<String, dynamic> json) => Rating(
    average: (json['average'] as num).toDouble(),
    count: json['count'] as int,
  );

  /// "4.5 · 12 reviews", or a plain note when there are none.
  String get label => count == 0
      ? 'No reviews yet'
      : '${average.toStringAsFixed(1)} · $count ${count == 1 ? 'review' : 'reviews'}';
}

class SellerReview {
  const SellerReview({
    required this.id,
    required this.rating,
    required this.text,
    required this.reviewerName,
    required this.listingTitle,
    required this.createdAt,
  });

  final String id;
  final int rating;
  final String text;
  final String reviewerName;
  final String listingTitle;
  final DateTime createdAt;

  factory SellerReview.fromJson(Map<String, dynamic> json) => SellerReview(
    id: json['id'] as String,
    rating: json['rating'] as int,
    text: json['text'] as String,
    reviewerName: json['reviewerName'] as String,
    listingTitle: json['listingTitle'] as String,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );
}

/// A listing the viewer may still review the seller for.
class Reviewable {
  const Reviewable({required this.id, required this.title});

  final String id;
  final String title;
}

class SellerProfile {
  const SellerProfile({
    required this.id,
    required this.name,
    required this.joinedAt,
    required this.verified,
    required this.rating,
    required this.followers,
    required this.following,
    required this.listings,
    required this.reviews,
    required this.reviewable,
  });

  final String id;
  final String name;
  final DateTime joinedAt;
  final bool verified;
  final Rating rating;
  final int followers;
  final bool following;
  final List<ListingCard> listings;
  final List<SellerReview> reviews;
  final List<Reviewable> reviewable;

  factory SellerProfile.fromJson(Map<String, dynamic> json) => SellerProfile(
    id: json['id'] as String,
    name: json['name'] as String,
    joinedAt: DateTime.parse(json['joinedAt'] as String),
    verified: json['verified'] as bool,
    rating: Rating.fromJson(json['rating'] as Map<String, dynamic>),
    followers: json['followers'] as int,
    following: json['following'] as bool,
    listings: [
      for (final item in json['listings'] as List<dynamic>)
        ListingCard.fromJson(item as Map<String, dynamic>),
    ],
    reviews: [
      for (final item in json['reviews'] as List<dynamic>)
        SellerReview.fromJson(item as Map<String, dynamic>),
    ],
    reviewable: [
      for (final item in json['reviewable'] as List<dynamic>)
        Reviewable(
          id: (item as Map<String, dynamic>)['id'] as String,
          title: item['title'] as String,
        ),
    ],
  );
}

/// Someone in a list of people: those followed, or blocked.
class Person {
  const Person({
    required this.id,
    required this.name,
    required this.verified,
    required this.rating,
  });

  final String id;
  final String name;
  final bool verified;
  final Rating rating;

  factory Person.fromJson(Map<String, dynamic> json) => Person(
    id: json['id'] as String,
    name: json['name'] as String,
    verified: json['verified'] as bool,
    rating: Rating.fromJson(json['rating'] as Map<String, dynamic>),
  );
}

enum ReportTarget { listing, review, user }

/// The reasons the server takes, in the order they are offered.
const reportReasons = {
  'scam': 'Looks like a scam',
  'prohibited': 'Not allowed on Listora',
  'misleading': 'Wrong price or details',
  'offensive': 'Offensive or abusive',
  'spam': 'Spam or a duplicate',
  'other': 'Something else',
};

enum VerificationStatus { none, pending, approved, rejected }

class VerificationState {
  const VerificationState({
    required this.verified,
    required this.status,
    this.reason,
  });

  final bool verified;
  final VerificationStatus status;

  /// Why the last request was turned down.
  final String? reason;

  factory VerificationState.fromJson(Map<String, dynamic> json) {
    final request = json['request'] as Map<String, dynamic>?;
    return VerificationState(
      verified: json['verified'] as bool,
      status: request == null
          ? VerificationStatus.none
          : VerificationStatus.values.byName(request['status'] as String),
      reason: request?['reason'] as String?,
    );
  }
}
