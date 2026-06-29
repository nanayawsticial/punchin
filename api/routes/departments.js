const prisma = require('../lib/prisma');
const { authenticate, requireManager } = require('../middleware/auth');

async function departmentRoutes(fastify, options) {
  // GET /api/departments - List departments
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const organizationId = request.user.organizationId;
    const departments = await prisma.department.findMany({
      where: { organizationId },
      orderBy: { name: 'asc' }
    });
    return departments;
  });

  // POST /api/departments - Create department
  fastify.post('/', { preHandler: requireManager }, async (request, reply) => {
    const { name, color } = request.body;
    const organizationId = request.user.organizationId;

    if (!name) {
      return reply.status(400).send({ error: 'Bad Request', message: 'name is required' });
    }

    const dept = await prisma.department.create({
      data: {
        name,
        color: color || '#E8603C',
        organizationId
      }
    });

    return dept;
  });
}

module.exports = departmentRoutes;
