import { GenerateActionCenter } from '../application/use-cases/GenerateActionCenter';
import { SellerNotificationTrigger } from './SellerNotificationTrigger';
import prisma from './database/prisma';

export class ActionCenterGenerationJob {
  async execute() {
    try {
      const activeSellers = await prisma.user_User.findMany({
        where: { role: 'SELLER', status: 'ACTIVE' },
        select: { id: true }
      });

      const notificationTrigger = new SellerNotificationTrigger();

      for (const seller of activeSellers) {
        const useCase = new GenerateActionCenter();
        const actions = await useCase.execute(seller.id);

        // Trigger notifications for HIGH priority actions
        const highPriorityActions = actions.filter((a: any) => a.priority === 'HIGH');
        if (highPriorityActions.length > 0) {
          for (const action of highPriorityActions) {
            if (action.type === 'RESTOCK') {
              await notificationTrigger.triggerRestockAlert(
                seller.id,
                action.productId || 'Product',
                3
              );
            }
          }
        }
      }

      console.log(`[ActionCenterGenerationJob] Completed for ${activeSellers.length} sellers`);
    } catch (error) {
      console.error('[ActionCenterGenerationJob] Error:', error);
    }
  }
}
