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

  factory AuthProvider({AuthService? authService, ApiService? apiService}) {
    final service = authService ?? AuthService(apiService: apiService ?? ApiService());
    return AuthProvider._(service);
  }

  AuthProvider._(this._authService) : _apiService = _authService.apiService;

  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  Map<String, String> get fieldErrors => _fieldErrors;
  User? get currentUser => _currentUser;
  String? get accessToken => _accessToken;
  String? get refreshToken => _refreshToken;
  bool get isAuthenticated => _currentUser != null && _accessToken != null;
  LoginResponse? get lastLoginResponse => _lastLoginResponse;
  RegisterResponse? get lastRegisterResponse => _lastRegisterResponse;

  /// Clears any cached error messages.
  void clearErrors() {
    _errorMessage = null;
    _fieldErrors = {};
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
