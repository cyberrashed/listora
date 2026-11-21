import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

/// Opens a web page in the phone's browser, like Stripe's checkout.
final openLinkProvider = Provider<Future<bool> Function(Uri)>(
  (ref) =>
      (page) => launchUrl(page, mode: LaunchMode.externalApplication),
);
