import 'dart:math' as math;
import '../core/utils/helpers.dart';

// Vocabulary, as the API defines it:
//   "items" are units, i.e. the sum of quantities (24 crates = 24 items);
//   "lines" are the rows of an order (24 crates of milk is one line).

/// Where a loading task is in its life. A trip nobody has opened yet is
/// `pending`; the other values mirror the API's session status.
enum TaskStatus {
  pending,
  inProgress,
  paused,
  onHold,
  completed;

  static TaskStatus fromApi(String? value) => switch (value) {
        'IN_PROGRESS' => TaskStatus.inProgress,
        'PAUSED' => TaskStatus.paused,
        'ON_HOLD' => TaskStatus.onHold,
        'COMPLETED' => TaskStatus.completed,
        _ => TaskStatus.pending,
      };
}

/// The two tabs of the Tasks screen. The API takes the name as `tab`.
enum TaskTab {
  pending,
  completed,
}

/// The Waypoint brands. The API sends FRESH, STYLE or TECH.
enum TaskCategory {
  fresh,
  style,
  tech;

  static TaskCategory? tryFromApi(String? value) => switch (value) {
        'FRESH' => TaskCategory.fresh,
        'STYLE' => TaskCategory.style,
        'TECH' => TaskCategory.tech,
        _ => null,
      };

  /// The value the API uses in filters.
  String get apiValue => name.toUpperCase();
}

/// Derived by the API: HIGH for perishable loads and early store openings.
enum TaskPriority {
  high,
  normal;

  static TaskPriority fromApi(String? value) =>
      value == 'HIGH' ? TaskPriority.high : TaskPriority.normal;
}

/// State of one order line while loading.
enum LineStatus {
  pending,
  verified,
  short,
  damaged,
  wrongItem;

  static LineStatus fromApi(String? value) => switch (value) {
        'VERIFIED' => LineStatus.verified,
        'SHORT' => LineStatus.short,
        'DAMAGED' => LineStatus.damaged,
        'WRONG_ITEM' => LineStatus.wrongItem,
        _ => LineStatus.pending,
      };

  /// True for the states a shortfall report puts a line in.
  bool get isFlagged =>
      this == LineStatus.short ||
      this == LineStatus.damaged ||
      this == LineStatus.wrongItem;
}

/// How far one outlet's goods are loaded.
enum StopStatus {
  notStarted,
  inProgress,
  loaded,
  short;

  static StopStatus fromApi(String? value) => switch (value) {
        'IN_PROGRESS' => StopStatus.inProgress,
        'LOADED' => StopStatus.loaded,
        'SHORT' => StopStatus.short,
        _ => StopStatus.notStarted,
      };
}

class LoadingVehicle {
  final String id;
  final String code;
  final String type;
  final bool isRefrigerated;
  final String status;

  const LoadingVehicle({
    required this.id,
    required this.code,
    required this.type,
    required this.isRefrigerated,
    required this.status,
  });

  factory LoadingVehicle.fromJson(Map<String, dynamic> json) {
    return LoadingVehicle(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      type: json['type'] as String? ?? '',
      isRefrigerated: json['isRefrigerated'] as bool? ?? false,
      status: json['status'] as String? ?? '',
    );
  }
}

/// Totals for a task or an outlet, in items (units) and lines.
class LoadingProgress {
  final int totalItems;
  final int loadedItems;
  final int remainingItems;
  final int excessItems;
  final int percent;
  final int totalLines;
  final int loadedLines;

  const LoadingProgress({
    this.totalItems = 0,
    this.loadedItems = 0,
    this.remainingItems = 0,
    this.excessItems = 0,
    this.percent = 0,
    this.totalLines = 0,
    this.loadedLines = 0,
  });

  factory LoadingProgress.fromJson(Map<String, dynamic> json) {
    return LoadingProgress(
      totalItems: Helpers.toInt(json['totalItems']),
      loadedItems: Helpers.toInt(json['loadedItems']),
      remainingItems: Helpers.toInt(json['remainingItems']),
      excessItems: Helpers.toInt(json['excessItems']),
      percent: Helpers.toInt(json['percent']),
      totalLines: Helpers.toInt(json['totalLines']),
      loadedLines: Helpers.toInt(json['loadedLines']),
    );
  }

