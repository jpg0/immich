import { Kysely } from 'kysely';
import { DateTime } from 'luxon';
import { AssetFileType, MemoryType, Permission } from 'src/enum';
import { AccessRepository } from 'src/repositories/access.repository';
import { AssetRepository } from 'src/repositories/asset.repository';
// import { RandomMemoriesSearchDto } from 'src/dtos/memory.dto'; // Removed as tests are removed
import { DatabaseRepository } from 'src/repositories/database.repository';
import { LoggingRepository } from 'src/repositories/logging.repository';
import { MemoryRepository } from 'src/repositories/memory.repository';
import { PartnerRepository } from 'src/repositories/partner.repository';
import { SystemMetadataRepository } from 'src/repositories/system-metadata.repository';
import { UserRepository } from 'src/repositories/user.repository';
import { DB } from 'src/schema';
import { MemoryService } from 'src/services/memory.service';
import { MemoryResponseDto } from 'src/dtos/memory.dto';
import { newMediumService, newTestApp } from 'test/medium.factory';
import { factory } from 'test/small.factory';
import { getKyselyDB, TestApp } from 'test/utils';

let defaultDatabase: Kysely<DB>;
let app: TestApp;

const setup = (db?: Kysely<DB>) => {
  return newMediumService(MemoryService, {
    database: db || defaultDatabase,
    real: [
      AccessRepository,
      AssetRepository,
      DatabaseRepository,
      MemoryRepository,
      UserRepository,
      SystemMetadataRepository,
      UserRepository,
      PartnerRepository,
    ],
    mock: [LoggingRepository],
  });
};

