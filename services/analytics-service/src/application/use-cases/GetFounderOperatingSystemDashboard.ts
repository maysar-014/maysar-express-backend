import {
  FounderBottleneckDTO,
  FounderDataGapDTO,
  FounderMetricDTO,
  FounderOperatingSystemDashboardDTO,
  FounderPhaseDTO,
  FounderWeeklyReviewDTO
} from '../dto/founder-operating-system-dashboard.dto';
import { SellerAnalyticsRepository } from '../../infrastructure/repositories/SellerAnalyticsRepository';
import { GetRevenueHealthMetrics } from './GetRevenueHealthMetrics';
import { GetGrowthIndicators } from './GetGrowthIndicators';
import { GetRetentionMetrics } from './GetRetentionMetrics';
import { GetFinancialMetrics } from './GetFinancialMetrics';
import { GetHappinessSignals } from './GetHappinessSignals';
import { RedFlag, RedFlagEngine } from '../../domain/engines/RedFlagEngine';

interface FocusBlueprint {
  primaryObjective: string;
  criticalTasks: string[];
  dailyWinStatement: string;
}

export class GetFounderOperatingSystemDashboard {
  constructor(
    private readonly repository: SellerAnalyticsRepository,
    private readonly revenueHealthUseCase: GetRevenueHealthMetrics,
    private readonly growthIndicatorsUseCase: GetGrowthIndicators,
    private readonly retentionMetricsUseCase: GetRetentionMetrics,
    private readonly financialMetricsUseCase: GetFinancialMetrics,
    private readonly happinessSignalsUseCase: GetHappinessSignals,
    private readonly redFlagEngine: RedFlagEngine
  ) {}

  async execute(): Promise<FounderOperatingSystemDashboardDTO> {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      gmvRaw,
      activeSellers,
      totalSellers,
      dailyActiveUsers,
      buyerConversionRate,
      ordersToday,
      checkoutSessionsToday,
      supportTicketsCreatedToday,
      supportTicketsResolvedToday,
      supportTicketsCreated7Days,
      openSupportTickets,
      sellerMetricsRollup,
      revenueHealth,
      growth,
      retention,
      financial,
      happiness
    ] = await Promise.all([
      this.repository.getGMV(last30Days, now),
      this.repository.getActiveSellersCount(30),
      this.repository.getTotalSellersCount(),
      this.repository.getDailyActiveUsersCount(1),
      this.repository.getBuyerConversionRate(last24Hours, now),
      this.repository.getOrdersCount(last24Hours, now),
      this.repository.getCheckoutSessionCount(last24Hours, now),
      this.repository.getSupportTicketsCreatedCount(last24Hours, now),
      this.repository.getSupportTicketsResolvedCount(last24Hours, now),
      this.repository.getSupportTicketsCreatedCount(last7Days, now),
      this.repository.getOpenSupportTicketsCount(),
      this.repository.getSellerMetricsRollup(),
      this.revenueHealthUseCase.execute('monthly'),
      this.growthIndicatorsUseCase.execute(),
      this.retentionMetricsUseCase.execute(),
      this.financialMetricsUseCase.execute(),
      this.happinessSignalsUseCase.execute()
    ]);

    const gmv = typeof gmvRaw === 'object' ? gmvRaw.toNumber() : Number(gmvRaw || 0);
    const sellerActivityRate = totalSellers === 0
      ? 0
      : Number(((activeSellers.length / totalSellers) * 100).toFixed(2));

    const flags = this.redFlagEngine.detectRedFlags({
      arpsMonthly: revenueHealth.arpsMonthly,
      arpsWeekly: revenueHealth.arpsWeekly,
      churnRateMonthly: retention.churnRateMonthly,
      medianRevenue: revenueHealth.medianRevenue,
      payoutTimeHours: financial.avgPayoutTimeHours,
      disputesPer100Orders: financial.disputesPer100Orders,
      retentionRate90Days: retention.retentionRate90Days,
      productExpansionRate: happiness.productExpansionRate
    });

    const bottleneck = this.selectBottleneck(
      flags,
      buyerConversionRate,
      openSupportTickets,
      sellerMetricsRollup.totalLowConversionProducts
    );
    const focus = this.buildFocusBlueprint(bottleneck.type);

