import '../../models/loading_issue.dart';
import '../../models/loading_summary.dart';
import '../../models/loading_task.dart';
import '../constants/api_constants.dart';
import '../utils/helpers.dart';
import 'api_service.dart';

/// Why an item cannot be loaded in full. The API takes MISSING, DAMAGED or WRONG_ITEM.
enum ShortfallType {
  missing('MISSING'),
  damaged('DAMAGED'),
  wrongItem('WRONG_ITEM');

  final String apiValue;
  const ShortfallType(this.apiValue);
}

/// One line of a shortfall report: [shortQty] units of an order line cannot be loaded.
class ShortfallLineRequest {
  final String orderItemId;
  final ShortfallType type;
  final int shortQty;
  final String? note;

  const ShortfallLineRequest({
    required this.orderItemId,
    required this.type,
    required this.shortQty,
    this.note,
  });

  Map<String, dynamic> toJson() {
    return {
      'orderItemId': orderItemId,
      'type': type.apiValue,
      'shortQty': shortQty,
      if (note != null && note!.trim().isNotEmpty) 'note': note!.trim(),
    };
  }
}

/// Loader service for the mobile application: the warehouse loading APIs.
class LoaderService {
  final ApiService _apiService;

  LoaderService({ApiService? apiService})
      : _apiService = apiService ?? ApiService();

  /// The `data` object of a success response; an [ApiException] if it is missing.
  Map<String, dynamic> _data(Map<String, dynamic> response) {
    final data = response['data'];
    if (data is Map) return Map<String, dynamic>.from(data);
    throw ApiException(
      message: 'The server sent an unexpected response.',
      statusCode: 502,
    );
  }

  /// Home screen figures for today at the loader's depots.
  ///
  /// Calls `GET /api/loading/summary`.
  Future<LoadingSummary> getSummary({String? date}) async {
    final endpoint = Uri(
      path: ApiConstants.loadingSummary,
      queryParameters: {'date': ?date},
    ).toString();
    final response = await _apiService.get(endpoint);
    return LoadingSummary.fromJson(_data(response));
  }

  /// One tab of the shared task pool, optionally filtered.
  ///
  /// Calls `GET /api/loading/tasks`. [search] matches route or vehicle codes
  /// and [brand] is FRESH, STYLE or TECH.
  Future<TaskPage> getTasks({
    required TaskTab tab,
    String? search,
    String? brand,
    int limit = 100,
  }) async {
    final endpoint = Uri(
      path: ApiConstants.loadingTasks,
      queryParameters: {
        'tab': tab.name,
        'limit': '$limit',
        if (search != null && search.isNotEmpty) 'search': search,
        'brand': ?brand,
      },
    ).toString();
    final response = await _apiService.get(endpoint);

    final data = response['data'];
    final meta = response['meta'];
    final items = [
      if (data is List)
        for (final item in data)
          if (item is Map) LoadingTask.fromJson(Map<String, dynamic>.from(item)),
    ];
    final total = meta is Map && meta['total'] is num
        ? (meta['total'] as num).toInt()
        : items.length;
    return TaskPage(items: items, total: total);
  }

  /// The shortfall reports of the loader's depots: one tab of them, and how
  /// many there are on each tab. A report is pending until the dispatcher
  /// resolves it.
  ///
  /// Calls `GET /api/loading/issues`.
  Future<IssuePage> getIssues({required IssueTab tab, int limit = 50}) async {
    final endpoint = Uri(
      path: ApiConstants.loadingIssues,
      queryParameters: {'tab': tab.name, 'limit': '$limit'},
    ).toString();
    final response = await _apiService.get(endpoint);

    final data = response['data'];
    final meta = Helpers.toMap(response['meta']);
    final counts = Helpers.toMap(meta['counts']);
    return IssuePage(
      items: [
        if (data is List)
          for (final item in data)
            if (item is Map) LoadingIssue.fromJson(Map<String, dynamic>.from(item)),
      ],
      pendingCount: Helpers.toInt(counts['pending']),
      resolvedCount: Helpers.toInt(counts['resolved']),
    );
  }

