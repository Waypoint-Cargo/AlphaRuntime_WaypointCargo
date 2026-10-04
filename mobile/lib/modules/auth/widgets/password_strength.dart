import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';

class PasswordStrength extends StatelessWidget {
  final String password;

  const PasswordStrength({super.key, required this.password});

  @override
  Widget build(BuildContext context) {
    if (password.isEmpty) {
      return const SizedBox.shrink();
    }

    final hasMinLength = password.length >= 8;
    final hasUppercase = RegExp(r'[A-Z]').hasMatch(password);
    final hasNumber = RegExp(r'\d').hasMatch(password);
    final hasSpecial = RegExp(r'[^A-Za-z0-9]').hasMatch(password);

    int score = 0;
    if (hasMinLength) score++;
    if (hasUppercase) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    Color barColor = AppColors.error;
    String label = 'Weak';
    if (score == 2) {
      barColor = AppColors.pending;
      label = 'Fair';
    } else if (score == 3) {
      barColor = AppColors.success;
      label = 'Good';
    } else if (score >= 4) {
      barColor = AppColors.success;
      label = 'Strong';
    }

    return Padding(
      padding: const EdgeInsets.only(top: 8.0),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: List.generate(4, (index) {
              final isFilled = index < score;
              return Expanded(
                child: Container(
                  margin: EdgeInsets.only(right: index < 3 ? 4.0 : 0.0),
                  height: 4,
                  decoration: BoxDecoration(
                    color: isFilled ? barColor : AppColors.divider,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              );
            }),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              fontSize: 11,
              fontWeight: FontWeight.w600,
              color: barColor,
            ),
          ),
        ],
      ),
    );
  }
}
