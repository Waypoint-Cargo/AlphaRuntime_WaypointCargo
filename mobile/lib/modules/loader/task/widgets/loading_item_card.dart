import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';

class OrderItem {
  final String code;
  final String name;
  final int qtyToLoad;
  int loadedQty;

  OrderItem({
    required this.code,
    required this.name,
    required this.qtyToLoad,
    this.loadedQty = 0,
  });
}

class OutletOrder {
  final int index;
  final String storeName;
  final String orderId;
  final List<OrderItem> items;
  bool isExpanded;
  bool showAllItems;

  OutletOrder({
    required this.index,
    required this.storeName,
    required this.orderId,
    required this.items,
    this.isExpanded = false,
    this.showAllItems = false,
  });

  int get totalItemsToLoad => items.fold(0, (sum, item) => sum + item.qtyToLoad);
  int get totalItemsLoaded => items.fold(0, (sum, item) => sum + item.loadedQty);
  double get progress => totalItemsToLoad > 0 ? (totalItemsLoaded / totalItemsToLoad).clamp(0.0, 1.0) : 0.0;
}

class LoadingItemCard extends StatelessWidget {
  final OutletOrder outlet;
  final VoidCallback onToggleExpand;
  final VoidCallback onToggleShowAll;
  final void Function(OrderItem item, int newQty) onQtyChanged;

  const LoadingItemCard({
    super.key,
    required this.outlet,
    required this.onToggleExpand,
    required this.onToggleShowAll,
    required this.onQtyChanged,
  });

  @override
  Widget build(BuildContext context) {
    final displayedItems = outlet.showAllItems
        ? outlet.items
        : outlet.items.take(8).toList();

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
                  // Green index circle
                  Container(
                    width: 28,
                    height: 28,
                    decoration: const BoxDecoration(
                      color: AppColors.deepForestGreen,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: Text(
                      '${outlet.index}',
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
                          outlet.storeName,
                          style: AppTextStyles.labelLarge,
                        ),
                        Text(
                          'Order #${outlet.orderId}',
                          style: AppTextStyles.bodySmall,
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
                      '${outlet.items.length} Items',
                      style: AppTextStyles.statusSuccess,
                    ),
                  ),
                  const SizedBox(width: 8),

                  // Expand / Collapse Chevron
                  Icon(
                    outlet.isExpanded
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
          if (outlet.isExpanded) ...[
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
                        '${outlet.totalItemsLoaded} of ${outlet.totalItemsToLoad} items loaded',
                        style: AppTextStyles.bodySmall,
                      ),
                      Text(
                        '${(outlet.progress * 100).toInt()}%',
                        style: AppTextStyles.labelLarge,
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(4),
                    child: LinearProgressIndicator(
                      value: outlet.progress,
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
              itemCount: displayedItems.length,
              separatorBuilder: (context, index) => const Divider(
                height: 1,
                color: AppColors.divider,
              ),
              itemBuilder: (context, index) {
                final item = displayedItems[index];
                return Padding(
                  padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 10.0),
                  child: Row(
                    children: [
                      // Item Code
                      Expanded(
                        flex: 3,
                        child: Text(
                          item.code,
                          style: AppTextStyles.labelMedium.copyWith(color: AppColors.primaryText),
                        ),
                      ),

                      // Item Name
                      Expanded(
                        flex: 5,
                        child: Text(
                          item.name,
                          style: AppTextStyles.bodyMedium,
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),

                      // Qty to Load
                      Expanded(
                        flex: 3,
                        child: Text(
                          '${item.qtyToLoad}',
                          textAlign: TextAlign.center,
                          style: AppTextStyles.heading3,
                        ),
                      ),

                      // Loaded Qty Stepper [ - ] [ qty ] [ + ]
                      Expanded(
                        flex: 4,
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            // Decrement button
                            _buildStepperButton(
                              icon: Icons.remove,
                              onTap: item.loadedQty > 0
                                  ? () => onQtyChanged(item, item.loadedQty - 1)
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
                                  color: AppColors.border,
                                  width: 0.8,
                                ),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '${item.loadedQty}',
                                style: AppTextStyles.labelLarge,
                              ),
                            ),
                            const SizedBox(width: 4),

                            // Increment button
                            _buildStepperButton(
                              icon: Icons.add,
                              onTap: item.loadedQty < item.qtyToLoad
                                  ? () => onQtyChanged(item, item.loadedQty + 1)
                                  : null,
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),

            // View all items toggle footer
            if (outlet.items.length > 8)
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
                        outlet.showAllItems
                            ? 'Show less'
                            : 'View all ${outlet.items.length} items',
                        style: const TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.deepForestGreen,
                        ),
                      ),
                      const SizedBox(width: 4),
                      Icon(
                        outlet.showAllItems
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
