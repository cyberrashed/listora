import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';

enum PackageKind { listing, featured }

/// Something on sale: listings to post, or listings to feature.
class SalePackage {
  const SalePackage({
    required this.id,
    required this.name,
    required this.kind,
    required this.priceCents,
    required this.quantity,
    required this.days,
    this.featureDays,
  });

  final String id;
  final String name;
  final PackageKind kind;
  final int priceCents;
  final int quantity;
  final int days;
  final int? featureDays;

  factory SalePackage.fromJson(Map<String, dynamic> json) => SalePackage(
    id: json['id'] as String,
    name: json['name'] as String,
    kind: PackageKind.values.byName(json['kind'] as String),
    priceCents: json['priceCents'] as int,
    quantity: json['quantity'] as int,
    days: json['days'] as int,
    featureDays: json['featureDays'] as int?,
  );

  String get gives => switch (kind) {
    PackageKind.listing =>
      '$quantity ${quantity == 1 ? 'listing' : 'listings'} to post within $days days',
    PackageKind.featured =>
      '$quantity ${quantity == 1 ? 'listing' : 'listings'} on top for '
          '$featureDays days each',
  };
}

/// Credits the person holds and can still use.
class Credit {
  const Credit({
    required this.id,
    required this.name,
    required this.kind,
    required this.total,
    required this.remaining,
    required this.expiresAt,
  });

  final String id;
  final String name;
  final PackageKind kind;
  final int total;
  final int remaining;
  final DateTime expiresAt;

  factory Credit.fromJson(Map<String, dynamic> json) => Credit(
    id: json['id'] as String,
    name: json['name'] as String,
    kind: PackageKind.values.byName(json['kind'] as String),
    total: json['total'] as int,
    remaining: json['remaining'] as int,
    expiresAt: DateTime.parse(json['expiresAt'] as String),
  );
}

class Receipt {
  const Receipt({
    required this.id,
    required this.packageName,
    required this.amountCents,
    required this.paidAt,
  });

  final String id;
  final String packageName;
  final int amountCents;
  final DateTime paidAt;

  factory Receipt.fromJson(Map<String, dynamic> json) => Receipt(
    id: json['id'] as String,
    packageName: json['packageName'] as String,
    amountCents: json['amountCents'] as int,
    paidAt: DateTime.parse(json['paidAt'] as String),
  );
}

class MyPackages {
  const MyPackages({required this.credits, required this.receipts});

  final List<Credit> credits;
  final List<Receipt> receipts;

  int left(PackageKind kind) => credits
      .where((credit) => credit.kind == kind)
      .fold(0, (sum, credit) => sum + credit.remaining);
}

final packagesApiProvider = Provider<PackagesApi>(
  (ref) => PackagesApi(ref.watch(apiClientProvider)),
);

final packagesForSaleProvider = FutureProvider.autoDispose<List<SalePackage>>(
  (ref) => ref.watch(packagesApiProvider).forSale(),
);

final myPackagesProvider = FutureProvider.autoDispose<MyPackages>(
  (ref) => ref.watch(packagesApiProvider).mine(),
);

typedef _Json = Map<String, dynamic>;

class PackagesApi {
  PackagesApi(this._dio);

  final Dio _dio;

  Future<List<SalePackage>> forSale() => apiCall(() async {
    final response = await _dio.get<List<dynamic>>('/packages');
    return [
      for (final item in response.data!) SalePackage.fromJson(item as _Json),
    ];
  });

  Future<MyPackages> mine() => apiCall(() async {
    final response = await _dio.get<_Json>('/me/packages');
    return MyPackages(
      credits: [
        for (final item in response.data!['credits'] as List<dynamic>)
          Credit.fromJson(item as _Json),
      ],
      receipts: [
        for (final item in response.data!['payments'] as List<dynamic>)
          Receipt.fromJson(item as _Json),
      ],
    );
  });

  /// The Stripe page to pay for a package on.
  Future<Uri> checkout(String packageId) => apiCall(() async {
    final response = await _dio.post<_Json>('/packages/$packageId/checkout');
    return Uri.parse(response.data!['url'] as String);
  });
}
