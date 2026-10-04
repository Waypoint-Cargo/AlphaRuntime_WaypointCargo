import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class AuthBrandHeader extends StatelessWidget {
  const AuthBrandHeader({super.key});

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.center,
      children: [
        // Waypoint Icon
        SizedBox(
          width: 48,
          height: 48,
          child: Image.asset(
            'assets/images/logo.png',
            fit: BoxFit.contain,
            errorBuilder: (context, error, stackTrace) => const Icon(
              Icons.share_location_rounded,
              color: AppColors.white,
              size: 44,
            ),
          ),
        ),
        const SizedBox(width: 12),
        // Waypoint Group Text
        Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: const [
            Text(
              'WAYPOINT',
              style: TextStyle(
                color: AppColors.white,
                fontSize: 22,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.5,
              ),
            ),
            Text(
              'CARGO',
              style: TextStyle(
                color: Color(0xFFF2BE32),
                fontSize: 11,
                fontWeight: FontWeight.w700,
                letterSpacing: 4.0,
              ),
            ),
          ],
        ),
      ],
    );
  }
}
