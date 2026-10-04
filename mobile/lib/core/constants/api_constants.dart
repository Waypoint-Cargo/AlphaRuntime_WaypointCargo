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
  static const String authRefresh = '/auth/refresh';
  static const String authMe = '/auth/me';
  static const String authForgotPassword = '/auth/forgot-password';

  // Loader endpoints (a loading task is identified by its trip id)
  static const String loadingSummary = '/loading/summary';
  static const String loadingTasks = '/loading/tasks';
  static const String loadingIssues = '/loading/issues';
  static String loadingTask(String tripId) =>
      '$loadingTasks/${Uri.encodeComponent(tripId)}';
  static String loadingTaskStart(String tripId) => '${loadingTask(tripId)}/start';
  static String loadingTaskPause(String tripId) => '${loadingTask(tripId)}/pause';
  static String loadingTaskLines(String tripId) => '${loadingTask(tripId)}/lines';
  static String loadingTaskShortfall(String tripId) =>
      '${loadingTask(tripId)}/shortfall';
  static String loadingTaskSummary(String tripId) =>
      '${loadingTask(tripId)}/summary';
  static String loadingTaskComplete(String tripId) =>
      '${loadingTask(tripId)}/complete';
}
