import 'package:flutter_dotenv/flutter_dotenv.dart';

class ApiConstants {
  ApiConstants._();

  /// Backend API Base URL loaded directly from .env
  static String get baseUrl => dotenv.isInitialized
      ? dotenv.get('API_BASE_URL', fallback: 'http://10.0.2.2:8000/api')
      : 'http://10.0.2.2:8000/api';

  // Request timeout
  static const Duration timeoutDuration = Duration(seconds: 15);

  // Authentication endpoints
  static const String authRegister = '/auth/register';
  static const String authLogin = '/auth/login';
  static const String authLogout = '/auth/logout';
}
