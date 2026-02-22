import prisma from '../database/prisma';

export class SellerNotificationTrigger {
  async triggerDailyRevenueUpdate(sellerId: string, amount: number, orderCount: number) {
    if (orderCount >= 5) {
      await prisma.notification_Notification.create({
        data: {
          userId: sellerId,
          type: 'push',
          priority: 'normal',
          subject: `You earned ${amount} today!`,
          content: `Great work! You've made ${amount} from ${orderCount} orders today. Keep it up!`,
          data: { amount, orderCount },
          status: 'pending'
        }
      });
    }
  }

  async triggerRestockAlert(sellerId: string, productName: string, daysLeft: number) {
    if (daysLeft <= 3) {
      await prisma.notification_Notification.create({
        data: {
          userId: sellerId,
          type: 'push',
          priority: 'high',
          subject: `Restock Alert: ${productName}`,
          content: `${productName} is trending and will run out in ${daysLeft} days. Restock now!`,
          data: { productName, daysLeft },
          status: 'pending'
        }
      });
    }
  }

  async triggerPendingInquiries(sellerId: string, count: number) {
    if (count >= 2) {
      await prisma.notification_Notification.create({
        data: {
          userId: sellerId,
          type: 'push',
          priority: count > 5 ? 'high' : 'normal',
          subject: `${count} customer questions waiting`,
          content: `You have ${count} pending customer questions. Quick responses increase sales!`,
          data: { count },
          status: 'pending'
        }
      });
    }
  }

  async triggerPayoutScheduled(sellerId: string, amount: number, netAmount: number, commission: number, date: Date) {
    await prisma.notification_Notification.create({
      data: {
        userId: sellerId,
        type: 'push',
        priority: 'normal',
        subject: `Payout of ${amount} scheduled`,
        content: `Your payout of ${amount} (${netAmount} after ${commission} commission) is scheduled for ${date.toDateString()}.`,
        data: { amount, netAmount, commission, date },
        status: 'pending'
      }
    });
  }

  async triggerProfitabilityScoreUpdate(sellerId: string, score: number, status: string, recommendation: string) {
    if (score >= 70) {
      await prisma.notification_Notification.create({
        data: {
          userId: sellerId,
          type: 'push',
          priority: 'normal',
          subject: `Your Business Health Score: ${score}/100`,
          content: `Your profitability score is ${score}/100 - ${status}. ${recommendation}`,
          data: { score, status, recommendation },
          status: 'pending'
        }
      });
    }
  }
}
