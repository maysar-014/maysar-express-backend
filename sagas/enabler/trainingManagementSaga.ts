import { BaseSaga, SagaStep, SagaContext } from '../../shared/sagaFramework';
import { eventBus } from '../../shared/events/eventBus';

// Seller Registration Assistance Saga (/enabler/seller-onboarding - Core Functions: Sales Support)
export class SellerRegistrationAssistanceSaga extends BaseSaga {
  constructor() {
    super('SellerRegistrationAssistance', [
      new SagaStep('REGISTRATION_INITIATION', async (context: SagaContext) => {
        const { enablerId, prospectiveSellerData, territory } = context.data;
        
        await eventBus.publish({
          type: 'SellerRegistrationInitiated',
          data: { 
            enablerId,
            prospectiveSellerData,
            territory,
            registrationId: `REG-${Date.now()}`,
            status: 'initiated',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { registrationInitiated: true } };
      }),
      
      new SagaStep('DOCUMENT_COLLECTION', async (context: SagaContext) => {
        const { registrationId, enablerId } = context.data;
        
        await eventBus.publish({
          type: 'DocumentCollectionStarted',
          data: { 
            registrationId,
            enablerId,
            requiredDocuments: [
              'business_license',
              'tax_certificate', 
              'bank_account_details',
              'identity_document'
            ],
            collectionStatus: 'in_progress',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { documentCollectionStarted: true } };
      }),
      
      new SagaStep('KYC_ASSISTANCE', async (context: SagaContext) => {
        const { registrationId, enablerId, documents } = context.data;
        
        await eventBus.publish({
          type: 'KYCAssistanceProvided',
          data: { 
            registrationId,
            enablerId,
            kycStatus: 'assisted',
            documentsVerified: documents?.length || 0,
            assistanceNotes: 'Enabler provided guidance on document requirements',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { kycAssistanceProvided: true } };
      }),
      
      new SagaStep('ACCOUNT_SETUP', async (context: SagaContext) => {
        const { registrationId, enablerId } = context.data;
        
        await eventBus.publish({
          type: 'SellerAccountCreated',
          data: { 
            registrationId,
            sellerId: `SELLER-${Date.now()}`,
            enablerId,
            accountStatus: 'pending_verification',
            setupCompletedAt: new Date(),
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { accountSetup: true } };
      }),
      
      new SagaStep('ONBOARDING_COMPLETION', async (context: SagaContext) => {
        const { registrationId, sellerId, enablerId } = context.data;
        
        await eventBus.publish({
          type: 'SellerOnboardingCompleted',
          data: { 
            registrationId,
            sellerId,
            enablerId,
            completedAt: new Date(),
            status: 'completed',
            nextSteps: ['training_enrollment', 'first_product_listing'],
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { onboardingCompleted: true } };
      })
    ]);
  }
}

// Seller Training Delivery Saga (/enabler/training - Training Center)
export class SellerTrainingDeliverySaga extends BaseSaga {
  constructor() {
    super('SellerTrainingDelivery', [
      new SagaStep('TRAINING_SCHEDULING', async (context: SagaContext) => {
        const { enablerId, sellerId, trainingModule, preferredSchedule } = context.data;
        
        await eventBus.publish({
          type: 'TrainingScheduled',
          data: { 
            enablerId,
            sellerId,
            trainingModule,
            scheduledDate: preferredSchedule,
            trainingId: `TRAIN-${Date.now()}`,
            status: 'scheduled',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { trainingScheduled: true } };
      }),
      
      new SagaStep('CONTENT_PREPARATION', async (context: SagaContext) => {
        const { trainingId, trainingModule, sellerId } = context.data;
        
        const trainingContent = await this.prepareTrainingContent(trainingModule, sellerId);
        
        await eventBus.publish({
          type: 'TrainingContentPrepared',
          data: { 
            trainingId,
            trainingContent,
            materialsReady: true,
            preparationCompletedAt: new Date(),
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { contentPrepared: true } };
      }),
      
      new SagaStep('TRAINING_DELIVERY', async (context: SagaContext) => {
        const { trainingId, enablerId, sellerId } = context.data;
        
        await eventBus.publish({
          type: 'TrainingDeliveryStarted',
          data: { 
            trainingId,
            enablerId,
            sellerId,
            deliveryStartedAt: new Date(),
            deliveryMethod: 'in_person',
            status: 'in_progress',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { trainingDeliveryStarted: true } };
      }),
      
      new SagaStep('PROGRESS_ASSESSMENT', async (context: SagaContext) => {
        const { trainingId, sellerId, trainingModule } = context.data;
        
        const assessmentResults = await this.conductAssessment(sellerId, trainingModule);
        
        await eventBus.publish({
          type: 'TrainingAssessmentCompleted',
          data: { 
            trainingId,
            sellerId,
            assessmentResults,
            passScore: 80,
            actualScore: assessmentResults.score,
            passed: assessmentResults.score >= 80,
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { assessmentCompleted: true } };
      }),
      
      new SagaStep('CERTIFICATION_ISSUANCE', async (context: SagaContext) => {
        const { trainingId, sellerId, enablerId, passed } = context.data;
        
        if (passed) {
          await eventBus.publish({
            type: 'TrainingCertificateIssued',
            data: { 
              trainingId,
              sellerId,
              enablerId,
              certificateId: `CERT-${Date.now()}`,
              issuedAt: new Date(),
              validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              sagaId: context.sagaId 
            }
          });
        } else {
          await eventBus.publish({
            type: 'TrainingRetakeRequired',
            data: { 
              trainingId,
              sellerId,
              retakeScheduledFor: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              sagaId: context.sagaId 
            }
          });
        }
        
        return { status: 'COMPLETED', data: { certificationProcessed: true } };
      }),
      
      new SagaStep('FOLLOW_UP_SCHEDULING', async (context: SagaContext) => {
        const { trainingId, sellerId, enablerId } = context.data;
        
        await eventBus.publish({
          type: 'TrainingFollowUpScheduled',
          data: { 
            trainingId,
            sellerId,
            enablerId,
            followUpDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            followUpType: 'progress_check',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { followUpScheduled: true } };
      })
    ]);
  }

  private async prepareTrainingContent(trainingModule: string, sellerId: string) {
    const contentLibrary = {
      'product_listing': {
        modules: ['photography', 'descriptions', 'pricing', 'seo'],
        duration: 120,
        materials: ['product_photos_guide', 'pricing_worksheet']
      },
      'order_management': {
        modules: ['order_processing', 'fulfillment', 'customer_service'],
        duration: 90,
        materials: ['order_workflow_chart', 'customer_service_scripts']
      },
      'marketing_basics': {
        modules: ['social_media', 'promotions', 'customer_retention'],
        duration: 150,
        materials: ['marketing_calendar_template', 'promotion_ideas']
      }
    };
    
    return contentLibrary[trainingModule] || contentLibrary['product_listing'];
  }

  private async conductAssessment(sellerId: string, trainingModule: string): Promise<any> {
    const baseScore = 75 + Math.random() * 20;
    
    return {
      score: Math.round(baseScore),
      strengths: ['product_knowledge', 'customer_service'],
      improvementAreas: ['pricing_strategy'],
      recommendations: ['practice_more_photography', 'study_competitor_pricing']
    };
  }
}

// Skill Development Saga (/enabler/training - Training Center)
export class SkillDevelopmentSaga extends BaseSaga {
  constructor() {
    super('SkillDevelopment', [
      new SagaStep('SKILL_ASSESSMENT', async (context: SagaContext) => {
        const { enablerId, skillCategory } = context.data;
        
        const currentSkills = await this.assessCurrentSkills(enablerId, skillCategory);
        
        await eventBus.publish({
          type: 'SkillAssessmentCompleted',
          data: { 
            enablerId,
            skillCategory,
            currentSkills,
            assessmentDate: new Date(),
            skillGaps: currentSkills.gaps,
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { skillAssessed: true } };
      }),
      
      new SagaStep('DEVELOPMENT_PLAN_CREATION', async (context: SagaContext) => {
        const { enablerId, skillGaps, skillCategory } = context.data;
        
        const developmentPlan = await this.createSkillDevelopmentPlan(skillGaps, skillCategory);
        
        await eventBus.publish({
          type: 'SkillDevelopmentPlanCreated',
          data: { 
            enablerId,
            developmentPlan,
            targetSkills: developmentPlan.targets,
            timeline: developmentPlan.timeline,
            resources: developmentPlan.resources,
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { developmentPlanCreated: true } };
      }),
      
      new SagaStep('TRAINING_ENROLLMENT', async (context: SagaContext) => {
        const { enablerId, developmentPlan } = context.data;
        
        const enrollments = await this.enrollInTrainingPrograms(enablerId, developmentPlan);
        
        await eventBus.publish({
          type: 'TrainingProgramsEnrolled',
          data: { 
            enablerId,
            enrollments,
            enrolledPrograms: enrollments.length,
            enrollmentDate: new Date(),
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { trainingEnrolled: true } };
      }),
      
      new SagaStep('PROGRESS_TRACKING', async (context: SagaContext) => {
        const { enablerId } = context.data;
        
        await eventBus.publish({
          type: 'SkillDevelopmentProgressTracked',
          data: { 
            enablerId,
            progressTrackingStarted: true,
            trackingFrequency: 'weekly',
            nextCheckIn: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { progressTrackingStarted: true } };
      }),
      
      new SagaStep('SKILL_CERTIFICATION', async (context: SagaContext) => {
        const { enablerId, completedTraining } = context.data;
        
        const certifications = await this.issueCertifications(enablerId, completedTraining);
        
        await eventBus.publish({
          type: 'SkillCertificationsIssued',
          data: { 
            enablerId,
            certifications,
            certificationDate: new Date(),
            validityPeriod: '2 years',
            sagaId: context.sagaId 
          }
        });
        
        return { status: 'COMPLETED', data: { certificationsIssued: true } };
      })
    ]);
  }

  private async assessCurrentSkills(enablerId: string, category: string) {
    const skillAssessment = {
      'sales_support': {
        current: ['basic_sales', 'customer_service'],
        gaps: ['advanced_negotiation', 'upselling_techniques'],
        level: 'intermediate'
      },
      'logistics_support': {
        current: ['route_planning', 'delivery_coordination'],
        gaps: ['inventory_management', 'supply_chain_optimization'],
        level: 'beginner'
      },
      'training_delivery': {
        current: ['presentation_skills', 'adult_learning'],
        gaps: ['curriculum_development', 'assessment_design'],
        level: 'advanced'
      }
    };

    return skillAssessment[category] || skillAssessment['sales_support'];
  }

  private async createSkillDevelopmentPlan(skillGaps: string[], category: string) {
    return {
      targets: skillGaps,
      timeline: '90 days',
      resources: [
        'Online training modules',
        'Mentorship program',
        'Practical workshops',
        'Peer learning sessions'
      ],
      milestones: [
        { week: 2, target: 'Complete foundational modules' },
        { week: 6, target: 'Pass intermediate assessment' },
        { week: 10, target: 'Complete practical project' },
        { week: 12, target: 'Achieve certification' }
      ]
    };
  }

  private async enrollInTrainingPrograms(enablerId: string, plan: any) {
    return plan.targets.map((skill: string, index: number) => ({
      programId: `PROG-${Date.now()}-${index}`,
      skillTarget: skill,
      duration: '4 weeks',
      format: 'blended',
      startDate: new Date(Date.now() + index * 7 * 24 * 60 * 60 * 1000)
    }));
  }

  private async issueCertifications(enablerId: string, completedTraining: any[]) {
    return completedTraining.map((training: any) => ({
      certificationId: `CERT-${Date.now()}-${training.programId}`,
      skill: training.skillTarget,
      level: 'certified',
      issuedDate: new Date(),
      validUntil: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000),
      verificationCode: `VERIFY-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
    }));
  }
}