import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;
import 'package:http/testing.dart';
import 'package:mobile/app.dart';
import 'package:mobile/core/services/api_service.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/modules/driver/screens/driver_home_screen.dart';
import 'package:mobile/modules/loader/home/screens/loader_home_screen.dart';
import 'package:mobile/modules/loader/report_issues/screens/issue_details_screen.dart';
import 'package:mobile/modules/loader/task/screens/task_screens.dart';
import 'package:mobile/providers/auth_provider.dart';
import 'package:mobile/providers/loader_provider.dart';
import 'package:mobile/routes/app_routes.dart';
import 'package:provider/provider.dart';

void main() {
  testWidgets('WaypointCargoApp starts on LoginScreen and renders logo, form, and validation', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const WaypointCargoApp());
    await tester.pumpAndSettle();

    // Verify Brand Logo Header
    expect(find.text('WAYPOINT'), findsOneWidget);
    expect(find.text('CARGO'), findsOneWidget);

    // Verify Welcome text
    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('Sign in to your Waypoint account'), findsOneWidget);

    // Verify Form Fields
    expect(find.text('Employee Number or Email'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Forgot password?'), findsOneWidget);

    // Verify Checkbox is removed
    expect(find.text('Keep me signed in for 30 days'), findsNothing);

    // Verify Action & Footer
    expect(find.text('Sign In'), findsOneWidget);
    expect(find.text('or'), findsOneWidget);
    expect(find.text("Don't have an account? "), findsOneWidget);
    expect(find.text('Create Account'), findsOneWidget);

    // Tap 'Sign In' without filling fields to verify validation triggers
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();

    expect(find.text('Please enter your employee number or email'), findsOneWidget);
    expect(find.text('Please enter your password'), findsOneWidget);
  });

  testWidgets('LoginScreen navigates to SignUpScreen on clicking Create Account and back on Sign In', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const WaypointCargoApp());
    await tester.pumpAndSettle();

    // Tap 'Create Account' link on LoginScreen
    await tester.tap(find.text('Create Account'));
    await tester.pumpAndSettle();

    // Verify SignUpScreen rendered
    expect(find.text('Create your Waypoint Cargo\naccount'), findsOneWidget);
    expect(find.text('Join our logistics network and keep deliveries moving.'), findsOneWidget);

    // Verify Form Labels & Hints
    expect(find.text('Full name'), findsOneWidget);
    expect(find.text('e.g. Tharindu Perera'), findsOneWidget);
    expect(find.text('Work email'), findsOneWidget);
    expect(find.text('you@company.com'), findsOneWidget);
    expect(find.text('Phone number'), findsOneWidget);
    expect(find.text('77 123 4567'), findsOneWidget);
    expect(find.text('+94'), findsOneWidget);
    expect(find.text('Password'), findsOneWidget);
    expect(find.text('Create a password'), findsOneWidget);
    expect(find.text('Confirm password'), findsOneWidget);
    expect(find.text('Re-enter your password'), findsOneWidget);
    expect(find.text('Role'), findsOneWidget);
    expect(find.text('Select your role'), findsOneWidget);

    // Verify Terms and Conditions & Privacy Policy text
    expect(find.text('Terms and Conditions'), findsOneWidget);
    expect(find.text('Privacy Policy'), findsOneWidget);

    // Tap 'Sign In' footer link to navigate back
    await tester.ensureVisible(find.text('Sign In'));
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();

    // Verify back on LoginScreen
    expect(find.text('Welcome back'), findsOneWidget);
  });

  testWidgets('SignUpScreen role dropdown contains Loader and Driver only', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const WaypointCargoApp());
    await tester.pumpAndSettle();

    // Navigate to SignUpScreen
    await tester.tap(find.text('Create Account'));
    await tester.pumpAndSettle();

    // Ensure role dropdown is visible and tap it
    final roleFinder = find.byType(DropdownButtonFormField<String>);
    await tester.ensureVisible(roleFinder);
    await tester.tap(roleFinder);
    await tester.pumpAndSettle();

    // Verify Loader and Driver are present, other roles are not
    expect(find.text('Loader'), findsWidgets);
    expect(find.text('Driver'), findsWidgets);
    expect(find.text('Admin'), findsNothing);
    expect(find.text('Supervisor'), findsNothing);

    // Select 'Loader'
    await tester.tap(find.text('Loader').last);
    await tester.pumpAndSettle();

    // Tap Back to Sign In
    await tester.ensureVisible(find.text('Sign In'));
    await tester.tap(find.text('Sign In'));
    await tester.pumpAndSettle();

    // Verify returned to LoginScreen
    expect(find.text('Welcome back'), findsOneWidget);
  });

  testWidgets('LoginScreen navigates to ForgotPasswordScreen and returns back to Sign In', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/auth/forgot-password')) {
        return http.Response(
          jsonEncode({
            'success': true,
            'message': 'Password reset link sent to driver@waypoint.com',
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('Not Found', 404);
    });

    final auth = AuthProvider(apiService: ApiService(client: mockClient));

    await tester.pumpWidget(WaypointCargoApp(authProvider: auth));
    await tester.pumpAndSettle();

    // Tap 'Forgot password?' on LoginScreen
    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();

    // Verify ForgotPasswordScreen rendered
    expect(find.text('Forgot your password?'), findsOneWidget);
    expect(find.text("Enter your email and we'll send you a link to reset it."), findsOneWidget);
    expect(find.text('Work email'), findsOneWidget);
    expect(find.text('you@company.com'), findsOneWidget);
    expect(find.text('Send Reset Link'), findsOneWidget);
    expect(find.text('Back to Sign In'), findsOneWidget);

    // Enter email address
    await tester.enterText(find.widgetWithText(TextFormField, 'you@company.com'), 'driver@waypoint.com');
    await tester.pumpAndSettle();

    // Tap 'Send Reset Link'
    await tester.tap(find.widgetWithText(ElevatedButton, 'Send Reset Link'));
    await tester.pumpAndSettle(const Duration(milliseconds: 600));

    // Verify Confirmation SnackBar shown
    expect(find.text('Password reset link sent to driver@waypoint.com'), findsOneWidget);

    // Wait for auto return or tap Back to Sign In
    await tester.pumpAndSettle(const Duration(seconds: 2));

    // Verify back on LoginScreen
    expect(find.text('Welcome back'), findsOneWidget);
  });

  testWidgets('Loader menu navigates to ProfileScreen with app header, nav bar, and section header', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final auth = AuthProvider();
    final loader = LoaderProvider(apiService: auth.apiService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: auth),
          ChangeNotifierProvider<LoaderProvider>.value(value: loader),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const LoaderHomeScreen(),
          routes: AppRoutes.routes,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Tap the 3-line menu icon in the AppBar
    final menuButtonFinder = find.byIcon(Icons.menu);
    expect(menuButtonFinder, findsOneWidget);
    await tester.tap(menuButtonFinder);
    await tester.pumpAndSettle();

    // Verify Popup menu with Profile and Logout
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Logout'), findsOneWidget);

    // Tap 'Profile'
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    // Verify App Header
    expect(find.text('Waypoint Cargo'), findsOneWidget);
    expect(find.text('Plan | Deliver | Stay Connected'), findsOneWidget);

    // Verify Section Header
    expect(find.text('Profile'), findsOneWidget);
    expect(find.byIcon(Icons.person_outline), findsOneWidget);

    // Verify Bottom Nav Bar
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Tasks'), findsOneWidget);
    expect(find.text('Issues'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);

    // Verify Account Details Card
    expect(find.text('Account Details'), findsOneWidget);
    expect(find.text('Full Name'), findsOneWidget);
    expect(find.text('Work Email'), findsOneWidget);
    expect(find.text('Phone Number'), findsOneWidget);
    expect(find.text('Employee ID'), findsOneWidget);
    expect(find.text('Assigned Role'), findsOneWidget);
    expect(find.text('Account Status'), findsOneWidget);
    expect(find.text('Active'), findsOneWidget);

    // Verify Preferences and Support section & Sign Out button are removed
    expect(find.text('Preferences & Support'), findsNothing);
    expect(find.text('Push Notifications'), findsNothing);
    expect(find.text('Help & Support'), findsNothing);
    expect(find.text('App Version'), findsNothing);
    expect(find.text('Sign Out'), findsNothing);

    // Tap 'Home' nav item to return to LoaderHomeScreen
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();

    // Verify returned to LoaderHomeScreen
    expect(find.byType(LoaderHomeScreen), findsOneWidget);
    expect(find.text('Account Details'), findsNothing);
  });

  testWidgets('Driver bottom navigation bar navigates to ProfileScreen on tapping Profile tab', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final auth = AuthProvider();
    final loader = LoaderProvider(apiService: auth.apiService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: auth),
          ChangeNotifierProvider<LoaderProvider>.value(value: loader),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const DriverHomeScreen(),
          routes: AppRoutes.routes,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify initially on Driver Overview
    expect(find.text("Today's Overview"), findsOneWidget);

    // Tap 'Profile' tab in bottom navigation bar
    final profileTabFinder = find.text('Profile');
    expect(profileTabFinder, findsOneWidget);
    await tester.tap(profileTabFinder);
    await tester.pumpAndSettle();

    // Verify App Header on ProfileScreen
    expect(find.text('Waypoint Cargo'), findsOneWidget);
    expect(find.text('Plan | Deliver | Stay Connected'), findsOneWidget);

    // Verify Section Header
    expect(find.text('Profile'), findsOneWidget);
    expect(find.byIcon(Icons.person_outline), findsOneWidget);

    // Verify ProfileScreen rendered
    expect(find.text("Today's Overview"), findsNothing);
    expect(find.text('Account Details'), findsOneWidget);
    expect(find.text('Preferences & Support'), findsNothing);
    expect(find.text('Sign Out'), findsNothing);

    // Tap 'Home' tab to return to Driver Overview
    await tester.tap(find.text('Home'));
    await tester.pumpAndSettle();

    expect(find.text("Today's Overview"), findsOneWidget);
    expect(find.text('Account Details'), findsNothing);
  });

  testWidgets('PendingTasksScreen menu navigates to ProfileScreen on tapping Profile', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final auth = AuthProvider();
    final loader = LoaderProvider(apiService: auth.apiService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: auth),
          ChangeNotifierProvider<LoaderProvider>.value(value: loader),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const PendingTasksScreen(),
          routes: AppRoutes.routes,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Tap the menu button in the app bar
    final menuButtonFinder = find.byIcon(Icons.menu);
    expect(menuButtonFinder, findsOneWidget);
    await tester.tap(menuButtonFinder);
    await tester.pumpAndSettle();

    // Tap 'Profile'
    expect(find.text('Profile'), findsOneWidget);
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    // Verify ProfileScreen rendered
    expect(find.text('Account Details'), findsOneWidget);
  });

  testWidgets('IssueDetailsScreen menu navigates to ProfileScreen on tapping Profile', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final auth = AuthProvider();
    final loader = LoaderProvider(apiService: auth.apiService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: auth),
          ChangeNotifierProvider<LoaderProvider>.value(value: loader),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const IssueDetailsScreen(),
          routes: AppRoutes.routes,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Tap the menu button in the app bar
    final menuButtonFinder = find.byIcon(Icons.menu);
    expect(menuButtonFinder, findsOneWidget);
    await tester.tap(menuButtonFinder);
    await tester.pumpAndSettle();

    // Tap 'Profile'
    expect(find.text('Profile'), findsOneWidget);
    await tester.tap(find.text('Profile'));
    await tester.pumpAndSettle();

    // Verify ProfileScreen rendered
    expect(find.text('Account Details'), findsOneWidget);
  });

  testWidgets('Driver bottom navigation bar switches to Settings screen with Change Password and Logout', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final auth = AuthProvider();
    final loader = LoaderProvider(apiService: auth.apiService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: auth),
          ChangeNotifierProvider<LoaderProvider>.value(value: loader),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const DriverHomeScreen(),
          routes: AppRoutes.routes,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Tap 'Settings' in bottom navigation bar
    final settingsNavFinder = find.text('Settings');
    expect(settingsNavFinder, findsOneWidget);
    await tester.tap(settingsNavFinder);
    await tester.pumpAndSettle();

    // Verify Settings Screen rendered
    expect(find.text('Account'), findsOneWidget);
    expect(find.text('Change Password'), findsOneWidget);
    expect(find.text('Preferences'), findsOneWidget);
    expect(find.text('About Waypoint Cargo'), findsOneWidget);
    expect(find.text('App Version'), findsOneWidget);

    // Profile tile is removed from settings
    expect(find.widgetWithText(ListTile, 'Profile'), findsNothing);

    // Logout button is present for driver
    expect(find.widgetWithText(OutlinedButton, 'Logout'), findsOneWidget);

    // Tap 'Change Password' tile in settings
    final changePwTileFinder = find.widgetWithText(ListTile, 'Change Password');
    expect(changePwTileFinder, findsOneWidget);
    await tester.tap(changePwTileFinder);
    await tester.pumpAndSettle();

    // Verify navigated to ForgotPasswordScreen
    expect(find.text('Forgot your password?'), findsOneWidget);
  });

  testWidgets('Loader bottom navigation bar opens Settings screen without Profile tile and without Logout button', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final auth = AuthProvider();
    final loader = LoaderProvider(apiService: auth.apiService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: auth),
          ChangeNotifierProvider<LoaderProvider>.value(value: loader),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const LoaderHomeScreen(),
          routes: AppRoutes.routes,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Tap 'Settings' in bottom navigation bar
    final settingsNavFinder = find.text('Settings');
    expect(settingsNavFinder, findsOneWidget);
    await tester.tap(settingsNavFinder);
    await tester.pumpAndSettle();

    // Verify Settings Screen rendered
    expect(find.text('Account'), findsOneWidget);
    expect(find.text('Change Password'), findsOneWidget);

    // Profile tile is removed from settings
    expect(find.widgetWithText(ListTile, 'Profile'), findsNothing);

    // Logout button is NOT present for loader (loader logs out via top menu)
    expect(find.widgetWithText(OutlinedButton, 'Logout'), findsNothing);

    // Tap 'Change Password' tile in settings
    final changePwTileFinder = find.widgetWithText(ListTile, 'Change Password');
    expect(changePwTileFinder, findsOneWidget);
    await tester.tap(changePwTileFinder);
    await tester.pumpAndSettle();

    // Verify navigated to ForgotPasswordScreen
    expect(find.text('Forgot your password?'), findsOneWidget);
  });

  testWidgets('ForgotPasswordScreen displays error message on API failure', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/auth/forgot-password')) {
        return http.Response(
          jsonEncode({
            'success': false,
            'message': 'No account found with this email address.',
          }),
          404,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('Not Found', 404);
    });

    final auth = AuthProvider(apiService: ApiService(client: mockClient));

    await tester.pumpWidget(WaypointCargoApp(authProvider: auth));
    await tester.pumpAndSettle();

    // Navigate to ForgotPasswordScreen
    await tester.tap(find.text('Forgot password?'));
    await tester.pumpAndSettle();

    // Enter email address
    await tester.enterText(find.widgetWithText(TextFormField, 'you@company.com'), 'unknown@waypoint.com');
    await tester.pumpAndSettle();

    // Tap 'Send Reset Link'
    await tester.tap(find.widgetWithText(ElevatedButton, 'Send Reset Link'));
    await tester.pumpAndSettle();

    // Verify Error SnackBar is displayed
    expect(find.text('No account found with this email address.'), findsOneWidget);
  });

  testWidgets("LoaderHomeScreen renders Today's Overview header with Pending Loads, Issues, Items to Load, and Departures cards", (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    final mockClient = MockClient((request) async {
      if (request.url.path.endsWith('/loading/summary')) {
        return http.Response(
          jsonEncode({
            'success': true,
            'data': {
              'pendingLoads': 5,
              'openIssues': 2,
              'itemsToLoad': 248,
              'departures': 3,
              'nextStep': {
                'title': 'Start Loading',
                'message': 'Truck ready for loading',
                'isResume': false,
                'isAllClear': false,
              }
            }
          }),
          200,
          headers: {'content-type': 'application/json'},
        );
      }
      return http.Response('Not Found', 404);
    });

    final auth = AuthProvider(apiService: ApiService(client: mockClient));
    final loader = LoaderProvider(apiService: auth.apiService);

    await tester.pumpWidget(
      MultiProvider(
        providers: [
          ChangeNotifierProvider<AuthProvider>.value(value: auth),
          ChangeNotifierProvider<LoaderProvider>.value(value: loader),
        ],
        child: MaterialApp(
          theme: AppTheme.lightTheme,
          home: const LoaderHomeScreen(),
          routes: AppRoutes.routes,
        ),
      ),
    );
    await tester.pumpAndSettle();

    // Verify "Today's Overview" section title
    expect(find.text("Today's Overview"), findsOneWidget);
    expect(find.text('Today at a glance'), findsNothing);

    // Verify cards are rendered with their labels and values
    expect(find.text('Pending Loads'), findsOneWidget);
    expect(find.text('5'), findsOneWidget);
    expect(find.text('Issues'), findsNWidgets(2)); // Card header + Bottom nav label
    expect(find.text('2'), findsOneWidget);
    expect(find.text('Items to Load'), findsOneWidget);
    expect(find.text('248'), findsOneWidget);
    expect(find.text('Departures'), findsOneWidget);
    expect(find.text('3'), findsOneWidget);
  });
}






