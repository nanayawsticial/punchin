const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { isWithinZone } = require('../lib/geofence');

async function geofenceRoutes(fastify, options) {
  // GET /api/geofence - List geofence zones
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const organizationId = request.user.organizationId;
    const zones = await prisma.geoFenceZone.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });
    return zones;
  });

  // POST /api/geofence - Create geofence zone (Admin only)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const { name, latitude, longitude, radiusMeters, isActive } = request.body;
    const organizationId = request.user.organizationId;

    if (!name || latitude === undefined || longitude === undefined) {
      return reply.status(400).send({ error: 'Bad Request', message: 'name, latitude and longitude are required' });
    }

    const zone = await prisma.geoFenceZone.create({
      data: {
        name,
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        radiusMeters: radiusMeters ? parseFloat(radiusMeters) : 100,
        isActive: isActive !== undefined ? isActive : true,
        organizationId
      }
    });

    return zone;
  });

  // POST /api/geofence/validate - Validate coordinates against active zones
  fastify.post('/validate', { preHandler: authenticate }, async (request, reply) => {
    const { latitude, longitude } = request.body;
    const organizationId = request.user.organizationId;

    if (latitude === undefined || longitude === undefined) {
      return reply.status(400).send({ error: 'Bad Request', message: 'latitude and longitude are required' });
    }

    const zones = await prisma.geoFenceZone.findMany({
      where: { organizationId, isActive: true }
    });

    const result = isWithinZone(latitude, longitude, zones);

    return result;
  });
}

module.exports = geofenceRoutes;
