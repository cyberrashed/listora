import '../../../core/format.dart';
import '../../../core/network/api_client.dart';

/// One of a listing's photos, in its two sizes.
class ListingPhoto {
  const ListingPhoto({
    required this.id,
    required this.url,
    required this.thumbUrl,
  });

  final String id;
  final String url;

  /// For lists and cards.
  final String thumbUrl;

  factory ListingPhoto.fromJson(Map<String, dynamic> json) => ListingPhoto(
    id: json['id'] as String,
    url: apiUrl(json['url'] as String),
    thumbUrl: apiUrl(json['thumbUrl'] as String),
  );

  static List<ListingPhoto> listFromJson(Object? json) => [
    for (final item in json as List<dynamic>? ?? const [])
      ListingPhoto.fromJson(item as Map<String, dynamic>),
  ];
}

enum ListingStatus {
  inReview('in_review', 'Waiting for review'),
  active('active', 'Live'),
  rejected('rejected', 'Rejected'),
  sold('sold', 'Sold'),
  expired('expired', 'Expired');

  const ListingStatus(this.wire, this.label);

  final String wire;
  final String label;

  static ListingStatus parse(String wire) =>
      values.firstWhere((status) => status.wire == wire);
}

enum PriceMode {
  fixed('fixed', 'Fixed price'),
  negotiable('negotiable', 'Or best offer'),
  range('range', 'Price range'),
  onRequest('on_request', 'Price on request'),
  free('free', 'Free');

  const PriceMode(this.wire, this.label);

  final String wire;
  final String label;

  bool get hasAmount => this != onRequest && this != free;

  static PriceMode parse(String wire) =>
      values.firstWhere((mode) => mode.wire == wire);
}

class ListingPrice {
  const ListingPrice({required this.mode, this.cents, this.maxCents});

  final PriceMode mode;
  final int? cents;
  final int? maxCents;

  factory ListingPrice.fromJson(Map<String, dynamic> json) => ListingPrice(
    mode: PriceMode.parse(json['mode'] as String),
    cents: json['cents'] as int?,
    maxCents: json['maxCents'] as int?,
  );

  Map<String, dynamic> toJson() => {
    'mode': mode.wire,
    if (mode.hasAmount) 'cents': cents,
    if (mode == PriceMode.range) 'maxCents': maxCents,
  };

  String get label => switch (mode) {
    PriceMode.free => 'Free',
    PriceMode.onRequest => 'Price on request',
    PriceMode.range => '${formatDollars(cents!)}–${formatDollars(maxCents!)}',
    PriceMode.negotiable => '${formatDollars(cents!)} or best offer',
    PriceMode.fixed => formatDollars(cents!),
  };
}

/// One of the seller's answers, with the field's label as it was when the
/// listing was posted.
class ListingAttribute {
  const ListingAttribute({
    required this.fieldId,
    required this.label,
    required this.value,
    this.unit,
  });

  final String fieldId;
  final String label;
  final String? unit;

  /// A String, num, bool or List of Strings, depending on the field.
  final Object value;

  factory ListingAttribute.fromJson(Map<String, dynamic> json) =>
      ListingAttribute(
        fieldId: json['fieldId'] as String,
        label: json['label'] as String,
        unit: json['unit'] as String?,
        value: json['value'] as Object,
      );

  String get text => switch (value) {
    final bool answer => answer ? 'Yes' : 'No',
    final List<dynamic> answers => answers.join(', '),
    // A year is a number too, and "2,015" would be wrong.
    final num number => [
      number >= 1900 && number <= 2100 ? '$number' : formatCount(number),
      ?unit,
    ].join(' '),
    _ => '$value',
  };
}

class Listing {
  const Listing({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.price,
    required this.categoryId,
    required this.categoryPath,
    required this.attributes,
    required this.placeId,
    required this.city,
    required this.state,
    required this.showPhone,
    required this.submittedAt,
    this.photos = const [],
    this.zip,
    this.rejectionReason,
    this.rejectionIsFinal = false,
    this.expiresAt,
    this.featuredUntil,
  });

