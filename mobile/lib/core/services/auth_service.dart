import '../constants/api_constants.dart';
import '../../models/user.dart';
import 'api_service.dart';

/// Request payload for user registration.
class RegisterRequest {
  final String fullName;
  final String email;
  final String? phone;
  final String password;
  final String role;

  RegisterRequest({
    required this.fullName,
    required this.email,
    this.phone,
    required this.password,
    required this.role,
  });

  Map<String, dynamic> toJson() {
    return {
      'fullName': fullName,
      'email': email,
      if (phone != null && phone!.isNotEmpty) 'phone': phone,
      'password': password,
      'role': role,
    };
  }
}

/// Response returned from the registration endpoint.
class RegisterResponse {
  final bool success;
  final String message;
  final User? user;

  RegisterResponse({
    required this.success,
    required this.message,
    this.user,
  });

  factory RegisterResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>?;
    final userData = data != null ? data['user'] as Map<String, dynamic>? : null;
    return RegisterResponse(
      success: json['success'] as bool? ?? true,
      message: json['message'] as String? ??
          'Registration received. An administrator must approve your account before you can sign in.',
      user: userData != null ? User.fromJson(userData) : null,
    );
  }
}

/// Request payload for user login.
class LoginRequest {
  final String identifier;
  final String password;
  final String? deviceId;

  LoginRequest({
    required this.identifier,
    required this.password,
    this.deviceId,
  });

  Map<String, dynamic> toJson() {
    return {
      'identifier': identifier.trim(),
      'password': password,
      if (deviceId != null && deviceId!.isNotEmpty) 'deviceId': deviceId,
    };
  }
}

/// Response returned from the login endpoint.
class LoginResponse {
  final bool success;
  final String message;
  final String? accessToken;
  final String? refreshToken;
  final User? user;

  LoginResponse({
    required this.success,
    required this.message,
    this.accessToken,
    this.refreshToken,
    this.user,
  });

  factory LoginResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>?;
    final userData = data != null ? data['user'] as Map<String, dynamic>? : null;
    return LoginResponse(
      success: json['success'] as bool? ?? true,
      message: json['message'] as String? ?? 'Login successful',
      accessToken: data != null ? data['accessToken'] as String? : null,
      refreshToken: data != null ? data['refreshToken'] as String? : null,
      user: userData != null ? User.fromJson(userData) : null,
    );
  }
}

/// Response returned from the refresh endpoint: a new token pair.
class RefreshResponse {
  final String accessToken;
  final String refreshToken;

  RefreshResponse({
    required this.accessToken,
    required this.refreshToken,
  });

  factory RefreshResponse.fromJson(Map<String, dynamic> json) {
    final data = json['data'] as Map<String, dynamic>?;
    return RefreshResponse(
      accessToken: data?['accessToken'] as String? ?? '',
      refreshToken: data?['refreshToken'] as String? ?? '',
    );
  }
}

/// Authentication service for the mobile application.
class AuthService {
  final ApiService _apiService;

  AuthService({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  ApiService get apiService => _apiService;

  /// Logs in a user using employee number or email and password.
  ///
  /// Sends payload to `POST /api/auth/login`.
  /// Throws [ApiException] on error (such as 401 Unauthorized, 403 Forbidden, 429 Locked).
  Future<LoginResponse> login(LoginRequest request) async {
    final response = await _apiService.post(
      ApiConstants.authLogin,
      body: request.toJson(),
    );
    return LoginResponse.fromJson(response);
  }

  /// Logs out the current mobile session.
  ///
  /// Sends the refresh token in the request body and the access token is
  /// attached by [ApiService] as a Bearer token.
  Future<void> logout({
    required String refreshToken,
  }) async {
    await _apiService.post(
      ApiConstants.authLogout,
      body: {'refreshToken': refreshToken},
    );
  }

  /// Exchanges the refresh token for a new access + refresh token pair.
  ///
  /// Sends the refresh token in the body to `POST /api/auth/refresh` (the
  /// mobile flow; browsers use a cookie instead). Each refresh token works once.
  /// Throws [ApiException] when the server refuses it (revoked or expired).
  Future<RefreshResponse> refresh({required String refreshToken}) async {
    final response = await _apiService.post(
      ApiConstants.authRefresh,
      body: {'refreshToken': refreshToken},
    );
    final tokens = RefreshResponse.fromJson(response);
    if (tokens.accessToken.isEmpty || tokens.refreshToken.isEmpty) {
      throw ApiException(
        message: 'The server sent an unexpected response.',
        statusCode: 502,
      );
    }
    return tokens;
  }

  /// Registers a new employee account (e.g. Loader or Driver).
  ///
  /// Sends actual registration payload to `POST /api/auth/register`.
  /// Throws [ApiException] on error (such as 409 Conflict or 422 Validation error).
  Future<RegisterResponse> register(RegisterRequest request) async {
    final response = await _apiService.post(
      ApiConstants.authRegister,
      body: request.toJson(),
    );
    return RegisterResponse.fromJson(response);
  }

  /// Fetches the currently authenticated user profile from `GET /api/auth/me`.
  Future<User> getProfile() async {
    final response = await _apiService.get(ApiConstants.authMe);
    final data = response['data'] as Map<String, dynamic>?;
    final userData = data != null
        ? (data['user'] as Map<String, dynamic>? ?? data)
        : (response['user'] as Map<String, dynamic>? ?? response);
    return User.fromJson(userData);
  }

  /// Requests a password reset link for the given email via `POST /api/auth/forgot-password`.
  Future<Map<String, dynamic>> forgotPassword({required String email}) async {
    final response = await _apiService.post(
      ApiConstants.authForgotPassword,
      body: {'email': email.trim()},
    );
    return response;
  }
}
