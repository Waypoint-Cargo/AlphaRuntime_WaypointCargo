import 'package:flutter/material.dart';

Future<void> main() async {
  runApp(const WaypointCargoApp());
}

class WaypointCargoApp extends StatelessWidget {
  const WaypointCargoApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Waypoint Cargo',
      debugShowCheckedModeBanner: false,
      home: const Scaffold(
        body: Center(
          child: Text('Waypoint Cargo'),
        ),
      ),
    );
  }
}