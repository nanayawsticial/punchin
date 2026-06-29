const prisma = require('../lib/prisma');
const { authenticate, requireManager } = require('../middleware/auth');

async function payrollRoutes(fastify, options) {
  // GET /api/payroll - Fetch payroll summary or sheet
  fastify.get('/', { preHandler: authenticate }, async (request, reply) => {
    const userId = request.user.id;
    const role = request.user.role;
    const organizationId = request.user.organizationId;

    // Get query month, e.g. "2026-06"
    const queryMonth = request.query.month || new Date().toISOString().slice(0, 7);

    // If EMPLOYEE: Return their personal payroll summary
    if (role === 'EMPLOYEE') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { department: { select: { name: true, color: true } } }
      });

      if (!user) {
        return reply.status(404).send({ error: 'Not Found', message: 'User not found' });
      }

      // Fetch all attendance records for this user in the selected month
      const records = await prisma.attendanceRecord.findMany({
        where: {
          userId,
          organizationId,
          date: { startsWith: queryMonth }
        }
      });

      const lateDays = records.filter(r => r.status === 'LATE').length;
      const presentDays = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY').length;
      const baseSalary = user.baseSalary || 0;
      const deductions = lateDays * 14.00;
      const netSalary = Math.max(0, baseSalary - deductions);

      return {
        isManager: false,
        summary: {
          userId: user.id,
          name: user.name,
          employeeCode: user.employeeCode,
          departmentName: user.department?.name || 'General',
          baseSalary,
          lateDays,
          presentDays,
          deductions,
          netSalary,
          month: queryMonth
        }
      };
    }

    // If ADMIN/MANAGER/SUPER_ADMIN: Return organization-wide payroll sheet
    const users = await prisma.user.findMany({
      where: {
        organizationId,
        status: 'ACTIVE'
      },
      include: {
        department: { select: { name: true, color: true } }
      },
      orderBy: { name: 'asc' }
    });

    const payrollRecords = await Promise.all(users.map(async (u) => {
      const records = await prisma.attendanceRecord.findMany({
        where: {
          userId: u.id,
          organizationId,
          date: { startsWith: queryMonth }
        }
      });

      const lateDays = records.filter(r => r.status === 'LATE').length;
      const presentDays = records.filter(r => r.status === 'PRESENT' || r.status === 'LATE' || r.status === 'HALF_DAY').length;
      const baseSalary = u.baseSalary || 0;
      const deductions = lateDays * 14.00;
      const netSalary = Math.max(0, baseSalary - deductions);

      return {
        userId: u.id,
        name: u.name,
        employeeCode: u.employeeCode,
        departmentName: u.department?.name || 'General',
        departmentColor: u.department?.color || '#E8603C',
        baseSalary,
        lateDays,
        presentDays,
        deductions,
        netSalary,
        role: u.role
      };
    }));

    return {
      isManager: true,
      records: payrollRecords,
      month: queryMonth
    };
  });

  // PATCH /api/payroll/salary/:userId - Update an employee's base salary
  fastify.patch('/salary/:userId', { preHandler: requireManager }, async (request, reply) => {
    const { userId } = request.params;
    const { baseSalary } = request.body;
    const organizationId = request.user.organizationId;

    if (baseSalary === undefined || typeof baseSalary !== 'number' || baseSalary < 0) {
      return reply.status(400).send({ error: 'Bad Request', message: 'Valid non-negative baseSalary is required' });
    }

    const employee = await prisma.user.findUnique({
      where: { id: userId }
    });

    if (!employee || employee.organizationId !== organizationId) {
      return reply.status(404).send({ error: 'Not Found', message: 'Employee not found' });
    }

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { baseSalary }
    });

    return {
      success: true,
      userId: updated.id,
      baseSalary: updated.baseSalary
    };
  });
}

module.exports = payrollRoutes;
