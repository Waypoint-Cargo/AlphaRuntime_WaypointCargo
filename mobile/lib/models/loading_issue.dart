import '../core/utils/helpers.dart';
import 'loading_task.dart';

/// The two tabs of the Issues screen. The API takes the name as `tab`.
enum IssueTab {
  pending,
  resolved,
}

/// Where a shortfall report is with the dispatcher.
enum IssueStatus {
  open,
  investigating,
  resolved;

  static IssueStatus fromApi(String? value) => switch (value) {
        'INVESTIGATING' => IssueStatus.investigating,
        'RESOLVED' => IssueStatus.resolved,
        _ => IssueStatus.open,
      };

  bool get isResolved => this == IssueStatus.resolved;
}

/// One line a loader flagged in a shortfall report.
class IssueLine {
  final String orderItemId;
  final String orderReference;
  final String? itemCode;
  final String itemName;

  /// What was wrong with it: short, damaged or the wrong item.
  final LineStatus status;
  final int plannedQty;

  /// Units that really are there: the plan minus [shortQty].
  final int availableQty;
  final int shortQty;
  final String? note;

  const IssueLine({
    required this.orderItemId,
    required this.orderReference,
    this.itemCode,
    required this.itemName,
    required this.status,
    required this.plannedQty,
    required this.availableQty,
    required this.shortQty,
    this.note,
  });

  factory IssueLine.fromJson(Map<String, dynamic> json) {
    return IssueLine(
      orderItemId: json['orderItemId'] as String? ?? '',
      orderReference: json['orderReference'] as String? ?? '',
      itemCode: json['itemCode'] as String?,
      itemName: json['itemName'] as String? ?? '',
      status: LineStatus.fromApi(json['status'] as String?),
      plannedQty: Helpers.toInt(json['plannedQty']),
      availableQty: Helpers.toInt(json['availableQty']),
      shortQty: Helpers.toInt(json['shortQty']),
      note: json['note'] as String?,
    );
  }

  /// "SKU-1 - Cotton Shirt", or just the name when the line has no code.
  String get label => itemCode == null ? itemName : '$itemCode - $itemName';
}

/// A shortfall a loader reported on a task. It stays pending until the
/// dispatcher resolves it.
class LoadingIssue {
  /// The reference shown to people, like "ISS-001".
  final String reference;
  final IssueStatus status;

  /// What the loader typed as the reason; null when they typed nothing.
  final String? reason;
  final DateTime? reportedAt;
  final String? reportedByName;
  final DateTime? resolvedAt;
  final String? resolvedByName;
  final String? resolutionNote;
  final String? tripId;
  final String routeCode;
  final List<String> orderReferences;
  final int totalShortItems;
  final List<IssueLine> lines;

  const LoadingIssue({
    required this.reference,
    required this.status,
    this.reason,
    this.reportedAt,
    this.reportedByName,
    this.resolvedAt,
    this.resolvedByName,
    this.resolutionNote,
    this.tripId,
    required this.routeCode,
    this.orderReferences = const [],
    this.totalShortItems = 0,
    this.lines = const [],
  });

  factory LoadingIssue.fromJson(Map<String, dynamic> json) {
    final trip = Helpers.toMap(json['trip']);
    return LoadingIssue(
      reference: json['reference'] as String? ?? '',
      status: IssueStatus.fromApi(json['status'] as String?),
      reason: json['reason'] as String?,
      reportedAt: Helpers.toDate(json['reportedAt']),
      reportedByName: Helpers.toMap(json['reportedBy'])['fullName'] as String?,
      resolvedAt: Helpers.toDate(json['resolvedAt']),
      resolvedByName: Helpers.toMap(json['resolvedBy'])['fullName'] as String?,
      resolutionNote: json['resolutionNote'] as String?,
      tripId: trip['id'] as String?,
      routeCode: trip['routeCode'] as String? ?? '',
      orderReferences: Helpers.toStringList(json['orderReferences']),
      totalShortItems: Helpers.toInt(json['totalShortItems']),
      lines: [
        for (final l in Helpers.toMapList(json['lines'])) IssueLine.fromJson(l),
      ],
    );
  }

  /// "ORD-1023 / R-005", or "ORD-1023, ORD-1024 / R-005".
  String get orderAndRoute {
    final orders = orderReferences.join(', ');
    return orders.isEmpty ? routeCode : '$orders / $routeCode';
  }

  /// The kind of problem, when every line has the same one.
  LineStatus? get commonKind {
    if (lines.isEmpty) return null;
    final first = lines.first.status;
    return lines.every((l) => l.status == first) ? first : null;
  }
}

/// One tab of reports plus how many there are on each tab.
class IssuePage {
  final List<LoadingIssue> items;
  final int pendingCount;
  final int resolvedCount;

  const IssuePage({
    required this.items,
    required this.pendingCount,
    required this.resolvedCount,
  });
}
