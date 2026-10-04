import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';

class VerificationSummaryCard extends StatelessWidget {
  final int totalItems;
  final int loadedItems;
  final int remainingItems;
  final int progressPercent;

  const VerificationSummaryCard({
    super.key,
    required this.totalItems,
    required this.loadedItems,
    required this.remainingItems,
    required this.progressPercent,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 14.0),
      decoration: BoxDecoration(
        color: AppColors.cardBackground,
        borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
        border: Border.all(
          color: AppColors.divider,
          width: 1.0,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0A0D302D),
            blurRadius: 6,
            offset: Offset(0, 2),
          ),
        ],
      ),
      child: Row(
        children: [
          // Package icon in soft green circle
          Container(
            width: 36,
            height: 36,
            decoration: const BoxDecoration(
              color: AppColors.greenSurfaceDark,
              shape: BoxShape.circle,
            ),
            child: const Center(
              child: Icon(
                Icons.inventory_2_outlined,
                color: AppColors.deepForestGreen,
                size: 20,
              ),
            ),
          ),
          const SizedBox(width: 8),

          // 4 Summary Metrics
          Expanded(
            child: Row(
              children: [
                Expanded(
                  child: _buildStat(
                    label: 'TOTAL ITEMS',
                    value: '$totalItems',
                    valueColor: AppColors.primaryText,
                  ),
                ),
                Expanded(
                  child: _buildStat(
                    label: 'LOADED ITEMS',
                    value: '$loadedItems',
                    valueColor: AppColors.success,
                  ),
                ),
                Expanded(
                  child: _buildStat(
                    label: 'REMAINING ITEMS',
                    value: '$remainingItems',
                    valueColor: AppColors.pending,
                  ),
                ),
                Expanded(
                  child: _buildStat(
                    label: 'LOADING PROGRESS',
                    value: '$progressPercent%',
                    valueColor: AppColors.success,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStat({
    required String label,
    required String value,
    required Color valueColor,
  }) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      crossAxisAlignment: CrossAxisAlignment.center,
      children: [
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            label,
            style: const TextStyle(
              fontSize: 8.5,
              fontWeight: FontWeight.w600,
              color: AppColors.secondaryText,
              letterSpacing: 0.1,
            ),
            textAlign: TextAlign.center,
            maxLines: 1,
          ),
        ),
        const SizedBox(height: 4),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            style: TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.bold,
              color: valueColor,
            ),
            textAlign: TextAlign.center,
          ),
        ),
      ],
    );
  }
}

class VerificationBottomBar extends StatelessWidget {
  final int? totalItems;
  final int? loadedItems;
  final VoidCallback onPauseLoading;
  final VoidCallback onReviewAndComplete;
  final VoidCallback? onReportShortfall;
  final EdgeInsetsGeometry? padding;

  /// True while a request is running: the buttons lock so it cannot be repeated.
  final bool isBusy;

  const VerificationBottomBar({
    super.key,
    this.totalItems,
    this.loadedItems,
    required this.onPauseLoading,
    required this.onReviewAndComplete,
    this.onReportShortfall,
    this.padding,
    this.isBusy = false,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: padding ?? const EdgeInsets.symmetric(vertical: 8.0),
      color: Colors.transparent,
      child: SafeArea(
        top: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              children: [
                // Pause Loading Button (Outline)
                Expanded(
                  flex: 4,
                  child: SizedBox(
                    height: 48,
                    child: OutlinedButton(
                      onPressed: isBusy ? null : onPauseLoading,
                      style: OutlinedButton.styleFrom(
                        backgroundColor: AppColors.white,
                        foregroundColor: AppColors.deepForestGreen,
                        side: const BorderSide(
                          color: AppColors.deepForestGreen,
                          width: 1.2,
                        ),
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 10),
                      ),
                      child: const Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Icon(
                            Icons.pause_circle_outline_rounded,
                            size: 20,
                            color: AppColors.deepForestGreen,
                          ),
                          SizedBox(width: 6),
                          Flexible(
                            child: Text(
                              'Pause Loading',
                              style: TextStyle(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: AppColors.deepForestGreen,
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

                const SizedBox(width: 12),

                // Review & Complete Button (Deep Forest Green)
                Expanded(
                  flex: 6,
                  child: SizedBox(
                    height: 48,
                    child: ElevatedButton(
                      onPressed: isBusy ? null : onReviewAndComplete,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.deepForestGreen,
                        foregroundColor: AppColors.white,
                        disabledBackgroundColor: AppColors.deepForestGreen,
                        elevation: 0,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                        ),
                        padding: const EdgeInsets.symmetric(horizontal: 14),
                      ),
                      child: isBusy
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                strokeWidth: 2,
                                color: AppColors.white,
                              ),
                            )
                          : const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'Review & Complete',
                                  style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.bold,
                                    color: AppColors.white,
                                  ),
                                ),
                                SizedBox(width: 8),
                                Icon(
                                  Icons.arrow_forward_rounded,
                                  size: 18,
                                  color: AppColors.white,
                                ),
                              ],
                            ),
                    ),
                  ),
                ),
              ],
            ),
            if (onReportShortfall != null) ...[
              const SizedBox(height: 10),
              SizedBox(
                width: double.infinity,
                height: 44,
                child: OutlinedButton.icon(
                  onPressed: isBusy ? null : onReportShortfall,
                  icon: const Icon(
                    Icons.warning_amber_rounded,
                    size: 18,
                    color: AppColors.error,
                  ),
                  label: const Text(
                    'Report Shortfall',
                    style: TextStyle(
                      fontSize: 13.5,
                      fontWeight: FontWeight.w600,
                      color: AppColors.error,
                    ),
                  ),
                  style: OutlinedButton.styleFrom(
                    backgroundColor: AppColors.white,
                    side: const BorderSide(
                      color: AppColors.error,
                      width: 1.0,
                    ),
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
                    ),
                  ),
                ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
