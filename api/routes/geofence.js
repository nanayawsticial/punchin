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
 
   // PATCH /api/geofence/:id - Update geofence details (Admin only)
   fastify.patch('/:id', { preHandler: requireAdmin }, async (request, reply) => {
     const { id } = request.params;
     const { name, latitude, longitude, radiusMeters, isActive } = request.body;
     const organizationId = request.user.organizationId;
 
     const zone = await prisma.geoFenceZone.findUnique({ where: { id } });
     if (!zone || zone.organizationId !== organizationId) {
       return reply.status(404).send({ error: 'Not Found', message: 'Geofence zone not found' });
     }
 
     const updated = await prisma.geoFenceZone.update({
       where: { id },
       data: {
         name: name || zone.name,
         latitude: latitude !== undefined ? parseFloat(latitude) : zone.latitude,
         longitude: longitude !== undefined ? parseFloat(longitude) : zone.longitude,
         radiusMeters: radiusMeters !== undefined ? parseFloat(radiusMeters) : zone.radiusMeters,
         isActive: isActive !== undefined ? isActive : zone.isActive
       }
     });
 
     return updated;
   });
 
   // DELETE /api/geofence/:id - Delete geofence zone (Admin only)
   fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
     const { id } = request.params;
     const organizationId = request.user.organizationId;
 
     const zone = await prisma.geoFenceZone.findUnique({ where: { id } });
     if (!zone || zone.organizationId !== organizationId) {
       return reply.status(404).send({ error: 'Not Found', message: 'Geofence zone not found' });
     }
 
     await prisma.geoFenceZone.delete({ where: { id } });
 
     return { success: true, message: 'Geofence zone deleted successfully' };
   });
 }
 
 module.exports = geofenceRoutes;
