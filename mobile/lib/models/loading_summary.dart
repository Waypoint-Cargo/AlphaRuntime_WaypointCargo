import '../core/utils/helpers.dart';
import 'loading_task.dart';

/// The hint on the Home screen about what to do next.
class LoadingNextStep {
  /// RESUME_LOADING, START_LOADING, AWAITING_REVIEW, WAITING or ALL_CLEAR.
  final String type;
  final String title;
  final String message;
  final int count;

  /// The task to continue, when the step is about one (RESUME_LOADING).
  final String? tripId;
  final String? routeCode;

  const LoadingNextStep({
    required this.type,
    required this.title,
    required this.message,
    this.count = 0,
    this.tripId,
    this.routeCode,
  });

  factory LoadingNextStep.fromJson(Map<String, dynamic> json) {
    return LoadingNextStep(
      type: json['type'] as String? ?? 'ALL_CLEAR',
      title: json['title'] as String? ?? '',
      message: json['message'] as String? ?? '',
      count: Helpers.toInt(json['count']),
      tripId: json['tripId'] as String?,
      routeCode: json['routeCode'] as String?,
    );
  }

  bool get isResume => type == 'RESUME_LOADING' && tripId != null;
  bool get isAllClear => type == 'ALL_CLEAR';
}

/// The Home screen's figures for one day at the loader's depots.
class LoadingSummary {
  final String date;
  final int pendingLoads;
  final int readyToDepart;
  final int openIssues;

  /// Items (units) still to load across the pending loads.
  final int itemsToLoad;
  final int departures;
  final int departuresRemaining;
  final LoadingNextStep nextStep;

  const LoadingSummary({
    required this.date,
    this.pendingLoads = 0,
    this.readyToDepart = 0,
    this.openIssues = 0,
    this.itemsToLoad = 0,
    this.departures = 0,
    this.departuresRemaining = 0,
    required this.nextStep,
  });

  factory LoadingSummary.fromJson(Map<String, dynamic> json) {
    return LoadingSummary(
      date: json['date'] as String? ?? '',
      pendingLoads: Helpers.toInt(json['pendingLoads']),
      readyToDepart: Helpers.toInt(json['readyToDepart']),
      openIssues: Helpers.toInt(json['openIssues']),
      itemsToLoad: Helpers.toInt(json['itemsToLoad']),
      departures: Helpers.toInt(json['departures']),
      departuresRemaining: Helpers.toInt(json['departuresRemaining']),
      nextStep: LoadingNextStep.fromJson(Helpers.toMap(json['nextStep'])),
    );
  }
}

/// One row of the outlet summary on the review and completed screens.
class LoadingOutletSummary {
  final String stopId;
  final int sequence;
  final String outletCode;
  final String outletName;
  final List<String> orderReferences;
  final int lineCount;
  final int totalItems;
  final int loadedItems;
  final int remainingItems;
  final StopStatus status;

  const LoadingOutletSummary({
    required this.stopId,
    required this.sequence,
    required this.outletCode,
    required this.outletName,
    this.orderReferences = const [],
    this.lineCount = 0,
    this.totalItems = 0,
    this.loadedItems = 0,
    this.remainingItems = 0,
    required this.status,
  });

  factory LoadingOutletSummary.fromJson(Map<String, dynamic> json) {
    final outlet = Helpers.toMap(json['outlet']);
    return LoadingOutletSummary(
      stopId: json['stopId'] as String? ?? '',
      sequence: Helpers.toInt(json['sequence']),
      outletCode: outlet['code'] as String? ?? '',
      outletName: outlet['name'] as String? ?? '',
      orderReferences: Helpers.toStringList(json['orderReferences']),
      lineCount: Helpers.toInt(json['lineCount']),
      totalItems: Helpers.toInt(json['totalItems']),
      loadedItems: Helpers.toInt(json['loadedItems']),
      remainingItems: Helpers.toInt(json['remainingItems']),
      status: StopStatus.fromApi(json['status'] as String?),
    );
  }

  /// "ORD-1023" or "ORD-1023, ORD-1024".
  String get orderReferencesLabel => orderReferences.join(', ');
}

/// Whether the load can be completed now and, if not, what stands in the way.
class TaskCompletion {
  final bool canComplete;

  /// True when the vehicle would leave with items not loaded (a recorded shortfall).
  final bool willDepartShort;
  final List<TaskIssue> blockers;

  const TaskCompletion({
    this.canComplete = false,
    this.willDepartShort = false,
    this.blockers = const [],
  });

  factory TaskCompletion.fromJson(Map<String, dynamic> json) {
    return TaskCompletion(
      canComplete: json['canComplete'] as bool? ?? false,
      willDepartShort: json['willDepartShort'] as bool? ?? false,
      blockers: [
        for (final b in Helpers.toMapList(json['blockers'])) TaskIssue.fromJson(b),
      ],
    );
  }
}

/// A task's totals and per-outlet results: the review before completing, and
/// the record afterwards (Loading Completed and Task Details screens).
class LoadingTaskSummary {
  final LoadingTask task;
  final DateTime? startedAt;
  final DateTime? completedAt;

  /// Time spent loading, without the time the task sat paused or on hold.
  final int loadingSec;
  final int elapsedSec;

  /// True when the vehicle left (or will leave) with items not loaded.
  final bool departedShort;
  final String? completedByName;
  final List<LoadingOutletSummary> outlets;
  final TaskShortfall? shortfall;
  final TaskCompletion completion;
  final String planRevision;

  const LoadingTaskSummary({
    required this.task,
    this.startedAt,
    this.completedAt,
    this.loadingSec = 0,
    this.elapsedSec = 0,
    this.departedShort = false,
    this.completedByName,
    this.outlets = const [],
    this.shortfall,
    this.completion = const TaskCompletion(),
    this.planRevision = '',
  });

  factory LoadingTaskSummary.fromJson(Map<String, dynamic> json) {
    return LoadingTaskSummary(
      task: LoadingTask.fromJson(json),
      startedAt: Helpers.toDate(json['startedAt']),
      completedAt: Helpers.toDate(json['completedAt']),
      loadingSec: Helpers.toInt(json['loadingSec']),
      elapsedSec: Helpers.toInt(json['elapsedSec']),
      departedShort: json['departedShort'] as bool? ?? false,
      completedByName: Helpers.toMap(json['completedBy'])['fullName'] as String?,
      outlets: [
        for (final o in Helpers.toMapList(json['outlets']))
          LoadingOutletSummary.fromJson(o),
      ],
      shortfall: TaskShortfall.fromJsonOrNull(json['shortfall']),
      completion: TaskCompletion.fromJson(Helpers.toMap(json['completion'])),
      planRevision: json['planRevision'] as String? ?? '',
    );
  }

  LoadingProgress get progress => task.progress;
}
