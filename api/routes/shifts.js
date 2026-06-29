const prisma = require('../lib/prisma');
const { authenticate, requireManager } = require('../middleware/auth');

async function shiftRoutes(fastify, options) {
  // GET /api/shifts
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { userId, date, startDate, endDate } = request.query;
    const organizationId = request.user.organizationId;

    const where = { organizationId };
    
    const isManager = request.user.role === 'SUPER_ADMIN' || request.user.role === 'ADMIN' || request.user.role === 'MANAGER';
    if (!isManager) {
      where.userId = request.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (date) {
      where.date = date;
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const shifts = await prisma.shift.findMany({
      where,
      include: {
        user: { select: { id: true, name: true, employeeCode: true, avatar: true } }
      },
      orderBy: { date: 'asc' }
    });

    return shifts;
  });

  // POST /api/shifts - Assign shift (Manager only)
  fastify.post('/', { preHandler: requireManager }, async (request, reply) => {
    const { userId, date, startTime, endTime, type } = request.body;
    const organizationId = request.user.organizationId;

    if (!userId || !date || !startTime || !endTime) {
      return reply.status(400).send({ error: 'Bad Request', message: 'userId, date, startTime and endTime are required' });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser || targetUser.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Employee not found' });
    }

    // Check if shift already assigned for this date
    const existing = await prisma.shift.findFirst({
      where: { userId, date, organizationId }
    });

    let shift;
    if (existing) {
      shift = await prisma.shift.update({
        where: { id: existing.id },
        data: { startTime, endTime, type: type || 'REGULAR' }
      });
    } else {
      shift = await prisma.shift.create({
        data: {
          userId,
          date,
          startTime,
          endTime,
          type: type || 'REGULAR',
          organizationId
        }
      });
    }

    return shift;
  });
}

module.exports = shiftRoutes;
