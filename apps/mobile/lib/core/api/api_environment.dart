class ApiEnvironment {
  static const String _defaultApiBaseUrl = 'https://api.pricelio.app';

  static const String apiBaseUrl = String.fromEnvironment(
    'API_BASE_URL',
    defaultValue: _defaultApiBaseUrl,
  );

  static const int connectTimeoutMs = int.fromEnvironment(
    'API_TIMEOUT_CONNECT_MS',
    defaultValue: 10000,
  );

  static const int receiveTimeoutMs = int.fromEnvironment(
    'API_TIMEOUT_RECEIVE_MS',
    defaultValue: 15000,
  );

  static String get normalizedApiBaseUrl {
    final trimmed = apiBaseUrl.trim();
    if (trimmed.isEmpty) {
      return _defaultApiBaseUrl;
    }
    return trimmed.endsWith('/')
        ? trimmed.substring(0, trimmed.length - 1)
        : trimmed;
  }
}
