import { expect } from 'chai';
import supertest from 'supertest';
import { PrismaClient } from '@prisma/client';
import { getLogger } from '@outlast/logger';
import { createApp } from './app';

describe('Provider API Integration', () => {
  let prisma: PrismaClient;
  let app: ReturnType<typeof createApp>;
  let logger: ReturnType<typeof getLogger>;

  before(async () => {
    prisma = new PrismaClient();
    logger = getLogger({ service: 'test', filePath: __filename });
    app = createApp({ prisma, logger });

    // Clean up before tests - delete in order to respect foreign key constraints
    await prisma.followUp.deleteMany({});
    await prisma.orderHistory.deleteMany({});
    await prisma.escalation.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.provider.deleteMany({});
  });

  after(async () => {
    // Clean up after tests - delete in order to respect foreign key constraints
    await prisma.followUp.deleteMany({});
    await prisma.orderHistory.deleteMany({});
    await prisma.escalation.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.provider.deleteMany({});
    await prisma.$disconnect();
  });

  describe('POST /api/providers', () => {
    it('should create a provider', async () => {
      const response = await supertest(app)
        .post('/api/providers')
        .send({
          name: 'API Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: {
            EMAIL: 'api@test.com',
            SMS: '+1234567890'
          }
        })
        .expect(201);

      expect(response.body).to.have.property('id');
      expect(response.body.name).to.equal('API Test Provider');
      expect(response.body.preferredChannel).to.equal('EMAIL');
    });

    it('should return 400 for invalid data', async () => {
      await supertest(app)
        .post('/api/providers')
        .send({
          name: '',
          contactInfo: {}
        })
        .expect(400);
    });
  });

  describe('GET /api/providers', () => {
    it('should list providers', async () => {
      const response = await supertest(app)
        .get('/api/providers')
        .expect(200);

      expect(response.body).to.have.property('items');
      expect(response.body).to.have.property('totalCount');
      expect(Array.isArray(response.body.items)).to.be.true;
    });

    it('should support pagination', async () => {
      const response = await supertest(app)
        .get('/api/providers')
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.limit).to.equal(10);
      expect(response.body.offset).to.equal(0);
    });
  });

  describe('GET /api/providers/:id', () => {
    let providerId: string;

    before(async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Get Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({ EMAIL: 'get@test.com' })
        }
      });
      providerId = provider.id;
    });

    it('should get a provider by id', async () => {
      const response = await supertest(app)
        .get(`/api/providers/${providerId}`)
        .expect(200);

      expect(response.body.id).to.equal(providerId);
      expect(response.body.name).to.equal('Get Test Provider');
    });

    it('should return 404 for non-existent provider', async () => {
      await supertest(app)
        .get('/api/providers/non-existent-id')
        .expect(404);
    });
  });

  describe('PUT /api/providers/:id', () => {
    let providerId: string;

    before(async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Update Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({ EMAIL: 'update@test.com' })
        }
      });
      providerId = provider.id;
    });

    it('should update a provider', async () => {
      const response = await supertest(app)
        .put(`/api/providers/${providerId}`)
        .send({
          name: 'Updated Provider Name'
        })
        .expect(200);

      expect(response.body.name).to.equal('Updated Provider Name');
    });

    it('should return 404 for non-existent provider', async () => {
      await supertest(app)
        .put('/api/providers/non-existent-id')
        .send({ name: 'New Name' })
        .expect(404);
    });
  });

  describe('DELETE /api/providers/:id', () => {
    let providerId: string;

    beforeEach(async () => {
      const provider = await prisma.provider.create({
        data: {
          name: 'Delete Test Provider',
          preferredChannel: 'EMAIL',
          contactInfo: JSON.stringify({ EMAIL: 'delete@test.com' })
        }
      });
      providerId = provider.id;
    });

    it('should delete a provider', async () => {
      await supertest(app)
        .delete(`/api/providers/${providerId}`)
        .expect(204);

      // Verify it's deleted
      await supertest(app)
        .get(`/api/providers/${providerId}`)
        .expect(404);
    });

    it('should return 404 for non-existent provider', async () => {
      await supertest(app)
        .delete('/api/providers/non-existent-id')
        .expect(404);
    });
  });
});

