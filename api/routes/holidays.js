const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');

async function holidayRoutes(fastify, options) {
  // GET /api/holidays - List holidays
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const organizationId = request.user.organizationId;
    const holidays = await prisma.publicHoliday.findMany({
      where: { organizationId },
      orderBy: { date: 'asc' }
    });
    return holidays;
  });

  // POST /api/holidays - Add holiday (Admin only)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const { name, date, type } = request.body;
    const organizationId = request.user.organizationId;

    if (!name || !date) {
      return reply.status(400).send({ error: 'Bad Request', message: 'name and date are required' });
    }

    const holiday = await prisma.publicHoliday.create({
      data: {
        name,
        date,
        type: type || 'PUBLIC',
        organizationId
      }
    });

    return holiday;
  });

  // DELETE /api/holidays/:id - Remove holiday (Admin only)
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params;
    const organizationId = request.user.organizationId;

    const holiday = await prisma.publicHoliday.findUnique({ where: { id } });
    if (!holiday || holiday.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Holiday not found' });
    }

    await prisma.publicHoliday.delete({ where: { id } });
    return { success: true, message: 'Holiday deleted successfully' };
  });
}

module.exports = holidayRoutes;
