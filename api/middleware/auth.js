const { verifyAccess } = require('../lib/jwt');
const prisma = require('../lib/prisma');

async function authenticate(request, reply) {
  try {
    const authHeader = request.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing or invalid token format' });
    }

    const token = authHeader.split(' ')[1];
    let payload;
    try {
      payload = verifyAccess(token);
    } catch (err) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Token is expired or invalid' });
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: {
        department: { select: { id: true, name: true, color: true } }
      }
    });

    if (!user || user.status !== 'ACTIVE') {
      return reply.status(403).send({ error: 'Forbidden', message: 'User account is inactive or suspended' });
    }

    request.user = user;
  } catch (err) {
    return reply.status(500).send({ error: 'Internal Server Error', message: err.message });
  }
}

async function requireAdmin(request, reply) {
  await authenticate(request, reply);
  if (reply.sent) return;

  if (request.user.role !== 'SUPER_ADMIN' && request.user.role !== 'ADMIN') {
    return reply.status(403).send({ error: 'Forbidden', message: 'Admin role is required' });
  }
}

async function requireManager(request, reply) {
  await authenticate(request, reply);
  if (reply.sent) return;

  if (request.user.role !== 'SUPER_ADMIN' && request.user.role !== 'ADMIN' && request.user.role !== 'MANAGER') {
    return reply.status(403).send({ error: 'Forbidden', message: 'Manager or Admin role is required' });
  }
}

module.exports = {
  authenticate,
  requireAdmin,
  requireManager
};
