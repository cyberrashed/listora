import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../app/theme/theme.dart';
import '../../../core/format.dart';
import '../../../core/network/api_error.dart';
import '../../../core/open_link.dart';
import '../../../core/widgets/centered_message.dart';
import '../../chat/application/chat_controllers.dart';
import '../data/packages.dart';

/// What the person has left to use, what they can buy, and their receipts.
class PackagesScreen extends ConsumerStatefulWidget {
  const PackagesScreen({super.key});

  @override
  ConsumerState<PackagesScreen> createState() => _PackagesScreenState();
}

class _PackagesScreenState extends ConsumerState<PackagesScreen>
    with WidgetsBindingObserver {
  String? _buying;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  // Back from the Stripe page: the package may have arrived meanwhile.
  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) ref.invalidate(myPackagesProvider);
  }

  Future<void> _buy(SalePackage pkg) async {
    setState(() => _buying = pkg.id);
    try {
      final page = await ref.read(packagesApiProvider).checkout(pkg.id);
      await ref.read(openLinkProvider)(page);
    } on ApiError catch (error) {
      if (mounted) {
        ScaffoldMessenger.of(context)
            .showSnackBar(SnackBar(content: Text(error.message)));
      }
    } finally {
      if (mounted) setState(() => _buying = null);
    }
  }

  @override
  Widget build(BuildContext context) {
    final mine = ref.watch(myPackagesProvider);
    final forSale = ref.watch(packagesForSaleProvider);
    final text = Theme.of(context).textTheme;
    final muted = text.bodyMedium?.copyWith(color: context.palette.muted);

    // A package bought on Stripe arrives as a notification.
    ref.listen(
      notificationsProvider,
      (_, _) => ref.invalidate(myPackagesProvider),
    );

    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: switch ((mine, forSale)) {
          (AsyncData(value: final owned), AsyncData(value: final sale)) =>
            RefreshIndicator(
              onRefresh: () => ref.refresh(myPackagesProvider.future),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(20, 4, 20, 32),
                children: [
                  Text('Packages', style: text.headlineMedium),
                  const SizedBox(height: 20),
                  Row(
                    children: [
                      _Count(
                        label: 'Listings left',
                        value: owned.left(PackageKind.listing),
                      ),
                      const SizedBox(width: 12),
                      _Count(
                        label: 'Features left',
                        value: owned.left(PackageKind.featured),
                      ),
                    ],
                  ),
                  for (final credit in owned.credits) ...[
                    const SizedBox(height: 12),
                    Text(
                      '${credit.name}: ${credit.remaining} of ${credit.total} '
                      'left until ${formatDate(credit.expiresAt)}',
                      style: muted,
                    ),
                  ],
                  const SizedBox(height: 32),
                  Text('Get more', style: text.titleMedium),
                  const SizedBox(height: 4),
                  Text(
                    'Paid by card on Stripe. This build uses test mode, so '
                    'no real money moves.',
                    style: muted,
                  ),
                  const SizedBox(height: 8),
                  for (final pkg in sale) ...[
                    const Divider(),
                    Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(pkg.name, style: text.bodyLarge),
                                Text(pkg.gives, style: muted),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          OutlinedButton(
                            onPressed: _buying == null ? () => _buy(pkg) : null,
                            child: _buying == pkg.id
                                ? const SizedBox.square(
                                    dimension: 16,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                    ),
                                  )
                                : Text(formatDollars(pkg.priceCents)),
                          ),
                        ],
                      ),
                    ),
                  ],
                  if (owned.receipts.isNotEmpty) ...[
                    const SizedBox(height: 32),
                    Text('Receipts', style: text.titleMedium),
                    const SizedBox(height: 8),
                    for (final receipt in owned.receipts) ...[
                      const Divider(),
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Row(
                          children: [
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    receipt.packageName,
                                    style: text.bodyLarge,
                                  ),
                                  Text(
                                    formatDate(receipt.paidAt),
                                    style: muted,
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              formatDollars(receipt.amountCents),
                              style: text.bodyLarge,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ],
                ],
              ),
            ),
          (AsyncError(:final error), _) ||
          (_, AsyncError(:final error)) => CenteredMessage(
            title: "Couldn't load packages",
            detail: error is ApiError ? error.message : 'Try again.',
            action: OutlinedButton(
              onPressed: () {
                ref.invalidate(myPackagesProvider);
                ref.invalidate(packagesForSaleProvider);
              },
              child: const Text('Try again'),
            ),
          ),
          _ => const Center(child: CircularProgressIndicator()),
        },
      ),
    );
  }
}

class _Count extends StatelessWidget {
  const _Count({required this.label, required this.value});

  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;
    return Expanded(
      child: DecoratedBox(
        decoration: BoxDecoration(
          border: Border.all(color: context.palette.border),
          borderRadius: BorderRadius.circular(8),
        ),
        child: Padding(
          padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: text.bodySmall?.copyWith(color: context.palette.muted),
              ),
              Text('$value', style: text.titleLarge),
            ],
          ),
        ),
      ),
    );
  }
}
