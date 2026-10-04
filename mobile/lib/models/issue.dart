enum IssueSeverity {
  low,
  medium,
  high,
  critical,
}

enum IssueStatus {
  open,
  inReview,
  resolved,
}

class Issue {
  final String id;
  final String taskId;
  final String title;
  final String description;
  final IssueSeverity severity;
  final IssueStatus status;
  final DateTime createdAt;
  final String reportedBy;

  Issue({
    required this.id,
    required this.taskId,
    required this.title,
    required this.description,
    required this.severity,
    required this.status,
    required this.createdAt,
    required this.reportedBy,
  });

  factory Issue.fromJson(Map<String, dynamic> json) {
    return Issue(
      id: json['id'] as String,
      taskId: json['taskId'] as String,
      title: json['title'] as String,
      description: json['description'] as String? ?? '',
      severity: IssueSeverity.values.firstWhere(
        (e) => e.name == json['severity'],
        orElse: () => IssueSeverity.medium,
      ),
      status: IssueStatus.values.firstWhere(
        (e) => e.name == json['status'],
        orElse: () => IssueStatus.open,
      ),
      createdAt: DateTime.parse(json['createdAt'] as String),
      reportedBy: json['reportedBy'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'taskId': taskId,
      'title': title,
      'description': description,
      'severity': severity.name,
      'status': status.name,
      'createdAt': createdAt.toIso8601String(),
      'reportedBy': reportedBy,
    };
  }
}
