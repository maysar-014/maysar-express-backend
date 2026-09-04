/**
 * Maysar Training Onboarding Seed Script
 * ==========================================
 * Seeds the database with welcoming, informative training modules for
 * couriers and enablers. Run with: npm run seed:training
 *
 * Philosophy: Training is an onboarding experience, not a hard blocker.
 * These modules help new participants understand how Maysar works, what
 * to expect, and how to succeed — all in a warm, encouraging tone.
 */

import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// ─── Training Modules ─────────────────────────────────────────────────────────

const COURIER_MODULES = [
  {
    id: 'courier-welcome',
    name: 'Welcome to the Maysar Courier Network 🚀',
    description: 'Your first step into a rewarding delivery career. Learn who we are, what we stand for, and how you fit into the Maysar ecosystem.',
    contentType: 'TEXT' as const,
    content: {
      type: 'TEXT',
      sections: [
        {
          title: 'Welcome, Courier! 👋',
          body: `We're thrilled to have you join the Maysar family. You're not just a delivery person — you're a vital link between sellers and buyers across Tanzania.

Maysar is Tanzania's digital community trade network, connecting local sellers, buyers, and enablers through a trusted, transparent platform. As a courier, your role is to complete the last mile — delivering products safely, on time, and with a smile.`
        },
        {
          title: 'What Makes Maysar Different?',
          body: `Unlike traditional delivery networks, Maysar puts you in control:
• Set your own availability and service areas
• Earn fairly for every delivery — see exactly what you earn before you accept
• Build your reputation score through great service
• Access earnings instantly in your Maysar wallet
• Get support whenever you need it — we're always here`
        },
        {
          title: 'Your First Steps',
          body: `1. Complete this onboarding training (you're already started — great!)
2. Verify your identity with our quick KYC process
3. Set up your vehicle information
4. Choose your service area on the map
5. Start accepting delivery assignments!`
        },
        {
          title: 'You\'re in Good Company',
          body: `Thousands of couriers across Dar es Salaam, Mwanza, Arusha, and beyond are already part of the Maysar network. They've found that Maysar deliveries are well-coordinated, fairly paid, and come with the backing of a platform that genuinely cares about your success.`
        }
      ],
      quiz: [
        { question: 'What is the main role of a courier on Maysar?', answer: 'To deliver products safely and on time, completing the last mile between sellers and buyers.' },
        { question: 'Where can you see your earnings?', answer: 'In your Maysar wallet, which is accessible from your dashboard.' }
      ]
    },
    durationMinutes: 10,
    category: 'onboarding',
    prerequisites: [],
    targetRoles: ['courier'],
    isPublic: true,
    difficulty: 'BEGINNER' as const,
  },
  {
    id: 'courier-delivery-process',
    name: 'How Deliveries Work on Maysar 📦',
    description: 'A clear walkthrough of the delivery process — from assignment to completion. Know exactly what to do at every step.',
    contentType: 'TEXT' as const,
    content: {
      type: 'TEXT',
      sections: [
        {
          title: 'The Delivery Lifecycle',
          body: `Every Maysar delivery follows a clear, simple flow:

1. **Assignment** — The system matches an order to you based on your location and availability
2. **Acceptance** — Review the pickup and delivery details, then accept if it works for you
3. **Pickup** — Navigate to the seller's location using the in-app map
4. **In Transit** — Update your status as you travel to maintain buyer trust
5. **Delivery** — Arrive at the buyer's address and confirm delivery
6. **COD Verification** — For Cash on Delivery orders, verify the buyer's code before accepting payment
7. **Completion** — Order marked complete, earnings credited to your wallet`
        },
        {
          title: 'The COD (Cash on Delivery) Process',
          body: `Many orders on Maysar use Cash on Delivery. Here's how it works safely:

• When you arrive, the buyer receives a unique verification code via SMS
• Ask the buyer for this code — do not accept payment without it
• Enter the code in the Maysar app to verify the delivery
• Only after verification will you collect payment from the buyer
• Your earnings are automatically calculated and credited to your wallet

This system protects both you and the buyer — no disputes, no confusion.`
        },
        {
          title: 'Status Updates Matter',
          body: `Keeping your delivery status updated in real time:
• Gives buyers confidence their order is on the way
• Protects you in case of any disputes
• Improves your reputation score
• Helps the platform optimize future assignments for you

It takes 2 seconds to tap a status update — and it makes a big difference.`
        },
        {
          title: 'What If Something Goes Wrong?',
          body: `Problems are rare, but we're prepared for them:
• Can't find the address? Use the in-app chat to contact the buyer directly
• Buyer not available? Follow the failed delivery protocol — mark appropriately and our support team will help
• Item damaged? Document with photos immediately and contact support
• Any dispute? Our 24/7 support team is always available`
        }
      ],
      quiz: [
        { question: 'When should you collect payment for a COD order?', answer: 'Only after verifying the buyer\'s unique code in the Maysar app.' },
        { question: 'Why are status updates important?', answer: 'They build buyer trust, protect you in disputes, and improve your reputation score.' }
      ]
    },
    durationMinutes: 15,
    category: 'operations',
    prerequisites: ['courier-welcome'],
    targetRoles: ['courier'],
    isPublic: true,
    difficulty: 'BEGINNER' as const,
  },
  {
    id: 'courier-safety-professionalism',
    name: 'Safety, Professionalism & Customer Experience ⭐',
    description: 'How to stay safe on the road, represent Maysar professionally, and create experiences that earn you 5-star ratings.',
    contentType: 'TEXT' as const,
    content: {
      type: 'TEXT',
      sections: [
        {
          title: 'Road Safety First',
          body: `Your safety is our top priority. Always:
• Follow Tanzania traffic regulations — no exceptions
• Never use your phone while driving/riding
• Wear your helmet if riding a motorcycle
• Keep your vehicle in good working condition
• Take breaks on long deliveries — fatigue is dangerous
• In bad weather, reduce speed and increase following distance

If you're ever in an accident or emergency, call our 24/7 safety line immediately.`
        },
        {
          title: 'Professional Standards',
          body: `As a Maysar courier, you represent our brand. Buyers trust us because they trust you:

✅ **DO:**
• Dress neatly and maintain good personal hygiene
• Greet buyers with a friendly smile
• Handle packages with care — treat every item as if it's yours
• Be punctual — if you're running late, notify the buyer through the app
• Be respectful in all interactions

❌ **DON'T:**
• Open or inspect packages (this breaches buyer privacy)
• Accept tips that weren't agreed upfront (check platform policy)
• Delay without communication
• Argue with buyers — escalate to support if needed`
        },
        {
          title: 'Building Your Rating',
          body: `Your reputation score is your most valuable asset on Maysar. High-rated couriers get:
• Priority assignment to higher-value orders
• Bonus opportunities during peak seasons
• Featured status on the platform
• Access to premium service areas

Every delivery is a chance to earn a 5-star rating. The secret is simple: be on time, be professional, and communicate proactively.`
        },
        {
          title: 'Handling Difficult Situations',
          body: `Occasionally you may encounter:
• **Unresponsive buyers** — Attempt contact 3 times via app, then follow failed delivery protocol
• **Wrong address** — Contact buyer, document the situation, update status
• **Damaged goods** — Photograph before and after, contact support immediately
• **Threatening situations** — Your safety first — leave the area and call emergency services

Never put yourself at risk. Maysar support is always available to help resolve situations.`
        }
      ],
      quiz: [
        { question: 'What should you do if you\'re running late for a delivery?', answer: 'Notify the buyer through the Maysar app proactively.' },
        { question: 'What benefit do high-rated couriers receive?', answer: 'Priority assignment to higher-value orders and bonus opportunities.' }
      ]
    },
    durationMinutes: 20,
    category: 'operations',
    prerequisites: ['courier-delivery-process'],
    targetRoles: ['courier'],
    isPublic: true,
    difficulty: 'BEGINNER' as const,
  },
  {
    id: 'courier-earnings-wallet',
    name: 'Your Earnings & Maysar Wallet 💰',
    description: 'Understand exactly how you get paid, how to manage your wallet, and how to maximize your income on Maysar.',
    contentType: 'TEXT' as const,
    content: {
      type: 'TEXT',
      sections: [
        {
          title: 'How Earnings Work',
          body: `Maysar has a transparent, fair earning structure:

• **Base fare** — Guaranteed minimum for accepting a delivery
• **Distance fee** — Per kilometer compensation
• **Weight fee** — Additional pay for heavier packages
• **Priority fee** — Bonus for urgent or express deliveries
• **Peak bonuses** — Extra earnings during high-demand periods

You see your expected earnings BEFORE accepting any delivery — no surprises.`
        },
        {
          title: 'The Maysar Wallet',
          body: `Your Maysar wallet is your financial hub:

• Earnings are credited instantly upon delivery completion
• Check your balance, transaction history, and earnings summary anytime
• Withdraw to your mobile money account (M-Pesa, Airtel Money, Tigo Pesa, Halopesa) instantly
• Weekly earnings summaries are sent to your phone

Your wallet is secured with the same technology used by banks — your money is safe.`
        },
        {
          title: 'Maximizing Your Income',
          body: `Top couriers on Maysar have shared their strategies:

🌟 **Work during peak hours** — Mornings (8-10am), lunch (12-2pm), and evenings (5-8pm) have the most orders

🌟 **Maintain your rating** — High-rated couriers get first pick of premium orders

🌟 **Stay in active areas** — Position yourself near commercial centers, markets, and shopping areas

🌟 **Complete your profile** — Couriers with verified vehicles and complete profiles get more orders

🌟 **Accept consistently** — A high acceptance rate gets you more assignments`
        },
        {
          title: 'Tax & Earnings Records',
          body: `Maysar makes it easy to manage your income records:
• Download monthly earnings statements from your dashboard
• All transactions are automatically documented
• Our support team can help you understand your earnings history

As a self-employed courier, you're responsible for your own tax filings. Consult the Tanzania Revenue Authority (TRA) for guidance on self-employment income.`
        }
      ],
      quiz: [
        { question: 'When are your earnings credited after a delivery?', answer: 'Instantly upon delivery completion.' },
        { question: 'What are peak hours when most orders are available?', answer: 'Mornings (8-10am), lunch (12-2pm), and evenings (5-8pm).' }
      ]
    },
    durationMinutes: 12,
    category: 'finance',
    prerequisites: ['courier-welcome'],
    targetRoles: ['courier'],
    isPublic: true,
    difficulty: 'BEGINNER' as const,
  }
];

