const fastify = require('fastify')({
  logger: process.env.NODE_ENV !== 'production'
});
const socketio = require('socket.io');
const { setIO } = require('./lib/socket');
const { initCronJobs } = require('./lib/cron');

// Register CORS
fastify.register(require('@fastify/cors'), {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
});

// Register JWT plugin
fastify.register(require('@fastify/jwt'), {
  secret: process.env.JWT_SECRET || 'fallback-access-secret'
});

// Health endpoint
fastify.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Register routes
fastify.register(require('./routes/auth'), { prefix: '/api/auth' });
fastify.register(require('./routes/attendance'), { prefix: '/api/attendance' });
fastify.register(require('./routes/devices'), { prefix: '/api/devices' });
fastify.register(require('./routes/users'), { prefix: '/api/users' });
fastify.register(require('./routes/leaves'), { prefix: '/api/leaves' });
fastify.register(require('./routes/shifts'), { prefix: '/api/shifts' });
fastify.register(require('./routes/geofence'), { prefix: '/api/geofence' });
fastify.register(require('./routes/notifications'), { prefix: '/api/notifications' });
fastify.register(require('./routes/holidays'), { prefix: '/api/holidays' });
fastify.register(require('./routes/organization'), { prefix: '/api/organization' });

// Global Error Handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  if (error.statusCode) {
    reply.status(error.statusCode).send({
      error: error.name,
      message: error.message
    });
  } else {
    reply.status(500).send({
      error: 'InternalServerError',
      message: 'An unexpected error occurred on the server'
    });
  }
});

// 404 Handler
fastify.setNotFoundHandler((request, reply) => {
  reply.status(404).send({
    error: 'NotFound',
    message: 'The requested resource was not found'
  });
});

const PORT = parseInt(process.env.PORT || '3001', 10);

const start = async () => {
  try {
    await fastify.listen({ port: PORT, host: '0.0.0.0' });
    console.log(`[SERVER] Fastify listening on port ${PORT}`);

    // Attach Socket.io to Fastify server instance
    const io = socketio(fastify.server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    setIO(io);

    io.on('connection', (socket) => {
      console.log(`[SOCKET] User connected: ${socket.id}`);

      socket.on('join:org', (orgId) => {
        socket.join(`org:${orgId}`);
        console.log(`[SOCKET] Socket ${socket.id} joined org room: org:${orgId}`);
      });

      socket.on('disconnect', () => {
        console.log(`[SOCKET] User disconnected: ${socket.id}`);
      });
    });

    // Initialize background cron jobs
    initCronJobs();

  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
