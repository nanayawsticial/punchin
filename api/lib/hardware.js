const bcrypt = require('bcryptjs');
const crypto = require('crypto');

async function validateApiKey(rawKey, device) {
  if (!rawKey || !device || !device.apiKeyHash) return false;
  return bcrypt.compare(rawKey, device.apiKeyHash);
}

function generateApiKey() {
  const raw = 'pi_' + crypto.randomBytes(24).toString('hex');
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(raw, salt);
  const last4 = raw.slice(-4);
  return { raw, hash, last4 };
}

async function processHardwarePunch(payload, organizationId, prisma, emitToOrg) {
  const { device_id, uid, event_type, timestamp, terminal_event_id } = payload;

  // 1. Find the active device
  const device = await prisma.biometricDevice.findFirst({
    where: {
      serialNumber: device_id,
      organizationId,
      isActive: true
    }
  });

  if (!device) {
    throw new Error(`Active device not found: ${device_id}`);
  }

  // 2. Match employeeCode -> User
  const user = await prisma.user.findFirst({
    where: {
      employeeCode: uid,
      organizationId,
      status: 'ACTIVE'
    }
  });

  if (!user) {
    // If user not found, we still log the sync event as unprocessed, and return error
    await prisma.deviceSyncLog.create({
      data: {
        deviceId: device.id,
        employeeCode: uid,
        eventType: event_type,
        eventTime: new Date(timestamp),
        terminalEventId: terminal_event_id || null,
        rawData: payload,
        processed: false
      }
    });
    throw new Error(`Active user not found for UID: ${uid}`);
  }

  // 3. Check for duplicate terminalEventId
  if (terminal_event_id) {
    const existingLog = await prisma.deviceSyncLog.findUnique({
      where: { terminalEventId: terminal_event_id }
    });
    if (existingLog) {
      return { success: true, message: 'Duplicate punch ignored', user, record: null };
    }
  }

  const punchTime = new Date(timestamp);
  const dateStr = timestamp.split('T')[0];

  // 4. Create/update AttendanceRecord
  let record = await prisma.attendanceRecord.findFirst({
    where: {
      userId: user.id,
      date: dateStr,
      organizationId
    }
  });

  let type = event_type.toLowerCase();

  // Smart toggle or direct mapping
  if (type === 'clock_in') {
    if (!record) {
      // Determine LATE status (strictly after 9:00 AM)
      const hours = punchTime.getHours();
      const minutes = punchTime.getMinutes();
      const isLate = hours > 9 || (hours === 9 && minutes > 0);
      const status = isLate ? 'LATE' : 'PRESENT';

      record = await prisma.attendanceRecord.create({
        data: {
          userId: user.id,
          date: dateStr,
          clockIn: punchTime,
          status,
          method: 'HARDWARE',
          organizationId
        }
      });
      emitToOrg(organizationId, 'attendance:clockIn', { record, user });
    }
  } else if (type === 'clock_out') {
    if (record && !record.clockOut) {
      const clockInTime = new Date(record.clockIn);
      const diffMs = punchTime - clockInTime;
      const hoursWorked = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10);

      record = await prisma.attendanceRecord.update({
        where: { id: record.id },
        data: {
          clockOut: punchTime,
          hoursWorked
        }
      });
      emitToOrg(organizationId, 'attendance:clockOut', { record, user });
    } else if (!record) {
      // Clock out without clock in - create irregular record
      record = await prisma.attendanceRecord.create({
        data: {
          userId: user.id,
          date: dateStr,
          clockOut: punchTime,
          status: 'HALF_DAY',
          method: 'HARDWARE',
          organizationId
        }
      });
      emitToOrg(organizationId, 'attendance:clockOut', { record, user });
    }
  }

  // 5. Log the sync event
  await prisma.deviceSyncLog.create({
    data: {
      deviceId: device.id,
      employeeCode: uid,
      userId: user.id,
      eventType: event_type,
      eventTime: punchTime,
      terminalEventId: terminal_event_id || null,
      rawData: payload,
      processed: true
    }
  });

  // Update lastSyncAt on device
  await prisma.biometricDevice.update({
    where: { id: device.id },
    data: { lastSyncAt: new Date(), status: 'ONLINE', lastSeenAt: new Date() }
  });

  // Push realtime stats via websocket
  emitToOrg(organizationId, 'device:eventAdded', { deviceId: device.id, eventType: event_type, user });

  return { success: true, message: 'Punch processed successfully', user, record };
}

module.exports = {
  validateApiKey,
  generateApiKey,
  processHardwarePunch
};