const ENABLER_MODULES = [
  {
    id: 'enabler-welcome',
    name: 'Welcome to the Maysar Enabler Network 🌟',
    description: 'Discover what it means to be a Maysar Enabler — an independent sales partner who connects buyers to amazing products and earns commission on every sale.',
    contentType: 'TEXT' as const,
    content: {
      type: 'TEXT',
      sections: [
        {
          title: 'Welcome, Enabler! 🎉',
          body: `You've joined one of the most exciting roles on the Maysar platform. As an Enabler, you're an independent sales partner — a trusted bridge between our network of verified sellers and the buyers you bring in.

Think of it this way: sellers have great products, buyers want them, and you make the connection happen. Every successful sale you facilitate earns you a commission. The more buyers you bring, the more you earn — there's no ceiling.`
        },
        {
          title: 'What Does an Enabler Do?',
          body: `As a Maysar Enabler, you:

🔗 **Generate referral links** — Create unique tracking links for products you love
📣 **Promote to your network** — Share with friends, family, WhatsApp groups, social media
💰 **Earn commission** — Get paid for every verified purchase through your link
📊 **Track performance** — See exactly how many clicks, conversions, and earnings you've generated
🏆 **Level up** — Build your enabler profile and qualify for higher commission tiers`
        },
        {
          title: 'Why Maysar Enablers Succeed',
          body: `Our top enablers share a few things in common:

• **They know their audience** — They promote products relevant to people they know
• **They're authentic** — Genuine recommendations convert better than hard selling
• **They're consistent** — Regular sharing builds momentum over time
• **They use the tools** — Maysar gives you analytics, promotional materials, and seller support

You don't need to be a marketing expert. You just need to be genuine, connected, and consistent.`
        },
        {
          title: 'Your Path to Approval',
          body: `To become a fully active Enabler:
1. ✅ Complete this onboarding training
2. ✅ Complete the Enabler Certification assessment
3. ✅ Admin review and approval (usually within 24-48 hours)
4. ✅ Generate your first referral link
5. ✅ Start earning!

The approval process ensures that every Enabler on our platform meets our quality standards — protecting both sellers and buyers.`
        }
      ],
      quiz: [
        { question: 'How does an Enabler earn money on Maysar?', answer: 'By earning commission on every verified purchase made through their referral links.' },
        { question: 'What is the admin approval process for?', answer: 'To ensure every Enabler meets quality standards, protecting sellers and buyers.' }
      ]
    },
    durationMinutes: 10,
    category: 'onboarding',
    prerequisites: [],
    targetRoles: ['enabler'],
    isPublic: true,
    difficulty: 'BEGINNER' as const,
  },
  {
    id: 'enabler-referral-system',
    name: 'Mastering the Referral & Attribution System 🔗',
    description: 'Learn how referral links work, how sales are tracked back to you, and how to maximize your attribution rate.',
    contentType: 'TEXT' as const,
    content: {
      type: 'TEXT',
      sections: [
        {
          title: 'How Referral Links Work',
          body: `Every Enabler gets unique tracking links for any product on Maysar:

1. Browse the product catalog and choose something to promote
2. Generate your personalized referral link from the product page
3. Share that link anywhere — WhatsApp, Telegram, Instagram, TikTok, Facebook, SMS
4. When someone clicks your link and buys the product, the sale is attributed to you
5. Your commission is automatically calculated and credited to your wallet

Your link contains a unique Enabler ID — every click is tracked, every sale is credited.`
        },
        {
          title: 'Attribution Window',
          body: `Attribution means a sale gets credited to you even if the buyer doesn't purchase immediately:

• A buyer clicks your link but doesn't buy right away
• They come back within the attribution window (typically 7 days)
• They purchase — the sale is STILL credited to you

This is powerful. It means you earn from buyers who needed time to think about it.`
        },
        {
          title: 'Choosing What to Promote',
          body: `The best products to promote are:

✅ **Products you've personally used or trust** — Authenticity converts
✅ **Products relevant to your audience** — Tech gadgets to tech-savvy friends, baby products to new parents
✅ **Trending products** — Check the "Popular" section in your Enabler dashboard
✅ **Products with good seller ratings** — Your reputation depends on the seller delivering well
✅ **Higher-value items** — Higher price = higher commission absolute value

Avoid promoting everything — focus on a niche where you have credibility.`
        },
        {
          title: 'Building Your Promotion Strategy',
          body: `Effective enablers don't just share links — they create context:

📱 **WhatsApp broadcast:** "Just ordered this from Maysar — amazing quality at this price! [link]"
📸 **Instagram story:** Photo of the product with your review + swipe-up link
👥 **Community groups:** Share in groups relevant to the product (electronics group, fashion group, etc.)
📝 **Personal recommendation:** "Hey [name], I know you were looking for this — found it on Maysar [link]"

People buy from people they trust. Your network trusts you — use that wisely.`
        }
      ],
      quiz: [
        { question: 'What is the attribution window?', answer: 'The period during which a sale is credited to you even if the buyer doesn\'t purchase immediately after clicking your link.' },
        { question: 'What type of products should you focus on promoting?', answer: 'Products you trust, that are relevant to your audience, and where you have credibility.' }
      ]
    },
    durationMinutes: 15,
    category: 'sales',
    prerequisites: ['enabler-welcome'],
    targetRoles: ['enabler'],
    isPublic: true,
    difficulty: 'BEGINNER' as const,
  },
  {
    id: 'enabler-commission-earnings',
    name: 'Commission Structure & Growing Your Income 💵',
    description: 'A complete guide to how commissions are calculated, when you get paid, and proven strategies to grow your monthly earnings.',
    contentType: 'TEXT' as const,
    content: {
      type: 'TEXT',
      sections: [
        {
          title: 'Understanding Your Commission',
          body: `Your commission is calculated as a percentage of the order value for every sale you facilitate:

• **Base commission rate** — Set by each seller (visible on product pages)
• **Performance bonuses** — Earn extra for hitting monthly targets
• **Category bonuses** — Some product categories have higher commission rates
• **Loyalty multipliers** — Long-term enablers with proven track records earn premium rates

Commission rates vary by seller and product category. Always check the commission rate before promoting a product — it's displayed clearly on every product listing.`
        },
        {
          title: 'Commission Payment Timeline',
          body: `Here's when your earnings are credited:

• **Order placed** → Commission is reserved (you can see it as "pending")
• **Order delivered** → Commission is confirmed and credited to your wallet
• **Order cancelled** → Reserved commission is released (no payment)

This system ensures you only get paid when buyers actually receive their products — maintaining trust for everyone on the platform.`
        },
        {
          title: 'Growing Your Enabler Business',
          body: `Top Enablers on Maysar earn significant monthly income. Here's what they do:

🎯 **Volume over single sales** — 100 small commissions > 1 large one. Focus on consistent activity.

📈 **Track your analytics** — Your Enabler dashboard shows click-through rates, conversion rates, and earnings by product. Double down on what works.

🤝 **Build seller relationships** — Some sellers offer exclusive promotions to top enablers. Reach out via the platform.

🌐 **Expand your reach** — Every new person you add to your network is potential earnings. WhatsApp groups, neighborhood associations, school parents — there are buyers everywhere.

⏰ **Promote during sales** — Maysar runs regular campaigns. Enablers who promote during these periods earn 2-3x their normal rate.`
        },
        {
          title: 'Withdrawal & Financial Management',
          body: `Your Maysar wallet gives you full financial control:

• Withdraw to M-Pesa, Airtel Money, Tigo Pesa, or Halopesa at any time
• Minimum withdrawal threshold: TZS 5,000
• No withdrawal fees (your money, your terms)
• Monthly statements available for download

Treat your Enabler income seriously — track it, save it, reinvest in your promotion efforts.`
        }
      ],
      quiz: [
        { question: 'When is your commission credited to your wallet?', answer: 'When the order is delivered to the buyer.' },
        { question: 'What should you check before promoting a product?', answer: 'The commission rate, which is displayed on every product listing.' }
      ]
    },
    durationMinutes: 12,
    category: 'finance',
    prerequisites: ['enabler-referral-system'],
    targetRoles: ['enabler'],
    isPublic: true,
    difficulty: 'INTERMEDIATE' as const,
  }
];

