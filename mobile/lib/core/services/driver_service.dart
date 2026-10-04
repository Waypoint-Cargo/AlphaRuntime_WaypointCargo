import 'dart:convert';
import 'dart:typed_data';
import '../../models/driver_task.dart';
import '../constants/api_constants.dart';
import '../utils/helpers.dart';
import 'api_service.dart';

/// What happened at a stop: the driver's events (the API takes these four).
enum StopEventType {
  arrived('ARRIVED'),
  unloadingStarted('UNLOADING_STARTED'),
  failed('FAILED'),
  skipped('SKIPPED');

  final String apiValue;
  const StopEventType(this.apiValue);
}

/// How many units of one order line were handed over.
class DeliveredLine {
  final String orderItemId;
  final int deliveredQty;

  const DeliveredLine({required this.orderItemId, required this.deliveredQty});

  Map<String, dynamic> toJson() => {
        'orderItemId': orderItemId,
        'deliveredQty': deliveredQty,
      };
}

/// Driver service for the mobile application: the delivery task APIs.
class DriverService {
  final ApiService _apiService;

  DriverService({ApiService? apiService})
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

  List<DriverTask> _trips(Map<String, dynamic> response) => [
        for (final trip in Helpers.toMapList(_data(response)['trips']))
          DriverTask.fromJson(trip),
      ];

  /// Tasks any driver can pick: trips the loader has finished that nobody has taken.
  ///
  /// Calls `GET /api/deliveries/available`.
  Future<List<DriverTask>> getAvailableTasks() async {
    return _trips(await _apiService.get(ApiConstants.deliveriesAvailable));
  }

  /// The trips this driver has picked (today's, plus any still to be driven).
  ///
  /// Calls `GET /api/deliveries/today`.
  Future<List<DriverTask>> getMyTasks() async {
    return _trips(await _apiService.get(ApiConstants.deliveriesToday));
  }

  /// Figures for the Tasks page: stops done, remaining, on-time share.
  ///
  /// Calls `GET /api/deliveries/summary`.
  Future<DriverSummary> getSummary() async {
    final response = await _apiService.get(ApiConstants.deliveriesSummary);
    return DriverSummary.fromJson(_data(response));
  }

  /// "Select Task": the driver takes an available task.
  ///
  /// Calls `POST /api/deliveries/tasks/:tripId/select`. Throws [ApiException]
  /// 409 (`TASK_TAKEN`, `TASK_NOT_AVAILABLE`, `DRIVER_HAS_ACTIVE_TASK`) when it
  /// cannot be taken.
  Future<DriverTask> selectTask(String tripId) async {
    final response =
        await _apiService.post(ApiConstants.deliveryTaskSelect(tripId));
    return DriverTask.fromJson(Helpers.toMap(_data(response)['trip']));
  }

  /// "Start Trip": the vehicle leaves the depot.
  ///
  /// Calls `POST /api/deliveries/trips/:tripId/depart`.
  Future<void> depart(String tripId, {String? clientMutationId}) async {
    await _apiService.post(
      ApiConstants.deliveryTripDepart(tripId),
      body: {
        'recordedAtDevice': DateTime.now().toUtc().toIso8601String(),
        'clientMutationId': ?clientMutationId,
      },
    );
  }

  /// Records that the driver arrived, started unloading, or could not deliver.
  ///
  /// Calls `POST /api/deliveries/stops/:stopId/events`. [failureReason] is
  /// required for [StopEventType.failed].
  Future<void> recordStopEvent(
    String stopId,
    StopEventType type, {
    String? failureReason,
    String? clientMutationId,
  }) async {
    await _apiService.post(
      ApiConstants.deliveryStopEvents(stopId),
      body: {
        'type': type.apiValue,
        'recordedAtDevice': DateTime.now().toUtc().toIso8601String(),
        if (failureReason != null && failureReason.trim().isNotEmpty)
          'failureReason': failureReason.trim(),
        'clientMutationId': ?clientMutationId,
      },
    );
  }

