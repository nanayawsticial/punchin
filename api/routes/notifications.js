const prisma = require('../lib/prisma');
const { authenticate } = require('../middleware/auth');

async function notificationRoutes(fastify, options) {
  // GET /api/notifications
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user;
    const organizationId = user.organizationId;

    // Find notifications targetted to this organization and either:
    // a) Specific to this user
    // b) Targeted to their role (SUPER_ADMIN / ADMIN / MANAGER / EMPLOYEE)
    // c) General notifications with no specific user or role
    const where = {
      organizationId,
      OR: [
        { userId: user.id },
        { targetRole: user.role },
        {
          AND: [
            { userId: null },
            { targetRole: null }
          ]
        }
      ]
    };

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50
    });

    return notifications;
  });

  // POST /api/notifications/:id/read - Mark notification as read
  fastify.post('/:id/read', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;
    const organizationId = request.user.organizationId;

    const notification = await prisma.notification.findUnique({ where: { id } });
    if (!notification || notification.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Notification not found' });
    }

    const updated = await prisma.notification.update({
      where: { id },
      data: { isRead: true }
    });

    return updated;
  });
}

module.exports = notificationRoutes;