const SHARED_MODULES = [
  {
    id: 'platform-overview',
    name: 'Understanding the Maysar Platform 🌍',
    description: 'A comprehensive overview of how Maysar works — the technology, the people, and the mission behind Tanzania\'s digital trade network.',
    contentType: 'TEXT' as const,
    content: {
      type: 'TEXT',
      sections: [
        {
          title: 'Our Mission',
          body: `Maysar exists to democratize trade in Tanzania and beyond. We believe that:

• Every seller, no matter how small, deserves access to a digital marketplace
• Every buyer deserves access to quality products with transparent pricing
• Every courier deserves fair compensation and reliable work
• Every enabler deserves to earn from the network they help build

We're building the infrastructure for a more connected, more prosperous digital economy in East Africa.`
        },
        {
          title: 'The Maysar Ecosystem',
          body: `The platform connects five types of participants:

👤 **Buyers** — Browse, discover, and purchase products with confidence
🏪 **Sellers** — List products, manage inventory, and reach thousands of buyers
🚚 **Couriers** — Fulfill deliveries efficiently and earn fairly
🤝 **Enablers** — Promote products and earn commission on sales
🏭 **Suppliers** — Supply bulk inventory to sellers and manage production

Each role is essential. When one thrives, all thrive — that's the Maysar network effect.`
        },
        {
          title: 'Safety & Trust at Maysar',
          body: `Trust is our most important product. We ensure it through:

🔐 **KYC Verification** — All participants verify their identity before transacting
⭐ **Rating System** — Every interaction is rated, building accountability
💰 **Secure Payments** — Wallet-based transactions with full audit trails
🛡️ **Dispute Resolution** — Fair, transparent process for resolving any issues
📊 **COD Verification** — Unique codes prevent fraud on cash deliveries

You can trust Maysar — and Maysar trusts you.`
        }
      ],
      quiz: [
        { question: 'What are the five types of participants in the Maysar ecosystem?', answer: 'Buyers, Sellers, Couriers, Enablers, and Suppliers.' },
        { question: 'How does Maysar ensure trust between participants?', answer: 'Through KYC verification, rating systems, secure payments, dispute resolution, and COD verification.' }
      ]
    },
    durationMinutes: 10,
    category: 'onboarding',
    prerequisites: [],
    targetRoles: ['courier', 'enabler'],
    isPublic: true,
    difficulty: 'BEGINNER' as const,
  }
];

