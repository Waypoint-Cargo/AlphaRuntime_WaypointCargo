import 'package:flutter/material.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_spacing.dart';
import '../../../../core/theme/app_text_style.dart';
import '../../../../core/widgets/inner_section_header.dart';
import '../../report_issues/screens/report_issue_screen.dart';
import '../widgets/loading_item_card.dart';
import '../widgets/task_card.dart';
import '../widgets/verification_summary.dart';
import 'verify_loading_screen.dart';

typedef VerifyItemsScreen = StartLoadingScreen;

class StartLoadingScreen extends StatefulWidget {
  final PendingTaskItem? task;

  const StartLoadingScreen({
    super.key,
    this.task,
  });

  @override
  State<StartLoadingScreen> createState() => _StartLoadingScreenState();
}

class _StartLoadingScreenState extends State<StartLoadingScreen> {
  late final PendingTaskItem _task;
  late final List<OutletOrder> _outlets;

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

    // All outlets collapsed by default
    _outlets = [
      OutletOrder(
        index: 1,
        storeName: 'Retail Store #1023',
        orderId: 'ORD-1023',
        isExpanded: false,
        items: [
          OrderItem(code: 'ITM-1001', name: 'Fresh Bananas', qtyToLoad: 25),
          OrderItem(code: 'ITM-1002', name: 'Whole Milk 1L', qtyToLoad: 12),
          OrderItem(code: 'ITM-1003', name: 'Brown Bread', qtyToLoad: 20),
          OrderItem(code: 'ITM-1004', name: 'Large Eggs (12)', qtyToLoad: 10),
          OrderItem(code: 'ITM-1005', name: 'Apples Red 1kg', qtyToLoad: 15),
          OrderItem(code: 'ITM-1006', name: 'Yogurt Strawberry 500g', qtyToLoad: 8),
          OrderItem(code: 'ITM-1007', name: 'Butter 200g', qtyToLoad: 6),
          OrderItem(code: 'ITM-1008', name: 'Cheddar Cheese 200g', qtyToLoad: 10),
          OrderItem(code: 'ITM-1009', name: 'Orange Juice 1L', qtyToLoad: 8),
          OrderItem(code: 'ITM-1010', name: 'Chicken Breast 500g', qtyToLoad: 14),
          OrderItem(code: 'ITM-1011', name: 'Greek Yogurt 400g', qtyToLoad: 6),
          OrderItem(code: 'ITM-1012', name: 'Tomatoes 1kg', qtyToLoad: 12),
          OrderItem(code: 'ITM-1013', name: 'Spinach Bag 250g', qtyToLoad: 5),
          OrderItem(code: 'ITM-1014', name: 'White Bread', qtyToLoad: 10),
          OrderItem(code: 'ITM-1015', name: 'Carrots 1kg', qtyToLoad: 8),
          OrderItem(code: 'ITM-1016', name: 'Salmon Fillet 400g', qtyToLoad: 7),
        ],
      ),
      OutletOrder(
        index: 2,
        storeName: 'Retail Store #1024',
        orderId: 'ORD-1024',
        isExpanded: false,
        items: [
          OrderItem(code: 'ITM-2001', name: 'Organic Bananas', qtyToLoad: 14),
          OrderItem(code: 'ITM-2002', name: 'Skim Milk 1L', qtyToLoad: 10),
          OrderItem(code: 'ITM-2003', name: 'Sourdough Bread', qtyToLoad: 8),
        ],
      ),
      OutletOrder(
        index: 3,
        storeName: 'Retail Store #1025',
        orderId: 'ORD-1025',
        isExpanded: false,
        items: [
          OrderItem(code: 'ITM-3001', name: 'Potatoes 2kg', qtyToLoad: 10),
          OrderItem(code: 'ITM-3002', name: 'Onions 1kg', qtyToLoad: 8),
        ],
      ),
      OutletOrder(
        index: 4,
        storeName: 'Retail Store #1026',
        orderId: 'ORD-1026',
        isExpanded: false,
        items: [
          OrderItem(code: 'ITM-4001', name: 'Green Apples 1kg', qtyToLoad: 12),
          OrderItem(code: 'ITM-4002', name: 'Cereal 500g', qtyToLoad: 6),
        ],
      ),
    ];
  }

  int get _totalItems {
    return _outlets.fold(0, (sum, o) => sum + o.totalItemsToLoad);
  }

  int get _loadedItems {
    return _outlets.fold(0, (sum, o) => sum + o.totalItemsLoaded);
  }

  int get _remainingItems {
    return _totalItems - _loadedItems;
  }

  int get _progressPercent {
    return _totalItems > 0 ? ((_loadedItems / _totalItems) * 100).toInt() : 0;
  }

  void _onQtyChanged(OrderItem item, int newQty) {
    setState(() {
      item.loadedQty = newQty;
    });
  }

  void _onPauseLoading() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Pause Loading Session'),
        content: const Text('Do you want to pause this loading session? Progress will be saved.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.deepForestGreen,
            ),
            onPressed: () {
              Navigator.pop(context);
              Navigator.pop(context);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(content: Text('Loading session paused.')),
              );
            },
            child: const Text('Pause & Exit', style: TextStyle(color: AppColors.white)),
          ),
        ],
      ),
    );
  }

  void _onReportShortfall() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => ReportLoadingIssueScreen(
          task: _task,
          outlets: _outlets,
        ),
      ),
    );
  }

  void _onReviewAndComplete() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (context) => VerifyLoadingScreen(
          task: _task,
          totalItems: _totalItems,
          loadedItems: _loadedItems,
          remainingItems: _remainingItems,
          outlets: _outlets,
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.screenBackground,
      appBar: InnerSectionHeader(
        title: 'Start Loading',
        onBack: () => Navigator.pop(context),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 16.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // 1. Top Route Metadata Card
            _buildRouteInfoCard(),

            const SizedBox(height: 14),

            // 2. Summary Stats Card (Above loading items)
            VerificationSummaryCard(
              totalItems: _totalItems,
              loadedItems: _loadedItems,
              remainingItems: _remainingItems,
              progressPercent: _progressPercent,
            ),

            const SizedBox(height: 14),

            // 3. Outlets / Orders Accordion List (Default collapsed)
            ..._outlets.map(
              (outlet) => LoadingItemCard(
                outlet: outlet,
                onToggleExpand: () {
                  setState(() {
                    outlet.isExpanded = !outlet.isExpanded;
                  });
                },
                onToggleShowAll: () {
                  setState(() {
                    outlet.showAllItems = !outlet.showAllItems;
                  });
                },
                onQtyChanged: _onQtyChanged,
              ),
            ),

            const SizedBox(height: 16),

            // 4. Action Buttons (Pause Loading, Review & Complete, Report Shortfall) - Below order cards
            VerificationBottomBar(
              totalItems: _totalItems,
              loadedItems: _loadedItems,
              onPauseLoading: _onPauseLoading,
              onReviewAndComplete: _onReviewAndComplete,
              onReportShortfall: _onReportShortfall,
              padding: EdgeInsets.zero,
            ),

            const SizedBox(height: 24),
          ],
        ),
      ),
    );
  }

  Widget _buildRouteInfoCard() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14.0, vertical: 16.0),
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
          // Route
          Expanded(
            child: _buildMetaCol(
              label: 'Route',
              valueWidget: Text(
                _task.routeId,
                style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
              ),
            ),
          ),
          _buildDivider(),

          // Vehicle
          Expanded(
            child: _buildMetaCol(
              label: 'Vehicle',
              valueWidget: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  const Icon(
                    Icons.local_shipping_outlined,
                    size: 15,
                    color: AppColors.primaryText,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _task.vehicle,
                    style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          _buildDivider(),

          // Priority
          Expanded(
            child: _buildMetaCol(
              label: 'Priority',
              valueWidget: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(
                    Icons.warning_amber_rounded,
                    size: 15,
                    color: _task.priority == TaskPriority.high
                        ? const Color(0xFFD97706)
                        : AppColors.primaryText,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    _task.priority == TaskPriority.high
                        ? 'High'
                        : (_task.priority == TaskPriority.normal ? 'Normal' : 'Low'),
                    style: AppTextStyles.labelLarge.copyWith(fontWeight: FontWeight.bold),
                  ),
                ],
              ),
            ),
          ),
          _buildDivider(),

          // Brand
          Expanded(
            child: _buildMetaCol(
              label: 'Brand',
              valueWidget: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  _getBrandIcon(_task.category),
                  const SizedBox(width: 4),
                  Text(
                    _task.category.name.toUpperCase(),
                    style: TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.bold,
                      color: _getBrandColor(_task.category),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildMetaCol({
    required String label,
    required Widget valueWidget,
  }) {
    return Column(
      children: [
        Text(
          label,
          style: AppTextStyles.labelSmall,
        ),
        const SizedBox(height: 4),
        valueWidget,
      ],
    );
  }

  Widget _buildDivider() {
    return Container(
      width: 1,
      height: 28,
      color: AppColors.divider,
    );
  }

  Widget _getBrandIcon(TaskCategory category) {
    switch (category) {
      case TaskCategory.fresh:
        return const Icon(
          Icons.ac_unit_rounded,
          size: 14,
          color: Color(0xFF1B6A56),
        );
      case TaskCategory.style:
        return const Icon(
          Icons.checkroom_outlined,
          size: 14,
          color: Color(0xFF6B46C1),
        );
      case TaskCategory.tech:
        return const Icon(
          Icons.desktop_windows_outlined,
          size: 14,
          color: Color(0xFF0284C7),
        );
    }
  }

  Color _getBrandColor(TaskCategory category) {
    switch (category) {
      case TaskCategory.fresh:
        return const Color(0xFF1B6A56);
      case TaskCategory.style:
        return const Color(0xFF6B46C1);
      case TaskCategory.tech:
        return const Color(0xFF0284C7);
    }
  }
}
