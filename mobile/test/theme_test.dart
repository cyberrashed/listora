import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:listora/app/theme/theme.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

void main() {
  for (final brightness in Brightness.values) {
    testWidgets('theme renders in ${brightness.name}', (tester) async {
      tester.view.physicalSize = const Size(390, 780);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.reset);

      await tester.pumpWidget(
        MaterialApp(
          debugShowCheckedModeBanner: false,
          theme: buildTheme(brightness),
          home: const _Specimen(),
        ),
      );

      await expectLater(
        find.byType(_Specimen),
        matchesGoldenFile('goldens/theme_${brightness.name}.png'),
      );
    });
  }
}

class _Specimen extends StatelessWidget {
  const _Specimen();

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    final palette = context.palette;

    return Scaffold(
      appBar: AppBar(title: const Text('Post a listing')),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text('Trek Marlin 7 mountain bike', style: text.headlineMedium),
          const SizedBox(height: 8),
          Text(r'$480', style: text.titleLarge),
          const SizedBox(height: 4),
          Text(
            'Austin, TX · Posted 2 hours ago',
            style: text.bodyMedium?.copyWith(color: palette.muted),
          ),
          const SizedBox(height: 16),
          Text(
            'Size large, 29 inch wheels. New chain and brake pads in March. '
            'Pickup near Zilker Park.',
            style: text.bodyLarge,
          ),
          const SizedBox(height: 24),
          Text('Title', style: text.labelLarge),
          const SizedBox(height: 8),
          const TextField(
            decoration: InputDecoration(hintText: 'What are you selling?'),
          ),
          const SizedBox(height: 24),
          FilledButton(onPressed: () {}, child: const Text('Message seller')),
          const SizedBox(height: 12),
          OutlinedButton(onPressed: () {}, child: const Text('Make an offer')),
          const SizedBox(height: 4),
          Align(
            alignment: Alignment.centerLeft,
            child: TextButton(
              onPressed: () {},
              child: const Text('Report this listing'),
            ),
          ),
          const SizedBox(height: 12),
          const Divider(),
          const SizedBox(height: 16),
          Card(
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Text(
                'Meet in a public place and check the item before you pay.',
                style: text.bodyMedium,
              ),
            ),
          ),
        ],
      ),
      bottomNavigationBar: NavigationBar(
        selectedIndex: 0,
        destinations: [
          NavigationDestination(icon: Icon(LucideIcons.house), label: 'Home'),
          NavigationDestination(
            icon: Icon(LucideIcons.search),
            label: 'Search',
          ),
          NavigationDestination(
            icon: Icon(LucideIcons.messagesSquare),
            label: 'Inbox',
          ),
          NavigationDestination(icon: Icon(LucideIcons.user), label: 'Account'),
        ],
      ),
    );
  }
}
