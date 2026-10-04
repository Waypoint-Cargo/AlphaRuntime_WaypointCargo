import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_text_style.dart';

class DriverMapPlaceholder extends StatelessWidget {
  final String destination;
  final String eta;
  final String distance;

  /// What the second chip is called ('Distance' by default).
  final String distanceLabel;

  const DriverMapPlaceholder({
    super.key,
    required this.destination,
    required this.eta,
    required this.distance,
    this.distanceLabel = 'Distance',
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 360,
      width: double.infinity,
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: const Color(0xFFE8ECE8),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Stack(
        children: [
          CustomPaint(
            size: const Size(double.infinity, 360),
            painter: _MapPainter(),
          ),

          Positioned(
            top: 18,
            left: 18,
            right: 18,
            child: Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(12),
                boxShadow: const [
                  BoxShadow(
                    color: Color(0x18000000),
                    blurRadius: 10,
                  ),
                ],
              ),
              child: Row(
                children: [
                  const Icon(
                    Icons.location_on,
                    color: Colors.red,
                    size: 20,
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      destination,
                      style: AppTextStyles.labelLarge,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
            ),
          ),

          Positioned(
            left: 18,
            right: 18,
            bottom: 18,
            child: Row(
              children: [
                Expanded(
                  child: _info(
                    Icons.access_time,
                    'ETA',
                    eta,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _info(
                    Icons.route_outlined,
                    distanceLabel,
                    distance,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _info(
    IconData icon,
    String label,
    String value,
  ) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 12,
        vertical: 10,
      ),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Row(
        children: [
          Icon(
            icon,
            size: 18,
            color: AppColors.deepForestGreen,
          ),
          const SizedBox(width: 7),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                label,
                style: AppTextStyles.labelSmall,
              ),
              Text(
                value,
                style: AppTextStyles.labelLarge,
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _MapPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final roadPaint = Paint()
      ..color = Colors.white
      ..strokeWidth = 22
      ..style = PaintingStyle.stroke;

    final routePaint = Paint()
      ..color = AppColors.deepForestGreen
      ..strokeWidth = 6
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final path = Path()
      ..moveTo(30, 300)
      ..quadraticBezierTo(
        size.width * 0.3,
        240,
        size.width * 0.5,
        260,
      )
      ..quadraticBezierTo(
        size.width * 0.7,
        280,
        size.width - 45,
        80,
      );

    canvas.drawPath(path, roadPaint);
    canvas.drawPath(path, routePaint);

    final driverPaint = Paint()
      ..color = AppColors.deepForestGreen;

    final destinationPaint = Paint()
      ..color = Colors.red;

    canvas.drawCircle(
      const Offset(45, 295),
      10,
      driverPaint,
    );

    canvas.drawCircle(
      Offset(size.width - 45, 80),
      10,
      destinationPaint,
    );
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) {
    return false;
  }
}