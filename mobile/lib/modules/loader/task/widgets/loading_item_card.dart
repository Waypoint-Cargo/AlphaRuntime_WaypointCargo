import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../models/loading_task.dart';

/// One outlet on the route: its orders, progress and the lines to load, each
/// with a loaded-quantity stepper.
class LoadingItemCard extends StatelessWidget {
  final LoadingStop stop;
  final bool isExpanded;
  final bool showAllItems;
  final VoidCallback onToggleExpand;
  final VoidCallback onToggleShowAll;
  final void Function(LoadingLine line, int newQty) onQtyChanged;

  /// False when the loader cannot change quantities (the task is not theirs).
  final bool enabled;

  const LoadingItemCard({
    super.key,
    required this.stop,
    required this.isExpanded,
    required this.showAllItems,
    required this.onToggleExpand,
    required this.onToggleShowAll,
    required this.onQtyChanged,
    this.enabled = true,
  });

  static const int _collapsedLineCount = 8;

  @override
  Widget build(BuildContext context) {
    final progress = stop.progress;
    final displayedLines = showAllItems
        ? stop.lines
        : stop.lines.take(_collapsedLineCount).toList();

    return Container(
      margin: const EdgeInsets.only(bottom: 12.0),
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
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Header Row (Tappable for expand/collapse)
          InkWell(
            onTap: onToggleExpand,
            borderRadius: BorderRadius.circular(AppSpacing.cardRadius),
            child: Padding(
              padding: const EdgeInsets.all(AppSpacing.cardPadding),
              child: Row(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  // Green index circle: the outlet's place in the delivery order
                  Container(
                    width: 28,
                    height: 28,
                    decoration: const BoxDecoration(
                      color: AppColors.deepForestGreen,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${stop.sequence}',
                      style: AppTextStyles.buttonLight.copyWith(fontSize: 13),
                    ),
                  ),
                  const SizedBox(width: 12),

                  // Store & Order Title
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          stop.outlet.name,
                          style: AppTextStyles.labelLarge,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          stop.orders.length > 1
                              ? 'Orders #${stop.orderReferences}'
                              : 'Order #${stop.orderReferences}',
                          style: AppTextStyles.bodySmall,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                    ),
                  ),

                  // Item count badge
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppColors.successLight,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Text(
                      '${progress.totalItems} Items',
                      style: AppTextStyles.statusSuccess,
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Expand / Collapse Chevron
                  Icon(
                    isExpanded
                        ? Icons.keyboard_arrow_up_rounded
                        : Icons.keyboard_arrow_down_rounded,
                    color: AppColors.secondaryText,
                    size: 20,
                  ),
                ],
              ),
            ),
          ),

