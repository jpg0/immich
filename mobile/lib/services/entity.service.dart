import 'package:hooks_riverpod/hooks_riverpod.dart';
import 'package:immich_mobile/entities/album.entity.dart';
import 'package:immich_mobile/infrastructure/entities/user.entity.dart';
import 'package:immich_mobile/infrastructure/repositories/user.repository.dart';
import 'package:immich_mobile/providers/infrastructure/user.provider.dart';
import 'package:immich_mobile/repositories/asset.repository.dart';

class EntityService {
  final AssetRepository _assetRepository;
  final IsarUserRepository _isarUserRepository;
  const EntityService(this._assetRepository, this._isarUserRepository);

  Future<Album> fillAlbumWithDatabaseEntities(Album album) async {
    final ownerId = album.ownerId;
    if (ownerId != null) {
      // replace owner with user from database
      final user = await _isarUserRepository.getByUserId(ownerId);
      album.owner.value = user == null ? null : User.fromDto(user);
    }
    final thumbnailAssetId = album.remoteThumbnailAssetId ?? album.thumbnail.value?.remoteId;
    if (thumbnailAssetId != null) {
      // set thumbnail with asset from database
      album.thumbnail.value = await _assetRepository.getByRemoteId(thumbnailAssetId);
    }
    if (album.remoteUsers.isNotEmpty) {
      // replace all users with users from database
      final users = await _isarUserRepository.getByUserIds(album.remoteUsers.map((user) => user.id).toList());
      album.sharedUsers.clear();
      album.sharedUsers.addAll(users.nonNulls.map(User.fromDto));
      album.shared = true;
    }
    if (album.remoteAssets.isNotEmpty) {
      // replace all assets with assets from database
      final assets = await _assetRepository.getAllByRemoteId(album.remoteAssets.map((asset) => asset.remoteId!));
      album.assets.clear();
      album.assets.addAll(assets);
    }
    return album;
  }
}

final entityServiceProvider = Provider(
  (ref) => EntityService(ref.watch(assetRepositoryProvider), ref.watch(userRepositoryProvider)),
);