  /// Totals worked out on the phone with the server's own rules, so the screen
  /// moves instantly on every tap and still agrees with what the server saves.
  factory LoadingProgress.fromLines(Iterable<LoadingLine> lines) {
    var total = 0;
    var loaded = 0;
    var remaining = 0;
    var excess = 0;
    var loadedLines = 0;
    var count = 0;
    for (final line in lines) {
      count += 1;
      total += line.plannedQty;
      // loaded is capped per line so progress never passes 100 %
      loaded += math.min(line.loadedQty, line.plannedQty);
      remaining += line.remainingQty;
      excess += line.excessQty;
      if (line.remainingQty == 0 && line.excessQty == 0) loadedLines += 1;
    }
    return LoadingProgress(
      totalItems: total,
      loadedItems: loaded,
      remainingItems: remaining,
      excessItems: excess,
      // rounded down, so 99.6 % never reads as done
      percent: total > 0 ? (loaded * 100) ~/ total : 0,
      totalLines: count,
      loadedLines: loadedLines,
    );
  }
}

/// Who holds a task that is being loaded, and until when.
class LoadingLock {
  final String? heldById;
  final String? heldByName;
  final bool isMine;
  final DateTime? expiresAt;

  /// True when the holder has been quiet past the lock timeout, so another
  /// loader may take the task over.
  final bool isExpired;

  /// How long the lock lasts without activity; a client should check in well
  /// inside this window.
  final int ttlSec;

  const LoadingLock({
    this.heldById,
    this.heldByName,
    required this.isMine,
    this.expiresAt,
    required this.isExpired,
    required this.ttlSec,
  });

  static LoadingLock? fromJsonOrNull(Object? value) {
    if (value is! Map) return null;
    final json = Helpers.toMap(value);
    final heldBy = Helpers.toMap(json['heldBy']);
    return LoadingLock(
      heldById: heldBy['id'] as String?,
      heldByName: heldBy['fullName'] as String?,
      isMine: json['isMine'] as bool? ?? false,
      expiresAt: Helpers.toDate(json['expiresAt']),
      isExpired: json['isExpired'] as bool? ?? false,
      ttlSec: Helpers.toInt(json['ttlSec'], 900),
    );
  }
}

/// What this loader may do with the task right now (decided by the server).
class TaskActions {
  final bool canStart;
  final bool canPause;
  final bool canUpdateLines;
  final bool canReportShortfall;
  final bool canComplete;

  const TaskActions({
    this.canStart = false,
    this.canPause = false,
    this.canUpdateLines = false,
    this.canReportShortfall = false,
    this.canComplete = false,
  });

  factory TaskActions.fromJson(Map<String, dynamic> json) {
    return TaskActions(
      canStart: json['canStart'] as bool? ?? false,
      canPause: json['canPause'] as bool? ?? false,
      canUpdateLines: json['canUpdateLines'] as bool? ?? false,
      canReportShortfall: json['canReportShortfall'] as bool? ?? false,
      canComplete: json['canComplete'] as bool? ?? false,
    );
  }
}

/// A broken operating constraint (for example chilled goods on an ambient
/// vehicle) or a reason the task cannot be completed yet.
class TaskIssue {
  final String code;
  final String message;

  const TaskIssue({required this.code, required this.message});

  factory TaskIssue.fromJson(Map<String, dynamic> json) {
    return TaskIssue(
      code: json['code'] as String? ?? '',
      message: json['message'] as String? ?? '',
    );
  }
}

/// A route to be loaded: what the Tasks cards show, and the header of every
/// other loader screen.
class LoadingTask {
  /// The task id: loading is done per trip.
  final String tripId;
  final String? sessionId;

  /// The route code shown on the screens, like "R-005".
  final String routeCode;
  final TaskStatus status;
  final String tripStatus;

  /// The brand carrying the most items, and every brand on the route.
  final TaskCategory? brand;
  final List<TaskCategory> brands;
  final TaskPriority priority;
  final String tempRequirement;
  final bool requiresRefrigeration;
  final DateTime? plannedDeparture;
  final String depotName;
  final LoadingVehicle vehicle;
  final int outletCount;
  final int lineCount;

  /// Total items (units) on the route.
  final int itemCount;
  final LoadingProgress progress;
  final LoadingLock? lock;
  final List<TaskIssue> violations;
  final TaskActions actions;

