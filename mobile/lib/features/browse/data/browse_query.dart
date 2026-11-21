import 'dart:convert';

import '../../listings/data/listing.dart';

enum SortOrder {
  newest('newest', 'Newest first'),
  priceLow('price_low', 'Price: low to high'),
  priceHigh('price_high', 'Price: high to low');

  const SortOrder(this.wire, this.label);

  final String wire;
  final String label;
}

/// Where the buyer is looking: a city or ZIP code and how far around it.
class BrowseArea {
  const BrowseArea({required this.place, required this.radius});

  final Place place;

  /// In miles.
  final int radius;

  String get label => '${place.label} · $radius mi';

  @override
  bool operator ==(Object other) =>
      other is BrowseArea &&
      other.place.id == place.id &&
      other.radius == radius;

  @override
  int get hashCode => Object.hash(place.id, radius);
}

/// Narrows a number answer, like a mileage or a year. Either end can be open.
class NumberRange {
  const NumberRange({this.min, this.max});

  final num? min;
  final num? max;

  Map<String, num> toJson() => {'min': ?min, 'max': ?max};
}

/// What a buyer asked for, apart from where: words, a category, a price
/// range, answers to the category's questions and an order.
class BrowseQuery {
  const BrowseQuery({
    this.text = '',
    this.categoryId,
    this.minCents,
    this.maxCents,
    this.filters = const {},
    this.sort,
    this.featuredOnly = false,
  });

  final String text;
  final String? categoryId;
  final int? minCents;
  final int? maxCents;

  /// By field id: the choices any of which will do, a [NumberRange], or
  /// `true` for a yes-or-no question that must be yes.
  final Map<String, Object> filters;

  /// Null is the default: best match for a search, otherwise newest.
  final SortOrder? sort;

  /// Only listings on top of the market, most recently featured first.
  final bool featuredOnly;

  BrowseQuery withText(String text) => BrowseQuery(
    text: text.trim(),
    categoryId: categoryId,
    minCents: minCents,
    maxCents: maxCents,
    filters: filters,
    sort: sort,
  );

  /// How many filters are on, for the button that opens them.
  int get filterCount =>
      (minCents != null || maxCents != null ? 1 : 0) +
      filters.length +
      (sort != null ? 1 : 0);

  Map<String, String> parameters({BrowseArea? area, int page = 1}) => {
    if (text.isNotEmpty) 'q': text,
    'categoryId': ?categoryId,
    if (area != null) ...{'placeId': area.place.id, 'radius': '${area.radius}'},
    if (minCents != null) 'minCents': '$minCents',
    if (maxCents != null) 'maxCents': '$maxCents',
    if (filters.isNotEmpty)
      'filters': jsonEncode(
        filters.map(
          (fieldId, wanted) => MapEntry(
            fieldId,
            wanted is NumberRange ? wanted.toJson() : wanted,
          ),
        ),
      ),
    if (sort != null) 'sort': sort!.wire,
    if (featuredOnly) 'featured': '1',
    'page': '$page',
  };

  String get _key => Uri(queryParameters: parameters()).query;

  @override
  bool operator ==(Object other) => other is BrowseQuery && other._key == _key;

  @override
  int get hashCode => _key.hashCode;
}
