enum TaskStatus {
  pending,
  ready,
  inProgress,
  completed,
  hasIssue,
}

class LoadingTask {
  final String id;
  final String title;
  final String description;
  final TaskStatus status;
  final int totalItems;
  final int loadedItems;
  final String vehicleNumber;
  final DateTime scheduledDeparture;
  final String bayNumber;

  LoadingTask({
    required this.id,
    required this.title,
    required this.description,
    required this.status,
    required this.totalItems,
    required this.loadedItems,
    required this.vehicleNumber,
    required this.scheduledDeparture,
    required this.bayNumber,
  });

  factory LoadingTask.fromJson(Map<String, dynamic> json) {
    return LoadingTask(
      id: json['id'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      status: TaskStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => TaskStatus.pending,
      ),
      totalItems: json['totalItems'] as int? ?? 0,
      loadedItems: json['loadedItems'] as int? ?? 0,
      vehicleNumber: json['vehicleNumber'] as String? ?? '',
      scheduledDeparture: DateTime.parse(json['scheduledDeparture'] as String),
      bayNumber: json['bayNumber'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'title': title,
      'description': description,
      'status': status.name,
      'totalItems': totalItems,
      'loadedItems': loadedItems,
      'vehicleNumber': vehicleNumber,
      'scheduledDeparture': scheduledDeparture.toIso8601String(),
      'bayNumber': bayNumber,
    };
  }
}
