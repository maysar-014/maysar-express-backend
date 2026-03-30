import { Prisma } from '@prisma/client';
import prisma from '../../infrastructure/database/prisma';
import {
  SellerSlaEngine,
  SellerSlaEvaluationMode,
  SellerSlaFacts,
  SellerSlaReport,
  SellerSlaMetricAssessment,
  SellerSlaReadinessGate
} from '../../domain/engines/SellerSlaEngine';
import type { SellerSlaExecutionResultDTO } from '../dto/seller-sla.dto';

interface OrderRecord {
  id: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
}

interface DeliveryRecord {
  orderId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  estimatedDeliveryTime: Date | null;
  actualDeliveryTime: Date | null;
}

interface TicketMessageRecord {
  senderType: string;
  createdAt: Date;
  isInternal: boolean;
}

interface SupportTicketRecord {
  id: string;
  priority: string;
  status: string;
  assignedAgentId: string | null;
  createdAt: Date;
  resolvedAt: Date | null;
  closedAt: Date | null;
  messages: TicketMessageRecord[];
}

interface RefundRecord {
  createdAt: Date;
  processedAt: Date | null;
  completedAt: Date | null;
  updatedAt: Date;
  status: string;
  orderId: string;
}

interface ProductRecord {
  id: string;
  description: string | null;
  status: string;
  seoTitle: string | null;
  shortSeoDescription: string | null;
  tags: string[];
  qualityScore: number;
  variants: Array<{ id: string }>;
  structuredAttributes: Array<{ id: string }>;
}

interface MediaRecord {
  entityId: string;
  displayOrder: number;
  isPrimary: boolean;
  url: string;
}

interface InventoryRecord {
  currentStock: number;
  stockStatus: string;
}

interface BusinessDocumentRecord {
  status: string;
}

interface BusinessRecord {
  status: string;
  verificationStatus: string;
  complianceStatus: string;
  documents: BusinessDocumentRecord[];
}

interface ExecutionOptions {
  lookbackDays?: number;
  mode?: SellerSlaEvaluationMode;
  now?: Date;
}

const DAY_MS = 24 * 60 * 60 * 1000;

const clampLookbackDays = (value: number): number => {
  if (!Number.isFinite(value) || value <= 0) return 30;
  return Math.max(1, Math.min(365, Math.floor(value)));
};