  /// A task as it is right now, read from the live plan.
  ///
  /// Calls `GET /api/loading/tasks/:tripId`.
  Future<LoadingTaskDetail> getTask(String tripId) async {
    final response = await _apiService.get(ApiConstants.loadingTask(tripId));
    return LoadingTaskDetail.fromJson(_data(response));
  }

  /// "Open Task": claims a pending task, resumes a paused one, takes over an
  /// abandoned one, or just extends the lock when the caller already holds it.
  ///
  /// Calls `POST /api/loading/tasks/:tripId/start`. Throws [ApiException] 409
  /// (`TASK_LOCKED`, `VEHICLE_BUSY`, `TASK_ON_HOLD`, ...) when it cannot be opened.
  Future<LoadingTaskDetail> startTask(String tripId) async {
    final response = await _apiService.post(ApiConstants.loadingTaskStart(tripId));
    return LoadingTaskDetail.fromJson(_data(response));
  }

  /// Hands the task back to the shared pool with every saved quantity kept.
  ///
  /// Calls `POST /api/loading/tasks/:tripId/pause`.
  Future<LoadingTaskDetail> pauseTask(String tripId) async {
    final response = await _apiService.post(ApiConstants.loadingTaskPause(tripId));
    return LoadingTaskDetail.fromJson(_data(response));
  }

  /// Saves loaded quantities. The values are totals ("12 loaded so far"), not
  /// changes, so a repeated save is harmless.
  ///
  /// Calls `PATCH /api/loading/tasks/:tripId/lines`. [planRevision] is the
  /// revision the screen was drawn from; the server answers 409 `PLAN_CHANGED`
  /// when the dispatcher changed the plan since.
  Future<LineUpdateResult> saveLines(
    String tripId,
    Map<String, int> loadedQtyByOrderItemId, {
    String? planRevision,
  }) async {
    final response = await _apiService.patch(
      ApiConstants.loadingTaskLines(tripId),
      body: {
        'lines': [
          for (final entry in loadedQtyByOrderItemId.entries)
            {'orderItemId': entry.key, 'loadedQty': entry.value},
        ],
        if (planRevision != null && planRevision.isNotEmpty)
          'planRevision': planRevision,
      },
    );
    return LineUpdateResult.fromJson(_data(response));
  }

  /// Reports items that cannot be loaded in full; the load goes on hold until
  /// the dispatcher reviews it. [clientMutationId] makes a retried request safe.
  ///
  /// Calls `POST /api/loading/tasks/:tripId/shortfall`.
  Future<LoadingTaskDetail> reportShortfall(
    String tripId, {
    required List<ShortfallLineRequest> lines,
    String? reason,
    String? clientMutationId,
  }) async {
    final response = await _apiService.post(
      ApiConstants.loadingTaskShortfall(tripId),
      body: {
        'lines': [for (final line in lines) line.toJson()],
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
        'clientMutationId': ?clientMutationId,
      },
    );
    return LoadingTaskDetail.fromJson(_data(response));
  }

  /// Totals and per-outlet results: the review before completing, and the
  /// record afterwards.
  ///
  /// Calls `GET /api/loading/tasks/:tripId/summary`.
  Future<LoadingTaskSummary> getTaskSummary(String tripId) async {
    final response = await _apiService.get(ApiConstants.loadingTaskSummary(tripId));
    return LoadingTaskSummary.fromJson(_data(response));
  }

  /// Finishes loading and marks the vehicle ready for its driver.
  ///
  /// Calls `POST /api/loading/tasks/:tripId/complete`. Throws [ApiException]
  /// 422 `COMPLETION_BLOCKED` while lines are still to be loaded.
  Future<LoadingTaskSummary> completeTask(
    String tripId, {
    String? planRevision,
  }) async {
    final response = await _apiService.post(
      ApiConstants.loadingTaskComplete(tripId),
      body: {
        if (planRevision != null && planRevision.isNotEmpty)
          'planRevision': planRevision,
      },
    );
    return LoadingTaskSummary.fromJson(_data(response));
  }
}