  /// Uploads a captured image (the receiver's signature, a photo).
  ///
  /// Calls `POST /api/files` and returns the new file's id. [clientFileId]
  /// makes a retried upload return the same file.
  Future<String> uploadImage(
    Uint8List bytes, {
    required String kind, // SIGNATURE, POD_PHOTO or ISSUE_PHOTO
    String mimeType = 'image/png',
    String? clientFileId,
  }) async {
    final response = await _apiService.post(
      ApiConstants.files,
      body: {
        'kind': kind,
        'mimeType': mimeType,
        'dataBase64': base64Encode(bytes),
        'clientFileId': ?clientFileId,
      },
    );
    return _data(response)['id']?.toString() ?? '';
  }

  /// Proof of delivery for a stop; the stop becomes COMPLETED, or PARTIAL when
  /// fewer units were handed over than planned.
  ///
  /// Calls `POST /api/deliveries/stops/:stopId/proof`. With
  /// [allDeliveredAsPlanned] the server uses the loaded quantities; otherwise
  /// [lines] must list every line of the stop.
  Future<void> submitProof(
    String stopId, {
    required String receiverName,
    required String signatureFileId,
    List<String> photoFileIds = const [],
    required bool allDeliveredAsPlanned,
    List<DeliveredLine>? lines,
    String? clientMutationId,
  }) async {
    await _apiService.post(
      ApiConstants.deliveryStopProof(stopId),
      body: {
        'receiverName': receiverName.trim(),
        'signatureFileId': signatureFileId,
        'photoFileIds': photoFileIds,
        'allDeliveredAsPlanned': allDeliveredAsPlanned,
        if (!allDeliveredAsPlanned && lines != null)
          'lines': [for (final line in lines) line.toJson()],
        'capturedAtDevice': DateTime.now().toUtc().toIso8601String(),
        'clientMutationId': ?clientMutationId,
      },
    );
  }

  /// Asks the dispatcher to change the order of the stops still waiting.
  ///
  /// Calls `POST /api/trips/:tripId/sequence-requests`. [proposedStopIds] is
  /// every pending stop in the order the driver wants.
  Future<void> requestSequenceChange(
    String tripId, {
    required List<String> proposedStopIds,
    String? reason,
  }) async {
    await _apiService.post(
      ApiConstants.tripSequenceRequests(tripId),
      body: {
        'proposedStopIds': proposedStopIds,
        if (reason != null && reason.trim().isNotEmpty) 'reason': reason.trim(),
      },
    );
  }

  /// The stop-order requests made for a trip, newest first.
  ///
  /// Calls `GET /api/trips/:tripId/sequence-requests`.
  Future<List<SequenceRequest>> getSequenceRequests(String tripId) async {
    final response =
        await _apiService.get(ApiConstants.tripSequenceRequests(tripId));
    final data = response['data'];
    return [
      if (data is List)
        for (final item in data)
          if (item is Map)
            SequenceRequest.fromJson(Map<String, dynamic>.from(item)),
    ];
  }

  /// The issues this driver reported, newest first.
  ///
  /// Calls `GET /api/issues`.
  Future<List<DriverIssue>> getIssues() async {
    final response =
        await _apiService.get('${ApiConstants.issues}?pageSize=100');
    final items = _data(response)['items'];
    return [
      for (final item in Helpers.toMapList(items)) DriverIssue.fromJson(item),
    ];
  }

  /// Reports a problem on the trip (and optionally one of its stops).
  ///
  /// Calls `POST /api/issues`. The description is at most 200 characters for
  /// drivers.
  Future<void> reportIssue({
    required DriverIssueType type,
    required String tripId,
    String? stopId,
    String? description,
    String? clientMutationId,
  }) async {
    await _apiService.post(
      ApiConstants.issues,
      body: {
        'type': type.apiValue,
        'tripId': tripId,
        'stopId': ?stopId,
        if (description != null && description.trim().isNotEmpty)
          'description': description.trim(),
        'reportedAtDevice': DateTime.now().toUtc().toIso8601String(),
        'clientMutationId': ?clientMutationId,
      },
    );
  }
}
