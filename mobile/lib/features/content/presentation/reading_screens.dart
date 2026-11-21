import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/network/api_error.dart';
import '../../../core/widgets/centered_message.dart';
import '../data/content.dart';

Widget _failed(Object error, String what, VoidCallback onRetry) =>
    CenteredMessage(
      title: "Couldn't load $what",
      detail: error is ApiError ? error.message : 'Try again.',
      action: OutlinedButton(
        onPressed: onRetry,
        child: const Text('Try again'),
      ),
    );

/// Common questions, the longer pages and how to reach a person.
class HelpScreen extends ConsumerWidget {
  const HelpScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final help = ref.watch(helpProvider);
    final support = ref.watch(appConfigProvider).value?.supportEmail;
    final text = Theme.of(context).textTheme;
    final palette = context.palette;

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: switch (help) {
          AsyncData(:final value) => ListView(
            padding: const EdgeInsets.only(bottom: 32),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                child: Text('Help', style: text.headlineMedium),
              ),
              for (final item in value.questions) ...[
                const Divider(height: 1),
                Theme(
                  // The tile's own dividers would double the list's.
                  data: Theme.of(context)
                      .copyWith(dividerColor: Colors.transparent),
                  child: ExpansionTile(
                    tilePadding: const EdgeInsets.symmetric(horizontal: 20),
                    childrenPadding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
                    expandedCrossAxisAlignment: CrossAxisAlignment.start,
                    iconColor: palette.text,
                    collapsedIconColor: palette.muted,
                    title: Text(item.question, style: text.bodyLarge),
                    children: [
                      Text(
                        item.answer,
                        style: text.bodyMedium?.copyWith(color: palette.muted),
                      ),
                    ],
                  ),
                ),
              ],
              const Divider(height: 1),
              const SizedBox(height: 24),
              for (final page in value.pages) ...[
                InkWell(
                  onTap: () => context.push('/pages/${page.slug}'),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 14,
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: Text(page.title, style: text.bodyLarge),
                        ),
                        Icon(
                          LucideIcons.chevronRight,
                          size: 18,
                          color: palette.muted,
                        ),
                      ],
                    ),
                  ),
                ),
                const Divider(indent: 20),
              ],
              if (support != null)
                Padding(
                  padding: const EdgeInsets.fromLTRB(20, 24, 20, 0),
                  child: InkWell(
                    onTap: () async {
                      await Clipboard.setData(ClipboardData(text: support));
                      if (context.mounted) {
                        ScaffoldMessenger.of(context).showSnackBar(
                          SnackBar(content: Text('Copied $support')),
                        );
                      }
                    },
                    child: Text.rich(
                      TextSpan(
                        text: 'Still stuck? Write to ',
                        style: text.bodyMedium?.copyWith(color: palette.muted),
                        children: [
                          TextSpan(
                            text: support,
                            style: TextStyle(color: palette.text),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
            ],
          ),
          AsyncError(:final error) => _failed(
            error,
            'help',
            () => ref.invalidate(helpProvider),
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

/// A help page, like the terms or the safety tips.
class PageScreen extends ConsumerWidget {
  const PageScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final page = ref.watch(pageProvider(slug));
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: switch (page) {
          AsyncData(:final value) => _Reading(value),
          AsyncError(:final error) => _failed(
            error,
            'this page',
            () => ref.invalidate(pageProvider(slug)),
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class BlogScreen extends ConsumerWidget {
  const BlogScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final posts = ref.watch(postsProvider);
    final text = Theme.of(context).textTheme;
    final muted = text.bodyMedium?.copyWith(color: context.palette.muted);

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: switch (posts) {
          AsyncData(:final value) when value.isEmpty => const CenteredMessage(
            title: 'No posts yet',
            detail: 'Tips for buying and selling show up here.',
          ),
          AsyncData(:final value) => ListView(
            padding: const EdgeInsets.only(bottom: 32),
            children: [
              Padding(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 16),
                child: Text('Blog', style: text.headlineMedium),
              ),
              for (final post in value) ...[
                const Divider(height: 1),
                InkWell(
                  onTap: () => context.push('/blog/${post.slug}'),
                  child: Padding(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 20,
                      vertical: 16,
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(post.title, style: text.titleMedium),
                        const SizedBox(height: 4),
                        Text(post.excerpt, style: muted),
                        const SizedBox(height: 6),
                        Text(
                          formatDate(post.publishedAt),
                          style: text.bodySmall?.copyWith(
                            color: context.palette.muted,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
              const Divider(height: 1),
            ],
          ),
          AsyncError(:final error) => _failed(
            error,
            'the blog',
            () => ref.invalidate(postsProvider),
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class PostScreen extends ConsumerWidget {
  const PostScreen({super.key, required this.slug});

  final String slug;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final post = ref.watch(postProvider(slug));
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: switch (post) {
          AsyncData(:final value) => _Reading(value),
          AsyncError(:final error) => _failed(
            error,
            'this post',
            () => ref.invalidate(postProvider(slug)),
          ),
          AsyncLoading() => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

/// A help page or blog post laid out for reading.
class _Reading extends StatelessWidget {
  const _Reading(this.article);

  final Article article;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final muted = text.bodyMedium?.copyWith(color: context.palette.muted);
    final date = article.date;

    return ListView(
      padding: const EdgeInsets.fromLTRB(20, 4, 20, 40),
      children: [
        Text(article.title, style: text.headlineMedium),
        if (date != null) ...[
          const SizedBox(height: 8),
          Text(formatDate(date), style: muted),
        ],
        if (article.excerpt != null) ...[
          const SizedBox(height: 16),
          Text(
            article.excerpt!,
            style: text.titleMedium?.copyWith(fontWeight: FontWeight.w400),
          ),
        ],
        for (final paragraph in article.paragraphs) ...[
          const SizedBox(height: 16),
          Text(paragraph, style: text.bodyLarge),
        ],
      ],
    );
  }
}