// ─── Certification Requirements ────────────────────────────────────────────────

const CERTIFICATION_REQUIREMENTS = [
  // Shared
  { module: 'platform-overview', minimumScore: 60, validityPeriodDays: 730, mandatory: false, maxAttempts: 5 },

  // Courier
  { module: 'courier-welcome', minimumScore: 60, validityPeriodDays: 730, mandatory: false, maxAttempts: 5 },
  { module: 'courier-delivery-process', minimumScore: 70, validityPeriodDays: 365, mandatory: false, maxAttempts: 5 },
  { module: 'courier-safety-professionalism', minimumScore: 70, validityPeriodDays: 365, mandatory: false, maxAttempts: 5 },
  { module: 'courier-earnings-wallet', minimumScore: 60, validityPeriodDays: 730, mandatory: false, maxAttempts: 5 },

  // Enabler
  { module: 'enabler-welcome', minimumScore: 60, validityPeriodDays: 730, mandatory: false, maxAttempts: 5 },
  { module: 'enabler-referral-system', minimumScore: 70, validityPeriodDays: 365, mandatory: false, maxAttempts: 5 },
  { module: 'enabler-commission-earnings', minimumScore: 70, validityPeriodDays: 365, mandatory: false, maxAttempts: 5 },
];

// ─── Seed Function ─────────────────────────────────────────────────────────────

