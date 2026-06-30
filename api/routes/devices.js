const crypto = require('crypto');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { generateApiKey, validateApiKey, processHardwarePunch } = require('../lib/hardware');
const { emitToOrg } = require('../lib/socket');

async function deviceRoutes(fastify, options) {
  // GET /api/devices - List devices
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const organizationId = request.user.organizationId;
    const devices = await prisma.biometricDevice.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    });
    return devices;
  });

  // POST /api/devices - Register a device directly (alternative flow)
  fastify.post('/', { preHandler: requireAdmin }, async (request, reply) => {
    const { name, serialNumber, location } = request.body;
    const organizationId = request.user.organizationId;

    if (!name || !serialNumber) {
      return reply.status(400).send({ error: 'Bad Request', message: 'name and serialNumber are required' });
    }

    const existing = await prisma.biometricDevice.findUnique({
      where: { serialNumber }
    });

    if (existing) {
      return reply.status(409).send({ error: 'Conflict', message: 'Device with this serial number is already registered' });
    }

    const { raw, hash, last4 } = generateApiKey();

    const device = await prisma.biometricDevice.create({
      data: {
        name,
        serialNumber,
        location: location || '',
        apiKeyHash: hash,
        apiKeyLast4: last4,
        organizationId,
        status: 'OFFLINE'
      }
    });

    emitToOrg(organizationId, 'device:added', device);

    return { device, apiKey: raw };
  });

  // PATCH /api/devices/:id - Update device details
  fastify.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;
    const { name, location, isActive } = request.body;
    const organizationId = request.user.organizationId;

    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device || device.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Device not found' });
    }

    const updated = await prisma.biometricDevice.update({
      where: { id },
      data: {
        name: name || device.name,
        location: location !== undefined ? location : device.location,
        isActive: isActive !== undefined ? isActive : device.isActive
      }
    });

    return updated;
  });

  // DELETE /api/devices/:id - Remove device
  fastify.delete('/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = request.params;
    const organizationId = request.user.organizationId;

    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device || device.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Device not found' });
    }

    await prisma.biometricDevice.delete({ where: { id } });
    emitToOrg(organizationId, 'device:removed', { id });

    return { success: true, message: 'Device removed successfully' };
  });

  // GET /api/devices/:id/logs - View device logs
  fastify.get('/:id/logs', { preHandler: authenticate }, async (request, reply) => {
    const { id } = request.params;
    const organizationId = request.user.organizationId;

    const device = await prisma.biometricDevice.findUnique({ where: { id } });
    if (!device || device.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Device not found' });
    }

    const logs = await prisma.deviceSyncLog.findMany({
      where: { deviceId: id },
      include: {
        user: { select: { name: true, employeeCode: true } }
      },
      orderBy: { eventTime: 'desc' },
      take: 100
    });

    return logs;
  });

  // POST /api/devices/:id/heartbeat - Hardware heartbeat endpoint
  fastify.post('/:id/heartbeat', async (request, reply) => {
    const apiKey = request.headers['x-device-key'];
    const { id } = request.params; // serialNumber

    if (!apiKey) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing API key' });
    }

    const device = await prisma.biometricDevice.findUnique({
      where: { serialNumber: id }
    });

    if (!device || !device.isActive) {
      return reply.status(404).send({ error: 'Not Found', message: 'Device is unregistered or inactive' });
    }

    const validKey = await validateApiKey(apiKey, device);
    if (!validKey) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Invalid device key' });
    }

    const { wifiRssi, freeMemory, uptimeSeconds } = request.body;

    const updated = await prisma.biometricDevice.update({
      where: { id: device.id },
      data: {
        status: 'ONLINE',
        lastSeenAt: new Date(),
        ipAddress: request.ip
      }
    });

    emitToOrg(device.organizationId, 'device:heartbeat', {
      deviceId: device.id,
      status: 'ONLINE',
      wifiRssi,
      freeMemory,
      uptimeSeconds,
      lastSeenAt: updated.lastSeenAt
    });

    return { status: 'ok' };
  });

  // POST /api/devices/:id/events - Direct hardware event endpoint
  fastify.post('/:id/events', async (request, reply) => {
    const apiKey = request.headers['x-device-key'];
    const { id } = request.params; // serialNumber

    if (!apiKey) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing API key' });
    }

    const device = await prisma.biometricDevice.findUnique({
      where: { serialNumber: id }
    });

    if (!device || !device.isActive) {
      return reply.status(404).send({ error: 'Not Found', message: 'Device is unregistered or inactive' });
    }

    const validKey = await validateApiKey(apiKey, device);
    if (!validKey) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Invalid device key' });
    }

    try {
      const result = await processHardwarePunch(request.body, device.organizationId, prisma, emitToOrg);
      return result;
    } catch (err) {
      return reply.status(400).send({ error: 'Event Failed', message: err.message });
    }
  });

  // POST /api/devices/pairing-code - Called by Pico at boot to initiate pairing
  fastify.post('/pairing-code', async (request, reply) => {
    // Generate 6-digit random code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Create a temporary placeholder device (tenant is set to dummy/temp until admin pairs it)
    // We create a temporary org or map it to a global system tenant, or just save the code without org first.
    // Wait, the schema requires organizationId.
    // So we can find a default setup tenant, or let's allow pairingCode on BiometricDevice and we'll create the device with a placeholder or find/create a 'pending' state.
    // Let's create it with a global/dummy organization, or we can look up the admin's organization when they pair it.
    // Since organizationId is required, let's create the pending device with the code, but wait - what organizationId does it have?
    // An elegant way: have a global/fallback system organization for pending devices, or allow organizationId to be set when the admin inputs the pairing code.
    // Wait, if the device is created at POST /pairing-code, how does it know the org? It doesn't.
    // So we can:
    // 1) Have a system organization for pending pairings.
    // 2) Or just keep the active codes in-memory, or in a simple `PairingCode` DB table if we had one.
    // But since the schema didn't define a PairingCode model, we can look up/create a "System Pending Organization" or use the first organization created,
    // or better, create the BiometricDevice model under the admin's organization *when* they click "pair", and the Pico's `/pairing-code` endpoint just registers the code in a simple memory store!
    // Yes! An in-memory store is perfect, simple, fast, and does not require complex DB model additions.
    // Let's implement an in-memory pairing store:
    if (!global.pairingStore) {
      global.pairingStore = new Map();
    }

    const serialNumber = 'pico-' + crypto.randomBytes(4).toString('hex');
    global.pairingStore.set(code, {
      code,
      serialNumber,
      expiresAt,
      paired: false,
      deviceId: null,
      deviceKey: null
    });

    return reply.status(201).send({ code });
  });

  // GET /api/devices/pair/status - Polled by Pico during pairing
  fastify.get('/pair/status', async (request, reply) => {
    const { code } = request.query;
    if (!code) {
      return reply.status(400).send({ error: 'Bad Request', message: 'code query parameter is required' });
    }

    const pairing = global.pairingStore?.get(code);
    if (!pairing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Pairing code not found' });
    }

    if (new Date() > pairing.expiresAt) {
      global.pairingStore.delete(code);
      return reply.status(400).send({ expired: true });
    }

    if (pairing.paired) {
      // Clear the pairing store entry so it can't be reused
      const response = {
        paired: true,
        deviceId: pairing.deviceId,
        deviceKey: pairing.deviceKey
      };
      global.pairingStore.delete(code);
      return response;
    }

    return { paired: false };
  });

  // POST /api/devices/pair - Admin enters code on dashboard to confirm pairing
  fastify.post('/pair', { preHandler: authenticate }, async (request, reply) => {
    const { code, name, location } = request.body;
    const organizationId = request.user.organizationId;

    if (!code || !name) {
      return reply.status(400).send({ error: 'Bad Request', message: 'code and name are required' });
    }

    const pairing = global.pairingStore?.get(code);
    if (!pairing) {
      return reply.status(404).send({ error: 'Not Found', message: 'Invalid or expired pairing code' });
    }

    if (new Date() > pairing.expiresAt) {
      global.pairingStore.delete(code);
      return reply.status(400).send({ error: 'Expired', message: 'Pairing code has expired' });
    }

    const { raw, hash, last4 } = generateApiKey();

    const device = await prisma.biometricDevice.create({
      data: {
        name,
        serialNumber: pairing.serialNumber,
        location: location || '',
        apiKeyHash: hash,
        apiKeyLast4: last4,
        organizationId,
        status: 'ONLINE',
        pairedAt: new Date(),
        lastSeenAt: new Date()
      }
    });

    // Update pairing status in-memory for Pico to fetch
    pairing.paired = true;
    pairing.deviceId = device.serialNumber;
    pairing.deviceKey = raw;

    emitToOrg(organizationId, 'device:added', device);

    return { device, apiKey: raw };
  });

  // POST /api/devices/unknown-card - Alert admin about unregistered card
  fastify.post('/unknown-card', async (request, reply) => {
    const apiKey = request.headers['x-device-key'];
    if (!apiKey) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing API key' });
    }

    const { uid, deviceSerial } = request.body;
    if (!uid || !deviceSerial) {
      return reply.status(400).send({ error: 'Bad Request', message: 'uid and deviceSerial are required' });
    }

    const device = await prisma.biometricDevice.findUnique({
      where: { serialNumber: deviceSerial }
    });

    if (!device || !device.isActive) {
      return reply.status(404).send({ error: 'Not Found', message: 'Device is unregistered or inactive' });
    }

    const validKey = await validateApiKey(apiKey, device);
    if (!validKey) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Invalid device key' });
    }

    // Create notifications for admins and managers
    const targetRoles = ['ADMIN', 'MANAGER'];
    for (const role of targetRoles) {
      const notification = await prisma.notification.create({
        data: {
          message: `Unknown RFID card scanned: UID "${uid}" at terminal "${device.name}"`,
          type: 'warning',
          targetRole: role,
          organizationId: device.organizationId,
          metadata: { uid, deviceId: device.id, location: device.location }
        }
      });
      emitToOrg(device.organizationId, 'notification:new', notification);
    }

    emitToOrg(device.organizationId, 'device:unknown-card', { uid, deviceId: device.id });

    return { success: true };
  });
}

module.exports = deviceRoutes;
