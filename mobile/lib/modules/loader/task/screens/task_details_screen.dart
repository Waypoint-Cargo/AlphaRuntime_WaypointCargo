import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/inner_section_header.dart';
import '../widgets/loading_item_card.dart';
import '../widgets/task_card.dart';
import 'task_screens.dart';

class TaskDetailsScreen extends StatefulWidget {
  final PendingTaskItem? task;
  final List<OutletOrder>? outlets;
  final int? totalItems;
  final int? loadedItems;
  final int? remainingItems;
  final String startedAt;
  final String completedAt;
  final String loadingTime;

  const TaskDetailsScreen({
    super.key,
    this.task,
    this.outlets,
    this.totalItems,
    this.loadedItems,
    this.remainingItems,
    this.startedAt = '06:20 AM',
    this.completedAt = '08:35 AM',
    this.loadingTime = '25 mins',
  });

  @override
  State<TaskDetailsScreen> createState() => _TaskDetailsScreenState();
}

class _TaskDetailsScreenState extends State<TaskDetailsScreen> {
  late final PendingTaskItem _task;
  late final List<OutletOrder> _outlets;
  late final int _totalItems;
  late final int _loadedItems;

  @override
  void initState() {
    super.initState();
    _task = widget.task ??
        const PendingTaskItem(
          routeId: 'R-005',
          category: TaskCategory.fresh,
          priority: TaskPriority.high,
          vehicle: 'V-012',
          departure: '06:15 AM',
          outlets: '4 Outlets',
          items: '46 Items',
        );

    _outlets = widget.outlets ??
        [
          OutletOrder(
            index: 1,
            storeName: 'Retail Store #1023',
            orderId: 'ORD-1023',
            items: List.generate(
              16,
              (i) => OrderItem(code: 'ITM-10$i', name: 'Fresh Item $i', qtyToLoad: 1, loadedQty: 1),
            ),
          ),
          OutletOrder(
            index: 2,
            storeName: 'Retail Store #1024',
            orderId: 'ORD-1024',
            items: List.generate(
              14,
              (i) => OrderItem(code: 'ITM-20$i', name: 'Packaged Goods $i', qtyToLoad: 1, loadedQty: 1),
            ),
          ),
          OutletOrder(
            index: 3,
            storeName: 'Retail Store #1025',
            orderId: 'ORD-1025',
            items: List.generate(
              8,
              (i) => OrderItem(code: 'ITM-30$i', name: 'Cold Produce $i', qtyToLoad: 1, loadedQty: 1),
            ),
          ),
          OutletOrder(
            index: 4,
            storeName: 'Retail Store #1026',
            orderId: 'ORD-1026',
            items: List.generate(
              8,
              (i) => OrderItem(code: 'ITM-40$i', name: 'Dry Grocery $i', qtyToLoad: 1, loadedQty: 1),
            ),
          ),
        ];

    _totalItems = widget.totalItems ?? _outlets.fold(0, (sum, o) => sum + o.totalItemsToLoad);
    _loadedItems = widget.loadedItems ?? _totalItems;
  }

  void _onDone() {
    Navigator.pushAndRemoveUntil(
      context,
      MaterialPageRoute(builder: (context) => const PendingTasksScreen()),
      (route) => false,
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: InnerSectionHeader(
        title: 'Task Details',
        onBack: () => Navigator.pop(context),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Unified Task Details Card (All 6 details in one card)
            _buildUnifiedCard(),

            const SizedBox(height: 18),

            // 2. Delivery Manifest Section
            _buildOutletsManifestSection(),

            const SizedBox(height: 20),

            // 3. Return to Tasks Button (Below Delivery Manifest card)
            _buildReturnButton(),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // 1. UNIFIED TASK DETAILS CARD (6 Details in 1 Card)
  // -------------------------------------------------------------
  Widget _buildUnifiedCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.cardPadding),
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
            blurRadius: 8,
            offset: Offset(0, 3),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          // Top row: Route ID + Brand Badge & Status Pill
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Text(
                    _task.routeId,
                    style: AppTextStyles.heading2,
                  ),
                  const SizedBox(width: 8),
                  _buildBrandBadge(_task.category),
                ],
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                decoration: BoxDecoration(
                  color: AppColors.successLight,
                  borderRadius: BorderRadius.circular(20),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(
                      Icons.check_circle_rounded,
                      size: 13,
                      color: AppColors.success,
                    ),
                    SizedBox(width: 4),
                    Text(
                      'Verified & Loaded',
                      style: AppTextStyles.statusSuccess,
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.divider),
          const SizedBox(height: 14),

          // Row 1: Vehicle | Departure | Priority
          Row(
            children: [
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.local_shipping_outlined,
                  label: 'Vehicle',
                  value: _task.vehicle,
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.access_time_rounded,
                  label: 'Departure',
                  value: _task.departure,
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.warning_amber_rounded,
                  iconColor: const Color(0xFFD97706),
                  label: 'Priority',
                  value: _task.priority == TaskPriority.high
                      ? 'High'
                      : (_task.priority == TaskPriority.normal ? 'Normal' : 'Low'),
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          const Divider(height: 1, color: AppColors.divider),
          const SizedBox(height: 14),

          // Row 2: Total Items | Loaded Items | Outlets
          Row(
            children: [
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.inventory_2_outlined,
                  label: 'Total Items',
                  value: '$_totalItems Items',
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.task_alt_rounded,
                  iconColor: AppColors.success,
                  label: 'Loaded Items',
                  value: '$_loadedItems Items',
                ),
              ),
              _buildDivider(),
              Expanded(
                child: _buildMetaItem(
                  icon: Icons.storefront_outlined,
                  label: 'Outlets',
                  value: '${_outlets.length} Outlets',
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // -------------------------------------------------------------
  // 2. DELIVERY MANIFEST SECTION
  // -------------------------------------------------------------
  Widget _buildOutletsManifestSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Delivery Manifest',
              style: AppTextStyles.heading3,
            ),
            Flexible(
              child: Text(
                '${_outlets.length} Orders Scheduled',
                style: AppTextStyles.bodySmall,
                overflow: TextOverflow.ellipsis,
              ),
            ),
          ],
        ),
        const SizedBox(height: 10),

        // Destination Order Cards without outlet name
        ..._outlets.map((outlet) {
          return Container(
            margin: const EdgeInsets.only(bottom: 10.0),
            padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 12.0),
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
                  blurRadius: 4,
                  offset: Offset(0, 1),
                ),
              ],
            ),
            child: Row(
              children: [
                // Order circle index badge
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

                // Store name & Order ID
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        outlet.storeName,
                        style: AppTextStyles.labelLarge,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Order #${outlet.orderId}',
                        style: AppTextStyles.bodySmall,
                      ),
                    ],
                  ),
                ),