async function seedTraining() {
  console.log('\n🌱 Maysar Training Seed — Starting...\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const allModules = [...SHARED_MODULES, ...COURIER_MODULES, ...ENABLER_MODULES];

  // Seed Training Modules
  console.log('\n📚 Seeding Training Modules...\n');
  for (const module of allModules) {
    try {
      await (prisma as any).training_TrainingModule.upsert({
        where: { id: module.id },
        update: {
          name: module.name,
          description: module.description,
          contentType: module.contentType,
          content: module.content,
          durationMinutes: module.durationMinutes,
          category: module.category,
          prerequisites: module.prerequisites,
          targetRoles: module.targetRoles,
          isPublic: module.isPublic,
          difficulty: module.difficulty,
        },
        create: {
          id: module.id,
          name: module.name,
          description: module.description,
          contentType: module.contentType,
          content: module.content,
          durationMinutes: module.durationMinutes,
          category: module.category,
          prerequisites: module.prerequisites,
          targetRoles: module.targetRoles,
          isPublic: module.isPublic,
          difficulty: module.difficulty,
        },
      });
      console.log(`   ✅ ${module.name}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to seed module "${module.name}": ${error.message}`);
    }
  }

  // Seed Certification Requirements
  console.log('\n📋 Seeding Certification Requirements...\n');
  for (const req of CERTIFICATION_REQUIREMENTS) {
    try {
      await (prisma as any).training_CertificationRequirement.upsert({
        where: { module: req.module },
        update: {
          minimumScore: req.minimumScore,
          validityPeriodDays: req.validityPeriodDays,
          mandatory: req.mandatory,
          maxAttempts: req.maxAttempts,
        },
        create: {
          module: req.module,
          minimumScore: req.minimumScore,
          validityPeriodDays: req.validityPeriodDays,
          mandatory: req.mandatory,
          maxAttempts: req.maxAttempts,
        },
      });
      console.log(`   ✅ Certification for: ${req.module}`);
    } catch (error: any) {
      console.error(`   ❌ Failed to seed certification for "${req.module}": ${error.message}`);
    }
  }

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('\n🎉 Training seed complete!\n');
  console.log(`   📦 ${allModules.length} training modules seeded`);
  console.log(`   📋 ${CERTIFICATION_REQUIREMENTS.length} certification requirements seeded`);
  console.log('\n   Modules seeded:');
  console.log('   ─ Shared:');
  SHARED_MODULES.forEach(m => console.log(`     • ${m.name}`));
  console.log('   ─ Courier Onboarding:');
  COURIER_MODULES.forEach(m => console.log(`     • ${m.name}`));
  console.log('   ─ Enabler Onboarding:');
  ENABLER_MODULES.forEach(m => console.log(`     • ${m.name}`));
  console.log('\n   Run again at any time — it\'s idempotent (safe to re-run).');
  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
}

seedTraining()
  .catch((error) => {
    console.error('\n❌ Training seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
