import 'package:flutter/widgets.dart';

import '../network/api_error.dart';

/// Shared by every form screen: tracks the request in flight and turns a
/// refused request into a message under the right field, or one for the
/// whole form.
mixin FormSubmission<T extends StatefulWidget> on State<T> {
  bool submitting = false;
  String? formError;

  /// The server's code for the last refusal, like `payment_required`.
  String? errorCode;
  Map<String, String> fieldErrors = const {};

  /// Runs [request] and returns whether it succeeded.
  Future<bool> submit(Future<void> Function() request) async {
    if (submitting) return false;
    setState(() {
      submitting = true;
      formError = null;
      errorCode = null;
      fieldErrors = const {};
    });

    try {
      await request();
      return true;
    } on ApiError catch (error) {
      if (mounted) {
        setState(() {
          fieldErrors = error.fields;
          formError = error.fields.isEmpty ? error.message : null;
          errorCode = error.code;
        });
      }
      return false;
    } finally {
      if (mounted) setState(() => submitting = false);
    }
  }
}
