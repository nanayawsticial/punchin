const cron = require('node-cron');
const prisma = require('./prisma');
const { emitToOrg } = require('./socket');

function initCronJobs() {
  // 1. Late attendance alert (10 AM weekdays Monday-Friday)
  cron.schedule('0 10 * * 1-5', async () => {
    console.log('[CRON] Running late attendance check...');
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const orgs = await prisma.organization.findMany();
      for (const org of orgs) {
        // Find all active employees in this org
        const employees = await prisma.user.findMany({
          where: {
            organizationId: org.id,
            role: 'EMPLOYEE',
            status: 'ACTIVE'
          }
        });

        // Find who has already clocked in today
        const checkedInRecords = await prisma.attendanceRecord.findMany({
          where: {
            organizationId: org.id,
            date: todayStr
          },
          select: { userId: true }
        });
        const checkedInUserIds = new Set(checkedInRecords.map(r => r.userId));

        // Find employees on approved leave today
        const leaveRequests = await prisma.leaveRequest.findMany({
          where: {
            organizationId: org.id,
            status: 'APPROVED',
            startDate: { lte: todayStr },
            endDate: { gte: todayStr }
          },
          select: { userId: true }
        });
        const onLeaveUserIds = new Set(leaveRequests.map(r => r.userId));

        // Find holidays today
        const holiday = await prisma.publicHoliday.findFirst({
          where: {
            organizationId: org.id,
            date: todayStr
          }
        });

        if (holiday) {
          console.log(`[CRON] Today is a public holiday (${holiday.name}) for org ${org.name}. Skipping late check.`);
          continue;
        }

        for (const emp of employees) {
          if (checkedInUserIds.has(emp.id) || onLeaveUserIds.has(emp.id)) {
            continue;
          }

          // Mark as ABSENT and create notification
          const record = await prisma.attendanceRecord.create({
            data: {
              userId: emp.id,
              date: todayStr,
              status: 'ABSENT',
              method: 'SYSTEM',
              organizationId: org.id
            }
          });

          // Create notification for admin/managers & user
          const notification = await prisma.notification.create({
            data: {
              message: `${emp.name} has not clocked in by 10:00 AM and is flagged ABSENT.`,
              type: 'lateAlert',
              targetRole: 'MANAGER',
              organizationId: org.id,
              metadata: { recordId: record.id, userId: emp.id }
            }
          });

          emitToOrg(org.id, 'notification:new', notification);
          emitToOrg(org.id, 'attendance:lateAlert', { record, user: emp });
        }
      }
    } catch (err) {
      console.error('[CRON] Error in late attendance check:', err);
    }
  });

  // 2. Real-time stats push (every minute)
  cron.schedule('* * * * *', async () => {
    const todayStr = new Date().toISOString().split('T')[0];

    try {
      const orgs = await prisma.organization.findMany();
      for (const org of orgs) {
        const [presentCount, lateCount, absentCount] = await Promise.all([
          prisma.attendanceRecord.count({
            where: {
              organizationId: org.id,
              date: todayStr,
              status: { in: ['PRESENT', 'LATE', 'HALF_DAY'] }
            }
          }),
          prisma.attendanceRecord.count({
            where: {
              organizationId: org.id,
              date: todayStr,
              status: 'LATE'
            }
          }),
          prisma.attendanceRecord.count({
            where: {
              organizationId: org.id,
              date: todayStr,
              status: 'ABSENT'
            }
          })
        ]);

        emitToOrg(org.id, 'stats:update', {
          date: todayStr,
          present: presentCount,
          late: lateCount,
          absent: absentCount
        });
      }
    } catch (err) {
      console.error('[CRON] Error in stats push:', err);
    }
  });

  // 3. Session cleanup (every day at 3:00 AM)
  cron.schedule('0 3 * * *', async () => {
    console.log('[CRON] Cleaning up expired refresh sessions...');
    try {
      const result = await prisma.session.deleteMany({
        where: {
          expiresAt: { lt: new Date() }
        }
      });
      console.log(`[CRON] Cleaned up ${result.count} expired sessions.`);
    } catch (err) {
      console.error('[CRON] Error cleaning up sessions:', err);
    }
  });

  console.log('[CRON] Cron jobs initialized successfully.');
}

module.exports = { initCronJobs };
