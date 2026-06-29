const prisma = require('../lib/prisma');
const { authenticate, requireManager } = require('../middleware/auth');
const { isWithinZone } = require('../lib/geofence');
const { emitToOrg } = require('../lib/socket');
const { processHardwarePunch, validateApiKey } = require('../lib/hardware');

async function attendanceRoutes(fastify, options) {
  // GET /api/attendance
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { userId, date, startDate, endDate, status } = request.query;
    const organizationId = request.user.organizationId;

    const where = { organizationId };

    if (userId) where.userId = userId;
    if (status) where.status = status;

    if (date) {
      where.date = date;
    } else if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    const records = await prisma.attendanceRecord.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            employeeCode: true,
            avatar: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: [
        { date: 'desc' },
        { clockIn: 'desc' }
      ]
    });

    return records;
  });

  // GET /api/attendance/live-feed - Last 50 punch events today
  fastify.get('/live-feed', { preHandler: authenticate }, async (request, reply) => {
    const organizationId = request.user.organizationId;
    const todayStr = new Date().toISOString().split('T')[0];

    const records = await prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        date: todayStr
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            department: { select: { name: true, color: true } }
          }
        }
      },
      orderBy: { updatedAt: 'desc' },
      take: 50
    });

    return records;
  });

  // GET /api/attendance/presence - Today's presence summary
  fastify.get('/presence', { preHandler: authenticate }, async (request, reply) => {
    const organizationId = request.user.organizationId;
    const todayStr = new Date().toISOString().split('T')[0];

    // Get all active employees
    const employees = await prisma.user.findMany({
      where: {
        organizationId,
        role: 'EMPLOYEE',
        status: 'ACTIVE'
      },
      include: {
        department: { select: { id: true, name: true, color: true } }
      }
    });

    // Get all records for today
    const records = await prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        date: todayStr
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            avatar: true,
            department: { select: { name: true } }
          }
        }
      }
    });

    const present = [];
    const late = [];
    const onLeave = [];
    const clockedInUserIds = new Set();

    for (const record of records) {
      clockedInUserIds.add(record.userId);
      if (record.status === 'PRESENT') present.push(record);
      else if (record.status === 'LATE') late.push(record);
      else if (record.status === 'ON_LEAVE') onLeave.push(record);
      else if (record.status === 'HALF_DAY') present.push(record); // Half day is present too
    }

    // Absent are those active employees not clocked in and not on leave
    const absent = employees.filter(emp => !clockedInUserIds.has(emp.id));

    return { present, late, absent, onLeave };
  });

  // GET /api/attendance/stats - Attendance statistics
  fastify.get('/stats', { preHandler: authenticate }, async (request, reply) => {
    const { startDate, endDate } = request.query;
    const organizationId = request.user.organizationId;

    if (!startDate || !endDate) {
      return reply.status(400).send({ error: 'Bad Request', message: 'startDate and endDate are required' });
    }

    const records = await prisma.attendanceRecord.findMany({
      where: {
        organizationId,
        date: { gte: startDate, lte: endDate }
      }
    });

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalHours = 0;
    let hourRecords = 0;

    const dayStats = {}; // Group stats by date
    let curr = new Date(startDate);
    const end = new Date(endDate);
    while (curr <= end) {
      const dStr = curr.toISOString().split('T')[0];
      dayStats[dStr] = { date: dStr, present: 0, absent: 0, late: 0 };
      curr.setDate(curr.getDate() + 1);
    }

    for (const r of records) {
      if (r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY') {
        totalPresent++;
        if (dayStats[r.date]) dayStats[r.date].present++;
        if (r.status === 'LATE') {
          totalLate++;
          if (dayStats[r.date]) dayStats[r.date].late++;
        }
      } else if (r.status === 'ABSENT') {
        totalAbsent++;
        if (dayStats[r.date]) dayStats[r.date].absent++;
      }

      if (r.hoursWorked) {
        totalHours += r.hoursWorked;
        hourRecords++;
      }
    }

    const avgHours = hourRecords > 0 ? Math.round((totalHours / hourRecords) * 10) / 10 : 0;
    const byDay = Object.values(dayStats).sort((a, b) => a.date.localeCompare(b.date));

    return {
      totalPresent,
      totalAbsent,
      totalLate,
      avgHours,
      byDay
    };
  });

  // GET /api/attendance/timesheets - Grouped by user then by date
  fastify.get('/timesheets', { preHandler: authenticate }, async (request, reply) => {
    const { userId, startDate, endDate } = request.query;
    const organizationId = request.user.organizationId;

    if (!startDate || !endDate) {
      return reply.status(400).send({ error: 'Bad Request', message: 'startDate and endDate are required' });
    }

    const targetUserId = userId || request.user.id;

    const records = await prisma.attendanceRecord.findMany({
      where: {
        userId: targetUserId,
        organizationId,
        date: { gte: startDate, lte: endDate }
      },
      orderBy: { date: 'asc' }
    });

    return records;
  });

  // POST /api/attendance/clock-in
  fastify.post('/clock-in', { preHandler: authenticate }, async (request, reply) => {
    const { latitude, longitude, notes, method } = request.body;
    const userId = request.user.id;
    const organizationId = request.user.organizationId;
    const todayStr = new Date().toISOString().split('T')[0];

    const existingRecord = await prisma.attendanceRecord.findFirst({
      where: { userId, date: todayStr, organizationId }
    });

    if (existingRecord && existingRecord.clockIn) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Already clocked in today' });
    }

    // Geofence check if coordinates provided
    if (latitude && longitude) {
      const zones = await prisma.geoFenceZone.findMany({
        where: { organizationId, isActive: true }
      });
      const validation = isWithinZone(latitude, longitude, zones);
      if (!validation.valid) {
        return reply.status(400).send({
          error: 'Geofence Breach',
          message: `You are outside the designated area. Nearest zone: ${validation.zone?.name || 'Unknown'} (${Math.round(validation.distance)}m away)`
        });
      }
    }

    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const isLate = hours > 9 || (hours === 9 && minutes > 0);
    const status = isLate ? 'LATE' : 'PRESENT';

    let record;
    if (existingRecord) {
      record = await prisma.attendanceRecord.update({
        where: { id: existingRecord.id },
        data: {
          clockIn: now,
          status,
          method: method || 'WEB',
          latitude: latitude || null,
          longitude: longitude || null,
          notes: notes || null
        }
      });
    } else {
      record = await prisma.attendanceRecord.create({
        data: {
          userId,
          date: todayStr,
          clockIn: now,
          status,
          method: method || 'WEB',
          latitude: latitude || null,
          longitude: longitude || null,
          notes: notes || null,
          organizationId
        }
      });
    }

    emitToOrg(organizationId, 'attendance:clockIn', { record, user: request.user });

    return { record };
  });

  // POST /api/attendance/clock-out
  fastify.post('/clock-out', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.id;
    const organizationId = request.user.organizationId;
    const todayStr = new Date().toISOString().split('T')[0];

    const record = await prisma.attendanceRecord.findFirst({
      where: { userId, date: todayStr, organizationId }
    });

    if (!record || !record.clockIn) {
      return reply.status(400).send({ error: 'Bad Request', message: 'You have not clocked in today' });
    }

    if (record.clockOut) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Already clocked out today' });
    }

    const now = new Date();
    const clockInTime = new Date(record.clockIn);
    const diffMs = now - clockInTime;
    const hoursWorked = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);

    const updated = await prisma.attendanceRecord.update({
      where: { id: record.id },
      data: {
        clockOut: now,
        hoursWorked
      }
    });

    emitToOrg(organizationId, 'attendance:clockOut', { record: updated, user: request.user });

    return { record: updated };
  });

  // POST /api/attendance/hardware-punch - RFID hardware endpoint
  fastify.post('/hardware-punch', async (request, reply) => {
    const apiKey = request.headers['x-device-key'];
    if (!apiKey) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing hardware API key' });
    }

    const payload = request.body;
    const { device_id } = payload;

    if (!device_id) {
      return reply.status(400).send({ error: 'Bad Request', message: 'device_id is required' });
    }

    // 1. Find device and validate API Key
    const device = await prisma.biometricDevice.findUnique({
      where: { serialNumber: device_id }
    });

    if (!device || !device.isActive) {
      return reply.status(404).send({ error: 'Not Found', message: 'Device is unregistered or inactive' });
    }

    const validKey = await validateApiKey(apiKey, device);
    if (!validKey) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Invalid device key' });
    }

    try {
      const result = await processHardwarePunch(payload, device.organizationId, prisma, emitToOrg);
      return result;
    } catch (err) {
      return reply.status(400).send({ error: 'Punch Failed', message: err.message });
    }
  });

  // POST /api/attendance/hardware-punch/batch - Offline queue sync from Pico
  fastify.post('/hardware-punch/batch', async (request, reply) => {
    const apiKey = request.headers['x-device-key'];
    if (!apiKey) {
      return reply.status(401).send({ error: 'Unauthorized', message: 'Missing hardware API key' });
    }

    const { events } = request.body;
    if (!events || !Array.isArray(events) || events.length === 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'events array is required' });
    }

    // Validate the first event's device to verify API key
    const firstEvent = events[0];
    const device = await prisma.biometricDevice.findUnique({
      where: { serialNumber: firstEvent.device_id }
    });

    if (!device || !device.isActive) {
      return reply.status(404).send({ error: 'Not Found', message: 'Device is unregistered or inactive' });
    }

    const validKey = await validateApiKey(apiKey, device);
    if (!validKey) {
      return reply.status(403).send({ error: 'Forbidden', message: 'Invalid device key' });
    }

    let processed = 0;
    let failed = 0;
    const results = [];

    for (const evt of events) {
      try {
        const res = await processHardwarePunch(evt, device.organizationId, prisma, emitToOrg);
        results.push({ event_id: evt.terminal_event_id, success: true, details: res.message });
        processed++;
      } catch (err) {
        results.push({ event_id: evt.terminal_event_id, success: false, error: err.message });
        failed++;
      }
    }

    return { processed, failed, results };
  });

  // PATCH /api/attendance/:id - Timesheet correction by Manager/Admin
  fastify.patch('/:id', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params;
    const { clockIn, clockOut, correctionReason, notes, status } = request.body;
    const organizationId = request.user.organizationId;

    if (!correctionReason) {
      return reply.status(400).send({ error: 'Bad Request', message: 'correctionReason is required' });
    }

    const record = await prisma.attendanceRecord.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!record || record.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Attendance record not found' });
    }

    const updateData = {
      notes: notes || record.notes,
      correctionReason,
      correctedBy: request.user.name
    };

    if (clockIn) {
      updateData.clockIn = new Date(clockIn);
      updateData.correctedIn = new Date(clockIn);
    }
    if (clockOut) {
      updateData.clockOut = new Date(clockOut);
      updateData.correctedOut = new Date(clockOut);
    }
    if (status) {
      updateData.status = status;
    }

    // Recalculate hours if clock times change
    const finalIn = updateData.clockIn || record.clockIn;
    const finalOut = updateData.clockOut || record.clockOut;
    if (finalIn && finalOut) {
      const diffMs = new Date(finalOut) - new Date(finalIn);
      updateData.hoursWorked = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);
    }

    const updated = await prisma.attendanceRecord.update({
      where: { id },
      data: updateData
    });

    emitToOrg(organizationId, 'attendance:updated', { record: updated, user: record.user });

    return updated;
  });
}

module.exports = attendanceRoutes;
