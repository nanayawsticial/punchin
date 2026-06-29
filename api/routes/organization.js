const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

async function organizationRoutes(fastify, options) {
  // GET /api/organization
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const org = await prisma.organization.findUnique({
      where: { id: request.user.organizationId }
    });
    return org;
  });

  // PATCH /api/organization - Update settings (Admin only)
  fastify.patch('/', { preHandler: requireAdmin }, async (request, reply) => {
    const { name } = request.body;
    
    if (!name) {
      return reply.status(400).send({ error: 'Bad Request', message: 'name is required' });
    }

    const org = await prisma.organization.update({
      where: { id: request.user.organizationId },
      data: { name }
    });

    return org;
  });
}

module.exports = organizationRoutes;
