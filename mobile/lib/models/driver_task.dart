import '../core/utils/helpers.dart';

/// A minute of the day (the API's `windowStartMin`) as "07:30 AM".
String formatMinuteOfDay(int minutes) {
  final h24 = (minutes ~/ 60) % 24;
  final m = minutes % 60;
  final h12 = h24 % 12 == 0 ? 12 : h24 % 12;
  return '${h12.toString().padLeft(2, '0')}:${m.toString().padLeft(2, '0')} '
      '${h24 < 12 ? 'AM' : 'PM'}';
}

double? _toDouble(Object? value) => value is num ? value.toDouble() : null;

/// The outlet a stop delivers to.
class DriverOutlet {
  final String id;
  final String code;
  final String name;
  final String district;
  final String address;
  final String phone;
  final double? lat;
  final double? lng;
  final int? windowStartMin;
  final int? windowEndMin;
  final String unloadingNotes;

  const DriverOutlet({
    required this.id,
    required this.code,
    required this.name,
    required this.district,
    required this.address,
    required this.phone,
    this.lat,
    this.lng,
    this.windowStartMin,
    this.windowEndMin,
    this.unloadingNotes = '',
  });

  factory DriverOutlet.fromJson(Map<String, dynamic> json) {
    final window = Helpers.toMap(json['effectiveWindow']);
    return DriverOutlet(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      name: json['name']?.toString() ?? '',
      district: json['district']?.toString() ?? '',
      address: json['address']?.toString() ?? '',
      phone: json['phone']?.toString() ?? '',
      lat: _toDouble(json['lat']),
      lng: _toDouble(json['lng']),
      windowStartMin: window['startMin'] is num
          ? (window['startMin'] as num).toInt()
          : null,
      windowEndMin:
          window['endMin'] is num ? (window['endMin'] as num).toInt() : null,
      unloadingNotes: json['unloadingNotes']?.toString() ?? '',
    );
  }

  /// "07:30 AM - 08:30 AM", or "Anytime" when the outlet has no window.
  String get windowLabel {
    if (windowStartMin == null || windowEndMin == null) return 'Anytime';
    return '${formatMinuteOfDay(windowStartMin!)} - ${formatMinuteOfDay(windowEndMin!)}';
  }
}

/// One order line to hand over at a stop.
class DriverOrderItem {
  final String id;
  final int lineNo;
  final String itemName;
  final String unit;
  final int quantity;

  /// What the loader actually put on the vehicle; the most that can be delivered.
  final int loadedQty;

  const DriverOrderItem({
    required this.id,
    required this.lineNo,
    required this.itemName,
    required this.unit,
    required this.quantity,
    required this.loadedQty,
  });

  factory DriverOrderItem.fromJson(Map<String, dynamic> json) {
    final quantity = Helpers.toInt(json['quantity']);
    return DriverOrderItem(
      id: json['id']?.toString() ?? '',
      lineNo: Helpers.toInt(json['lineNo']),
      itemName: json['itemName']?.toString() ?? '',
      unit: json['unit']?.toString() ?? '',
      quantity: quantity,
      loadedQty: Helpers.toInt(json['loadedQty'], quantity),
    );
  }
}

class DriverOrder {
  final String id;
  final String reference;
  final String tempClass;
  final String specialInstructions;
  final bool isFragile;
  final bool isHighValue;
  final List<DriverOrderItem> items;

  const DriverOrder({
    required this.id,
    required this.reference,
    required this.tempClass,
    required this.specialInstructions,
    required this.isFragile,
    required this.isHighValue,
    required this.items,
  });

  factory DriverOrder.fromJson(Map<String, dynamic> json) {
    return DriverOrder(
      id: json['id']?.toString() ?? '',
      reference: json['reference']?.toString() ?? '',
      tempClass: json['tempClass']?.toString() ?? '',
      specialInstructions: json['specialInstructions']?.toString() ?? '',
      isFragile: json['isFragile'] == true,
      isHighValue: json['isHighValue'] == true,
      items: [
        for (final item in Helpers.toMapList(json['items']))
          DriverOrderItem.fromJson(item),
      ],
    );
  }
}

/// One stop of a driver task.
class DriverTaskStop {
  final String id;
  final int sequence;