  const LoadingTask({
    required this.tripId,
    this.sessionId,
    required this.routeCode,
    required this.status,
    required this.tripStatus,
    this.brand,
    this.brands = const [],
    required this.priority,
    this.tempRequirement = 'AMBIENT',
    this.requiresRefrigeration = false,
    this.plannedDeparture,
    this.depotName = '',
    required this.vehicle,
    this.outletCount = 0,
    this.lineCount = 0,
    this.itemCount = 0,
    this.progress = const LoadingProgress(),
    this.lock,
    this.violations = const [],
    this.actions = const TaskActions(),
  });

  factory LoadingTask.fromJson(Map<String, dynamic> json) {
    return LoadingTask(
      tripId: json['tripId'] as String? ?? '',
      sessionId: json['sessionId'] as String?,
      routeCode: json['routeCode'] as String? ?? '',
      status: TaskStatus.fromApi(json['status'] as String?),
      tripStatus: json['tripStatus'] as String? ?? '',
      brand: TaskCategory.tryFromApi(json['brand'] as String?),
      brands: [
        for (final brand in Helpers.toStringList(json['brands']))
          if (TaskCategory.tryFromApi(brand) != null)
            TaskCategory.tryFromApi(brand)!,
      ],
      priority: TaskPriority.fromApi(json['priority'] as String?),
      tempRequirement: json['tempRequirement'] as String? ?? 'AMBIENT',
      requiresRefrigeration: json['requiresRefrigeration'] as bool? ?? false,
      plannedDeparture: Helpers.toDate(json['plannedDeparture']),
      depotName: Helpers.toMap(json['depot'])['name'] as String? ?? '',
      vehicle: LoadingVehicle.fromJson(Helpers.toMap(json['vehicle'])),
      outletCount: Helpers.toInt(json['outletCount']),
      lineCount: Helpers.toInt(json['lineCount']),
      itemCount: Helpers.toInt(json['itemCount']),
      progress: LoadingProgress.fromJson(Helpers.toMap(json['progress'])),
      lock: LoadingLock.fromJsonOrNull(json['lock']),
      violations: [
        for (final v in Helpers.toMapList(json['violations']))
          TaskIssue.fromJson(v),
      ],
      actions: TaskActions.fromJson(Helpers.toMap(json['actions'])),
    );
  }
}

/// One page of the task pool.
class TaskPage {
  final List<LoadingTask> items;
  final int total;

  const TaskPage({required this.items, required this.total});
}

class LoadingOutlet {
  final String id;
  final String code;
  final String name;
  final String district;
  final bool vanOnly;
  final bool isMall;

  const LoadingOutlet({
    required this.id,
    required this.code,
    required this.name,
    this.district = '',
    this.vanOnly = false,
    this.isMall = false,
  });

  factory LoadingOutlet.fromJson(Map<String, dynamic> json) {
    return LoadingOutlet(
      id: json['id'] as String? ?? '',
      code: json['code'] as String? ?? '',
      name: json['name'] as String? ?? '',
      district: json['district'] as String? ?? '',
      vanOnly: json['vanOnly'] as bool? ?? false,
      isMall: json['isMall'] as bool? ?? false,
    );
  }
}

/// An order delivered at a stop. A Fresh outlet can have two (dry and chilled).
class OrderRef {
  final String id;
  final String reference;
  final String tempClass;

  const OrderRef({
    required this.id,
    required this.reference,
    this.tempClass = 'AMBIENT',
  });

  factory OrderRef.fromJson(Map<String, dynamic> json) {
    return OrderRef(
      id: json['id'] as String? ?? '',
      reference: json['reference'] as String? ?? '',
      tempClass: json['tempClass'] as String? ?? 'AMBIENT',
    );
  }
}

/// One order line: what to load and how much of it is on the vehicle.
class LoadingLine {
  final String orderItemId;
  final String orderId;
  final String orderReference;
  final int lineNo;

  /// The product code; null when the order line has none.
  final String? itemCode;
  final String itemName;
  final String unit;
  final int plannedQty;

  /// Units loaded so far. The provider changes it as the loader taps the
  /// stepper, before the server has confirmed the save.
  int loadedQty;

