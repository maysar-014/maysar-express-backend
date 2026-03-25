import { IEnablerPolicyRepository } from '../../domain/repositories/enabler-policy.repository.interface';
import prisma from '../database/prisma-client';
import { getModelPrefix, makeId } from '../../../../../shared/ids/id';

export class PrismaEnablerPolicyRepository implements IEnablerPolicyRepository {
  async createDefaultPolicy(enablerId: string, createdBy: string): Promise<void> {
    const existing = await prisma.enabler_Policy.findFirst({
      where: {
        enablerId,
        policyType: 'DEFAULT',
        isActive: true
      }
    });

    if (existing) {
      return;
    }

    await prisma.enabler_Policy.create({
      data: {
        id: makeId(getModelPrefix('Enabler_Policy')),
        enablerId,
        policyType: 'DEFAULT',
        policyName: 'Default Enabler Policy',
        policyRules: {
          allowListing: true,
          enforceCompliance: true
        },
        isGlobal: false,
        sellerIds: [],
        categoryIds: [],
        createdBy
      }
    });
  }
}
