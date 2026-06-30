const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { signAccess, signRefresh } = require('../lib/jwt');
const { authenticate } = require('../middleware/auth');

// Generate unique employee code
async function generateEmployeeCode(prefix = 'EP') {
  let attempts = 0;
  while (attempts < 100) {
    const code = `${prefix}-${Math.floor(100000 + Math.random() * 900000)}`;
    const existing = await prisma.user.findUnique({
      where: { employeeCode: code }
    });
    if (!existing) return code;
    attempts++;
  }
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

// Generate unique join code for orgs
async function generateJoinCode() {
  let attempts = 0;
  while (attempts < 100) {
    const code = crypto.randomBytes(3).toString('hex').toUpperCase(); // 6 chars
    const existing = await prisma.organization.findUnique({
      where: { joinCode: code }
    });
    if (!existing) return code;
    attempts++;
  }
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

async function authRoutes(fastify, options) {
  // POST /api/auth/signup - Creates new organization + SUPER_ADMIN user
  fastify.post('/signup', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const { name, email, password, organizationName } = request.body;

    if (!name || !email || !password || !organizationName) {
      return reply.status(400).send({ error: 'Bad Request', message: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({ error: 'Conflict', message: 'Email address already registered' });
    }

    const joinCode = await generateJoinCode();
    const org = await prisma.organization.create({
      data: {
        name: organizationName,
        joinCode
      }
    });

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const employeeCode = await generateEmployeeCode('SA');

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'SUPER_ADMIN',
        employeeCode,
        organizationId: org.id
      }
    });

    const accessToken = signAccess({ userId: user.id, role: user.role, orgId: org.id });
    const refreshToken = signRefresh({ userId: user.id });

    // Store session
    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeCode,
        organizationId: user.organizationId,
        avatar: user.avatar,
        status: user.status
      }
    };
  });

  // POST /api/auth/join - Joins existing organization with joinCode
  fastify.post('/join', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const { name, email, password, joinCode } = request.body;

    if (!name || !email || !password || !joinCode) {
      return reply.status(400).send({ error: 'Bad Request', message: 'All fields are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.status(409).send({ error: 'Conflict', message: 'Email address already registered' });
    }

    const org = await prisma.organization.findUnique({
      where: { joinCode: joinCode.toUpperCase() }
    });

    if (!org) {
      return reply.status(404).send({ error: 'Not Found', message: 'Invalid organization join code' });
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const employeeCode = await generateEmployeeCode('EP');

    const user = await prisma.user.create({
      data: {
        name,
        email,
        passwordHash,
        role: 'EMPLOYEE',
        employeeCode,
        organizationId: org.id
      }
    });

    const accessToken = signAccess({ userId: user.id, role: user.role, orgId: org.id });
    const refreshToken = signRefresh({ userId: user.id });

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeCode,
        organizationId: user.organizationId,
        avatar: user.avatar,
        status: user.status
      }
    };
  });

  // POST /api/auth/login
  fastify.post('/login', {
    config: {
      rateLimit: {
        max: 10,
        timeWindow: '1 minute'
      }
    }
  }, async (request, reply) => {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true }
    });

    if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid email or password' });
    }

    if (user.status !== 'ACTIVE') {
      return reply.status(403).send({ error: 'Forbidden', message: `Account is ${user.status.toLowerCase()}` });
    }

    const accessToken = signAccess({ userId: user.id, role: user.role, orgId: user.organizationId });
    const refreshToken = signRefresh({ userId: user.id });

    await prisma.session.create({
      data: {
        userId: user.id,
        refreshToken,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
      }
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeCode,
        organizationId: user.organizationId,
        avatar: user.avatar,
        status: user.status,
        organization: { id: user.organization.id, name: user.organization.name }
      }
    };
  });

  // POST /api/auth/refresh
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = request.body;
    if (!refreshToken) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Refresh token is required' });
    }

    const session = await prisma.session.findUnique({
      where: { refreshToken },
      include: { user: true }
    });

    if (!session || session.expiresAt < new Date()) {
      if (session) await prisma.session.delete({ where: { id: session.id } });
      return reply.status(401).send({ error: 'Unauthorized', message: 'Invalid or expired session' });
    }

    const accessToken = signAccess({
      userId: session.user.id,
      role: session.user.role,
      orgId: session.user.organizationId
    });

    return { accessToken };
  });

  // POST /api/auth/logout
  fastify.post('/logout', async (request, reply) => {
    const { refreshToken } = request.body;
    if (refreshToken) {
      await prisma.session.deleteMany({
        where: { refreshToken }
      });
    }
    return reply.status(200).send({ success: true, message: 'Logged out successfully' });
  });

  // GET /api/auth/me
  fastify.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const user = request.user;
    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        employeeCode: user.employeeCode,
        organizationId: user.organizationId,
        avatar: user.avatar,
        status: user.status,
        department: user.department
      }
    };
  });
}

module.exports = authRoutes;
