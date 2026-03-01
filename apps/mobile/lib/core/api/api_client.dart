import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';

import 'api_environment.dart';

const String kTokenKey = 'pricelio_access_token';
const String kRefreshTokenKey = 'pricelio_refresh_token';

class ApiErrorEnvelope {
  final String code;
  final String message;
  final String? traceId;

  const ApiErrorEnvelope({
    required this.code,
    required this.message,
    this.traceId,
  });

  factory ApiErrorEnvelope.fromResponse(dynamic data, {String? traceId}) {
    if (data is Map<String, dynamic>) {
      final dynamic err = data['error'];
      if (err is Map<String, dynamic>) {
        return ApiErrorEnvelope(
          code: (err['code'] ?? 'api_error').toString(),
          message: (err['message'] ?? err['code'] ?? 'API error').toString(),
          traceId: (err['trace_id'] ?? traceId)?.toString(),
        );
      }
      if (err is String) {
        return ApiErrorEnvelope(
          code: err,
          message: (data['message'] ?? err).toString(),
          traceId: traceId,
        );
      }
      if (data['message'] is String) {
        return ApiErrorEnvelope(
          code: 'api_error',
          message: data['message'].toString(),
          traceId: traceId,
        );
      }
    }
    return ApiErrorEnvelope(
      code: 'api_error',
      message: 'API request failed',
      traceId: traceId,
    );
  }
}

class ApiClientException implements Exception {
  final String code;
  final String message;
  final String? traceId;
  final int? statusCode;

  const ApiClientException({
    required this.code,
    required this.message,
    this.traceId,
    this.statusCode,
  });

  @override
  String toString() {
    final status = statusCode == null ? '' : 'status=$statusCode';
    final trace =
        (traceId == null || traceId!.isEmpty) ? '' : ' trace_id=$traceId';
    return 'ApiClientException($code, $message $status$trace)';
  }
}

class ApiClient {
  static final ApiClient _instance = ApiClient._internal();
  factory ApiClient() => _instance;
  ApiClient._internal();

  final _storage = const FlutterSecureStorage();
  late final Dio dio;

  Future<bool>? _refreshFuture;
  bool _initialized = false;

  void init() {
    if (_initialized) return;

    dio = Dio(
      BaseOptions(
        baseUrl: ApiEnvironment.normalizedApiBaseUrl,
        connectTimeout: const Duration(
          milliseconds: ApiEnvironment.connectTimeoutMs,
        ),
        receiveTimeout: const Duration(
          milliseconds: ApiEnvironment.receiveTimeoutMs,
        ),
        headers: const {
          'Content-Type': 'application/json',
          'X-Auth-Transport': 'body'
        },
      ),
    );

    dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await _storage.read(key: kTokenKey);
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          handler.next(options);
        },
        onError: (error, handler) async {
          if (_shouldAttemptTokenRefresh(error)) {
            final refreshed = await _refreshToken();
            if (refreshed) {
              try {
                final retried = await _retryWithAuth(error.requestOptions);
                return handler.resolve(retried);
              } catch (_) {
                // Fall through to normalized error handling.
              }
            }
          }

          if (_shouldRetryRequest(error)) {
            final retryCount =
                (error.requestOptions.extra['retry_count'] as int?) ?? 0;
            if (retryCount < 2) {
              final waitMs = 250 * (1 << retryCount);
              await Future<void>.delayed(Duration(milliseconds: waitMs));
              final options = error.requestOptions;
              options.extra['retry_count'] = retryCount + 1;
              try {
                final retried = await dio.fetch(options);
                return handler.resolve(retried);
              } catch (retryError) {
                if (retryError is DioException) {
                  error = retryError;
                }
              }
            }
          }

          handler.next(_normalizeError(error));
        },
      ),
    );

    _initialized = true;
  }

  bool _shouldAttemptTokenRefresh(DioException error) {
    if (error.response?.statusCode != 401) return false;
    if (error.requestOptions.path.endsWith('/auth/refresh')) return false;
    return error.requestOptions.extra['auth_retry'] != true;
  }

  bool _shouldRetryRequest(DioException error) {
    return error.type == DioExceptionType.connectionError ||
        error.type == DioExceptionType.connectionTimeout ||
        error.type == DioExceptionType.receiveTimeout ||
        error.type == DioExceptionType.sendTimeout;
  }

  Future<Response<dynamic>> _retryWithAuth(
      RequestOptions requestOptions) async {
    final token = await _storage.read(key: kTokenKey);
    if (token != null && token.isNotEmpty) {
      requestOptions.headers['Authorization'] = 'Bearer $token';
    }
    requestOptions.extra['auth_retry'] = true;
    return dio.fetch(requestOptions);
  }

  DioException _normalizeError(DioException error) {
    final traceId = error.response?.headers.value('x-trace-id');
    final envelope =
        ApiErrorEnvelope.fromResponse(error.response?.data, traceId: traceId);
    return DioException(
      requestOptions: error.requestOptions,
      response: error.response,
      type: error.type,
      message: envelope.message,
      error: ApiClientException(
        code: envelope.code,
        message: envelope.message,
        traceId: envelope.traceId,
        statusCode: error.response?.statusCode,
      ),
    );
  }

  Future<bool> _refreshToken() async {
    if (_refreshFuture != null) {
      return _refreshFuture!;
    }

    _refreshFuture = _refreshTokenInternal();
    final result = await _refreshFuture!;
    _refreshFuture = null;
    return result;
  }

  Future<bool> _refreshTokenInternal() async {
    try {
      final refresh = await _storage.read(key: kRefreshTokenKey);
      if (refresh == null || refresh.isEmpty) {
        return false;
      }

      final refreshDio = Dio(
        BaseOptions(
          baseUrl: ApiEnvironment.normalizedApiBaseUrl,
          connectTimeout: const Duration(
            milliseconds: ApiEnvironment.connectTimeoutMs,
          ),
          receiveTimeout: const Duration(
            milliseconds: ApiEnvironment.receiveTimeoutMs,
          ),
          headers: const {
            'Content-Type': 'application/json',
            'X-Auth-Transport': 'body'
          },
        ),
      );

      final res = await refreshDio.post(
        '/auth/refresh',
        data: {'refresh_token': refresh},
      );

      final accessToken = res.data is Map<String, dynamic>
          ? res.data['access_token']?.toString()
          : null;
      if (accessToken == null || accessToken.isEmpty) {
        return false;
      }

      await _storage.write(key: kTokenKey, value: accessToken);
      final rotatedRefresh = res.data is Map<String, dynamic>
          ? res.data['refresh_token']?.toString()
          : null;
      if (rotatedRefresh != null && rotatedRefresh.isNotEmpty) {
        await _storage.write(key: kRefreshTokenKey, value: rotatedRefresh);
      }
      return true;
    } catch (_) {
      await logout();
      return false;
    }
  }

  Future<void> saveTokens({String? accessToken, String? refreshToken}) async {
    if (accessToken != null) {
      await _storage.write(key: kTokenKey, value: accessToken);
    }
    if (refreshToken != null) {
      await _storage.write(key: kRefreshTokenKey, value: refreshToken);
    }
  }

  Future<void> logout() async {
    await _storage.delete(key: kTokenKey);
    await _storage.delete(key: kRefreshTokenKey);
  }
}