const average = (values: number[]): number | null => {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const serializeForJson = (value: unknown): Prisma.InputJsonValue => JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

const mapSeverityToPriority = (severity: SellerSlaReport['breaches'][number]['severity'] | 'high') => {
  switch (severity) {
    case 'critical':
      return 'CRITICAL';
    case 'high':
      return 'HIGH';
    case 'medium':
      return 'MEDIUM';
    default:
      return 'LOW';
  }
};

const isOpenTicket = (status: string): boolean => ['OPEN', 'IN_PROGRESS'].includes(status.toUpperCase());

const firstAgentReply = (messages: TicketMessageRecord[]): Date | null => {
  const message = messages.find(entry => !entry.isInternal && entry.senderType.toUpperCase() === 'AGENT');
  return message?.createdAt ?? null;
};

const isTicketUrgent = (priority: string): boolean => ['HIGH', 'URGENT'].includes(priority.toUpperCase());

const getFinalRefundTime = (refund: RefundRecord): Date | null => refund.completedAt ?? refund.processedAt ?? null;

export class GetSellerSlaReport {
  private readonly engine = new SellerSlaEngine();

  async execute(sellerId: string, options: ExecutionOptions = {}): Promise<SellerSlaExecutionResultDTO> {
    const now = options.now ?? new Date();
    const lookbackDays = clampLookbackDays(options.lookbackDays ?? 30);
    const mode = options.mode ?? 'report';
    const periodStart = new Date(now.getTime() - lookbackDays * DAY_MS);

    const orders: OrderRecord[] = await prisma.order_Order.findMany({
      where: {
        sellerId,
        createdAt: {
          gte: periodStart,
          lte: now
        }
      },
      select: {
        id: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        cancelledAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
      });

    const orderIds = orders.map(order => order.id);

    const refundsPromise = orderIds.length > 0
      ? prisma.payment_Refund.findMany({
        where: {
          createdAt: {
            gte: periodStart,
            lte: now
          },
          orderId: {
            in: orderIds
          }
        },
        select: {
          createdAt: true,
          processedAt: true,
          completedAt: true,
          updatedAt: true,
          status: true,
          orderId: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }) as Promise<RefundRecord[]>
      : Promise.resolve([] as RefundRecord[]);

    const [deliveries, tickets, refunds, products, inventoryHealth, business] = await Promise.all([
      prisma.logistics_Delivery.findMany({
        where: {
          sellerId,
          createdAt: {
            gte: periodStart,
            lte: now
          }
        },
        select: {
          orderId: true,
          status: true,
          createdAt: true,
          updatedAt: true,
          estimatedDeliveryTime: true,
          actualDeliveryTime: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }) as Promise<DeliveryRecord[]>,
      prisma.support_Ticket.findMany({
        where: {
          userId: sellerId,
          createdAt: {
            gte: periodStart,
            lte: now
          }
        },
        include: {
          messages: {
            where: {
              isInternal: false
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      }) as Promise<SupportTicketRecord[]>,
      refundsPromise,
      prisma.product.findMany({
        where: {
          sellerId
        },
        select: {
          id: true,
          description: true,
          status: true,
          seoTitle: true,
          shortSeoDescription: true,
          tags: true,
          qualityScore: true,
          variants: {
            select: {
              id: true
            }
          },
          structuredAttributes: {
            select: {
              id: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      }) as Promise<ProductRecord[]>,
      prisma.analytics_SellerInventoryHealth.findMany({
        where: {
          sellerId
        },
        select: {
          currentStock: true,
          stockStatus: true
        }
      }) as Promise<InventoryRecord[]>,
      prisma.business.findFirst({
        where: {
          ownerId: sellerId
        },
        include: {
          documents: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      }) as Promise<BusinessRecord | null>
    ]);

    const orderById = new Map(orders.map(order => [order.id, order]));

    const pendingOverdueOrders = orders.filter(order => {
      if (order.status.toUpperCase() !== 'PENDING') return false;
      return (now.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60) > 2;
    }).length;

    const dispatchResults = deliveries.map(delivery => {
      const order = orderById.get(delivery.orderId);
      if (!order) {
        return { onTime: false, delayHours: null as number | null };
      }

      const orderDay = this.getLocalDateKey(order.createdAt);
      const dispatchDay = this.getLocalDateKey(delivery.createdAt);
      const createdHour = this.getLocalHour(order.createdAt);
      const elapsedHours = (delivery.createdAt.getTime() - order.createdAt.getTime()) / (1000 * 60 * 60);
      const sameDayRule = createdHour < 14;
      const onTime = sameDayRule
        ? dispatchDay === orderDay && elapsedHours <= 24
        : dispatchDay !== orderDay && elapsedHours <= 24;

      return {
        onTime,
        delayHours: onTime
          ? 0
          : Math.max(0, elapsedHours - 24)
      };
    });

    const customerResponseMetrics = tickets.map(ticket => {
      const firstReply = firstAgentReply(ticket.messages);
      const responseAt = firstReply ?? ticket.resolvedAt ?? ticket.closedAt ?? now;
      const responseMinutes = (responseAt.getTime() - ticket.createdAt.getTime()) / (1000 * 60);
      const ageHours = (now.getTime() - ticket.createdAt.getTime()) / (1000 * 60 * 60);
      const urgent = isTicketUrgent(ticket.priority);
      const open = isOpenTicket(ticket.status);

      return {
        responseMinutes,
        respondedWithin30: responseMinutes <= 30,
        urgent,
        urgentRespondedWithin15: urgent && responseMinutes <= 15,
        open,
        overdueHigh: urgent && open && ageHours > 4,
        overdueMedium: !urgent && open && ticket.priority.toUpperCase() === 'MEDIUM' && ageHours > 24,
        unassignedOver1h: open && !ticket.assignedAgentId && ageHours > 1
      };
    });

    const refundProcessingHours = refunds.map(refund => {
      const finalTime = getFinalRefundTime(refund);
      const referenceTime = finalTime ?? now;
      return (referenceTime.getTime() - refund.createdAt.getTime()) / (1000 * 60 * 60);
    });

    const mediaByProduct = new Map<string, number>();
    const productIds = products.map(product => product.id);
    if (productIds.length > 0) {
      const mediaRows: MediaRecord[] = await prisma.mediaRef.findMany({
        where: {
          entityType: 'product',
          entityId: {
            in: productIds
          }
        },
        select: {
          entityId: true,
          displayOrder: true,
          isPrimary: true,
          url: true
        }
      });
      for (const media of mediaRows) {
        mediaByProduct.set(media.entityId, (mediaByProduct.get(media.entityId) || 0) + 1);
      }
    }

    const catalogAverageCompleteness = average(products.map(product => {
      const mediaCount = mediaByProduct.get(product.id) || 0;
      const descriptionScore = product.description?.trim() ? 20 : 0;
      const seoScore = product.seoTitle?.trim() || product.shortSeoDescription?.trim() ? 10 : 0;
      const variantScore = product.variants.length > 0 ? 20 : 0;
      const attributeScore = product.structuredAttributes.length > 0 || product.tags.length > 0 ? 15 : 0;
      const mediaScore = mediaCount > 0 ? 20 : 0;
      const liveScore = product.status.toLowerCase() === 'published' ? 15 : 0;
      return descriptionScore + seoScore + variantScore + attributeScore + mediaScore + liveScore;
    }));

    const catalogAverageQualityScore = average(products.map(product => Number(product.qualityScore || 0)));

    const facts: SellerSlaFacts = {
      sellerId,
      periodStart,
      periodEnd: now,
      now,
      totalOrders: orders.length,
      confirmedOnTimeOrders: Math.max(0, orders.length - pendingOverdueOrders),
      pendingOverdueOrders,
      cancelledOrders: orders.filter(order => order.status.toUpperCase() === 'CANCELLED').length,
      dispatchTotal: deliveries.length,
      dispatchOnTime: dispatchResults.filter(result => result.onTime).length,
      dispatchLate: dispatchResults.filter(result => !result.onTime).length,
      inventoryTotal: inventoryHealth.length,
      inventoryInStock: inventoryHealth.filter(record => record.stockStatus.toUpperCase() === 'IN_STOCK').length,
      inventoryLowStock: inventoryHealth.filter(record => record.stockStatus.toUpperCase() === 'LOW_STOCK').length,
      inventoryOutOfStock: inventoryHealth.filter(record => record.stockStatus.toUpperCase() === 'OUT_OF_STOCK').length,
      catalogTotal: products.length,
      catalogPublished: products.filter(product => product.status.toLowerCase() === 'published').length,
      catalogAverageCompleteness,
      catalogAverageQualityScore,
      catalogProductsWithMedia: products.filter(product => (mediaByProduct.get(product.id) || 0) > 0).length,
      catalogProductsWithDescription: products.filter(product => Boolean(product.description?.trim())).length,
      catalogProductsWithVariants: products.filter(product => product.variants.length > 0).length,
      customerTicketsTotal: tickets.length,
      customerTicketsRespondedWithin30: customerResponseMetrics.filter(metric => metric.respondedWithin30).length,
      urgentTicketsTotal: customerResponseMetrics.filter(metric => metric.urgent).length,
      urgentTicketsRespondedWithin15: customerResponseMetrics.filter(metric => metric.urgentRespondedWithin15).length,
      averageFirstResponseMinutes: average(customerResponseMetrics.map(metric => metric.responseMinutes)),
      supportOpenHighOver4h: customerResponseMetrics.filter(metric => metric.overdueHigh).length,
      supportOpenMediumOver24h: customerResponseMetrics.filter(metric => metric.overdueMedium).length,
      supportOpenUnassignedOver1h: customerResponseMetrics.filter(metric => metric.unassignedOver1h).length,
      deliveriesTotal: deliveries.length,
      deliveriesOnTime: dispatchResults.filter(result => result.onTime).length,
      deliveriesLate: dispatchResults.filter(result => !result.onTime).length,
      averageDeliveryDelayHours: average(dispatchResults.filter(result => !result.onTime && result.delayHours !== null).map(result => result.delayHours || 0)),
      refundsTotal: refunds.length,
      refundsCompletedWithin48h: refundProcessingHours.filter(hours => hours <= 48).length,
      averageRefundProcessingHours: average(refundProcessingHours),
      refundRate: orders.length > 0 ? (refunds.length / orders.length) * 100 : null,
      businessPresent: Boolean(business),
      businessActive: business?.status === 'ACTIVE',
      businessVerified: business?.verificationStatus === 'VERIFIED',
      businessCompliant: business?.complianceStatus === 'COMPLIANT',
      businessDocumentsApproved: business?.documents.filter(document => document.status === 'APPROVED').length || 0,
      businessDocumentsTotal: business?.documents.length || 0
    };

    const report = this.engine.assess(facts, mode);
    const persistence = mode === 'evaluate'
      ? await this.persistEvaluation(report)
      : undefined;

    return {
      report,
      persistence
    };
  }

  private getLocalDateKey(date: Date): string {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Dar_es_Salaam',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(date);
  }

  private getLocalHour(date: Date): number {
    return Number(new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Africa/Dar_es_Salaam',
      hour: '2-digit',
      hour12: false
    }).format(date));
  }

  private async persistEvaluation(report: SellerSlaReport): Promise<NonNullable<SellerSlaExecutionResultDTO['persistence']>> {
    const now = report.evaluatedAt;
    const actionableMetrics = report.breaches;
    const blockedGates = report.readiness.filter(gate => !gate.passed);
    const activeActionItemIds = new Set<string>();

    await prisma.analytics_SellerMetrics.upsert({
      where: {
        sellerId: report.sellerId
      },
      update: {
        lastUpdated: now
      },
      create: {
        sellerId: report.sellerId,
        lastUpdated: now
      }
    });

    const existingItems = await prisma.analytics_SellerActionItem.findMany({
      where: {
        sellerId: report.sellerId,
        type: {
          startsWith: 'SLA_'
        },
        isResolved: false
      },
      select: {
        id: true
      }
    });

    const resolutionUpdates = existingItems.filter(item => {
      const shouldStayOpen = actionableMetrics.some(metric => this.metricActionItemId(report.sellerId, metric.key) === item.id)
        || blockedGates.some(gate => this.gateActionItemId(report.sellerId, gate.key) === item.id);
      return !shouldStayOpen;
    });

    for (const item of resolutionUpdates) {
      await prisma.analytics_SellerActionItem.update({
        where: { id: item.id },
        data: {
          isResolved: true,
          metadata: {
            resolvedAt: now.toISOString()
          }
        }
      });
    }

    for (const metric of actionableMetrics) {
      const id = this.metricActionItemId(report.sellerId, metric.key);
      activeActionItemIds.add(id);
      await prisma.analytics_SellerActionItem.upsert({
        where: { id },
        update: {
          isResolved: false,
          priority: mapSeverityToPriority(metric.severity),
          title: metric.title,
          description: `${metric.clause}: ${metric.observed} observed against ${metric.expected}.`,
          metadata: {
            sellerId: report.sellerId,
            metricKey: metric.key,
            clause: metric.clause,
            severity: metric.severity,
            expected: metric.expected,
            observed: metric.observed,
            confidence: metric.confidence,
            score: report.metrics.find(entry => entry.key === metric.key)?.score ?? null,
            periodStart: report.periodStart.toISOString(),
            periodEnd: report.periodEnd.toISOString()
          }
        },
        create: {
          id,
          sellerId: report.sellerId,
          type: `SLA_METRIC_${metric.key.toUpperCase()}`,
          priority: mapSeverityToPriority(metric.severity),
          title: metric.title,
          description: `${metric.clause}: ${metric.observed} observed against ${metric.expected}.`,
          metadata: {
            sellerId: report.sellerId,
            metricKey: metric.key,
            clause: metric.clause,
            severity: metric.severity,
            expected: metric.expected,
            observed: metric.observed,
            confidence: metric.confidence,
            score: report.metrics.find(entry => entry.key === metric.key)?.score ?? null,
            periodStart: report.periodStart.toISOString(),
            periodEnd: report.periodEnd.toISOString()
          }
        }
      });
    }

    for (const gate of blockedGates) {
      const id = this.gateActionItemId(report.sellerId, gate.key);
      activeActionItemIds.add(id);
      await prisma.analytics_SellerActionItem.upsert({
        where: { id },
        update: {
          isResolved: false,
          priority: gate.confidence === 'manual' ? 'HIGH' : 'MEDIUM',
          title: gate.label,
          description: gate.blocker,
          metadata: {
            sellerId: report.sellerId,
            gateKey: gate.key,
            status: gate.status,
            confidence: gate.confidence,
            periodStart: report.periodStart.toISOString(),
            periodEnd: report.periodEnd.toISOString(),
            evidence: gate.evidence
          }
        },
        create: {
          id,
          sellerId: report.sellerId,
          type: `SLA_GATE_${gate.key.toUpperCase()}`,
          priority: gate.confidence === 'manual' ? 'HIGH' : 'MEDIUM',
          title: gate.label,
          description: gate.blocker,
          metadata: {
            sellerId: report.sellerId,
            gateKey: gate.key,
            status: gate.status,
            confidence: gate.confidence,
            periodStart: report.periodStart.toISOString(),
            periodEnd: report.periodEnd.toISOString(),
            evidence: gate.evidence
          }
        }
      });
    }

    const event = await prisma.analytics_Event.create({
      data: {
        type: 'seller_sla.evaluated',
        data: serializeForJson(report),
        timestamp: now,
        status: 'COMPLETED',
        processedAt: now,
        metadata: serializeForJson({
          sellerId: report.sellerId,
          evaluatedAt: now.toISOString(),
          overallComplianceScore: report.overallComplianceScore,
          goLiveReadinessScore: report.goLiveReadinessScore,
          breachedMetrics: report.breaches.length,
          activeActionItems: activeActionItemIds.size
        })
      }
    });

    return {
      actionItemsUpserted: activeActionItemIds.size,
      actionItemsResolved: resolutionUpdates.length,
      eventId: event.id
    };
  }

  private metricActionItemId(sellerId: string, metricKey: string): string {
    return `${sellerId}-sla-metric-${metricKey}`;
  }

  private gateActionItemId(sellerId: string, gateKey: string): string {
    return `${sellerId}-sla-gate-${gateKey}`;
  }
}
