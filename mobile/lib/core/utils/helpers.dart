/// Small helpers shared by the models for reading API JSON defensively.
class Helpers {
  Helpers._();

  /// A JSON number as an int (JSON may send 5 or 5.0); [fallback] when missing.
  static int toInt(Object? value, [int fallback = 0]) =>
      value is num ? value.toInt() : fallback;

  /// A JSON object as a map; empty when missing or not an object.
  static Map<String, dynamic> toMap(Object? value) =>
      value is Map ? Map<String, dynamic>.from(value) : <String, dynamic>{};

  /// A JSON array of objects as a list of maps; empty when missing.
  static List<Map<String, dynamic>> toMapList(Object? value) => value is List
      ? [
          for (final item in value)
            if (item is Map) Map<String, dynamic>.from(item),
        ]
      : <Map<String, dynamic>>[];

  /// A JSON array of strings; empty when missing.
  static List<String> toStringList(Object? value) => value is List
      ? [
          for (final item in value)
            if (item is String) item,
        ]
      : <String>[];

  /// An ISO-8601 string as a DateTime; null when missing or malformed.
  static DateTime? toDate(Object? value) =>
      value is String ? DateTime.tryParse(value) : null;
}
