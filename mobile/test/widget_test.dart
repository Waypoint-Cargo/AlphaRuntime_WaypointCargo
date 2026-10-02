// This is a basic Flutter widget test.
//
// To perform an interaction with a widget in your test, use the WidgetTester
// utility in the flutter_test package. For example, you can send tap and scroll
// gestures. You can also use WidgetTester to find child widgets in the widget
// tree, read text, and verify that the values of widget properties are correct.

import 'package:flutter_test/flutter_test.dart';
import 'package:mobile/app.dart';

void main() {
  testWidgets('driver home is the default screen', (WidgetTester tester) async {
    await tester.pumpWidget(const WaypointCargoApp());

    expect(find.text("Today's Overview"), findsOneWidget);
    expect(find.text('Continue Delivery'), findsOneWidget);
    expect(find.text('Next Stop'), findsOneWidget);
    expect(find.text('Home'), findsOneWidget);
    expect(find.text('Issues'), findsOneWidget);
    expect(find.text('Profile'), findsOneWidget);
    expect(find.text('Settings'), findsOneWidget);
  });
}
