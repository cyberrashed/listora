class Category {
  const Category({
    required this.id,
    required this.name,
    required this.slug,
    this.parentId,
  });

  final String id;
  final String name;
  final String slug;
  final String? parentId;

  factory Category.fromJson(Map<String, dynamic> json) => Category(
    id: json['id'] as String,
    name: json['name'] as String,
    slug: json['slug'] as String,
    parentId: json['parentId'] as String?,
  );
}

extension CategoryTree on List<Category> {
  /// The categories directly under [parentId], or the top level for null.
  /// The server sends the list in display order, and this keeps it.
  List<Category> childrenOf(String? parentId) =>
      where((category) => category.parentId == parentId).toList();

  Category? byId(String id) {
    for (final category in this) {
      if (category.id == id) return category;
    }
    return null;
  }
}
