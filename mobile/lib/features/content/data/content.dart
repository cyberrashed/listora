import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:package_info_plus/package_info_plus.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_error.dart';

/// What the server says about running the app at all.
class AppConfig {
  const AppConfig({
    required this.maintenance,
    required this.maintenanceMessage,
    required this.minAppVersion,
    required this.supportEmail,
  });

  final bool maintenance;
  final String maintenanceMessage;
  final String minAppVersion;
  final String supportEmail;

  factory AppConfig.fromJson(Map<String, dynamic> json) => AppConfig(
    maintenance: json['maintenance'] as bool,
    maintenanceMessage: json['maintenanceMessage'] as String,
    minAppVersion: json['minAppVersion'] as String,
    supportEmail: json['supportEmail'] as String,
  );
}

/// Whether [version] is older than [minimum], both like "1.4.0".
bool isOlder(String version, String minimum) {
  List<int> parts(String text) => [
    for (final part in text.split('+').first.split('.'))
      int.tryParse(part) ?? 0,
  ];
  final have = parts(version);
  final need = parts(minimum);
  for (var index = 0; index < 3; index++) {
    final a = index < have.length ? have[index] : 0;
    final b = index < need.length ? need[index] : 0;
    if (a != b) return a < b;
  }
  return false;
}

enum BannerLink { none, category, search, post }

class HomeBanner {
  const HomeBanner({
    required this.id,
    required this.title,
    required this.body,
    required this.link,
    this.target,
  });

  final String id;
  final String title;
  final String body;
  final BannerLink link;

  /// The category id, or the words to search for.
  final String? target;

  factory HomeBanner.fromJson(Map<String, dynamic> json) => HomeBanner(
    id: json['id'] as String,
    title: json['title'] as String,
    body: json['body'] as String,
    link: BannerLink.values.byName(json['link'] as String),
    target: json['target'] as String?,
  );
}

class Question {
  const Question({required this.question, required this.answer});

  final String question;
  final String answer;
}

class PageLink {
  const PageLink({required this.slug, required this.title});

  final String slug;
  final String title;
}

class Help {
  const Help({required this.questions, required this.pages});

  final List<Question> questions;
  final List<PageLink> pages;
}

/// A help page or a blog post, ready to read.
class Article {
  const Article({
    required this.title,
    required this.body,
    this.date,
    this.excerpt,
  });

  final String title;
  final String body;
  final DateTime? date;
  final String? excerpt;

  /// The text split where a blank line starts a new paragraph.
  List<String> get paragraphs => [
    for (final part in body.split(RegExp(r'\n\s*\n')))
      if (part.trim().isNotEmpty) part.trim(),
  ];
}

class PostCard {
  const PostCard({
    required this.slug,
    required this.title,
    required this.excerpt,
    required this.publishedAt,
  });

  final String slug;
  final String title;
  final String excerpt;
  final DateTime publishedAt;
}

final contentApiProvider = Provider<ContentApi>(
  (ref) => ContentApi(ref.watch(apiClientProvider)),
);

/// The version of this build, like "0.1.0".
final appVersionProvider = FutureProvider<String>(
  (ref) async => (await PackageInfo.fromPlatform()).version,
);

final appConfigProvider = FutureProvider<AppConfig>(
  (ref) => ref.watch(contentApiProvider).config(),
);

final homeBannersProvider = FutureProvider.autoDispose<List<HomeBanner>>(
  (ref) => ref.watch(contentApiProvider).banners(),
);

final helpProvider = FutureProvider.autoDispose<Help>(
  (ref) => ref.watch(contentApiProvider).help(),
);

final pageProvider = FutureProvider.autoDispose.family<Article, String>(
  (ref, slug) => ref.watch(contentApiProvider).page(slug),
);

final postsProvider = FutureProvider.autoDispose<List<PostCard>>(
  (ref) => ref.watch(contentApiProvider).posts(),
);

final postProvider = FutureProvider.autoDispose.family<Article, String>(
  (ref, slug) => ref.watch(contentApiProvider).post(slug),
);

typedef _Json = Map<String, dynamic>;

class ContentApi {
  ContentApi(this._dio);

  final Dio _dio;

  Future<AppConfig> config() => apiCall(() async {
    final response = await _dio.get<_Json>('/app-config');
    return AppConfig.fromJson(response.data!);
  });

  Future<List<HomeBanner>> banners() => apiCall(() async {
    final response = await _dio.get<_Json>('/home');
    return [
      for (final item in response.data!['banners'] as List<dynamic>)
        HomeBanner.fromJson(item as _Json),
    ];
  });

  Future<Help> help() => apiCall(() async {
    final response = await _dio.get<_Json>('/help');
    final data = response.data!;
    return Help(
      questions: [
        for (final item in data['faq'] as List<dynamic>)
          Question(
            question: (item as _Json)['question'] as String,
            answer: item['answer'] as String,
          ),
      ],
      pages: [
        for (final item in data['pages'] as List<dynamic>)
          PageLink(
            slug: (item as _Json)['slug'] as String,
            title: item['title'] as String,
          ),
      ],
    );
  });

  Future<Article> page(String slug) => apiCall(() async {
    final response = await _dio.get<_Json>('/pages/$slug');
    return Article(
      title: response.data!['title'] as String,
      body: response.data!['body'] as String,
    );
  });

  Future<List<PostCard>> posts() => apiCall(() async {
    final response = await _dio.get<List<dynamic>>('/posts');
    return [
      for (final item in response.data!)
        PostCard(
          slug: (item as _Json)['slug'] as String,
          title: item['title'] as String,
          excerpt: item['excerpt'] as String,
          publishedAt: DateTime.parse(item['publishedAt'] as String),
        ),
    ];
  });

  Future<Article> post(String slug) => apiCall(() async {
    final response = await _dio.get<_Json>('/posts/$slug');
    final data = response.data!;
    return Article(
      title: data['title'] as String,
      body: data['body'] as String,
      excerpt: data['excerpt'] as String,
      date: DateTime.parse(data['publishedAt'] as String),
    );
  });
}