  /// PENDING, ARRIVED, UNLOADING, COMPLETED, PARTIAL, FAILED or SKIPPED.
  final String status;
  final DateTime? predictedArrival;
  final DateTime? arrivedAt;
  final DateTime? completedAt;
  final String failureReason;
  final bool hasProof;
  final DriverOutlet outlet;
  final List<DriverOrder> orders;

  const DriverTaskStop({
    required this.id,
    required this.sequence,
    required this.status,
    required this.outlet,
    required this.orders,
    this.predictedArrival,
    this.arrivedAt,
    this.completedAt,
    this.failureReason = '',
    this.hasProof = false,
  });

  factory DriverTaskStop.fromJson(Map<String, dynamic> json) {
    return DriverTaskStop(
      id: json['id']?.toString() ?? '',
      sequence: Helpers.toInt(json['sequence']),
      status: json['status']?.toString() ?? 'PENDING',
      predictedArrival: Helpers.toDate(json['predictedArrival']),
      arrivedAt: Helpers.toDate(json['arrivedAt']),
      completedAt: Helpers.toDate(json['completedAt']),
      failureReason: json['failureReason']?.toString() ?? '',
      hasProof: json['hasProof'] == true,
      outlet: DriverOutlet.fromJson(Helpers.toMap(json['outlet'])),
      orders: [
        for (final order in Helpers.toMapList(json['orders']))
          DriverOrder.fromJson(order),
      ],
    );
  }

  /// Delivered, partly delivered, failed or skipped: nothing more to do here.
  bool get isDone =>
      const {'COMPLETED', 'PARTIAL', 'FAILED', 'SKIPPED'}.contains(status);
  bool get isPending => status == 'PENDING';
  bool get isArrived => status == 'ARRIVED';
  bool get isUnloading => status == 'UNLOADING';

  /// Every line to hand over at this stop.
  List<DriverOrderItem> get items => [for (final o in orders) ...o.items];

  /// Delivery instructions: the outlet's unloading notes and every order's note.
  String get instructions {
    final parts = <String>[
      if (outlet.unloadingNotes.isNotEmpty) outlet.unloadingNotes,
      for (final order in orders)
        if (order.specialInstructions.isNotEmpty) order.specialInstructions,
    ];
    return parts.isEmpty ? 'No special instructions' : parts.join('\n');
  }
}

/// A delivery route (trip) a driver can pick, or has picked.
///
/// Comes from `GET /api/deliveries/available` and `GET /api/deliveries/today`.
class DriverTask {
  final String id;
  final String code;
  final int tripNumber;

  /// The trip status: LOADED (ready to leave), IN_TRANSIT, COMPLETED, ...
  final String status;
  final String vehicleCode;
  final String vehicleType;
  final bool isRefrigerated;
  final String depotName;
  final double plannedDistanceKm;
  final DateTime? actualDeparture;
  final List<DriverTaskStop> stops;

  const DriverTask({
    required this.id,
    required this.code,
    required this.tripNumber,
    required this.status,
    required this.vehicleCode,
    required this.vehicleType,
    required this.isRefrigerated,
    required this.depotName,
    required this.plannedDistanceKm,
    required this.stops,
    this.actualDeparture,
  });

  factory DriverTask.fromJson(Map<String, dynamic> json) {
    final vehicle = Helpers.toMap(json['vehicle']);
    final depot = Helpers.toMap(json['depot']);
    return DriverTask(
      id: json['id']?.toString() ?? '',
      code: json['code']?.toString() ?? '',
      tripNumber: Helpers.toInt(json['tripNumber'], 1),
      status: json['status']?.toString() ?? '',
      vehicleCode: vehicle['code']?.toString() ?? '',
      vehicleType: vehicle['type']?.toString() ?? '',
      isRefrigerated: vehicle['isRefrigerated'] == true,
      depotName: depot['name']?.toString() ?? '',
      plannedDistanceKm: _toDouble(json['plannedDistanceKm']) ?? 0,
      actualDeparture: Helpers.toDate(json['actualDeparture']),
      stops: [
        for (final stop in Helpers.toMapList(json['stops']))
          DriverTaskStop.fromJson(stop),
      ]..sort((a, b) => a.sequence.compareTo(b.sequence)),
    );
  }

