import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:geolocator/geolocator.dart';

/// Roughly where the phone is, or null when location is off or refused.
/// City-level accuracy is enough: the server turns it into the nearest city.
final currentPositionProvider =
    Provider<Future<({double lat, double lng})?> Function()>(
      (ref) => () async {
        if (!await Geolocator.isLocationServiceEnabled()) return null;
        var permission = await Geolocator.checkPermission();
        if (permission == LocationPermission.denied) {
          permission = await Geolocator.requestPermission();
        }
        if (permission == LocationPermission.denied ||
            permission == LocationPermission.deniedForever) {
          return null;
        }
        final position = await Geolocator.getCurrentPosition(
          locationSettings: const LocationSettings(
            accuracy: LocationAccuracy.low,
          ),
        );
        return (lat: position.latitude, lng: position.longitude);
      },
    );
