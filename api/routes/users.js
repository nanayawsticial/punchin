const bcrypt = require('bcryptjs');
const prisma = require('../lib/prisma');
const { authenticate, requireManager, requireAdmin } = require('../middleware/auth');

async function userRoutes(fastify, options) {
  // GET /api/users - List users
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const organizationId = request.user.organizationId;
    const { departmentId, role, status } = request.query;

    const where = { organizationId };
    if (departmentId) where.departmentId = departmentId;
    if (role) where.role = role;
    if (status) where.status = status;

    const users = await prisma.user.findMany({
      where,
      include: {
        department: { select: { id: true, name: true, color: true } }
      },
      orderBy: { name: 'asc' }
    });

    return users.map(u => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      employeeCode: u.employeeCode,
      departmentId: u.departmentId,
      department: u.department,
      avatar: u.avatar,
      phone: u.phone,
      status: u.status,
      mfaEnabled: u.mfaEnabled,
      createdAt: u.createdAt
    }));
  });

  // GET /api/users/:id - Get single user
  fastify.get('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;
    const organizationId = request.user.organizationId;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, color: true } }
      }
    });

    if (!user || user.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeCode: user.employeeCode,
      departmentId: user.departmentId,
      department: user.department,
      avatar: user.avatar,
      phone: user.phone,
      status: user.status,
      mfaEnabled: user.mfaEnabled,
      createdAt: user.createdAt
    };
  });

  // POST /api/users - Create a user directly (admin/manager only)
  fastify.post('/', { preHandler: requireManager }, async (request, reply) => {
    const { name, email, password, role, employeeCode, departmentId, phone } = request.body;
    const organizationId = request.user.organizationId;

    if (!name || !email || !password || !employeeCode) {
      return reply.status(400).send({ error: 'Bad Request', message: 'name, email, password and employeeCode are required' });
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return reply.status(409).send({ error: 'Conflict', message: 'Email address already in use' });
    }

    const existingCode = await prisma.user.findUnique({ where: { employeeCode } });
    if (existingCode) {
      return reply.status(409).send({ error: 'Conflict', message: 'Employee code already in use' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: role || 'EMPLOYEE',
        employeeCode,
        departmentId: departmentId || null,
        phone: phone || null,
        organizationId
      }
    });

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      employeeCode: user.employeeCode,
      avatar: user.avatar,
      status: user.status
    };
  });

  // PATCH /api/users/:id - Update user details
  fastify.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;
    const organizationId = request.user.organizationId;
    const { name, email, password, role, departmentId, phone, status, avatar } = request.body;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
    }

    // Role guard: Only admin/manager can change role/status/department
    const isSelfUpdate = request.user.id === id;
    const isAuthorized = request.user.role === 'SUPER_ADMIN' || request.user.role === 'ADMIN' || request.user.role === 'MANAGER';

    if (!isSelfUpdate && !isAuthorized) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Access denied' });
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (avatar !== undefined) updateData.avatar = avatar;

    if (isAuthorized) {
      if (role) updateData.role = role;
      if (departmentId !== undefined) updateData.departmentId = departmentId;
      if (status) updateData.status = status;
    }

    if (email && email !== user.email) {
      const existingEmail = await prisma.user.findUnique({ where: { email } });
      if (existingEmail) {
        return reply.status(409).send({ error: 'Conflict', message: 'Email address already in use' });
      }
      updateData.email = email;
    }

    if (password) {
      const salt = bcrypt.genSaltSync(10);
      updateData.passwordHash = bcrypt.hashSync(password, salt);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        department: { select: { id: true, name: true, color: true } }
      }
    });

    return {
      id: updated.id,
      name: updated.name,
      email: updated.email,
      role: updated.role,
      employeeCode: updated.employeeCode,
      departmentId: updated.departmentId,
      department: updated.department,
      avatar: updated.avatar,
      phone: updated.phone,
      status: updated.status,
      mfaEnabled: updated.mfaEnabled,
      createdAt: updated.createdAt
    };
  });

  // DELETE /api/users/:id - Delete employee
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params;
    const organizationId = request.user.organizationId;

    if (request.user.id === id) {
      return reply.status(400).send({ error: 'Bad Request', message: 'You cannot delete yourself' });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user || user.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
    }

    await prisma.user.delete({ where: { id } });
    return { success: true, message: 'User deleted successfully' };
  });

}

module.exports = userRoutes;
