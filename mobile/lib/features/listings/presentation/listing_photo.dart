import 'package:flutter/material.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../app/theme/theme.dart';
import '../data/listing.dart';

/// A listing's photos, one at a time, swiped sideways. Tapping one opens
/// them full screen.
class PhotoGallery extends StatefulWidget {
  const PhotoGallery(this.photos, {super.key});

  final List<ListingPhoto> photos;

  @override
  State<PhotoGallery> createState() => _PhotoGalleryState();
}

class _PhotoGalleryState extends State<PhotoGallery> {
  var _index = 0;

  @override
  Widget build(BuildContext context) {
    final photos = widget.photos;

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: AspectRatio(
        aspectRatio: 4 / 3,
        child: Stack(
          children: [
            PageView.builder(
              itemCount: photos.length,
              onPageChanged: (index) => setState(() => _index = index),
              itemBuilder: (context, index) => Semantics(
                image: true,
                label: 'Photo ${index + 1} of ${photos.length}',
                child: GestureDetector(
                  onTap: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      fullscreenDialog: true,
                      builder: (context) =>
                          _FullScreenPhotos(photos: photos, first: index),
                    ),
                  ),
                  child: ListingPhotoBox(photos[index].url, radius: 0),
                ),
              ),
            ),
            if (photos.length > 1)
              Positioned(
                right: 10,
                bottom: 10,
                child: _Count('${_index + 1} / ${photos.length}'),
              ),
          ],
        ),
      ),
    );
  }
}

class _Count extends StatelessWidget {
  const _Count(this.label);

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.6),
        borderRadius: BorderRadius.circular(4),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
        child: Text(
          label,
          style: Theme.of(context).textTheme.bodySmall
              ?.copyWith(color: Colors.white),
        ),
      ),
    );
  }
}

/// The photos on black, pinch to zoom.
class _FullScreenPhotos extends StatefulWidget {
  const _FullScreenPhotos({required this.photos, required this.first});

  final List<ListingPhoto> photos;
  final int first;

  @override
  State<_FullScreenPhotos> createState() => _FullScreenPhotosState();
}

class _FullScreenPhotosState extends State<_FullScreenPhotos> {
  late var _index = widget.first;
  late final _pages = PageController(initialPage: widget.first);

  @override
  void dispose() {
    _pages.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final photos = widget.photos;

    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        foregroundColor: Colors.white,
        // The app's theme sets the title colour, so it's set again here.
        titleTextStyle: Theme.of(context).appBarTheme.titleTextStyle
            ?.copyWith(color: Colors.white),
        title: Text('${_index + 1} of ${photos.length}'),
      ),
      body: PageView.builder(
        controller: _pages,
        itemCount: photos.length,
        onPageChanged: (index) => setState(() => _index = index),
        itemBuilder: (context, index) => InteractiveViewer(
          maxScale: 4,
          child: Center(
            child: Image.network(
              photos[index].url,
              fit: BoxFit.contain,
              loadingBuilder: (context, child, progress) => progress == null
                  ? child
                  : const CircularProgressIndicator(color: Colors.white),
              errorBuilder: (context, error, stack) => const Icon(
                LucideIcons.imageOff,
                color: Colors.white54,
                size: 32,
              ),
            ),
          ),
        ),
      ),
    );
  }
}

/// A listing photo filling its box. A plain stand-in shows while it loads,
/// when the listing has no photo, and when it can't be fetched.
class ListingPhotoBox extends StatelessWidget {
  const ListingPhotoBox(
    this.url, {
    super.key,
    this.radius = 8,
    this.fit = BoxFit.cover,
  });

  final String? url;
  final double radius;
  final BoxFit fit;

  @override
  Widget build(BuildContext context) {
    final palette = context.palette;
    final standIn = ColoredBox(
      color: palette.raised,
      child: Center(
        child: Icon(LucideIcons.imageOff, size: 20, color: palette.muted),
      ),
    );

    return ClipRRect(
      borderRadius: BorderRadius.circular(radius),
      child: url == null
          ? standIn
          : Image.network(
              url!,
              fit: fit,
              frameBuilder: (context, child, frame, synchronous) =>
                  synchronous || frame != null
                  ? child
                  : ColoredBox(color: palette.raised),
              errorBuilder: (context, error, stack) => standIn,
            ),
    );
  }
}
