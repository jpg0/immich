//
// AUTO-GENERATED FILE, DO NOT MODIFY!
//
// @dart=2.18

// ignore_for_file: unused_element, unused_import
// ignore_for_file: always_put_required_named_parameters_first
// ignore_for_file: constant_identifier_names
// ignore_for_file: lines_longer_than_80_chars

part of openapi.api;

class SessionResponseDto {
  /// Returns a new [SessionResponseDto] instance.
  SessionResponseDto({
    required this.createdAt,
    required this.current,
    required this.deviceOS,
    required this.deviceType,
    this.expiresAt,
    required this.id,
    required this.isPendingSyncReset,
    required this.updatedAt,
  });

  String createdAt;

  bool current;

  String deviceOS;

  String deviceType;

  ///
  /// Please note: This property should have been non-nullable! Since the specification file
  /// does not include a default value (using the "default:" property), however, the generated
  /// source code must fall back to having a nullable type.
  /// Consider adding a "default:" property in the specification file to hide this note.
  ///
  String? expiresAt;

  String id;

  bool isPendingSyncReset;

  String updatedAt;

  @override
  bool operator ==(Object other) => identical(this, other) || other is SessionResponseDto &&
    other.createdAt == createdAt &&
    other.current == current &&
    other.deviceOS == deviceOS &&
    other.deviceType == deviceType &&
    other.expiresAt == expiresAt &&
    other.id == id &&
    other.isPendingSyncReset == isPendingSyncReset &&
    other.updatedAt == updatedAt;

  @override
  int get hashCode =>
    // ignore: unnecessary_parenthesis
    (createdAt.hashCode) +
    (current.hashCode) +
    (deviceOS.hashCode) +
    (deviceType.hashCode) +
    (expiresAt == null ? 0 : expiresAt!.hashCode) +
    (id.hashCode) +
    (isPendingSyncReset.hashCode) +
    (updatedAt.hashCode);

  @override
  String toString() => 'SessionResponseDto[createdAt=$createdAt, current=$current, deviceOS=$deviceOS, deviceType=$deviceType, expiresAt=$expiresAt, id=$id, isPendingSyncReset=$isPendingSyncReset, updatedAt=$updatedAt]';

  Map<String, dynamic> toJson() {
    final json = <String, dynamic>{};
      json[r'createdAt'] = this.createdAt;
      json[r'current'] = this.current;
      json[r'deviceOS'] = this.deviceOS;
      json[r'deviceType'] = this.deviceType;
    if (this.expiresAt != null) {
      json[r'expiresAt'] = this.expiresAt;
    } else {
    //  json[r'expiresAt'] = null;
    }
      json[r'id'] = this.id;
      json[r'isPendingSyncReset'] = this.isPendingSyncReset;
      json[r'updatedAt'] = this.updatedAt;
    return json;
  }

  /// Returns a new [SessionResponseDto] instance and imports its values from
  /// [value] if it's a [Map], null otherwise.
  // ignore: prefer_constructors_over_static_methods
  static SessionResponseDto? fromJson(dynamic value) {
    upgradeDto(value, "SessionResponseDto");
    if (value is Map) {
      final json = value.cast<String, dynamic>();

      return SessionResponseDto(
        createdAt: mapValueOfType<String>(json, r'createdAt')!,
        current: mapValueOfType<bool>(json, r'current')!,
        deviceOS: mapValueOfType<String>(json, r'deviceOS')!,
        deviceType: mapValueOfType<String>(json, r'deviceType')!,
        expiresAt: mapValueOfType<String>(json, r'expiresAt'),
        id: mapValueOfType<String>(json, r'id')!,
        isPendingSyncReset: mapValueOfType<bool>(json, r'isPendingSyncReset')!,
        updatedAt: mapValueOfType<String>(json, r'updatedAt')!,
      );
    }
    return null;
  }

  static List<SessionResponseDto> listFromJson(dynamic json, {bool growable = false,}) {
    final result = <SessionResponseDto>[];
    if (json is List && json.isNotEmpty) {
      for (final row in json) {
        final value = SessionResponseDto.fromJson(row);
        if (value != null) {
          result.add(value);
        }
      }
    }
    return result.toList(growable: growable);
  }

  static Map<String, SessionResponseDto> mapFromJson(dynamic json) {
    final map = <String, SessionResponseDto>{};
    if (json is Map && json.isNotEmpty) {
      json = json.cast<String, dynamic>(); // ignore: parameter_assignments
      for (final entry in json.entries) {
        final value = SessionResponseDto.fromJson(entry.value);
        if (value != null) {
          map[entry.key] = value;
        }
      }
    }
    return map;
  }

  // maps a json object with a list of SessionResponseDto-objects as value to a dart map
  static Map<String, List<SessionResponseDto>> mapListFromJson(dynamic json, {bool growable = false,}) {
    final map = <String, List<SessionResponseDto>>{};
    if (json is Map && json.isNotEmpty) {
      // ignore: parameter_assignments
      json = json.cast<String, dynamic>();
      for (final entry in json.entries) {
        map[entry.key] = SessionResponseDto.listFromJson(entry.value, growable: growable,);
      }
    }
    return map;
  }

  /// The list of required keys that must be present in a JSON.
  static const requiredKeys = <String>{
    'createdAt',
    'current',
    'deviceOS',
    'deviceType',
    'id',
    'isPendingSyncReset',
    'updatedAt',
  };
}

