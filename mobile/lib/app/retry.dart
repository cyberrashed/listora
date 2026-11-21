/// Riverpod retries a failed provider up to ten times by default. That would
/// repeat requests the server has already refused, and it hides failures
/// behind a spinner. Screens here show the failure and offer "Try again".
Duration? neverRetry(int retryCount, Object error) => null;
