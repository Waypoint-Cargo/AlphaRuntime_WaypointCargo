import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'modules/auth/screens/login_screen.dart';
import 'providers/auth_provider.dart';
import 'routes/app_routes.dart';

class WaypointCargoApp extends StatelessWidget {
  final AuthProvider? authProvider;

  const WaypointCargoApp({super.key, this.authProvider});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider<AuthProvider>(
      create: (_) => authProvider ?? AuthProvider(),
      lazy: false,
      child: MaterialApp(
        title: 'Waypoint Cargo',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        home: const LoginScreen(),
        routes: AppRoutes.routes,
      ),
    );
  }
}
