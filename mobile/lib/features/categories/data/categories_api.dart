import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';
import 'category.dart';

/// Every category customers can browse, in display order. Screens pick the
/// level they show out of this one list.
final categoriesProvider = FutureProvider<List<Category>>(
  (ref) => apiCall(() async {
    final response = await ref
        .watch(apiClientProvider)
        .get<List<dynamic>>('/categories');
    return [
      for (final item in response.data!)
        Category.fromJson(item as Map<String, dynamic>),
    ];
  }),
);
