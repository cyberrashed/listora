import 'package:dio/dio.dart';

/// A failure the UI can show: the server's own message and, for a rejected
/// form, one message per field.
class ApiError implements Exception {
  const ApiError({
    required this.code,
    required this.message,
    this.fields = const {},
  });

  final String code;
  final String message;
  final Map<String, String> fields;

  factory ApiError.from(DioException error) {
    final data = error.response?.data;
    if (data is Map<String, dynamic> && data['message'] is String) {
      final details = data['details'];
      return ApiError(
        code: data['code'] as String? ?? 'unknown',
        message: data['message'] as String,
        fields: details is Map<String, dynamic>
            ? details.map((field, text) => MapEntry(field, '$text'))
            : const {},
      );
    }

    if (error.response == null) {
      return const ApiError(
        code: 'network',
        message: "Can't reach Listora. Check your connection and try again.",
      );
    }

    return const ApiError(
      code: 'unknown',
      message: 'Something went wrong. Try again.',
    );
  }
}

/// Runs a request, turning a transport failure into an [ApiError].
Future<T> apiCall<T>(Future<T> Function() request) async {
  try {
    return await request();
  } on DioException catch (error) {
    throw ApiError.from(error);
  }
}
