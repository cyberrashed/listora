import 'package:flutter/material.dart';

import '../../../app/theme/theme.dart';
import '../data/listing.dart';

/// Where a listing stands, in the same colours the dashboard uses.
class StatusPill extends StatelessWidget {
  const StatusPill(this.status, {super.key});

  final ListingStatus status;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final (background, ink) = switch (status) {
      ListingStatus.active => (palette.pillPositiveBg, palette.pillPositiveInk),
      ListingStatus.inReview => (palette.pillWarningBg, palette.pillWarningInk),
      ListingStatus.rejected => (
        palette.pillNegativeBg,
        palette.pillNegativeInk,
      ),
      ListingStatus.sold ||
      ListingStatus.expired => (palette.pillNeutralBg, palette.pillNeutralInk),
    };

    return DecoratedBox(
      decoration: ShapeDecoration(
        color: background,
        shape: const StadiumBorder(),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          status.label,
          style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(color: ink, fontWeight: FontWeight.w500),
        ),
      ),
    );
  }
}
