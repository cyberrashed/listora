class User {
  const User({
    required this.id,
    required this.name,
    required this.email,
    required this.createdAt,
    this.phone,
  });

  final String id;
  final String name;
  final String email;
  final String? phone;
  final DateTime createdAt;

  factory User.fromJson(Map<String, dynamic> json) => User(
    id: json['id'] as String,
    name: json['name'] as String,
    email: json['email'] as String,
    phone: json['phone'] as String?,
    createdAt: DateTime.parse(json['createdAt'] as String),
  );
}
