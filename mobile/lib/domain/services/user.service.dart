import 'dart:async';
import 'dart:typed_data';

import 'package:immich_mobile/domain/models/store.model.dart';
import 'package:immich_mobile/domain/models/user.model.dart';
import 'package:immich_mobile/domain/services/store.service.dart';
import 'package:immich_mobile/infrastructure/repositories/user.repository.dart';
import 'package:immich_mobile/infrastructure/repositories/user_api.repository.dart';
import 'package:logging/logging.dart';

class UserService {
  final Logger _log = Logger("UserService");
  final IsarUserRepository _isarUserRepository;
  final UserApiRepository _userApiRepository;
  final StoreService _storeService;

  UserService({
    required IsarUserRepository isarUserRepository,
    required UserApiRepository userApiRepository,
    required StoreService storeService,
  }) : _isarUserRepository = isarUserRepository,
       _userApiRepository = userApiRepository,
       _storeService = storeService;

  UserDto getMyUser() {
    return _storeService.get(StoreKey.currentUser);
  }

  UserDto? tryGetMyUser() {
    return _storeService.tryGet(StoreKey.currentUser);
  }

  Stream<UserDto?> watchMyUser() {
    return _storeService.watch(StoreKey.currentUser);
  }

  Future<UserDto?> refreshMyUser() async {
    final user = await _userApiRepository.getMyUser();
    if (user == null) return null;
    await _storeService.put(StoreKey.currentUser, user);
    await _isarUserRepository.update(user);
    return user;
  }

  Future<String?> createProfileImage(String name, Uint8List image) async {
    try {
      final path = await _userApiRepository.createProfileImage(name: name, data: image);
      final updatedUser = getMyUser().copyWith(profileImagePath: path);
      await _storeService.put(StoreKey.currentUser, updatedUser);
      await _isarUserRepository.update(updatedUser);
      return path;
    } catch (e) {
      _log.warning("Failed to upload profile image", e);
      return null;
    }
  }

  Future<List<UserDto>> getAll() async {
    return await _isarUserRepository.getAll();
  }

  Future<void> deleteAll() {
    return _isarUserRepository.deleteAll();
  }
}