  /// Units reported short, damaged or wrong; these can never be loaded.
  int shortQty;
  LineStatus status;
  final String? note;

  LoadingLine({
    required this.orderItemId,
    required this.orderId,
    required this.orderReference,
    required this.lineNo,
    this.itemCode,
    required this.itemName,
    this.unit = 'EA',
    required this.plannedQty,
    this.loadedQty = 0,
    this.shortQty = 0,
    this.status = LineStatus.pending,
    this.note,
  });

  factory LoadingLine.fromJson(Map<String, dynamic> json) {
    return LoadingLine(
      orderItemId: json['orderItemId'] as String? ?? '',
      orderId: json['orderId'] as String? ?? '',
      orderReference: json['orderReference'] as String? ?? '',
      lineNo: Helpers.toInt(json['lineNo']),
      itemCode: json['itemCode'] as String?,
      itemName: json['itemName'] as String? ?? '',
      unit: json['unit'] as String? ?? 'EA',
      plannedQty: Helpers.toInt(json['plannedQty']),
      loadedQty: Helpers.toInt(json['loadedQty']),
      shortQty: Helpers.toInt(json['shortQty']),
      status: LineStatus.fromApi(json['status'] as String?),
      note: json['note'] as String?,
    );
  }

  /// The most that can be loaded: the plan minus what was reported short.
  int get maxLoadableQty => math.max(plannedQty - shortQty, 0);

  int get remainingQty => math.max(plannedQty - loadedQty, 0);

  /// Units loaded beyond the plan (the plan shrank after loading began).
  int get excessQty => math.max(loadedQty - plannedQty, 0);

  /// What the loader sees in the "item code" column: the product code, or the
  /// line number when the order line has no code.
  String get displayCode => itemCode ?? 'L$lineNo';
}

/// One outlet on the route, in delivery order, with the lines to load for it.
class LoadingStop {
  final String stopId;

  /// Position in the delivery sequence (1 = first drop).
  final int sequence;

  /// Goods leave the vehicle in stop order, so the last stop is loaded first
  /// (loadPosition 1).
  final int loadPosition;
  final LoadingOutlet outlet;
  final List<OrderRef> orders;
  final List<LoadingLine> lines;

  const LoadingStop({
    required this.stopId,
    required this.sequence,
    required this.loadPosition,
    required this.outlet,
    this.orders = const [],
    this.lines = const [],
  });

  factory LoadingStop.fromJson(Map<String, dynamic> json) {
    return LoadingStop(
      stopId: json['stopId'] as String? ?? '',
      sequence: Helpers.toInt(json['sequence']),
      loadPosition: Helpers.toInt(json['loadPosition']),
      outlet: LoadingOutlet.fromJson(Helpers.toMap(json['outlet'])),
      orders: [
        for (final o in Helpers.toMapList(json['orders'])) OrderRef.fromJson(o),
      ],
      lines: [
        for (final l in Helpers.toMapList(json['lines'])) LoadingLine.fromJson(l),
      ],
    );
  }

  LoadingProgress get progress => LoadingProgress.fromLines(lines);

  /// "ORD-1023" or "ORD-1023, ORD-1024" when the outlet has two orders.
  String get orderReferences => orders.map((o) => o.reference).join(', ');
}

/// Units that were loaded for an order that has since left the route; they
/// are still on the vehicle until unloaded.
class RemovedLine {
  final String orderItemId;
  final String? orderReference;
  final String? itemCode;
  final String itemName;
  int loadedQty;

  RemovedLine({
    required this.orderItemId,
    this.orderReference,
    this.itemCode,
    required this.itemName,
    required this.loadedQty,
  });

  factory RemovedLine.fromJson(Map<String, dynamic> json) {
    return RemovedLine(
      orderItemId: json['orderItemId'] as String? ?? '',
      orderReference: json['orderReference'] as String?,
      itemCode: json['itemCode'] as String?,
      itemName: json['itemName'] as String? ?? 'Removed item',
      loadedQty: Helpers.toInt(json['loadedQty']),
    );
  }
}

/// One line of a shortfall report.
class ShortfallLine {
  final String orderItemId;
  final String orderReference;
  final String? itemCode;
  final String itemName;
  final LineStatus status;
  final int plannedQty;
  final int loadedQty;
  final int shortQty;
  final String? note;

