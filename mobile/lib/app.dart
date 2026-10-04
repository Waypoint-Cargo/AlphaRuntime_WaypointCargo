import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'core/theme/app_theme.dart';
import 'modules/auth/screens/login_screen.dart';
import 'providers/auth_provider.dart';
import 'providers/loader_provider.dart';
import 'routes/app_routes.dart';
import 'routes/route_guard.dart';

class WaypointCargoApp extends StatefulWidget {
  final AuthProvider? authProvider;
  final LoaderProvider? loaderProvider;

  const WaypointCargoApp({super.key, this.authProvider, this.loaderProvider});

  @override
  State<WaypointCargoApp> createState() => _WaypointCargoAppState();
}

class _WaypointCargoAppState extends State<WaypointCargoApp> {
  final _navigatorKey = GlobalKey<NavigatorState>();
  final _messengerKey = GlobalKey<ScaffoldMessengerState>();

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider<AuthProvider>(
          create: (_) => widget.authProvider ?? AuthProvider(),
          lazy: false,
        ),
        // The loader screens call the API through the same client as the auth
        // provider, so they carry its token; they start afresh whenever a
        // different user signs in.
        ChangeNotifierProxyProvider<AuthProvider, LoaderProvider>(
          create: (context) =>
              widget.loaderProvider ??
              LoaderProvider(apiService: context.read<AuthProvider>().apiService),
          update: (context, auth, loader) {
            loader!.bindUser(auth.currentUser?.id);
            return loader;
          },
        ),
      ],
      child: SessionGuard(
        navigatorKey: _navigatorKey,
        messengerKey: _messengerKey,
        child: MaterialApp(
          title: 'Waypoint Cargo',
          debugShowCheckedModeBanner: false,
          navigatorKey: _navigatorKey,
          scaffoldMessengerKey: _messengerKey,
          theme: AppTheme.lightTheme,
          home: const LoginScreen(),
          routes: AppRoutes.routes,
        ),
      ),
    );
  }
}
