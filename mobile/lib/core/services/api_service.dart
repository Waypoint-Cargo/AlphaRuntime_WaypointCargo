import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import '../constants/api_constants.dart';

/// Exception thrown when an API request fails.
class ApiException implements Exception {
  final String message;
  final int? statusCode;
  final dynamic details;

  ApiException({
    required this.message,
    this.statusCode,
    this.details,
  });

  /// Extracts field-specific errors if returned in 422 details:
  /// `[ { "field": "email", "message": "..." } ]`
  Map<String, String> get fieldErrors {
    final map = <String, String>{};
    if (details is List) {
      for (final item in details) {
        if (item is Map && item['field'] != null && item['message'] != null) {
          final field = item['field'].toString();
          if (!map.containsKey(field)) {
            map[field] = item['message'].toString();
          }
        }
      }
    }
    return map;
  }

  /// Machine-readable error code the API puts in `details.code`
  /// (for example `TASK_LOCKED`), or null when it sends none.
  String? get code {
    final d = details;
    if (d is Map && d['code'] != null) return d['code'].toString();
    return null;
  }

  /// `details` as a map; empty when the API sent none (or a list of field errors).
  Map<String, dynamic> get detailsMap {
    final d = details;
    return d is Map ? Map<String, dynamic>.from(d) : const <String, dynamic>{};
  }

  /// True when the request never got an answer: no connection, DNS failure or timeout.
  bool get isNetworkError => statusCode == 0 || statusCode == 408;

  @override
  String toString() => message;
}

/// Core API service for making HTTP requests to the Waypoint Cargo backend.
class ApiService {
  final http.Client _client;
  final String _baseUrl;
  String? _authToken;

  /// Called once when an authenticated request is answered with 401 (the
  /// access token expired). It returns a fresh access token, and the request is
  /// then repeated once; or null when the session cannot be renewed.
  Future<String?> Function()? onUnauthorized;

  ApiService({
    http.Client? client,
    String? baseUrl,
    String? authToken,
    this.onUnauthorized,
  })  : _client = client ?? http.Client(),
        _baseUrl = baseUrl ?? ApiConstants.baseUrl,
        _authToken = authToken;

  void setAuthToken(String? token) {
    _authToken = token;
  }

  String? get authToken => _authToken;

  Map<String, String> get _defaultHeaders => {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Client': 'mobile',
        if (_authToken != null) 'Authorization': 'Bearer $_authToken',
      };

  Uri _buildUri(String endpoint) {
    final cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/$endpoint';
    return Uri.parse('$_baseUrl$cleanEndpoint');
  }

  /// Sends a POST request.
  Future<Map<String, dynamic>> post(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) {
    return _send(
      endpoint,
      (uri, requestHeaders) => _client.post(
        uri,
        headers: requestHeaders,
        body: body != null ? jsonEncode(body) : null,
      ),
      headers: headers,
    );
  }

  /// Sends a PATCH request.
  Future<Map<String, dynamic>> patch(
    String endpoint, {
    Map<String, dynamic>? body,
    Map<String, String>? headers,
  }) {
    return _send(
      endpoint,
      (uri, requestHeaders) => _client.patch(
        uri,
        headers: requestHeaders,
        body: body != null ? jsonEncode(body) : null,
      ),
      headers: headers,
    );
  }

  /// Sends a GET request.
  Future<Map<String, dynamic>> get(
    String endpoint, {
    Map<String, String>? headers,
  }) {
    return _send(
      endpoint,
      (uri, requestHeaders) => _client.get(uri, headers: requestHeaders),
      headers: headers,
    );
  }

  /// Sends a request and turns every failure into an [ApiException].
  Future<Map<String, dynamic>> _send(
    String endpoint,
    Future<http.Response> Function(Uri uri, Map<String, String> headers) request, {
    Map<String, String>? headers,
  }) async {
    final uri = _buildUri(endpoint);

    // Headers are rebuilt on every attempt so a renewed token is picked up.
    Future<http.Response> attempt() => request(
          uri,
          {..._defaultHeaders, ...?headers},
        ).timeout(ApiConstants.timeoutDuration);

    try {
      var response = await attempt();

      // The access token lasts minutes, not a whole shift: renew it once and
      // repeat the request. Auth endpoints are excluded (a 401 on login means
      // wrong credentials, and the renewal call itself must not recurse).
      if (response.statusCode == 401 &&
          _authToken != null &&
          onUnauthorized != null &&
          !endpoint.startsWith('/auth/')) {
        final renewedToken = await onUnauthorized!();
        if (renewedToken != null) {
          if (renewedToken != _authToken) setAuthToken(renewedToken);
          response = await attempt();
        }
      }

      return _handleResponse(response);
    } on SocketException {
      throw ApiException(
        message: 'Unable to connect to server. Please check your network connection.',
        statusCode: 0,
      );
    } on TimeoutException {
      throw ApiException(
        message: 'Connection timed out. Please try again later.',
        statusCode: 408,
      );
    } on http.ClientException catch (e) {
      throw ApiException(
        message: 'Network error: ${e.message}',
        statusCode: 0,
      );
    }
  }

  Map<String, dynamic> _handleResponse(http.Response response) {
    Map<String, dynamic> jsonBody = {};
    try {
      if (response.body.isNotEmpty) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          jsonBody = decoded;
        }
      }
    } catch (_) {
      // Body is not JSON
    }

    if (response.statusCode >= 200 && response.statusCode < 300) {
      return jsonBody;
    }

    // Handle error response from server
    String message = 'Request failed (${response.statusCode})';
    if (jsonBody.containsKey('message') && jsonBody['message'] is String) {
      message = jsonBody['message'] as String;
    }

    final details = jsonBody['details'];

    throw ApiException(
      message: message,
      statusCode: response.statusCode,
      details: details,
    );
  }
}