describe(MemoryService.name, () => {
  beforeEach(async () => {
    defaultDatabase = await getKyselyDB();
    app = await newTestApp({ db: defaultDatabase });
  });

  afterEach(async () => {
    await app?.close();
  });

  describe('create', () => {
    it('should create a new memory', async () => {
      const { sut, ctx } = setup();
      const { user } = await ctx.newUser();
      const auth = factory.auth({ user });
      const dto = {
        type: MemoryType.ON_THIS_DAY,
        data: { year: 2021 },
        memoryAt: new Date(2021),
      };

      await expect(sut.create(auth, dto)).resolves.toEqual({
        id: expect.any(String),
        type: dto.type,
        data: dto.data,
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date),
        isSaved: false,
        memoryAt: dto.memoryAt,
        ownerId: user.id,
        assets: [],
      });
    });

    it('should create a new memory (with assets)', async () => {
      const { sut, ctx } = setup();
      const { user } = await ctx.newUser();
      const { asset: asset1 } = await ctx.newAsset({ ownerId: user.id });
      const { asset: asset2 } = await ctx.newAsset({ ownerId: user.id });
      const auth = factory.auth({ user });
      const dto = {
        type: MemoryType.ON_THIS_DAY,
        data: { year: 2021 },
        memoryAt: new Date(2021),
        assetIds: [asset1.id, asset2.id],
      };

      await expect(sut.create(auth, dto)).resolves.toEqual(
        expect.objectContaining({
          id: expect.any(String),
          assets: [expect.objectContaining({ id: asset1.id }), expect.objectContaining({ id: asset2.id })],
        }),
      );
    });

    it('should create a new memory and ignore assets the user does not have access to', async () => {
      const { sut, ctx } = setup();
      const { user: user1 } = await ctx.newUser();
      const { user: user2 } = await ctx.newUser();
      const { asset: asset1 } = await ctx.newAsset({ ownerId: user1.id });
      const { asset: asset2 } = await ctx.newAsset({ ownerId: user2.id });
      const auth = factory.auth({ user: user1 });
      const dto = {
        type: MemoryType.ON_THIS_DAY,
        data: { year: 2021 },
        memoryAt: new Date(2021),
        assetIds: [asset1.id, asset2.id],
      };

      await expect(sut.create(auth, dto)).resolves.toEqual(
        expect.objectContaining({
          id: expect.any(String),
          assets: [expect.objectContaining({ id: asset1.id })],
        }),
      );
    });
  });

  describe('onMemoryCreate', () => {
    it('should work on an empty database', async () => {
      const { sut } = setup();
      await expect(sut.onMemoriesCreate()).resolves.not.toThrow();
    });

    it('should create a memory from an asset', async () => {
      const { sut, ctx } = setup();
      const assetRepo = ctx.get(AssetRepository);
      const memoryRepo = ctx.get(MemoryRepository);
      const now = DateTime.fromObject({ year: 2025, month: 2, day: 25 }, { zone: 'utc' }) as DateTime<true>;
      const { user } = await ctx.newUser();
      const { asset } = await ctx.newAsset({ ownerId: user.id, localDateTime: now.minus({ years: 1 }).toISO() });
      await Promise.all([
        ctx.newExif({ assetId: asset.id, make: 'Canon' }),
        ctx.newJobStatus({ assetId: asset.id }),
        assetRepo.upsertFiles([
          { assetId: asset.id, type: AssetFileType.PREVIEW, path: '/path/to/preview.jpg' },
          { assetId: asset.id, type: AssetFileType.THUMBNAIL, path: '/path/to/thumbnail.jpg' },
        ]),
      ]);

      vi.setSystemTime(now.toJSDate());
      await sut.onMemoriesCreate();

      const memories = await memoryRepo.search(user.id, {});
      expect(memories.length).toBe(1);
      expect(memories[0]).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          createdAt: expect.any(Date),
          memoryAt: expect.any(Date),
          updatedAt: expect.any(Date),
          deletedAt: null,
          ownerId: user.id,
          assets: expect.arrayContaining([expect.objectContaining({ id: asset.id })]),
          isSaved: false,
          showAt: now.startOf('day').toJSDate(),
          hideAt: now.endOf('day').toJSDate(),
          seenAt: null,
          type: 'on_this_day',
          data: { year: 2024 },
        }),
      );
    });

    it('should not generate a memory twice for the same day', async () => {
      const { sut, ctx } = setup();
      const assetRepo = ctx.get(AssetRepository);
      const memoryRepo = ctx.get(MemoryRepository);
      const now = DateTime.fromObject({ year: 2025, month: 2, day: 20 }, { zone: 'utc' }) as DateTime<true>;
      const { user } = await ctx.newUser();
      for (const dto of [
        {
          ownerId: user.id,
          localDateTime: now.minus({ year: 1 }).plus({ days: 3 }).toISO(),
        },
        {
          ownerId: user.id,
          localDateTime: now.minus({ year: 1 }).plus({ days: 4 }).toISO(),
        },
        {
          ownerId: user.id,
          localDateTime: now.minus({ year: 1 }).plus({ days: 5 }).toISO(),
        },
      ]) {
        const { asset } = await ctx.newAsset(dto);
        await Promise.all([
          ctx.newExif({ assetId: asset.id, make: 'Canon' }),
          ctx.newJobStatus({ assetId: asset.id }),
          assetRepo.upsertFiles([
            { assetId: asset.id, type: AssetFileType.PREVIEW, path: '/path/to/preview.jpg' },
            { assetId: asset.id, type: AssetFileType.THUMBNAIL, path: '/path/to/thumbnail.jpg' },
          ]),
        ]);
      }

      vi.setSystemTime(now.toJSDate());
      await sut.onMemoriesCreate();

      const memories = await memoryRepo.search(user.id, {});
      expect(memories.length).toBe(1);

      await sut.onMemoriesCreate();

      const memoriesAfter = await memoryRepo.search(user.id, {});
      expect(memoriesAfter.length).toBe(1);
    });
  });

  describe('onMemoriesCleanup', () => {
    it('should run without error', async () => {
      const { sut } = setup();
      await expect(sut.onMemoriesCleanup()).resolves.not.toThrow();
    });
  });

  describe('GET /memories/random', () => {
    it('should return a random set of memories', async () => {
      const { ctx } = setup();
      const { user, accessToken } = await ctx.newUser({ withPermission: [Permission.MEMORY_READ] });

      // Create some memories
      for (let i = 0; i < 5; i++) {
        await ctx.newMemory({ ownerId: user.id, data: { year: 2020 + i } });
      }

      const { status, body } = await app.request
        .get('/memories/random?size=3')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(status).toBe(200);
      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBe(3);
      body.forEach((memory: MemoryResponseDto) => {
        expect(memory.id).toEqual(expect.any(String));
        expect(memory.ownerId).toBe(user.id);
      });
    });

    it('should return default number of memories if size is not specified', async () => {
      const { ctx } = setup();
      const { user, accessToken } = await ctx.newUser({ withPermission: [Permission.MEMORY_READ] });

      for (let i = 0; i < 25; i++) {
        await ctx.newMemory({ ownerId: user.id, data: { year: 2000 + i } });
      }

      const { status, body } = await app.request
        .get('/memories/random')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(status).toBe(200);
      expect(body).toBeInstanceOf(Array);
      expect(body.length).toBe(20); // Default size
    });

    it('should return empty array if no memories found', async () => {
      const { ctx } = setup();
      const { accessToken } = await ctx.newUser({ withPermission: [Permission.MEMORY_READ] });

      const { status, body } = await app.request
        .get('/memories/random?size=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .send();

      expect(status).toBe(200);
      expect(body).toEqual([]);
    });

    it('should return 401 for unauthenticated user', async () => {
      const { status } = await app.request.get('/memories/random').send();
      expect(status).toBe(401);
    });
  });
});
