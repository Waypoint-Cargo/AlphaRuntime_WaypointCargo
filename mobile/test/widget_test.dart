import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app.dart';
import 'package:mobile/core/theme/app_theme.dart';
import 'package:mobile/modules/loader/home/screens/loader_home_screen.dart';
import 'package:mobile/routes/app_routes.dart';

void main() {
  testWidgets('LoaderHomeScreen renders brand, bottom nav with Settings, and key metrics', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const LoaderHomeScreen(),
        routes: AppRoutes.routes,
      ),
    );
    await tester.pumpAndSettle();

    // Verify AppBar branding
    expect(find.text('Waypoint Cargo'), findsOneWidget);
    expect(find.text('Plan | Deliver | Stay Connected'), findsOneWidget);

    // Verify sections
    expect(find.text('Today at a glance'), findsOneWidget);
    expect(find.text("Today's Overview"), findsOneWidget);
    expect(find.text('Your next step'), findsOneWidget);

    // Verify bottom nav items: Home, Tasks, Issues, Settings (No Verify)
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Tasks'), findsOneWidget);
    expect(find.text('Issues'), findsNWidgets(2)); // Card label + bottom nav
    expect(find.text('Settings'), findsOneWidget);
    expect(find.text('Verify'), findsNothing);

    // Verify key metrics
    expect(find.text('Pending Loads'), findsOneWidget);
    expect(find.text('Ready'), findsOneWidget);
    expect(find.text('Items to load'), findsOneWidget);
    expect(find.text('Est. load time'), findsOneWidget);
    expect(find.text('Departures'), findsOneWidget);
    expect(find.text('On-time target'), findsOneWidget);
  });

  testWidgets('Tapping View Tasks navigates to Tasks screen with toggle tabs and 3 brands', (WidgetTester tester) async {
    // Use standard mobile viewport size
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const LoaderHomeScreen(),
        routes: AppRoutes.routes,
      ),
    );
    await tester.pumpAndSettle();

    final viewTasksFinder = find.text('View Tasks');
    await tester.ensureVisible(viewTasksFinder);
    await tester.pumpAndSettle();

    // Tap the 'View Tasks' button
    await tester.tap(viewTasksFinder);
    await tester.pumpAndSettle();

    // Verify Tasks screen header banner and toggle tabs (header remains 'Tasks')
    expect(find.text('Tasks'), findsWidgets);
    expect(find.text('Pending Tasks'), findsNothing);
    expect(find.text('Pending'), findsOneWidget);
    expect(find.text('Completed'), findsOneWidget);
    expect(find.text('Brand'), findsOneWidget);

    // Verify pending routes
    expect(find.text('R-005'), findsOneWidget);
    expect(find.text('R-006'), findsOneWidget);
    expect(find.text('R-007'), findsOneWidget);
    expect(find.text('FRESH'), findsOneWidget);
    expect(find.text('STYLE'), findsOneWidget);
    expect(find.text('TECH'), findsWidgets);
    expect(find.text('Open Task'), findsWidgets);

    // Tap 'Completed' toggle tab
    await tester.tap(find.text('Completed'));
    await tester.pumpAndSettle();

    // Verify header remains 'Tasks' (not changed to 'Completed Tasks')
    expect(find.text('Tasks'), findsWidgets);
    expect(find.text('Completed Tasks'), findsNothing);
    expect(find.text('R-001'), findsOneWidget);
    expect(find.text('R-002'), findsOneWidget);
    expect(find.text('R-003'), findsOneWidget);
    expect(find.text('View Task'), findsWidgets);
  });

  testWidgets('Tapping Open Task navigates to StartLoadingScreen', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const LoaderHomeScreen(),
        routes: AppRoutes.routes,
      ),
    );
    await tester.pumpAndSettle();

    // Navigate to tasks
    final viewTasksFinder = find.text('View Tasks');
    await tester.ensureVisible(viewTasksFinder);
    await tester.tap(viewTasksFinder);
    await tester.pumpAndSettle();

    // Tap the first 'Open Task' button for R-005
    final openTaskFinder = find.text('Open Task').first;
    await tester.tap(openTaskFinder);
    await tester.pumpAndSettle();

    // Verify Start Loading AppBar (No 3 dots)
    expect(find.text('Start Loading'), findsOneWidget);
    expect(find.text('R-005'), findsWidgets);
    expect(find.byIcon(Icons.qr_code_scanner_rounded), findsNothing);
    expect(find.byIcon(Icons.more_vert), findsNothing);

    // Verify Route metadata columns
    expect(find.text('In Progress'), findsNothing);
    expect(find.text('Started at 06:20 AM'), findsNothing);
    expect(find.text('Route'), findsOneWidget);
    expect(find.text('Vehicle'), findsOneWidget);
    expect(find.text('Priority'), findsOneWidget);
    expect(find.text('Brand'), findsOneWidget);

    // Verify summary stats card
    expect(find.text('TOTAL ITEMS'), findsOneWidget);
    expect(find.text('LOADED ITEMS'), findsOneWidget);
    expect(find.text('REMAINING ITEMS'), findsOneWidget);
    expect(find.text('LOADING PROGRESS'), findsOneWidget);

    // Verify outlet headers are present and items are collapsed by default
    expect(find.text('Outlet / Order'), findsNothing);
    expect(find.text('Retail Store #1023'), findsOneWidget);
    expect(find.text('Order #ORD-1023'), findsOneWidget);
    expect(find.text('Fresh Bananas'), findsNothing); // Collapsed by default

    // Tap outlet header to expand and show items
    await tester.tap(find.text('Retail Store #1023'));
    await tester.pumpAndSettle();

    // Now items are visible
    expect(find.text('Fresh Bananas'), findsOneWidget);
    expect(find.text('Whole Milk 1L'), findsOneWidget);
    expect(find.text('ITEM CODE'), findsOneWidget);
    expect(find.text('QTY TO LOAD'), findsOneWidget);

    // Verify bottom action buttons including Report Shortfall
    expect(find.text('Report Shortfall'), findsOneWidget);
    expect(find.text('Pause Loading'), findsOneWidget);
    expect(find.text('Review & Complete'), findsOneWidget);

    // Tap 'Review & Complete' to navigate to VerifyLoadingScreen
    final reviewFinder = find.text('Review & Complete');
    await tester.ensureVisible(reviewFinder);
    await tester.tap(reviewFinder);
    await tester.pumpAndSettle();

    // Verify 'Loading Completed' screen elements
    expect(find.text('Loading Completed'), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back), findsOneWidget);
    expect(find.byIcon(Icons.more_vert), findsNothing);
    expect(find.text('All items have been loaded successfully!'), findsOneWidget);
    expect(find.text('You can now proceed to the next task.'), findsOneWidget);
    expect(find.text('Loading Summary'), findsOneWidget);
    expect(find.text('Great job!'), findsNothing);
    expect(find.text('Outlet Summary'), findsOneWidget);
    expect(find.text("What's next?"), findsNothing);
    expect(find.text('Back to Tasks'), findsNothing);
    expect(find.text('View Task Details'), findsOneWidget);
    expect(find.text('Pick Another Task'), findsOneWidget);

    // Tap 'View Task Details' to navigate to TaskDetailsScreen
    await tester.tap(find.text('View Task Details'));
    await tester.pumpAndSettle();

    // Verify TaskDetailsScreen elements
    expect(find.text('Task Details'), findsOneWidget);
    expect(find.text('R-005'), findsOneWidget);
    expect(find.text('Verified & Loaded'), findsOneWidget);
    expect(find.text('Vehicle'), findsOneWidget);
    expect(find.text('Departure'), findsOneWidget);
    expect(find.text('Priority'), findsOneWidget);
    expect(find.text('Total Items'), findsOneWidget);
    expect(find.text('Loaded Items'), findsOneWidget);
    expect(find.text('Outlets'), findsOneWidget);
    expect(find.text('Delivery Manifest'), findsOneWidget);
    expect(find.text('Retail Store #1023'), findsOneWidget);
    expect(find.text('Order #ORD-1023'), findsOneWidget);
    expect(find.text('Special Handling & Security'), findsNothing);
    expect(find.text('Return to Tasks'), findsOneWidget);
  });

  testWidgets('Tapping Report Shortfall navigates to ReportLoadingIssueScreen with InnerSectionHeader and all form sections', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const LoaderHomeScreen(),
        routes: AppRoutes.routes,
      ),
    );
    await tester.pumpAndSettle();

    // Navigate to tasks
    final viewTasksFinder = find.text('View Tasks');
    await tester.ensureVisible(viewTasksFinder);
    await tester.tap(viewTasksFinder);
    await tester.pumpAndSettle();

    // Tap the first 'Open Task' button for R-005
    final openTaskFinder = find.text('Open Task').first;
    await tester.tap(openTaskFinder);
    await tester.pumpAndSettle();

    // Ensure Report Shortfall button is visible and tap it
    final reportShortfallFinder = find.text('Report Shortfall');
    await tester.ensureVisible(reportShortfallFinder);
    await tester.tap(reportShortfallFinder);
    await tester.pumpAndSettle();

    // Verify InnerSectionHeader on Report Loading Issue screen
    expect(find.text('Report an Issue'), findsOneWidget);
    expect(find.byIcon(Icons.arrow_back), findsOneWidget);
    expect(find.byIcon(Icons.more_vert), findsNothing);

    // Verify Issue Category Selector
    expect(find.text('Select Issue'), findsOneWidget);
    expect(find.text('Missing Items'), findsOneWidget);
    expect(find.text('Damaged Items'), findsOneWidget);
    expect(find.text('Wrong Items'), findsOneWidget);
    expect(find.text('Quantity Short'), findsOneWidget);
    expect(find.text('Vehicle Problem'), findsOneWidget);
    expect(find.text('Other'), findsOneWidget);

    // Verify Form Fields
    expect(find.text('Order/route'), findsOneWidget);
    expect(find.text('Item'), findsOneWidget);
    expect(find.text('Planned quantity'), findsOneWidget);
    expect(find.text('Actual quantity'), findsOneWidget);
    expect(find.text('Description'), findsOneWidget);
    expect(find.text('Optional Photo'), findsOneWidget);
    expect(find.text('Tap to add photo'), findsOneWidget);

    // Verify Bottom Report Issue Button
    expect(find.text('Report Issue'), findsOneWidget);

    // Test interacting with an issue card
    await tester.tap(find.text('Quantity Short'));
    await tester.pumpAndSettle();

    // Test tapping Report Issue button (scrolled into view)
    final reportIssueButtonFinder = find.text('Report Issue');
    await tester.ensureVisible(reportIssueButtonFinder);
    await tester.tap(reportIssueButtonFinder);
    await tester.pumpAndSettle();

    // Verify Dialog pops up
    expect(find.text('Issue Reported'), findsOneWidget);
    await tester.tap(find.text('OK'));
    await tester.pumpAndSettle();

    // Verify returned to Start Loading Screen
    expect(find.text('Start Loading'), findsOneWidget);
  });

  testWidgets('Tapping Issues nav bar icon navigates to IssueDetailsScreen with SectionHeader, list, and Report button', (WidgetTester tester) async {
    tester.view.physicalSize = const Size(1080, 2400);
    tester.view.devicePixelRatio = 2.0;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(
      MaterialApp(
        theme: AppTheme.lightTheme,
        home: const LoaderHomeScreen(),
        routes: AppRoutes.routes,
      ),
    );
    await tester.pumpAndSettle();

    // Tap the 'Issues' item in bottom navbar
    final issuesNavFinder = find.byIcon(Icons.warning_amber_rounded).first;
    await tester.tap(issuesNavFinder);
    await tester.pumpAndSettle();

    // Verify App Header & SectionHeader
    expect(find.text('Waypoint Cargo'), findsOneWidget);
    expect(find.text('Reported Issues'), findsOneWidget);

    // Verify Top Action Card
    expect(find.text('Found a Loading Issue?'), findsOneWidget);
    expect(find.text('Report'), findsOneWidget);

    // Verify Segmented Toggle Tabs [Pending (2)] | [Resolved (1)] (No 'All' toggle)
    expect(find.text('All (3)'), findsNothing);
    expect(find.text('Pending (2)'), findsOneWidget);
    expect(find.text('Resolved (1)'), findsOneWidget);

    // Verify Issue List Cards (No outlet name, time, or status badge in card)
    expect(find.text('ISS-1021'), findsOneWidget);
    expect(find.text('ISS-1022'), findsOneWidget);
    expect(find.text('ORD-1023 / R-005'), findsOneWidget);
    expect(find.textContaining('Retail Store #1023'), findsNothing); // Outlet name removed from card
    expect(find.text('12 mins ago'), findsNothing); // Time removed from card
    expect(find.textContaining('Fresh Bananas'), findsOneWidget);
    expect(find.textContaining('Organic Bananas'), findsOneWidget);

    // Tap 'Resolved (1)' toggle button
    await tester.tap(find.text('Resolved (1)'));
    await tester.pumpAndSettle();

    expect(find.text('ISS-1019'), findsOneWidget);
    expect(find.textContaining('Greek Yogurt 400g'), findsOneWidget);
    expect(find.text('ISS-1021'), findsNothing);

    // Tap 'Report' button in top action card
    await tester.tap(find.text('Report'));
    await tester.pumpAndSettle();

    // Verify navigated to ReportLoadingIssueScreen
    expect(find.text('Report an Issue'), findsOneWidget);
    expect(find.text('Select Issue'), findsOneWidget);
  });

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

    await tester.pumpWidget(const WaypointCargoApp());
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
}





