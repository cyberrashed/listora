import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../categories/data/category.dart';
import '../data/browse_api.dart';

/// Where results come from. Tapping it changes the area for every screen.
class AreaButton extends ConsumerWidget {
  const AreaButton({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final area = ref.watch(browseAreaProvider);
    final palette = context.palette;

    return InkWell(
      onTap: () => context.push('/area'),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 12),
        child: Row(
          children: [
            Icon(LucideIcons.mapPin, size: 16, color: palette.muted),
            const SizedBox(width: 8),
            Flexible(
              child: Text(
                area?.label ?? 'Anywhere in the US',
                style: Theme.of(context).textTheme.bodyMedium,
                overflow: TextOverflow.ellipsis,
              ),
            ),
            const SizedBox(width: 4),
            Icon(LucideIcons.chevronDown, size: 16, color: palette.muted),
          ],
        ),
      ),
    );
  }
}

/// A row of categories to narrow into, scrolling sideways.
class CategoryChips extends StatelessWidget {
  const CategoryChips({super.key, required this.categories});

  final List<Category> categories;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: categories.length,
        separatorBuilder: (context, index) => const SizedBox(width: 8),
        itemBuilder: (context, index) {
          final category = categories[index];
          return ActionChip(
            label: Text(category.name),
            onPressed: () => context.push('/browse/category/${category.id}'),
          );
        },
      ),
    );
  }
}
