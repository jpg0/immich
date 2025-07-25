import { AssetType, AssetVisibility, JobName, JobStatus } from 'src/enum';
import { DuplicateService } from 'src/services/duplicate.service';
import { SearchService } from 'src/services/search.service';
import { assetStub } from 'test/fixtures/asset.stub';
import { authStub } from 'test/fixtures/auth.stub';
import { makeStream, newTestService, ServiceMocks } from 'test/utils';
import { beforeEach, vitest } from 'vitest';

vitest.useFakeTimers();

const hasEmbedding = {
  id: 'asset-1',
  ownerId: 'user-id',
  stackId: null,
  type: AssetType.Image,
  duplicateId: null,
  embedding: '[1, 2, 3, 4]',
  visibility: AssetVisibility.Timeline,
};

const hasDupe = {
  ...hasEmbedding,
  id: 'asset-2',
  duplicateId: 'duplicate-id',
};

describe(SearchService.name, () => {
  let sut: DuplicateService;
  let mocks: ServiceMocks;

  beforeEach(() => {
    ({ sut, mocks } = newTestService(DuplicateService));
  });

  it('should work', () => {
    expect(sut).toBeDefined();
  });

  describe('getDuplicates', () => {
    it('should get duplicates', async () => {
      mocks.duplicateRepository.getAll.mockResolvedValue([
        {
          duplicateId: 'duplicate-id',
          assets: [assetStub.image, assetStub.image],
        },
      ]);
      await expect(sut.getDuplicates(authStub.admin)).resolves.toEqual([
        {
          duplicateId: 'duplicate-id',
          assets: [
            expect.objectContaining({ id: assetStub.image.id }),
            expect.objectContaining({ id: assetStub.image.id }),
          ],
        },
      ]);
    });
  });

  describe('handleQueueSearchDuplicates', () => {
    beforeEach(() => {
      mocks.systemMetadata.get.mockResolvedValue({
        machineLearning: {
          enabled: true,
          duplicateDetection: {
            enabled: true,
          },
        },
      });
    });

    it('should skip if machine learning is disabled', async () => {
      mocks.systemMetadata.get.mockResolvedValue({
        machineLearning: {
          enabled: false,
          duplicateDetection: {
            enabled: true,
          },
        },
      });

      await expect(sut.handleQueueSearchDuplicates({})).resolves.toBe(JobStatus.Skipped);
      expect(mocks.job.queue).not.toHaveBeenCalled();
      expect(mocks.job.queueAll).not.toHaveBeenCalled();
      expect(mocks.systemMetadata.get).toHaveBeenCalled();
    });

    it('should skip if duplicate detection is disabled', async () => {
      mocks.systemMetadata.get.mockResolvedValue({
        machineLearning: {
          enabled: true,
          duplicateDetection: {
            enabled: false,
          },
        },
      });

      await expect(sut.handleQueueSearchDuplicates({})).resolves.toBe(JobStatus.Skipped);
      expect(mocks.job.queue).not.toHaveBeenCalled();
      expect(mocks.job.queueAll).not.toHaveBeenCalled();
      expect(mocks.systemMetadata.get).toHaveBeenCalled();
    });

    it('should queue missing assets', async () => {
      mocks.assetJob.streamForSearchDuplicates.mockReturnValue(makeStream([assetStub.image]));

      await sut.handleQueueSearchDuplicates({});

      expect(mocks.assetJob.streamForSearchDuplicates).toHaveBeenCalledWith(undefined);
      expect(mocks.job.queueAll).toHaveBeenCalledWith([
        {
          name: JobName.AssetDetectDuplicates,
          data: { id: assetStub.image.id },
        },
      ]);
    });

    it('should queue all assets', async () => {
      mocks.assetJob.streamForSearchDuplicates.mockReturnValue(makeStream([assetStub.image]));

      await sut.handleQueueSearchDuplicates({ force: true });

      expect(mocks.assetJob.streamForSearchDuplicates).toHaveBeenCalledWith(true);
      expect(mocks.job.queueAll).toHaveBeenCalledWith([
        {
          name: JobName.AssetDetectDuplicates,
          data: { id: assetStub.image.id },
        },
      ]);
    });
  });

  describe('handleSearchDuplicates', () => {
    beforeEach(() => {
      mocks.systemMetadata.get.mockResolvedValue({
        machineLearning: {
          enabled: true,
          duplicateDetection: {
            enabled: true,
          },
        },
      });
    });

    it('should skip if machine learning is disabled', async () => {
      mocks.systemMetadata.get.mockResolvedValue({
        machineLearning: {
          enabled: false,
          duplicateDetection: {
            enabled: true,
          },
        },
      });
      const id = assetStub.livePhotoMotionAsset.id;

      const result = await sut.handleSearchDuplicates({ id });

      expect(result).toBe(JobStatus.Skipped);
      expect(mocks.assetJob.getForSearchDuplicatesJob).not.toHaveBeenCalled();
    });

    it('should skip if duplicate detection is disabled', async () => {
      mocks.systemMetadata.get.mockResolvedValue({
        machineLearning: {
          enabled: true,
          duplicateDetection: {
            enabled: false,
          },
        },
      });
      const id = assetStub.livePhotoMotionAsset.id;

      const result = await sut.handleSearchDuplicates({ id });

      expect(result).toBe(JobStatus.Skipped);
      expect(mocks.assetJob.getForSearchDuplicatesJob).not.toHaveBeenCalled();
    });

    it('should fail if asset is not found', async () => {
      mocks.assetJob.getForSearchDuplicatesJob.mockResolvedValue(void 0);

      const result = await sut.handleSearchDuplicates({ id: assetStub.image.id });

      expect(result).toBe(JobStatus.Failed);
      expect(mocks.logger.error).toHaveBeenCalledWith(`Asset ${assetStub.image.id} not found`);
    });

    it('should skip if asset is part of stack', async () => {
      const id = assetStub.primaryImage.id;
      mocks.assetJob.getForSearchDuplicatesJob.mockResolvedValue({ ...hasEmbedding, stackId: 'stack-id' });

      const result = await sut.handleSearchDuplicates({ id });

      expect(result).toBe(JobStatus.Skipped);
      expect(mocks.logger.debug).toHaveBeenCalledWith(`Asset ${id} is part of a stack, skipping`);
    });

    it('should skip if asset is not visible', async () => {
      const id = assetStub.livePhotoMotionAsset.id;
      mocks.assetJob.getForSearchDuplicatesJob.mockResolvedValue({
        ...hasEmbedding,
        visibility: AssetVisibility.Hidden,
      });

      const result = await sut.handleSearchDuplicates({ id });

      expect(result).toBe(JobStatus.Skipped);
      expect(mocks.logger.debug).toHaveBeenCalledWith(`Asset ${id} is not visible, skipping`);
    });

    it('should fail if asset is missing embedding', async () => {
      mocks.assetJob.getForSearchDuplicatesJob.mockResolvedValue({ ...hasEmbedding, embedding: null });

      const result = await sut.handleSearchDuplicates({ id: assetStub.image.id });

      expect(result).toBe(JobStatus.Failed);
      expect(mocks.logger.debug).toHaveBeenCalledWith(`Asset ${assetStub.image.id} is missing embedding`);
    });

    it('should search for duplicates and update asset with duplicateId', async () => {
      mocks.assetJob.getForSearchDuplicatesJob.mockResolvedValue(hasEmbedding);
      mocks.duplicateRepository.search.mockResolvedValue([
        { assetId: assetStub.image.id, distance: 0.01, duplicateId: null },
      ]);
      mocks.duplicateRepository.merge.mockResolvedValue();
      const expectedAssetIds = [assetStub.image.id, hasEmbedding.id];

      const result = await sut.handleSearchDuplicates({ id: hasEmbedding.id });

      expect(result).toBe(JobStatus.Success);
      expect(mocks.duplicateRepository.search).toHaveBeenCalledWith({
        assetId: hasEmbedding.id,
        embedding: hasEmbedding.embedding,
        maxDistance: 0.01,
        type: hasEmbedding.type,
        userIds: [hasEmbedding.ownerId],
      });
      expect(mocks.duplicateRepository.merge).toHaveBeenCalledWith({
        assetIds: expectedAssetIds,
        targetId: expect.any(String),
        sourceIds: [],
      });
      expect(mocks.asset.upsertJobStatus).toHaveBeenCalledWith(
        ...expectedAssetIds.map((assetId) => ({ assetId, duplicatesDetectedAt: expect.any(Date) })),
      );
    });

    it('should use existing duplicate ID among matched duplicates', async () => {
      const duplicateId = hasDupe.duplicateId;
      mocks.assetJob.getForSearchDuplicatesJob.mockResolvedValue(hasEmbedding);
      mocks.duplicateRepository.search.mockResolvedValue([{ assetId: hasDupe.id, distance: 0.01, duplicateId }]);
      mocks.duplicateRepository.merge.mockResolvedValue();
      const expectedAssetIds = [hasEmbedding.id];

      const result = await sut.handleSearchDuplicates({ id: hasEmbedding.id });

      expect(result).toBe(JobStatus.Success);
      expect(mocks.duplicateRepository.search).toHaveBeenCalledWith({
        assetId: hasEmbedding.id,
        embedding: hasEmbedding.embedding,
        maxDistance: 0.01,
        type: hasEmbedding.type,
        userIds: [hasEmbedding.ownerId],
      });
      expect(mocks.duplicateRepository.merge).toHaveBeenCalledWith({
        assetIds: expectedAssetIds,
        targetId: duplicateId,
        sourceIds: [],
      });
      expect(mocks.asset.upsertJobStatus).toHaveBeenCalledWith(
        ...expectedAssetIds.map((assetId) => ({ assetId, duplicatesDetectedAt: expect.any(Date) })),
      );
    });

    it('should remove duplicateId if no duplicates found and asset has duplicateId', async () => {
      mocks.assetJob.getForSearchDuplicatesJob.mockResolvedValue(hasDupe);
      mocks.duplicateRepository.search.mockResolvedValue([]);

      const result = await sut.handleSearchDuplicates({ id: hasDupe.id });

      expect(result).toBe(JobStatus.Success);
      expect(mocks.asset.update).toHaveBeenCalledWith({ id: hasDupe.id, duplicateId: null });
      expect(mocks.asset.upsertJobStatus).toHaveBeenCalledWith({
        assetId: hasDupe.id,
        duplicatesDetectedAt: expect.any(Date),
      });
    });
  });
});
