import prisma from './database/prisma';

export async function seedSellerNotificationTemplates() {
  const templates = [
    {
      name: 'seller_daily_revenue_update',
      type: 'push',
      subject: 'You earned {{amount}} today!',
      content: 'Great work! You\'ve made {{amount}} from {{orderCount}} orders today. Keep it up!',
      variables: JSON.stringify(['amount', 'orderCount'])
    },
    {
      name: 'seller_restock_alert',
      type: 'push',
      subject: 'Restock Alert: {{productName}}',
      content: '{{productName}} is trending in your area and will run out in {{daysLeft}} days. Restock now to maximize sales!',
      variables: JSON.stringify(['productName', 'daysLeft'])
    },
    {
      name: 'seller_low_conversion_warning',
      type: 'push',
      subject: 'Low conversion on {{productCount}} products',
      content: '{{productCount}} of your products have low conversion rates. Consider adjusting prices or improving descriptions.',
      variables: JSON.stringify(['productCount'])
    },
    {
      name: 'seller_pending_inquiries',
      type: 'push',
      subject: '{{count}} customer questions waiting',
      content: 'You have {{count}} pending customer questions. Quick responses increase sales!',
      variables: JSON.stringify(['count'])
    },
    {
      name: 'seller_repeat_customer_milestone',
      type: 'push',
      subject: 'You earned {{amount}} from repeat customers!',
      content: '{{percentage}}% of your buyers returned this month, generating {{amount}} in revenue. Your customer loyalty is growing!',
      variables: JSON.stringify(['amount', 'percentage'])
    },
    {
      name: 'seller_payout_scheduled',
      type: 'push',
      subject: 'Payout of {{amount}} scheduled',
      content: 'Your payout of {{amount}} ({{netAmount}} after {{commission}} commission) is scheduled for {{date}}.',
      variables: JSON.stringify(['amount', 'netAmount', 'commission', 'date'])
    },
    {
      name: 'seller_profitability_score_update',
      type: 'push',
      subject: 'Your Business Health Score: {{score}}/100',
      content: 'Your profitability score is {{score}}/100 - {{status}}. {{recommendation}}',
      variables: JSON.stringify(['score', 'status', 'recommendation'])
    }
  ];

  for (const template of templates) {
    await prisma.notification_Template.upsert({
      where: { name: template.name },
      update: template,
      create: {
        ...template,
        status: 'active',
        locale: 'en',
        createdBy: 'system'
      }
    });
  }

  console.log('Seller notification templates seeded successfully');
}