    return {
      title: 'Maysar Daily Operating System',
      generatedAt: now,
      currentBottleneck: bottleneck,
      primaryObjective: focus.primaryObjective,
      criticalTasks: focus.criticalTasks,
      dailyWinStatement: focus.dailyWinStatement,
      phases: this.buildPhases({
        gmv,
        dailyActiveUsers,
        buyerConversionRate,
        sellerActivityRate,
        ordersToday,
        checkoutSessionsToday,
        supportTicketsCreatedToday,
        supportTicketsResolvedToday,
        openSupportTickets,
        openRedFlags: flags.length,
        avgPendingCustomerQuestions: sellerMetricsRollup.avgPendingCustomerQuestions,
        avgPlatformConversionRate: sellerMetricsRollup.avgConversionRate,
        avgCartAbandonment: sellerMetricsRollup.avgCartAbandonment,
        totalLowConversionProducts: sellerMetricsRollup.totalLowConversionProducts,
        retentionRate90Days: retention.retentionRate90Days,
        repeatBuyerRate: growth.repeatBuyerRate,
        productExpansionRate: happiness.productExpansionRate,
        referralCount: happiness.referralCount,
        payoutTimeHours: financial.avgPayoutTimeHours,
        primaryObjective: focus.primaryObjective,
        criticalTasks: focus.criticalTasks,
        dailyWinStatement: focus.dailyWinStatement
      }),
      weeklyReview: this.buildWeeklyReview({
        supportTicketsCreated7Days,
        openRedFlags: flags.length,
        churnRateMonthly: retention.churnRateMonthly,
        disputesPer100Orders: financial.disputesPer100Orders,
        retentionRate90Days: retention.retentionRate90Days,
        repeatBuyerRate: growth.repeatBuyerRate
      }),
      dataGaps: this.buildDataGaps()
    };
  }

  private buildPhases(input: {
    gmv: number;
    dailyActiveUsers: number;
    buyerConversionRate: number;
    sellerActivityRate: number;
    ordersToday: number;
    checkoutSessionsToday: number;
    supportTicketsCreatedToday: number;
    supportTicketsResolvedToday: number;
    openSupportTickets: number;
    openRedFlags: number;
    avgPendingCustomerQuestions: number;
    avgPlatformConversionRate: number;
    avgCartAbandonment: number;
    totalLowConversionProducts: number;
    retentionRate90Days: number;
    repeatBuyerRate: number;
    productExpansionRate: number;
    referralCount: number;
    payoutTimeHours: number;
    primaryObjective: string;
    criticalTasks: string[];
    dailyWinStatement: string;
  }): FounderPhaseDTO[] {
    return [
      {
        key: 'fajr',
        prayerName: 'Fajr',
        mode: 'Strategic Command Center',
        stateShift: 'Direction',
        objective: 'Define what matters most today and cut everything else.',
        adminPanelSection: 'admin.dashboard.mdos.fajr',
        actions: [
          'Review the core demand, conversion, and seller activity signals.',
          'Lock one primary objective for the day.',
          'Choose only three critical tasks that move that objective.'
        ],
        metrics: [
          this.automatedMetric('gmv_30d', 'GMV (30d)', input.gmv, 'currency', 'orders.delivered'),
          this.automatedMetric('daily_active_users', 'Daily active users (24h)', input.dailyActiveUsers, 'count', 'user_sessions'),
          this.automatedMetric('buyer_conversion_rate', 'Buyer conversion rate (24h)', input.buyerConversionRate, 'percent', 'checkout_sessions_to_orders'),
          this.automatedMetric('seller_activity_rate', 'Seller activity rate (30d)', input.sellerActivityRate, 'percent', 'active_sellers_vs_total_sellers')
        ],
        outputs: [
          { label: 'Primary objective', value: input.primaryObjective },
          { label: 'Critical task 1', value: input.criticalTasks[0] },
          { label: 'Critical task 2', value: input.criticalTasks[1] },
          { label: 'Critical task 3', value: input.criticalTasks[2] },
          { label: 'Daily win statement', value: input.dailyWinStatement }
        ]
      },
      {
        key: 'dhuhr',
        prayerName: 'Dhuhr',
        mode: 'Execution Engine',
        stateShift: 'Movement',
        objective: 'Turn the day plan into visible platform progress.',
        adminPanelSection: 'admin.dashboard.mdos.dhuhr',
        actions: [
          'Execute only the critical tasks locked at Fajr.',
          'Resolve blockers quickly and keep communication tight.',
          'Refuse feature drift until the primary objective moves.'
        ],
        rule: 'If it does not move the primary objective, it does not exist.',
        metrics: [
          this.automatedMetric('orders_24h', 'Orders created (24h)', input.ordersToday, 'count', 'order_Order'),
          this.automatedMetric('checkout_sessions_24h', 'Checkout sessions (24h)', input.checkoutSessionsToday, 'count', 'checkout_CheckoutSession'),
          this.automatedMetric('issues_resolved_24h', 'Issues resolved (24h)', input.supportTicketsResolvedToday, 'count', 'support_Ticket.resolvedAt'),
          this.manualMetric('critical_tasks_complete', 'Critical tasks complete', 'percent', 'Needs a founder task tracker or sprint board integration.'),
          this.manualMetric('blockers_removed', 'Blockers removed', 'count', 'Needs blocker logging in the admin panel or incident tracker.'),
          this.manualMetric('deployment_progress', 'Deployment progress', 'percent', 'Needs CI/CD deployment status integration.')
        ]
      },
      {
        key: 'asr',
        prayerName: 'Asr',
        mode: 'Control Tower',
        stateShift: 'Correction',
        objective: 'Catch drift early and redirect effort before the day is lost.',
        adminPanelSection: 'admin.dashboard.mdos.asr',
        actions: [
          'Compare the intended plan with the real signal.',
          'Surface what is slipping, stalling, or burning team time.',
          'Reassign effort immediately when the scoreboard says no.'
        ],
        guidingQuestion: 'If we continue like this, do we still win today?',
        metrics: [
          this.automatedMetric('open_red_flags', 'Open red flags', input.openRedFlags, 'count', 'red_flag_engine'),
          this.automatedMetric('open_support_tickets', 'Open support tickets', input.openSupportTickets, 'count', 'support_Ticket'),
          this.derivedMetric('pending_customer_questions', 'Pending customer questions', this.round(input.avgPendingCustomerQuestions), 'count', 'analytics_SellerMetrics.pendingCustomerQuestions'),
          this.manualMetric('time_wasted', 'Estimated time wasted', 'hours', 'Needs a lightweight founder audit input during Asr review.'),
          this.manualMetric('new_blockers_discovered', 'New blockers discovered', 'count', 'Needs explicit blocker capture during team sync.')
        ]
      },
      {
        key: 'maghrib',
        prayerName: 'Maghrib',
        mode: 'Intelligence & Learning',
        stateShift: 'Insight',
        objective: 'Convert the day into operating knowledge the team can reuse.',
        adminPanelSection: 'admin.dashboard.mdos.maghrib',
        actions: [
          'Review drop-off, complaints, and low-conversion surfaces.',
          'Capture one insight, one mistake, and one improvement.',
          'Make sure every difficult day leaves a useful trace.'
        ],
        rule: 'No day ends without extracting intelligence.',
        metrics: [
          this.automatedMetric('issues_raised_24h', 'Issues raised (24h)', input.supportTicketsCreatedToday, 'count', 'support_Ticket.createdAt'),
          this.automatedMetric('buyer_conversion_rate_review', 'Buyer conversion rate (24h)', input.buyerConversionRate, 'percent', 'checkout_sessions_to_orders'),
          this.derivedMetric('avg_platform_conversion_rate', 'Average seller conversion signal', this.round(input.avgPlatformConversionRate), 'percent', 'analytics_SellerMetrics.conversionRate'),
          this.derivedMetric('cart_abandonment_signal', 'Cart abandonment signal', this.round(input.avgCartAbandonment), 'count', 'analytics_SellerMetrics.cartAbandonment'),
          this.automatedMetric('low_conversion_products', 'Low-conversion products', input.totalLowConversionProducts, 'count', 'analytics_SellerMetrics.lowConversionProductCount')
        ],
        outputs: [
          { label: 'Insight prompt', value: 'What worked today that should become default behavior?' },
          { label: 'Mistake prompt', value: 'What did we overbuild, ignore, or misunderstand?' },
          { label: 'Improvement prompt', value: 'What single change should we make tomorrow because of today?' }
        ]
      },
      {
        key: 'isha',
        prayerName: 'Isha',
        mode: 'Vision & System Design',
        stateShift: 'Compounding',
        objective: 'Push the company toward systems that keep working tomorrow without heroics.',
        adminPanelSection: 'admin.dashboard.mdos.isha',
        actions: [
          'Think in systems, loops, and automation instead of isolated tasks.',
          'Design one scalable improvement that compounds over time.',
          'Prefer trust, retention, and network effects over cosmetic movement.'
        ],
        guidingQuestion: 'What are we building that works without us tomorrow?',
        metrics: [
          this.automatedMetric('retention_rate_90d', 'Seller retention (90d)', input.retentionRate90Days, 'percent', 'retention_engine'),
          this.automatedMetric('repeat_purchase_rate', 'Repeat purchase rate', input.repeatBuyerRate, 'percent', 'growth_indicators.repeatBuyerRate'),
          this.automatedMetric('product_expansion_rate', 'Product expansion rate', input.productExpansionRate, 'percent', 'seller_happiness.productExpansionRate'),
          this.automatedMetric('referral_count', 'Referral count', input.referralCount, 'count', 'commission_Referral'),
          this.automatedMetric('avg_payout_time', 'Average payout time', input.payoutTimeHours, 'hours', 'payout.completedAt')
        ]
      }
    ];
  }

  private buildWeeklyReview(input: {
    supportTicketsCreated7Days: number;
    openRedFlags: number;
    churnRateMonthly: number;
    disputesPer100Orders: number;
    retentionRate90Days: number;
    repeatBuyerRate: number;
  }): FounderWeeklyReviewDTO {
    return {
      cadence: 'Every 7 days',
      objective: 'Review patterns from the week and redesign the system, not just the to-do list.',
      actions: [
        'Review all Maghrib insights and recurring friction points.',
        'Identify repeated problems and structural weaknesses.',
        'Redesign one system instead of patching seven symptoms.'
      ],
      metrics: [
        this.automatedMetric('weekly_issues_raised', 'Issues raised (7d)', input.supportTicketsCreated7Days, 'count', 'support_Ticket.createdAt'),
        this.automatedMetric('weekly_open_red_flags', 'Open red flags', input.openRedFlags, 'count', 'red_flag_engine'),
        this.automatedMetric('weekly_churn_rate', 'Monthly churn rate', input.churnRateMonthly, 'percent', 'retention_engine'),
        this.automatedMetric('weekly_disputes', 'Disputes per 100 orders', input.disputesPer100Orders, 'count', 'financial_metrics_engine'),
        this.automatedMetric('weekly_retention', 'Seller retention (90d)', input.retentionRate90Days, 'percent', 'retention_engine'),
        this.automatedMetric('weekly_repeat_purchase', 'Repeat purchase rate', input.repeatBuyerRate, 'percent', 'growth_indicators.repeatBuyerRate')
      ],
      redesignPrompt: 'Which repeated problem deserves a system redesign before next week starts?'
    };
  }

  private buildDataGaps(): FounderDataGapDTO[] {
    return [
      {
        key: 'founder_task_tracker',
        label: 'Founder task tracker',
        reason: 'Critical task completion, blocker removal, and planned-vs-actual execution are not stored in the backend today.',
        suggestedSource: 'Integrate Jira, Linear, or a lightweight admin task table.'
      },
      {
        key: 'deployment_pipeline',
        label: 'Deployment pipeline telemetry',
        reason: 'MDOS asks for deployment progress, but CI/CD state is not yet connected to the admin dashboard contract.',
        suggestedSource: 'Integrate GitHub Actions, Docker deploy events, or release metadata.'
      },
      {
        key: 'founder_journal',
        label: 'Founder journal and Maghrib log',
        reason: 'Insights, mistakes, and improvements need a persistent journal if we want weekly review to be truly actionable.',
        suggestedSource: 'Add an admin journal table or connect a structured notes service.'
      }
    ];
  }

  private selectBottleneck(
    flags: RedFlag[],
    buyerConversionRate: number,
    openSupportTickets: number,
    totalLowConversionProducts: number
  ): FounderBottleneckDTO {
    if (flags.length > 0) {
      const severityRank: Record<RedFlag['severity'], number> = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1
      };
      const topFlag = [...flags].sort((left, right) => severityRank[right.severity] - severityRank[left.severity])[0];
      return {
        type: topFlag.type,
        severity: topFlag.severity,
        summary: topFlag.message
      };
    }

    if (buyerConversionRate < 25) {
      return {
        type: 'conversion_gap',
        severity: 'high',
        summary: `Buyer conversion is ${buyerConversionRate.toFixed(2)}%, so trust and funnel clarity are likely costing the day.`
      };
    }

    if (openSupportTickets >= 10) {
      return {
        type: 'support_backlog',
        severity: 'medium',
        summary: `${openSupportTickets} support issues are still open, which suggests response speed is dragging execution.`
      };
    }

    if (totalLowConversionProducts > 0) {
      return {
        type: 'catalog_friction',
        severity: 'medium',
        summary: `${totalLowConversionProducts} low-conversion products need sharper pricing, trust, or merchandising signals.`
      };
    }

    return {
      type: 'system_compounding',
      severity: 'low',
      summary: 'No major red flag dominates today, so the focus can shift to compounding retention, trust, and automation.'
    };
  }

  private buildFocusBlueprint(bottleneckType: string): FocusBlueprint {
    switch (bottleneckType) {
      case 'low_retention':
      case 'high_churn':
        return {
          primaryObjective: 'Stabilize seller retention and repeat buying.',
          criticalTasks: [
            'Audit the first-sale and onboarding friction that delays activation.',
            'Target dormant sellers and buyers with reactivation follow-ups.',
            'Push one repeat-purchase trigger that improves return behavior.'
          ],
          dailyWinStatement: 'Today we win if retention risk drops because activation and repeat purchase friction are reduced.'
        };
      case 'high_disputes':
        return {
          primaryObjective: 'Increase buyer trust and reduce dispute-causing ambiguity.',
          criticalTasks: [
            'Strengthen visible trust signals around seller quality and authenticity.',
            'Tighten pricing clarity and reduce avoidable confusion before checkout.',
            'Shorten dispute handling response loops with clear ownership.'
          ],
          dailyWinStatement: 'Today we win if buyers see clearer proof, clearer pricing, and fewer reasons to hesitate or dispute.'
        };
      case 'slow_payouts':
        return {
          primaryObjective: 'Reduce payout latency and protect seller confidence.',
          criticalTasks: [
            'Identify the payout bottleneck inside approvals or settlement flow.',
            'Surface stuck payouts and force explicit queue ownership.',
            'Design the shortest safe path to faster seller cash-out.'
          ],
          dailyWinStatement: 'Today we win if payout friction is exposed, owned, and reduced enough to rebuild seller trust.'
        };
      case 'revenue_concentration':
        return {
          primaryObjective: 'Diversify revenue beyond the current top sellers.',
          criticalTasks: [
            'Identify the seller segments not yet contributing meaningful revenue.',
            'Improve conversion or assortment for the next layer of sellers.',
            'Launch one growth action that broadens revenue participation.'
          ],
          dailyWinStatement: 'Today we win if revenue starts spreading across more sellers instead of depending on a few.'
        };
      case 'low_expansion':
      case 'catalog_friction':
        return {
          primaryObjective: 'Expand seller catalog quality and visible demand signals.',
          criticalTasks: [
            'Prioritize the products with low conversion or weak trust presentation.',
            'Reduce merchandising friction that slows discovery and checkout.',
            'Create one repeatable loop for adding stronger catalog depth.'
          ],
          dailyWinStatement: 'Today we win if the catalog becomes easier to trust, easier to browse, and easier to buy from.'
        };
      case 'support_backlog':
        return {
          primaryObjective: 'Clear the operational backlog that is slowing the team and the marketplace.',
          criticalTasks: [
            'Triage open issues by severity and unblock the highest-impact ones first.',
            'Reduce response lag on active merchant and buyer problems.',
            'Eliminate the repeat issue category creating the most drag.'
          ],
          dailyWinStatement: 'Today we win if open issues stop piling up and the team regains clean execution speed.'
        };
      case 'conversion_gap':
        return {
          primaryObjective: 'Improve buyer conversion through clearer trust and funnel flow.',
          criticalTasks: [
            'Find the sharpest drop-off between checkout intent and order creation.',
            'Improve the trust, pricing, or product detail signal that is blocking conversion.',
            'Simplify one step in the purchase path before adding anything new.'
          ],
          dailyWinStatement: 'Today we win if more buyer intent turns into completed orders instead of hesitation.'
        };
      default:
        return {
          primaryObjective: 'Compound retention, trust, and system leverage.',
          criticalTasks: [
            'Choose one system improvement that keeps paying back next week.',
            'Strengthen one trust or retention loop that works without manual chasing.',
            'Cut one recurring source of drag from the operating system.'
          ],
          dailyWinStatement: 'Today we win if the platform leaves the day more self-sustaining than it started.'
        };
    }
  }

  private automatedMetric(
    key: string,
    label: string,
    value: number,
    unit: FounderMetricDTO['unit'],
    source: string
  ): FounderMetricDTO {
    return {
      key,
      label,
      value,
      unit,
      status: 'automated',
      source
    };
  }

  private derivedMetric(
    key: string,
    label: string,
    value: number,
    unit: FounderMetricDTO['unit'],
    source: string
  ): FounderMetricDTO {
    return {
      key,
      label,
      value,
      unit,
      status: 'derived',
      source
    };
  }

  private manualMetric(
    key: string,
    label: string,
    unit: FounderMetricDTO['unit'],
    note: string
  ): FounderMetricDTO {
    return {
      key,
      label,
      value: null,
      unit,
      status: 'manual',
      source: 'admin_panel_manual_input',
      note
    };
  }

  private round(value: number) {
    return Number(value.toFixed(2));
  }
}