  final String id;
  final String title;
  final String description;
  final ListingStatus status;
  final ListingPrice price;
  final String categoryId;
  final List<String> categoryPath;
  final List<ListingAttribute> attributes;

  /// In the seller's order. The first is the cover.
  final List<ListingPhoto> photos;
  final String placeId;
  final String city;
  final String state;
  final String? zip;
  final bool showPhone;
  final DateTime submittedAt;
  final DateTime? expiresAt;

  /// Set while the listing is on top of the market.
  final DateTime? featuredUntil;
  final String? rejectionReason;
  final bool rejectionIsFinal;

  String get place => '$city, $state';

  /// A listing can be edited until it is sold, expired or rejected for good.
  bool get canEdit =>
      status == ListingStatus.inReview ||
      status == ListingStatus.active ||
      (status == ListingStatus.rejected && !rejectionIsFinal);

  factory Listing.fromJson(Map<String, dynamic> json) {
    final category = json['category'] as Map<String, dynamic>;
    final location = json['location'] as Map<String, dynamic>;
    final rejection = json['rejection'] as Map<String, dynamic>?;
    final expiresAt = json['expiresAt'] as String?;
    final featuredUntil = json['featuredUntil'] as String?;

    return Listing(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String,
      status: ListingStatus.parse(json['status'] as String),
      price: ListingPrice.fromJson(json['price'] as Map<String, dynamic>),
      categoryId: category['id'] as String,
      categoryPath: (category['path'] as List<dynamic>).cast<String>(),
      attributes: [
        for (final item in json['attributes'] as List<dynamic>)
          ListingAttribute.fromJson(item as Map<String, dynamic>),
      ],
      photos: ListingPhoto.listFromJson(json['photos']),
      placeId: location['placeId'] as String,
      city: location['city'] as String,
      state: location['state'] as String,
      zip: location['zip'] as String?,
      showPhone: json['showPhone'] as bool,
      submittedAt: DateTime.parse(json['submittedAt'] as String),
      expiresAt: expiresAt == null ? null : DateTime.parse(expiresAt),
      featuredUntil: featuredUntil == null
          ? null
          : DateTime.parse(featuredUntil),
      rejectionReason: rejection?['reason'] as String?,
      rejectionIsFinal: rejection?['kind'] == 'permanent',
    );
  }
}

enum FieldType { text, number, select, multiselect, boolean }

/// A question the listing's category asks, as the dashboard defines it.
class ListingField {
  const ListingField({
    required this.id,
    required this.label,
    required this.type,
    required this.options,
    required this.required,
    this.unit,
    this.filterable = false,
  });

  final String id;
  final String label;
  final FieldType type;
  final List<String> options;
  final String? unit;
  final bool required;

  /// Whether buyers can narrow results by it.
  final bool filterable;

  factory ListingField.fromJson(Map<String, dynamic> json) => ListingField(
    id: json['id'] as String,
    label: json['label'] as String,
    type: FieldType.values.byName(json['type'] as String),
    options: (json['options'] as List<dynamic>).cast<String>(),
    unit: json['unit'] as String?,
    required: json['required'] as bool,
    filterable: json['filterable'] as bool? ?? false,
  );
}

/// A city or ZIP code the seller can pick as the listing's location.
class Place {
  const Place({required this.id, required this.label});

  final String id;
  final String label;

  factory Place.fromJson(Map<String, dynamic> json) =>
      Place(id: json['id'] as String, label: json['label'] as String);
}

/// What the posting form collects, in the shape the API takes.
class ListingDraft {
  const ListingDraft({
    required this.title,
    required this.description,
    required this.categoryId,
    required this.price,
    required this.attributes,
    required this.placeId,
    required this.showPhone,
    this.photoIds = const [],
  });

  final String title;
  final String description;
  final String categoryId;
  final ListingPrice price;
  final Map<String, Object> attributes;
  final String placeId;
  final bool showPhone;

  /// Photos already uploaded, in order.
  final List<String> photoIds;

  Map<String, dynamic> toJson() => {
    'title': title,
    'description': description,
    'categoryId': categoryId,
    'price': price.toJson(),
    'attributes': attributes,
    'placeId': placeId,
    'showPhone': showPhone,
    'photoIds': photoIds,
  };
}
