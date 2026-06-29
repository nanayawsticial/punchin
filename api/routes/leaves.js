const prisma = require('../lib/prisma');
const { authenticate, requireManager } = require('../middleware/auth');
const { emitToOrg } = require('../lib/socket');

async function leaveRoutes(fastify, options) {
  // GET /api/leaves - List leave requests
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const { userId, status } = request.query;
    const organizationId = request.user.organizationId;

    const where = { organizationId };
    
    // Non-managers can only see their own leaves
    const isManager = request.user.role === 'SUPER_ADMIN' || request.user.role === 'ADMIN' || request.user.role === 'MANAGER';
    if (!isManager) {
      where.userId = request.user.id;
    } else if (userId) {
      where.userId = userId;
    }

    if (status) {
      where.status = status;
    }

    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
            department: { select: { name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return leaves;
  });

  // POST /api/leaves - Create leave request
  fastify.post('/', { preHandler: authenticate }, async (request, reply) => {
    const { startDate, endDate, type, reason } = request.body;
    const userId = request.user.id;
    const organizationId = request.user.organizationId;

    if (!startDate || !endDate || !type) {
      return reply.status(400).send({ error: 'Bad Request', message: 'startDate, endDate and type are required' });
    }

    const leave = await prisma.leaveRequest.create({
      data: {
        userId,
        startDate,
        endDate,
        type,
        reason: reason || '',
        organizationId,
        status: 'PENDING'
      },
      include: {
        user: { select: { name: true } }
      }
    });

    // Create notification for admins/managers
    const notification = await prisma.notification.create({
      data: {
        message: `New leave request submitted by ${leave.user.name} for ${startDate} to ${endDate}.`,
        type: 'leaveRequest',
        targetRole: 'MANAGER',
        organizationId,
        metadata: { leaveId: leave.id, userId }
      }
    });

    emitToOrg(organizationId, 'notification:new', notification);

    return leave;
  });

  // PATCH /api/leaves/:id - Approve or Reject leave request (Manager only)
  fastify.patch('/:id', { preHandler: requireManager }, async (request, reply) => {
    const { id } = request.params;
    const { status, managerNotes } = request.body;
    const organizationId = request.user.organizationId;

    if (!status || !['APPROVED', 'REJECTED'].includes(status)) {
      return reply.status(400).send({ error: 'Bad Request', message: 'status must be APPROVED or REJECTED' });
    }

    const leave = await prisma.leaveRequest.findUnique({
      where: { id },
      include: { user: true }
    });

    if (!leave || leave.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Leave request not found' });
    }

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status,
        managerNotes: managerNotes || leave.managerNotes
      }
    });

    // If approved, create/update ON_LEAVE AttendanceRecords for the dates
    if (status === 'APPROVED') {
      let curr = new Date(leave.startDate);
      const end = new Date(leave.endDate);
      
      const recordsToCreate = [];
      while (curr <= end) {
        const dateStr = curr.toISOString().split('T')[0];
        
        // Check if a record already exists
        const existing = await prisma.attendanceRecord.findFirst({
          where: {
            userId: leave.userId,
            date: dateStr,
            organizationId
          }
        });

        if (!existing) {
          recordsToCreate.push({
            userId: leave.userId,
            date: dateStr,
            status: 'ON_LEAVE',
            method: 'SYSTEM',
            organizationId
          });
        } else if (existing.status === 'ABSENT' || !existing.clockIn) {
          // If marked absent or open, update to ON_LEAVE
          await prisma.attendanceRecord.update({
            where: { id: existing.id },
            data: { status: 'ON_LEAVE' }
          });
        }
        curr.setDate(curr.getDate() + 1);
      }

      if (recordsToCreate.length > 0) {
        await prisma.attendanceRecord.createMany({
          data: recordsToCreate
        });
      }
    }

    // Create notification for employee
    const notification = await prisma.notification.create({
      data: {
        message: `Your leave request for ${leave.startDate} to ${leave.endDate} has been ${status.toLowerCase()}.`,
        type: 'leaveStatus',
        userId: leave.userId,
        organizationId,
        metadata: { leaveId: leave.id, status }
      }
    });

    emitToOrg(organizationId, 'notification:new', notification);

    return updated;
  });
}

module.exports = leaveRoutes;
