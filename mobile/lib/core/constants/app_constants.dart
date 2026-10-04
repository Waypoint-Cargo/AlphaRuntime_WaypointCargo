class AppConstants {
  AppConstants._();

  static const String appName = 'Waypoint Cargo';
  static const String appVersion = '1.0.0';

  // Role values matching backend Role enum
  static const String roleLoader = 'LOADER';
  static const String roleDriver = 'DRIVER';
  static const String roleDispatcher = 'DISPATCHER';
  static const String roleStoreManager = 'STORE_MANAGER';

  // Supported country dialing codes
  static const List<String> countryCodes = ['+94', '+91', '+44'];
}