  bool get isLoaded => status == 'LOADED';
  bool get isInTransit => status == 'IN_TRANSIT';
  bool get isFinished => status == 'COMPLETED' || status == 'CANCELLED';

  int get doneStops => stops.where((s) => s.isDone).length;
  List<DriverTaskStop> get pendingStops =>
      stops.where((s) => s.isPending).toList();

  /// The first stop that is not finished: where the driver goes next.
  DriverTaskStop? get nextStop {
    for (final stop in stops) {
      if (!stop.isDone) return stop;
    }
    return null;
  }

  DriverTaskStop? stopById(String id) {
    for (final stop in stops) {
      if (stop.id == id) return stop;
    }
    return null;
  }

  /// Stops can be reordered while at least two of them are still waiting.
  bool get canRequestSequenceChange =>
      (isLoaded || isInTransit) && pendingStops.length >= 2;
}

/// The Tasks page header figures: `GET /api/deliveries/summary`.
class DriverSummary {
  final int totalStops;
  final int completedStops;
  final int failedStops;
  final int remainingStops;
  final double onTimePct;

  const DriverSummary({
    this.totalStops = 0,
    this.completedStops = 0,
    this.failedStops = 0,
    this.remainingStops = 0,
    this.onTimePct = 0,
  });

  factory DriverSummary.fromJson(Map<String, dynamic> json) {
    return DriverSummary(
      totalStops: Helpers.toInt(json['totalStops']),
      completedStops: Helpers.toInt(json['completedStops']),
      failedStops: Helpers.toInt(json['failedStops']),
      remainingStops: Helpers.toInt(json['remainingStops']),
      onTimePct: _toDouble(json['onTimePct']) ?? 0,
    );
  }
}

/// A driver's request to change the stop order: `/api/trips/:id/sequence-requests`.
class SequenceRequest {
  final String id;
  final String status; // PENDING, APPROVED or REJECTED
  final String reason;
  final List<String> proposedStopIds;
  final DateTime? createdAt;

  const SequenceRequest({
    required this.id,
    required this.status,
    required this.reason,
    required this.proposedStopIds,
    this.createdAt,
  });

  factory SequenceRequest.fromJson(Map<String, dynamic> json) {
    return SequenceRequest(
      id: json['id']?.toString() ?? '',
      status: json['status']?.toString() ?? 'PENDING',
      reason: json['reason']?.toString() ?? '',
      proposedStopIds: Helpers.toStringList(json['proposedStopIds']),
      createdAt: Helpers.toDate(json['createdAt']),
    );
  }
}

/// An issue the driver reported: `/api/issues`.
class DriverIssue {
  final String id;
  final String reference;
  final String type;
  final String typeLabel;
  final String status; // OPEN, INVESTIGATING or RESOLVED
  final String description;
  final String tripCode;
  final String outletName;
  final String resolutionNote;
  final DateTime? createdAt;

  const DriverIssue({
    required this.id,
    required this.reference,
    required this.type,
    required this.typeLabel,
    required this.status,
    required this.description,
    required this.tripCode,
    required this.outletName,
    required this.resolutionNote,
    this.createdAt,
  });

  factory DriverIssue.fromJson(Map<String, dynamic> json) {
    return DriverIssue(
      id: json['id']?.toString() ?? '',
      reference: json['reference']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      typeLabel: json['typeLabel']?.toString() ?? json['type']?.toString() ?? '',
      status: json['status']?.toString() ?? 'OPEN',
      description: json['description']?.toString() ?? '',
      tripCode: Helpers.toMap(json['trip'])['code']?.toString() ?? '',
      outletName: Helpers.toMap(json['stop'])['outletName']?.toString() ?? '',
      resolutionNote: json['resolutionNote']?.toString() ?? '',
      createdAt: Helpers.toDate(json['createdAt']),
    );
  }

  bool get isResolved => status == 'RESOLVED';
}

/// What a driver can report (the API's DRIVER issue types) and how it reads.
enum DriverIssueType {
  outletClosed('OUTLET_CLOSED', 'Outlet closed'),
  vehicleProblem('VEHICLE_PROBLEM', 'Vehicle problem'),
  trafficDelay('TRAFFIC_DELAY', 'Traffic delay'),
  other('OTHER', 'Other');

  final String apiValue;
  final String label;
  const DriverIssueType(this.apiValue, this.label);
}
