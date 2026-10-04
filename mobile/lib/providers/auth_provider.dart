import 'package:flutter/foundation.dart';
import '../core/services/api_service.dart';
import '../core/services/auth_service.dart';
import '../models/user.dart';

/// Provider for managing authentication state and actions.
class AuthProvider extends ChangeNotifier {
  final AuthService _authService;
  final ApiService _apiService;

  bool _isLoading = false;
  String? _errorMessage;
  Map<String, String> _fieldErrors = {};
  User? _currentUser;
  String? _accessToken;
  String? _refreshToken;
  LoginResponse? _lastLoginResponse;
  RegisterResponse? _lastRegisterResponse;
  String? _lastForgotPasswordMessage;
  Future<String?>? _refreshInFlight;
  bool _sessionExpired = false;

  factory AuthProvider({AuthService? authService, ApiService? apiService}) {
    final service = authService ?? AuthService(apiService: apiService ?? ApiService());
    return AuthProvider._(service);
  }

  AuthProvider._(this._authService) : _apiService = _authService.apiService {
    // Lets the API client renew an expired access token without bothering the user.
    _apiService.onUnauthorized = _renewAccessToken;
  }

  /// The API client carrying this session's token, shared with other providers.
  ApiService get apiService => _apiService;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  Map<String, String> get fieldErrors => _fieldErrors;
  User? get currentUser => _currentUser;
  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  bool get isAuthenticated => _currentUser != null && _accessToken != null;
  LoginResponse? get lastLoginResponse => _lastLoginResponse;
  RegisterResponse? get lastRegisterResponse => _lastRegisterResponse;
  String? get lastForgotPasswordMessage => _lastForgotPasswordMessage;

  /// Whether the session ended without the user asking (the server refused to
  /// renew it). Reading it resets it, so the app reacts exactly once.
  bool takeSessionExpired() {
    final expired = _sessionExpired;
    _sessionExpired = false;
    return expired;
  }

  /// Clears any cached error messages.
  void clearErrors() {
    _errorMessage = null;
    _fieldErrors = {};
    _lastForgotPasswordMessage = null;
    notifyListeners();
  }

  /// Logs in a user using employee number or email and password.
  ///
  /// Calls the actual backend API at `POST /api/auth/login`.
  /// Returns `true` on success, or `false` on failure.
  Future<bool> login({
    required String identifier,
    required String password,
    String? deviceId,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    _fieldErrors = {};
    notifyListeners();

    try {
      final request = LoginRequest(
        identifier: identifier,
        password: password,
        deviceId: deviceId,
      );

      final response = await _authService.login(request);
      _lastLoginResponse = response;
      _sessionExpired = false;
      _currentUser = response.user;
      _accessToken = response.accessToken;
      _refreshToken = response.refreshToken;
      _apiService.setAuthToken(response.accessToken);
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _isLoading = false;
      _errorMessage = e.message;
      _fieldErrors = e.fieldErrors;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'An unexpected error occurred. Please try again.';
      _fieldErrors = {};
      notifyListeners();
      return false;
    }
  }

  /// Registers a new user account through [AuthService].
  ///
  /// Calls the actual backend API at `POST /api/auth/register`.
  /// Returns `true` on success, or `false` on failure.
  Future<bool> register({
    required String fullName,
    required String email,
    required String phone,
    required String password,
    required String role,
  }) async {
    _isLoading = true;
    _errorMessage = null;
    _fieldErrors = {};
    notifyListeners();

    try {
      final request = RegisterRequest(
        fullName: fullName,
        email: email,
        phone: phone,
        password: password,
        role: role,
      );

      final response = await _authService.register(request);
      _lastRegisterResponse = response;
      _isLoading = false;
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _isLoading = false;
      _errorMessage = e.message;
      _fieldErrors = e.fieldErrors;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'An unexpected error occurred. Please try again.';
      _fieldErrors = {};
      notifyListeners();
      return false;
    }
  }

  /// Sends a password reset link to the given email address.
  ///
  /// Calls `POST /api/auth/forgot-password`.
  /// Returns `true` on success, or `false` on failure.
  Future<bool> forgotPassword({required String email}) async {
    _isLoading = true;
    _errorMessage = null;
    _fieldErrors = {};
    _lastForgotPasswordMessage = null;
    notifyListeners();

    try {
      final response = await _authService.forgotPassword(email: email);
      _isLoading = false;
      _lastForgotPasswordMessage = response['message'] as String? ??
          'Password reset link sent to $email';
      notifyListeners();
      return true;
    } on ApiException catch (e) {
      _isLoading = false;
      _errorMessage = e.message;
      _fieldErrors = e.fieldErrors;
      notifyListeners();
      return false;
    } catch (e) {
      _isLoading = false;
      _errorMessage = 'An unexpected error occurred. Please try again.';
      _fieldErrors = {};
      notifyListeners();
      return false;
    }
  }

  /// Renews the access token with the refresh token.
  ///
  /// Callers that hit 401 at the same moment share one request: a refresh
  /// token works once, so a second parallel refresh would look like token
  /// theft to the server and end the whole session.
  Future<String?> _renewAccessToken() {
    return _refreshInFlight ??=
        _refreshTokens().whenComplete(() => _refreshInFlight = null);
  }

  Future<String?> _refreshTokens() async {
    final refreshToken = _refreshToken;
    if (refreshToken == null) return null;

    try {
      final tokens = await _authService.refresh(refreshToken: refreshToken);
      _accessToken = tokens.accessToken;
      _refreshToken = tokens.refreshToken;
      _apiService.setAuthToken(tokens.accessToken);
      return tokens.accessToken;
    } on ApiException catch (e) {
      // 401/403 means the server will not renew this session any more
      // (revoked, expired, account suspended). Being offline proves nothing,
      // so a network failure keeps the session and the caller can retry later.
      if (e.statusCode == 401 || e.statusCode == 403) {
        _currentUser = null;
        _accessToken = null;
        _refreshToken = null;
        _apiService.setAuthToken(null);
        _sessionExpired = true;
        notifyListeners();
      }
      return null;
    }
  }

  /// Fetches the latest authenticated user profile from the backend.
  Future<User?> fetchProfile() async {
    if (_accessToken == null) return _currentUser;
    try {
      final user = await _authService.getProfile();
      _currentUser = user;
      notifyListeners();
      return user;
    } catch (_) {
      return _currentUser;
    }
  }

  /// Ends the current server session and clears local authentication state.
  Future<void> logout() async {
    final refreshToken = _refreshToken;

    try {
      if (refreshToken != null && _accessToken != null) {
        await _authService.logout(refreshToken: refreshToken);
      }
    } catch (_) {
      // Local logout must still complete when the server is unreachable.
    } finally {
      _currentUser = null;
      _accessToken = null;
      _refreshToken = null;
      _apiService.setAuthToken(null);
      notifyListeners();
    }
  }
}