  const ShortfallLine({
    required this.orderItemId,
    required this.orderReference,
    this.itemCode,
    required this.itemName,
    required this.status,
    required this.plannedQty,
    required this.loadedQty,
    required this.shortQty,
    this.note,
  });

  factory ShortfallLine.fromJson(Map<String, dynamic> json) {
    return ShortfallLine(
      orderItemId: json['orderItemId'] as String? ?? '',
      orderReference: json['orderReference'] as String? ?? '',
      itemCode: json['itemCode'] as String?,
      itemName: json['itemName'] as String? ?? '',
      status: LineStatus.fromApi(json['status'] as String?),
      plannedQty: Helpers.toInt(json['plannedQty']),
      loadedQty: Helpers.toInt(json['loadedQty']),
      shortQty: Helpers.toInt(json['shortQty']),
      note: json['note'] as String?,
    );
  }
}

/// The shortfall recorded against a task: the issue raised and the lines in it.
class TaskShortfall {
  /// The issue reference, like "ISS-001".
  final String? issueReference;
  final String? issueStatus;
  final int totalShortItems;
  final List<ShortfallLine> lines;

  const TaskShortfall({
    this.issueReference,
    this.issueStatus,
    required this.totalShortItems,
    this.lines = const [],
  });

  static TaskShortfall? fromJsonOrNull(Object? value) {
    if (value is! Map) return null;
    final json = Helpers.toMap(value);
    final issue = Helpers.toMap(json['issue']);
    return TaskShortfall(
      issueReference: issue['reference'] as String?,
      issueStatus: issue['status'] as String?,
      totalShortItems: Helpers.toInt(json['totalShortItems']),
      lines: [
        for (final l in Helpers.toMapList(json['lines'])) ShortfallLine.fromJson(l),
      ],
    );
  }
}

/// A task being worked on: its header plus every stop and line, read live from
/// the plan. The provider keeps one of these as the active task.
class LoadingTaskDetail {
  final LoadingTask task;

  /// Fingerprint of the plan this was read from. Sent back with saves so the
  /// server can tell when the dispatcher changed the plan in the meantime.
  String planRevision;
  final List<LoadingStop> stops;
  List<RemovedLine> removedLines;
  final TaskShortfall? shortfall;
  final DateTime? startedAt;

  LoadingTaskDetail({
    required this.task,
    required this.planRevision,
    required this.stops,
    this.removedLines = const [],
    this.shortfall,
    this.startedAt,
  });

  factory LoadingTaskDetail.fromJson(Map<String, dynamic> json) {
    return LoadingTaskDetail(
      task: LoadingTask.fromJson(json),
      planRevision: json['planRevision'] as String? ?? '',
      stops: [
        for (final s in Helpers.toMapList(json['stops'])) LoadingStop.fromJson(s),
      ],
      removedLines: [
        for (final r in Helpers.toMapList(json['removedLines']))
          RemovedLine.fromJson(r),
      ],
      shortfall: TaskShortfall.fromJsonOrNull(json['shortfall']),
      startedAt: Helpers.toDate(Helpers.toMap(json['timing'])['startedAt']),
    );
  }

  Iterable<LoadingLine> get lines => stops.expand((stop) => stop.lines);

  /// Totals for the whole route, worked out from the lines.
  LoadingProgress get progress => LoadingProgress.fromLines(lines);

  LoadingLine? findLine(String orderItemId) {
    for (final line in lines) {
      if (line.orderItemId == orderItemId) return line;
    }
    return null;
  }
}

/// The server's answer to saving loaded quantities.
class LineUpdateResult {
  final List<LoadingLine> lines;
  final List<RemovedLine> removedLines;
  final String planRevision;

  const LineUpdateResult({
    required this.lines,
    required this.removedLines,
    required this.planRevision,
  });

  factory LineUpdateResult.fromJson(Map<String, dynamic> json) {
    return LineUpdateResult(
      lines: [
        for (final l in Helpers.toMapList(json['lines'])) LoadingLine.fromJson(l),
      ],
      removedLines: [
        for (final r in Helpers.toMapList(json['removedLines']))
          RemovedLine.fromJson(r),
      ],
      planRevision: json['planRevision'] as String? ?? '',
    );
  }
}
