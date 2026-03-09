import { Enabler_Status } from '../types/enabler.types';
import { EnablerApprovalPolicy } from './enabler-approval.policy';

describe('EnablerApprovalPolicy', () => {
  it('blocks approval for invalid status, missing events, rejection, and high risk', () => {
    expect(
      EnablerApprovalPolicy.canApprove({
        status: Enabler_Status.ACTIVE,
        verificationStatus: 'approved',
        completenessEvents: ['email_verified', 'phone_verified']
      })
    ).toEqual({ allowed: false, reason: 'Enabler is not in pending status' });

    expect(
      EnablerApprovalPolicy.canApprove({
        status: Enabler_Status.PENDING,
        verificationStatus: 'approved',
        completenessEvents: ['email_verified']
      })
    ).toEqual({ allowed: false, reason: 'Missing verification steps: phone_verified' });

    expect(
      EnablerApprovalPolicy.canApprove({
        status: Enabler_Status.PENDING,
        verificationStatus: 'rejected',
        completenessEvents: ['email_verified', 'phone_verified']
      })
    ).toEqual({ allowed: false, reason: 'Business verification was rejected' });

    expect(
      EnablerApprovalPolicy.canApprove({
        status: Enabler_Status.PENDING,
        verificationStatus: 'approved',
        completenessEvents: ['email_verified', 'phone_verified'],
        riskScore: 90
      })
    ).toEqual({ allowed: false, reason: 'High risk score detected, requires manual review' });
  });

  it('allows approval when requirements are met and evaluates manual review', () => {
    expect(
      EnablerApprovalPolicy.canApprove({
        status: Enabler_Status.PENDING,
        verificationStatus: 'approved',
        completenessEvents: ['email_verified', 'phone_verified'],
        riskScore: 20
      })
    ).toEqual({ allowed: true });

    expect(
      EnablerApprovalPolicy.requiresManualReview({
        status: Enabler_Status.PENDING,
        verificationStatus: 'pending',
        completenessEvents: ['email_verified', 'phone_verified'],
        riskScore: 10
      })
    ).toBe(true);
  });
});

