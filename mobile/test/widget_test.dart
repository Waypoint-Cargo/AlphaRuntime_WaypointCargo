import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app.dart';

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
