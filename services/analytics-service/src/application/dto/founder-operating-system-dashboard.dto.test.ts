import type { FounderOperatingSystemDashboardDTO } from './founder-operating-system-dashboard.dto';

describe('founder-operating-system-dashboard DTO contracts', () => {
  it('supports a prayer-aligned founder dashboard payload for the admin panel', () => {
    const dashboard: FounderOperatingSystemDashboardDTO = {
      title: 'Maysar Daily Operating System',
      generatedAt: new Date('2026-04-28T05:00:00.000Z'),
      currentBottleneck: {
        type: 'conversion_gap',
        severity: 'high',
        summary: 'Buyer conversion is lagging behind checkout intent.'
      },
      primaryObjective: 'Improve buyer conversion through clearer trust and funnel flow.',
      criticalTasks: [
        'Find the sharpest drop-off between checkout intent and order creation.',
        'Improve the trust signal that is blocking conversion.',
        'Simplify one step in the purchase path.'
      ],
      dailyWinStatement: 'Today we win if more buyer intent turns into completed orders instead of hesitation.',
      phases: [
        {
          key: 'fajr',
          prayerName: 'Fajr',
          mode: 'Strategic Command Center',
          stateShift: 'Direction',
          objective: 'Define what matters most today and cut everything else.',
          adminPanelSection: 'admin.dashboard.mdos.fajr',
          actions: ['Review the core signals.'],
          metrics: [
            {
              key: 'daily_active_users',
              label: 'Daily active users (24h)',
              value: 320,
              unit: 'count',
              status: 'automated',
              source: 'user_sessions'
            }
          ],
          outputs: [{ label: 'Daily win statement', value: 'Today we win if conversion improves.' }]
        }
      ],
      weeklyReview: {
        cadence: 'Every 7 days',
        objective: 'Review patterns and redesign the system.',
        actions: ['Review all Maghrib insights.'],
        metrics: [
          {
            key: 'weekly_issues_raised',
            label: 'Issues raised (7d)',
            value: 18,
            unit: 'count',
            status: 'automated',
            source: 'support_Ticket.createdAt'
          }
        ],
        redesignPrompt: 'Which repeated problem deserves a redesign?'
      },
      dataGaps: [
        {
          key: 'founder_task_tracker',
          label: 'Founder task tracker',
          reason: 'Critical task completion is not stored yet.',
          suggestedSource: 'Integrate Jira or Linear.'
        }
      ]
    };

    expect(dashboard.phases[0].prayerName).toBe('Fajr');
    expect(dashboard.weeklyReview.metrics[0].value).toBe(18);
    expect(dashboard.dataGaps[0].key).toBe('founder_task_tracker');
  });
});