          // Expanded Content
          if (isExpanded) ...[
            // Progress row
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14.0),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text(
                        '${progress.loadedItems} of ${progress.totalItems} items loaded',
                        style: AppTextStyles.bodySmall,
                      ),
                      Text(
                        '${progress.percent}%',
                        style: AppTextStyles.labelLarge,
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: progress.totalItems > 0
                          ? progress.loadedItems / progress.totalItems
                          : 0.0,
                      backgroundColor: AppColors.mutedBackground,
                      valueColor: const AlwaysStoppedAnimation<Color>(AppColors.success),
                      minHeight: 4,
                    ),
                  ),
                ],
              ),
            ),

            const SizedBox(height: 14),

            // Item Table Header (Mint Green Strip)
            Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 8.0),
              color: AppColors.greenSurface,
              child: const Row(
                children: [
                  Expanded(
                    flex: 3,
                    child: Text(
                      'ITEM CODE',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForestGreen,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 5,
                    child: Text(
                      'ITEM NAME',
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForestGreen,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 3,
                    child: Text(
                      'QTY TO LOAD',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForestGreen,
                      ),
                    ),
                  ),
                  Expanded(
                    flex: 4,
                    child: Text(
                      'LOADED QTY',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 10.5,
                        fontWeight: FontWeight.bold,
                        color: AppColors.deepForestGreen,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Item Rows
            ListView.separated(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayedLines.length,
              separatorBuilder: (context, index) => const Divider(
                height: 1,
                color: AppColors.divider,
              ),
              itemBuilder: (context, index) {
                final line = displayedLines[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                  child: Row(
                    children: [
                      // Item Code
                      Expanded(
                        flex: 3,
                        child: Text(
                          line.displayCode,
                          style: AppTextStyles.labelMedium.copyWith(color: AppColors.primaryText),
                        ),
                      ),

                      // Item Name (and a note when part of it was reported short)
                      Expanded(
                        flex: 5,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              line.itemName,
                              style: AppTextStyles.bodyMedium,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                            ),
                            if (line.shortQty > 0)
                              Text(
                                '${line.shortQty} reported short',
                                style: AppTextStyles.statusError,
                              ),
                          ],
                        ),
                      ),

                      // Qty to Load
                      Expanded(
                        flex: 3,
                        child: Text(
                          '${line.plannedQty}',
                          textAlign: TextAlign.center,
                          style: AppTextStyles.heading3,
                        ),
                      ),

                      // Loaded Qty Stepper [ - ] [ qty ] [ + ]
                      Expanded(
                        flex: 4,
                        // On a narrow phone the stepper shrinks a little instead of overflowing.
                        child: FittedBox(
                          fit: BoxFit.scaleDown,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              // Decrement button
                              _buildStepperButton(
                                icon: Icons.remove,
                                onTap: enabled && line.loadedQty > 0
                                    ? () => onQtyChanged(line, line.loadedQty - 1)
                                    : null,
                              ),
                              const SizedBox(width: 4),

                              // Quantity display box
                              Container(
                                width: 32,
                                height: 28,
                                decoration: BoxDecoration(
                                  color: AppColors.white,
                                  borderRadius: BorderRadius.circular(4),
                                  border: Border.all(
                                    color: line.excessQty > 0
                                        ? AppColors.error
                                        : AppColors.border,
                                    width: 0.8,
                                  ),
                                ),
                                alignment: Alignment.center,
                                child: Text(
                                  '${line.loadedQty}',
                                  style: AppTextStyles.labelLarge,
                                ),
                              ),
                              const SizedBox(width: 4),

                              // Increment button
                              _buildStepperButton(
                                icon: Icons.add,
                                onTap: enabled && line.loadedQty < line.maxLoadableQty
                                    ? () => onQtyChanged(line, line.loadedQty + 1)
                                    : null,
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),

            // View all items toggle footer
            if (stop.lines.length > _collapsedLineCount)
              InkWell(
                onTap: onToggleShowAll,
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 12.0),
                  alignment: Alignment.center,
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        showAllItems
                            ? 'Show less'
                            : 'View all ${stop.lines.length} products',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.deepForestGreen,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        showAllItems
                            ? Icons.keyboard_arrow_up_rounded
                            : Icons.keyboard_arrow_down_rounded,
                        color: AppColors.deepForestGreen,
                        size: 16,
                      ),
                    ],
                  ),
                ),
              ),
          ],
        ],
      ),
    );
  }

  Widget _buildStepperButton({
    required IconData icon,
    required VoidCallback? onTap,
  }) {
    final bool isEnabled = onTap != null;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(4),
      child: Container(
        width: 26,
        height: 28,
        decoration: BoxDecoration(
          color: isEnabled ? AppColors.white : AppColors.mutedBackground,
          borderRadius: BorderRadius.circular(4),
          border: Border.all(
            color: isEnabled ? AppColors.border : AppColors.divider,
            width: 0.8,
          ),
        ),
        alignment: Alignment.center,
        child: Icon(
          icon,
          size: 14,
          color: isEnabled ? AppColors.primaryText : AppColors.disabledText,
        ),
      ),
    );
  }
}