                // Loaded Badge with Count
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 4),
                  decoration: BoxDecoration(
                    color: AppColors.successLight,
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        '${outlet.totalItemsToLoad} Items',
                        style: AppTextStyles.statusSuccess,
                      ),
                      const SizedBox(width: 4),
                      const Icon(
                        Icons.check,
                        size: 13,
                        color: AppColors.success,
                      ),
                    ],
                  ),
                ),
              ],
            ),
          );
        }),
      ],
    );
  }

  // -------------------------------------------------------------
  // 3. RETURN TO TASKS BUTTON (Below Delivery Manifest card)
  // -------------------------------------------------------------
  Widget _buildReturnButton() {
    return SizedBox(
      width: double.infinity,
      height: AppSpacing.buttonHeight,
      child: ElevatedButton(
        onPressed: _onDone,
        style: ElevatedButton.styleFrom(
          backgroundColor: AppColors.deepForestGreen,
          foregroundColor: AppColors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(AppSpacing.buttonRadius),
          ),
        ),
        child: const Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.check_circle_outline_rounded,
              size: 18,
              color: AppColors.white,
            ),
            SizedBox(width: 8),
            Text(
              'Return to Tasks',
              style: TextStyle(
                fontSize: 14,
                fontWeight: FontWeight.bold,
                color: AppColors.white,
              ),
            ),
          ],
        ),
      ),
    );
  }

  // -------------------------------------------------------------
  // HELPER WIDGETS
  // -------------------------------------------------------------
  Widget _buildBrandBadge(TaskCategory category) {
    Color bg;
    Color textColor;
    String label;
    IconData icon;

    switch (category) {
      case TaskCategory.fresh:
        bg = const Color(0xFFD4ECE6);
        textColor = const Color(0xFF1B6A56);
        label = 'FRESH';
        icon = Icons.ac_unit_rounded;
        break;
      case TaskCategory.style:
        bg = const Color(0xFFEAE6FF);
        textColor = const Color(0xFF6B46C1);
        label = 'STYLE';
        icon = Icons.checkroom_outlined;
        break;
      case TaskCategory.tech:
        bg = const Color(0xFFE0F2FE);
        textColor = const Color(0xFF0284C7);
        label = 'TECH';
        icon = Icons.desktop_windows_outlined;
        break;
    }

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(10),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: textColor),
          const SizedBox(width: 3),
          Text(
            label,
            style: TextStyle(
              fontSize: 10.5,
              fontWeight: FontWeight.bold,
              color: textColor,
              letterSpacing: 0.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaItem({
    required IconData icon,
    Color? iconColor,
    required String label,
    required String value,
  }) {
    return Column(
      children: [
        Icon(
          icon,
          size: 15,
          color: iconColor ?? AppColors.primaryText,
        ),
        const SizedBox(height: 3),
        Text(
          label,
          style: AppTextStyles.labelSmall,
        ),
        const SizedBox(height: 2),
        FittedBox(
          fit: BoxFit.scaleDown,
          child: Text(
            value,
            style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
          ),
        ),
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 32,
      color: AppColors.divider,
    );
  }
}
