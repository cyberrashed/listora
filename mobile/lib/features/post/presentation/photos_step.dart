import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../../listings/data/listing.dart';
import '../../listings/presentation/listing_photo.dart';
import 'post_steps.dart';

/// The most photos a listing takes, as the server allows.
const maxPhotos = 10;

/// A photo on the form. Each is uploaded as soon as it is picked, so it is
/// uploading, uploaded, or failed.
class PostPhoto {
  const PostPhoto({
    this.bytes,
    this.contentType = 'image/jpeg',
    this.photo,
    this.failed = false,
  });

  /// The picked file, shown until the uploaded copy is known. Absent for
  /// photos the listing already had.
  final Uint8List? bytes;
  final String contentType;
  final ListingPhoto? photo;
  final bool failed;

  bool get uploading => photo == null && !failed;
}

/// The photos step. The first photo is the cover.
class PhotosStep extends StatelessWidget {
  const PhotosStep({
    super.key,
    required this.photos,
    required this.onAdd,
    required this.onOpen,
    this.error,
  });

  final List<PostPhoto> photos;
  final VoidCallback onAdd;

  /// Opens what can be done with the photo at that place.
  final ValueChanged<int> onOpen;
  final String? error;

  @override
  Widget build(BuildContext context) {
    final text = Theme.of(context).textTheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const StepHeading(
          'Add photos',
          detail:
              'Up to $maxPhotos. The first one is the cover. Tap a photo to '
              'move it to the front or remove it.',
        ),
        GridView.count(
          crossAxisCount: 3,
          mainAxisSpacing: 8,
          crossAxisSpacing: 8,
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          children: [
            for (final (index, photo) in photos.indexed)
              _PhotoTile(
                photo,
                cover: index == 0,
                label: 'Photo ${index + 1}',
                onTap: () => onOpen(index),
              ),
            if (photos.length < maxPhotos) _AddTile(onTap: onAdd),
          ],
        ),
        if (error != null) ...[
          const SizedBox(height: 12),
          Text(
            error!,
            style: text.bodyMedium?.copyWith(color: context.palette.negative),
          ),
        ],
      ],
    );
  }
}

class _PhotoTile extends StatelessWidget {
  const _PhotoTile(
    this.photo, {
    required this.cover,
    required this.label,
    required this.onTap,
  });

  final PostPhoto photo;
  final bool cover;
  final String label;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final bytes = photo.bytes;
    final scrim = Colors.black.withValues(alpha: 0.45);

    return Semantics(
      button: true,
      label: [
        label,
        if (cover) 'cover',
        if (photo.uploading) 'uploading',
        if (photo.failed) "didn't upload",
      ].join(', '),
      excludeSemantics: true,
      child: GestureDetector(
        onTap: onTap,
        child: ClipRRect(
          borderRadius: BorderRadius.circular(8),
          child: Stack(
            fit: StackFit.expand,
            children: [
              if (bytes != null)
                Image.memory(bytes, fit: BoxFit.cover, cacheWidth: 360)
              else
                ListingPhotoBox(photo.photo?.thumbUrl, radius: 0),
              if (photo.uploading)
                ColoredBox(
                  color: scrim,
                  child: const Center(
                    child: SizedBox.square(
                      dimension: 22,
                      child: CircularProgressIndicator(
                        strokeWidth: 2,
                        color: Colors.white,
                      ),
                    ),
                  ),
                ),
              if (photo.failed)
                ColoredBox(
                  color: scrim,
                  child: const Center(
                    child: Icon(
                      LucideIcons.triangleAlert,
                      color: Colors.white,
                      size: 22,
                    ),
                  ),
                ),
              if (cover)
                const Positioned(left: 6, bottom: 6, child: _CoverMark()),
            ],
          ),
        ),
      ),
    );
  }
}

class _CoverMark extends StatelessWidget {
  const _CoverMark();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
        child: Text(
          'Cover',
          style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(color: Colors.white),
        ),
      ),
    );
  }
}

class _AddTile extends StatelessWidget {
  const _AddTile({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;

    return Material(
      color: palette.raised,
      borderRadius: BorderRadius.circular(8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(8),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(LucideIcons.imagePlus, size: 22, color: palette.text),
            const SizedBox(height: 6),
            Text('Add photos', style: Theme.of(context).textTheme.labelLarge),
          ],
        ),
      ),
    );
  }
}
