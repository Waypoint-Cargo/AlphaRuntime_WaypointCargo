import 'package:flutter/material.dart';
import 'core/theme/app_theme.dart';
import 'modules/loader/home/screens/loader_home_screen.dart';
import 'routes/app_routes.dart';

class WaypointCargoApp extends StatelessWidget {
  const WaypointCargoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Waypoint Cargo',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const LoaderHomeScreen(),
      routes: AppRoutes.routes,
    );
  }
}
