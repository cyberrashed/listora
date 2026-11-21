import '../../../core/network/api_client.dart';
import '../../listings/data/listing.dart';
import '../../sellers/data/seller.dart';

/// A listing in a page of results: enough to pick it out of a list.
class ListingCard {
  const ListingCard({
    required this.id,
    required this.title,
    required this.price,
    required this.city,
    required this.state,
    required this.publishedAt,
    this.photoUrl,
    this.featured = false,
  });

  final String id;
  final String title;
  final ListingPrice price;
  final String city;
  final String state;
  final DateTime publishedAt;

  /// The cover, small. Null when the seller added no photos.
  final String? photoUrl;

  /// On top of the market right now.
  final bool featured;

  String get place => '$city, $state';

  factory ListingCard.fromJson(Map<String, dynamic> json) => ListingCard(
    id: json['id'] as String,
    title: json['title'] as String,
    price: ListingPrice.fromJson(json['price'] as Map<String, dynamic>),
    city: json['city'] as String,
    state: json['state'] as String,
    publishedAt: DateTime.parse(json['publishedAt'] as String),
    photoUrl: switch (json['photo']) {
      final String path => apiUrl(path),
      _ => null,
    },
    featured: json['featured'] as bool? ?? false,
  );
}

class ListingPage {
  const ListingPage({
    required this.items,
    required this.total,
    required this.page,
  });

  final List<ListingCard> items;
  final int total;
  final int page;

  factory ListingPage.fromJson(Map<String, dynamic> json) => ListingPage(
    items: [
      for (final item in json['items'] as List<dynamic>)
        ListingCard.fromJson(item as Map<String, dynamic>),
    ],
    total: json['total'] as int,
    page: json['page'] as int,
  );
}

/// A listing as any buyer sees it.
class MarketListing {
  const MarketListing({
    required this.card,
    required this.description,
    required this.categoryPath,
    required this.attributes,
    required this.sellerId,
    required this.sellerName,
    required this.sellerJoinedAt,
    this.photos = const [],
    this.sellerVerified = false,
    this.sellerRating = const Rating(average: 0, count: 0),
    this.sellerPhone,
  });

  final ListingCard card;
  final List<ListingPhoto> photos;
  final String description;
  final List<String> categoryPath;
  final List<ListingAttribute> attributes;
  final String sellerId;
  final String sellerName;
  final DateTime sellerJoinedAt;
  final bool sellerVerified;
  final Rating sellerRating;

  /// Only there when the seller chose to show it on this listing.
  final String? sellerPhone;

  factory MarketListing.fromJson(Map<String, dynamic> json) {
    final category = json['category'] as Map<String, dynamic>;
    final seller = json['seller'] as Map<String, dynamic>;

    return MarketListing(
      card: ListingCard.fromJson(json),
      photos: ListingPhoto.listFromJson(json['photos']),
      description: json['description'] as String,
      categoryPath: (category['path'] as List<dynamic>).cast<String>(),
      attributes: [
        for (final item in json['attributes'] as List<dynamic>)
          ListingAttribute.fromJson(item as Map<String, dynamic>),
      ],
      sellerId: seller['id'] as String,
      sellerName: seller['name'] as String,
      sellerJoinedAt: DateTime.parse(seller['joinedAt'] as String),
      sellerVerified: seller['verified'] as bool,
      sellerRating: Rating.fromJson(seller['rating'] as Map<String, dynamic>),
      sellerPhone: seller['phone'] as String?,
    );
  }
}
