import type { SuspiciousPhraseInput } from "../entities/moderation.entity";

// ─────────────────────────────────────────────────────────────────────────────
// Seed suspicious phrase catalog for chat moderation.
//
// Covers the common abuse patterns on Tanzanian / East-African commerce chat:
//  - off-platform payment pressure (mobile money: M-Pesa, Tigo Pesa, Airtel
//    Money, HaloPesa, M-Pawa, Azam Pesa, Selcom, Tigo Tilipanimero, Mixx by Yas)
//  - advance-fee / clearance / customs-tax scams (very common in online trade)
//  - prize & lottery scams, money-doubling "investment" scams
//  - phishing / account-verification requests
//  - off-platform contact (WhatsApp, Telegram, IMO, direct calls)
//
// Every entry carries a human-readable `description` which is surfaced to the
// user so they understand exactly why a message was blocked, plus `weight`
// (0–100 risk contribution) and `action` (FLAG = review, BLOCK = never delivered).
// ─────────────────────────────────────────────────────────────────────────────

export type PhraseLanguage = "EN" | "SW" | "OTHER";
export type PhraseMatchType = "SUBSTRING" | "REGEX";
export type PhraseAction = "FLAG" | "BLOCK";

export interface SeedSuspiciousPhrase {
  phrase: string;
  matchType?: PhraseMatchType;
  language?: PhraseLanguage;
  category: string;
  description: string;
  weight?: number;
  action?: PhraseAction;
}

export const SEED_SUSPICIOUS_PHRASES: SeedSuspiciousPhrase[] = [
  // ── English: financial & payment scams ─────────────────────────────────────
  {
    phrase: "send money",
    category: "off_platform_payment",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Request to send money",
  },
  {
    phrase: "send me money",
    category: "off_platform_payment",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Direct request to send money",
  },
  {
    phrase: "western union",
    category: "off_platform_payment",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Off-platform money transfer service (Western Union)",
  },
  {
    phrase: "wire transfer",
    category: "off_platform_payment",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Off-platform wire transfer request",
  },
  {
    phrase: "money transfer",
    category: "off_platform_payment",
    language: "EN",
    action: "FLAG",
    weight: 70,
    description: "Money transfer mention",
  },
  {
    phrase: "send deposit first",
    category: "advance_fee",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Request for a deposit before goods are delivered",
  },
  {
    phrase: "pay deposit",
    category: "advance_fee",
    language: "EN",
    action: "FLAG",
    weight: 70,
    description: "Deposit payment request",
  },
  {
    phrase: "advance fee",
    category: "advance_fee",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Advance-fee scam pattern",
  },
  {
    phrase: "processing fee",
    category: "advance_fee",
    language: "EN",
    action: "FLAG",
    weight: 65,
    description: "Upfront processing fee request",
  },
  {
    phrase: "registration fee",
    category: "advance_fee",
    language: "EN",
    action: "FLAG",
    weight: 55,
    description: "Registration fee request",
  },
  {
    phrase: "admin fee",
    category: "advance_fee",
    language: "EN",
    action: "FLAG",
    weight: 60,
    description: "Admin fee request",
  },
  {
    phrase: "clearance fee",
    category: "advance_fee",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Clearance fee request (common delivery scam)",
  },
  {
    phrase: "customs tax",
    category: "advance_fee",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Customs tax fee request (common delivery scam)",
  },
  {
    phrase: "security deposit",
    category: "advance_fee",
    language: "EN",
    action: "FLAG",
    weight: 60,
    description: "Security deposit request",
  },
  {
    phrase: "pay outside",
    category: "off_platform_payment",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Attempt to move payment off the platform",
  },
  {
    phrase: "pay outside the app",
    category: "off_platform_payment",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Attempt to move payment off the platform",
  },
  {
    phrase: "pay directly",
    category: "off_platform_payment",
    language: "EN",
    action: "FLAG",
    weight: 80,
    description: "Request to pay outside the platform",
  },
  {
    phrase: "direct payment",
    category: "off_platform_payment",
    language: "EN",
    action: "FLAG",
    weight: 70,
    description: "Direct payment attempt",
  },
  {
    phrase: "direct bank transfer",
    category: "off_platform_payment",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Off-platform bank transfer request",
  },
  {
    phrase: "bank transfer to",
    category: "off_platform_payment",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Off-platform bank transfer request",
  },

  // ── Tanzania mobile money (English phrasing) ──────────────────────────────
  {
    phrase: "send via m-pesa",
    category: "tanzania_mobile_money",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Request to pay via M-Pesa outside the platform",
  },
  {
    phrase: "send via tigo pesa",
    category: "tanzania_mobile_money",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Request to pay via Tigo Pesa outside the platform",
  },
  {
    phrase: "send via airtel money",
    category: "tanzania_mobile_money",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Request to pay via Airtel Money outside the platform",
  },
  {
    phrase: "pay via m-pesa",
    category: "tanzania_mobile_money",
    language: "EN",
    action: "FLAG",
    weight: 80,
    description: "M-Pesa payment request outside the platform",
  },
  {
    phrase: "use m-pesa",
    category: "tanzania_mobile_money",
    language: "EN",
    action: "FLAG",
    weight: 80,
    description: "M-Pesa payment request outside the platform",
  },
  {
    phrase: "my m-pesa number",
    category: "tanzania_mobile_money",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Sharing a personal M-Pesa number for direct payment",
  },
  {
    phrase: "my tigo pesa number",
    category: "tanzania_mobile_money",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Sharing a personal Tigo Pesa number for direct payment",
  },
  {
    phrase: "my airtel money number",
    category: "tanzania_mobile_money",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Sharing a personal Airtel Money number for direct payment",
  },
  {
    phrase: "confirm your mpesa pin",
    category: "phishing",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Phishing attempt to capture an M-Pesa PIN",
  },
  {
    phrase: "mpesa pin",
    category: "phishing",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Phishing attempt to capture an M-Pesa PIN",
  },

  // ── English: prize / lottery / investment scams ────────────────────────────
  {
    phrase: "click here to claim",
    category: "prize_scam",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Prize-claim click bait",
  },
  {
    phrase: "you have won",
    category: "prize_scam",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Fake prize announcement",
  },
  {
    phrase: "you are a winner",
    category: "prize_scam",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Fake prize announcement",
  },
  {
    phrase: "claim your prize",
    category: "prize_scam",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Fake prize announcement",
  },
  {
    phrase: "lucky winner",
    category: "prize_scam",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Fake prize announcement",
  },
  {
    phrase: "you have been selected",
    category: "prize_scam",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Fake selection announcement",
  },
  {
    phrase: "lottery",
    category: "prize_scam",
    language: "EN",
    action: "FLAG",
    weight: 60,
    description: "Lottery mention",
  },
  {
    phrase: "jackpot",
    category: "prize_scam",
    language: "EN",
    action: "FLAG",
    weight: 60,
    description: "Jackpot mention",
  },
  {
    phrase: "gift card",
    category: "prize_scam",
    language: "EN",
    action: "FLAG",
    weight: 55,
    description: "Gift card offer (common scam bait)",
  },
  {
    phrase: "double your money",
    category: "investment_scam",
    language: "EN",
    action: "BLOCK",
    weight: 100,
    description: "Money-doubling investment scam",
  },
  {
    phrase: "guaranteed returns",
    category: "investment_scam",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Guaranteed-returns investment scam",
  },
  {
    phrase: "make money fast",
    category: "investment_scam",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Get-rich-quick scheme",
  },
  {
    phrase: "earn daily",
    category: "investment_scam",
    language: "EN",
    action: "FLAG",
    weight: 55,
    description: "Daily-earnings scheme (common scam bait)",
  },
  {
    phrase: "no risk investment",
    category: "investment_scam",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Fake no-risk investment offer",
  },
  {
    phrase: "bitcoin",
    category: "investment_scam",
    language: "EN",
    action: "FLAG",
    weight: 40,
    description: "Crypto mention (frequently used in scams)",
  },

  // ── English: phishing / account urgency / off-platform contact ─────────────
  {
    phrase: "verify your account",
    category: "phishing",
    language: "EN",
    action: "FLAG",
    weight: 80,
    description: "Account verification phishing attempt",
  },
  {
    phrase: "account suspended",
    category: "phishing",
    language: "EN",
    action: "FLAG",
    weight: 80,
    description: "Fake account-suspension warning",
  },
  {
    phrase: "confirm your identity",
    category: "phishing",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Identity confirmation phishing attempt",
  },
  {
    phrase: "login here",
    category: "phishing",
    language: "EN",
    action: "FLAG",
    weight: 80,
    description: "Fake login link",
  },
  {
    phrase: "update your payment details",
    category: "phishing",
    language: "EN",
    action: "FLAG",
    weight: 85,
    description: "Payment-details phishing attempt",
  },
  {
    phrase: "your account will be closed",
    category: "phishing",
    language: "EN",
    action: "FLAG",
    weight: 80,
    description: "Fake account-closure warning",
  },
  {
    phrase: "urgent action required",
    category: "urgency_pressure",
    language: "EN",
    action: "FLAG",
    weight: 80,
    description: "Urgency pressure tactic",
  },
  {
    phrase: "act now",
    category: "urgency_pressure",
    language: "EN",
    action: "FLAG",
    weight: 60,
    description: "Urgency pressure tactic",
  },
  {
    phrase: "limited time offer",
    category: "urgency_pressure",
    language: "EN",
    action: "FLAG",
    weight: 40,
    description: "Time-pressure marketing language",
  },
  {
    phrase: "whatsapp me",
    category: "off_platform_contact",
    language: "EN",
    action: "FLAG",
    weight: 80,
    description: "Attempt to move the conversation to WhatsApp",
  },
  {
    phrase: "whatsapp number",
    category: "off_platform_contact",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "WhatsApp contact exchange",
  },
  {
    phrase: "telegram me",
    category: "off_platform_contact",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Attempt to move the conversation to Telegram",
  },
  {
    phrase: "call me outside",
    category: "off_platform_contact",
    language: "EN",
    action: "FLAG",
    weight: 70,
    description: "Off-platform contact attempt",
  },
  {
    phrase: "call me directly",
    category: "off_platform_contact",
    language: "EN",
    action: "FLAG",
    weight: 70,
    description: "Off-platform contact attempt",
  },
  {
    phrase: "text me on",
    category: "off_platform_contact",
    language: "EN",
    action: "FLAG",
    weight: 55,
    description: "Off-platform contact attempt",
  },
  {
    phrase: "off the platform",
    category: "off_platform_contact",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Off-platform transaction attempt",
  },
  {
    phrase: "outside the app",
    category: "off_platform_contact",
    language: "EN",
    action: "FLAG",
    weight: 75,
    description: "Off-platform transaction attempt",
  },

  // ── Swahili: off-platform payment pressure & advance fees ─────────────────
  {
    phrase: "tuma pesa",
    category: "off_platform_payment",
    language: "SW",
    action: "FLAG",
    weight: 80,
    description: "Ombi la kutuma pesa (request to send money)",
  },
  {
    phrase: "tuma pesa moja kwa moja",
    category: "off_platform_payment",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la kutuma pesa nje ya mfumo (send money directly, outside the platform)",
  },
  {
    phrase: "nitumie pesa",
    category: "off_platform_payment",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description: "Ombi la kukutumia pesa (send me money)",
  },
  {
    phrase: "malipo ya awali",
    category: "advance_fee",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la malipo ya awali (advance payment request — common advance-fee scam)",
  },
  {
    phrase: "malipo nje ya mfumo",
    category: "off_platform_payment",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description: "Ombi la malipo nje ya mfumo (payment outside the system)",
  },
  {
    phrase: "malipo nje ya app",
    category: "off_platform_payment",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description: "Ombi la malipo nje ya app (payment outside the app)",
  },
  {
    phrase: "lipa moja kwa moja",
    category: "off_platform_payment",
    language: "SW",
    action: "FLAG",
    weight: 85,
    description:
      "Ombi la kulipa nje ya mfumo (pay directly, outside the platform)",
  },
  {
    phrase: "lipa ofisini",
    category: "off_platform_payment",
    language: "SW",
    action: "FLAG",
    weight: 70,
    description:
      "Ombi la kulipa ofisini (pay at an office, outside the platform)",
  },
  {
    phrase: "ada ya awali",
    category: "advance_fee",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la ada ya awali (upfront fee request — common advance-fee scam)",
  },
  {
    phrase: "ada ya usajili",
    category: "advance_fee",
    language: "SW",
    action: "FLAG",
    weight: 60,
    description: "Ombi la ada ya usajili (registration fee request)",
  },
  {
    phrase: "ada ya uanachama",
    category: "advance_fee",
    language: "SW",
    action: "FLAG",
    weight: 65,
    description: "Ombi la ada ya uanachama (membership fee request)",
  },
  {
    phrase: "ada ya kufungua",
    category: "advance_fee",
    language: "SW",
    action: "FLAG",
    weight: 75,
    description:
      "Ombi la ada ya kufungua mzigo (clearance fee request — common delivery scam)",
  },
  {
    phrase: "kodi ya forodha",
    category: "advance_fee",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la kodi ya forodha (customs tax request — very common online-delivery scam in Tanzania)",
  },
  {
    phrase: "ada ya usafiri",
    category: "advance_fee",
    language: "SW",
    action: "FLAG",
    weight: 40,
    description:
      "Ombi la ada ya usafiri (transport fee request — verify carefully)",
  },
  {
    phrase: "deposit ya kwanza",
    category: "advance_fee",
    language: "SW",
    action: "FLAG",
    weight: 75,
    description: "Ombi la deposit ya kwanza (first deposit request)",
  },
  {
    phrase: "pesa tupu",
    category: "investment_scam",
    language: "SW",
    action: "FLAG",
    weight: 70,
    description: "Ahadi ya pesa tupu (money for nothing — get-rich-quick bait)",
  },
  {
    phrase: "pata pesa tupu",
    category: "investment_scam",
    language: "SW",
    action: "FLAG",
    weight: 75,
    description: "Ahadi ya kupata pesa tupu (money-for-nothing scheme)",
  },

  // ── Swahili: Tanzanian mobile money ───────────────────────────────────────
  {
    phrase: "tuma kwa m-pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la kutuma kwa M-Pesa nje ya mfumo (send via M-Pesa outside the platform)",
  },
  {
    phrase: "nitumie kwa m-pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la kutuma kwa M-Pesa nje ya mfumo (send me via M-Pesa outside the platform)",
  },
  {
    phrase: "tuma kwa tigo pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la kutuma kwa Tigo Pesa nje ya mfumo (send via Tigo Pesa outside the platform)",
  },
  {
    phrase: "nitumie kwa tigo pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la kutuma kwa Tigo Pesa nje ya mfumo (send me via Tigo Pesa outside the platform)",
  },
  {
    phrase: "tuma kwa airtel money",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la kutuma kwa Airtel Money nje ya mfumo (send via Airtel Money outside the platform)",
  },
  {
    phrase: "nitumie kwa airtel money",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la kutuma kwa Airtel Money nje ya mfumo (send me via Airtel Money outside the platform)",
  },
  {
    phrase: "tuma kwa halopesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description:
      "Ombi la kutuma kwa HaloPesa nje ya mfumo (send via HaloPesa outside the platform)",
  },
  {
    phrase: "tuma kwa m-pawa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 85,
    description:
      "Ombi la kutuma kwa M-Pawa nje ya mfumo (send via M-Pawa outside the platform)",
  },
  {
    phrase: "namba ya m-pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 85,
    description:
      "Kubadilishana namba ya M-Pesa (exchanging an M-Pesa number for direct payment)",
  },
  {
    phrase: "namba ya tigo pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 85,
    description:
      "Kubadilishana namba ya Tigo Pesa (exchanging a Tigo Pesa number for direct payment)",
  },
  {
    phrase: "namba ya airtel money",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 85,
    description:
      "Kubadilishana namba ya Airtel Money (exchanging an Airtel Money number)",
  },
  {
    phrase: "namba ya halopesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 85,
    description:
      "Kubadilishana namba ya HaloPesa (exchanging a HaloPesa number)",
  },
  {
    phrase: "azam pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 60,
    description: "Azam Pesa mention (mobile money outside the platform)",
  },
  {
    phrase: "selcom pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 60,
    description: "Selcom Pesa mention (mobile money outside the platform)",
  },
  {
    phrase: "tilipanimero",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 60,
    description:
      "Tigo Tilipanimero mention (mobile money outside the platform)",
  },
  {
    phrase: "mixx by yas",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 60,
    description: "Mixx by Yas mention (mobile money outside the platform)",
  },
  {
    phrase: "mpesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 25,
    description: "M-Pesa mention (review the payment context)",
  },
  {
    phrase: "tigo pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 25,
    description: "Tigo Pesa mention (review the payment context)",
  },
  {
    phrase: "airtel money",
    category: "tanzania_mobile_money",
    language: "SW",
    action: "FLAG",
    weight: 25,
    description: "Airtel Money mention (review the payment context)",
  },

  // ── Swahili: prize / lottery / investment ─────────────────────────────────
  {
    phrase: "umeshinda tuzo",
    category: "prize_scam",
    language: "SW",
    action: "FLAG",
    weight: 85,
    description: "Ujumbe wa tuzo ya uwongo (fake prize message)",
  },
  {
    phrase: "ushindi wa tuzo",
    category: "prize_scam",
    language: "SW",
    action: "FLAG",
    weight: 80,
    description: "Ujumbe wa tuzo ya uwongo (fake prize message)",
  },
  {
    phrase: "tuzo maalum",
    category: "prize_scam",
    language: "SW",
    action: "FLAG",
    weight: 75,
    description: "Ujumbe wa tuzo ya uwongo (fake special prize message)",
  },
  {
    phrase: "bahati nasibu",
    category: "prize_scam",
    language: "SW",
    action: "FLAG",
    weight: 55,
    description: "Bahati nasibu (lottery mention)",
  },
  {
    phrase: "umebahatika",
    category: "prize_scam",
    language: "SW",
    action: "FLAG",
    weight: 55,
    description: "Ahadi ya bahati (fake luck announcement)",
  },
  {
    phrase: "uwekezaji wa haraka",
    category: "investment_scam",
    language: "SW",
    action: "FLAG",
    weight: 85,
    description: "Uwekezaji wa haraka (quick-investment scam)",
  },
  {
    phrase: "faida ya papo hapo",
    category: "investment_scam",
    language: "SW",
    action: "FLAG",
    weight: 85,
    description: "Ahadi ya faida ya papo hapo (instant-profit promise)",
  },
  {
    phrase: "ongeza pesa mara mbili",
    category: "investment_scam",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description: "Ahadi ya kuongeza pesa mara mbili (money-doubling scam)",
  },
  {
    phrase: "jitengeneze pesa online",
    category: "investment_scam",
    language: "SW",
    action: "FLAG",
    weight: 70,
    description:
      "Ahadi ya kujitengeneza pesa mtandaoni (make-money-online scheme)",
  },

  // ── Swahili: phishing / urgency ───────────────────────────────────────────
  {
    phrase: "thibitisha akaunti yako",
    category: "phishing",
    language: "SW",
    action: "FLAG",
    weight: 80,
    description:
      "Ombi la kuthibitisha akaunti yako (account-verification phishing)",
  },
  {
    phrase: "akaunti yako imefungwa",
    category: "phishing",
    language: "SW",
    action: "FLAG",
    weight: 80,
    description:
      "Onyo la uwongo la kufungwa kwa akaunti (fake account-suspension warning)",
  },
  {
    phrase: "pin yako",
    category: "phishing",
    language: "SW",
    action: "BLOCK",
    weight: 100,
    description: "Ombi la PIN yako (phishing attempt to capture a PIN)",
  },
  {
    phrase: "wakati unaisha",
    category: "urgency_pressure",
    language: "SW",
    action: "FLAG",
    weight: 55,
    description: "Msukosuko wa wakati (time-pressure tactic)",
  },
  {
    phrase: "hatua ya dharura",
    category: "urgency_pressure",
    language: "SW",
    action: "FLAG",
    weight: 70,
    description: "Onyo la uwongo la dharura (fake urgent-action warning)",
  },

  // ── Swahili: off-platform contact ─────────────────────────────────────────
  {
    phrase: "nipe namba yako",
    category: "off_platform_contact",
    language: "SW",
    action: "FLAG",
    weight: 80,
    description:
      "Ombi la namba yako (request to share a phone number, off-platform contact)",
  },
  {
    phrase: "namba yangu ya whatsapp",
    category: "off_platform_contact",
    language: "SW",
    action: "FLAG",
    weight: 80,
    description: "Kubadilishana namba ya WhatsApp (WhatsApp contact exchange)",
  },
  {
    phrase: "nipe namba ya whatsapp",
    category: "off_platform_contact",
    language: "SW",
    action: "FLAG",
    weight: 80,
    description: "Ombi la namba ya WhatsApp (WhatsApp contact exchange)",
  },
  {
    phrase: "piga simu kwa hii namba",
    category: "off_platform_contact",
    language: "SW",
    action: "FLAG",
    weight: 70,
    description:
      "Ombi la kupiga simu nje ya mfumo (call at this number, off-platform)",
  },
  {
    phrase: "nitafute kwa imo",
    category: "off_platform_contact",
    language: "SW",
    action: "FLAG",
    weight: 70,
    description: "Ombi la kuwasiliana kwa IMO (off-platform contact)",
  },
  {
    phrase: "tumia telegram",
    category: "off_platform_contact",
    language: "SW",
    action: "FLAG",
    weight: 70,
    description: "Ombi la kuwasiliana kwa Telegram (off-platform contact)",
  },

  // ── Swahili: bait pricing ─────────────────────────────────────────────────
  {
    phrase: "bei ya kuchekesha",
    category: "bait_pricing",
    language: "SW",
    action: "FLAG",
    weight: 45,
    description:
      "Bei ya kuchekesha (ridiculously low price — common scam bait)",
  },
  {
    phrase: "bei ya kushangaza",
    category: "bait_pricing",
    language: "SW",
    action: "FLAG",
    weight: 30,
    description:
      "Bei ya kushangaza (surprisingly low price — possible scam bait)",
  },
];

export interface SeedRegexPattern {
  pattern: string;
  category: string;
  description: string;
  language?: PhraseLanguage;
  weight?: number;
  action?: PhraseAction;
}

/** Regex patterns that catch structural/obfuscated variants the plain list cannot. */
export const SEED_SUSPICIOUS_REGEX: SeedRegexPattern[] = [
  {
    pattern: "wa\\.me/\\d+",
    category: "off_platform_contact",
    language: "OTHER",
    weight: 100,
    action: "BLOCK",
    description: "WhatsApp direct-chat link (wa.me)",
  },
  {
    pattern: "api\\.whatsapp\\.com",
    category: "off_platform_contact",
    language: "OTHER",
    weight: 100,
    action: "BLOCK",
    description: "WhatsApp click-to-chat link",
  },
  {
    pattern: "t\\.me/\\w+",
    category: "off_platform_contact",
    language: "OTHER",
    weight: 70,
    action: "FLAG",
    description: "Telegram channel/user link",
  },
  {
    pattern: "m[\\s._-]*p[\\s._-]*e[\\s._-]*s[\\s._-]*a",
    category: "tanzania_mobile_money",
    language: "SW",
    weight: 75,
    action: "FLAG",
    description: "Obfuscated mobile-money keyword (M-Pesa)",
  },
  {
    pattern: "tigo[\\s._-]*pesa",
    category: "tanzania_mobile_money",
    language: "SW",
    weight: 75,
    action: "FLAG",
    description: "Obfuscated mobile-money keyword (Tigo Pesa)",
  },
  {
    pattern: "airtel[\\s._-]*money",
    category: "tanzania_mobile_money",
    language: "SW",
    weight: 75,
    action: "FLAG",
    description: "Obfuscated mobile-money keyword (Airtel Money)",
  },
  {
    pattern: "\\b\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}[\\s-]?\\d{4}\\b",
    category: "card_fraud",
    language: "OTHER",
    weight: 100,
    action: "BLOCK",
    description: "Payment card number shared in chat",
  },
  {
    pattern:
      "\\b(?:bit\\.ly|tinyurl\\.com|cutt\\.us|rb\\.gy|shorturl\\.at|is\\.gd|t\\.co)\\b",
    category: "link_shortener",
    language: "OTHER",
    weight: 50,
    action: "FLAG",
    description: "Link shortener (hides the real destination)",
  },
  {
    pattern: "\\b(?:\\+?255|0)\\s?[67]\\d{2}[\\s.-]?\\d{3}[\\s.-]?\\d{3}\\b",
    category: "phone_number",
    language: "OTHER",
    weight: 50,
    action: "FLAG",
    description:
      "Tanzanian phone number shared in chat (context-aware: phone + off-platform contact/payment intent is blocked)",
  },
  {
    pattern: "\\b\\d{10,}\\b",
    category: "financial_details",
    language: "OTHER",
    weight: 40,
    action: "FLAG",
    description:
      "Long digit sequence (bank account / reference number) — phone numbers are detected separately with a dedicated detector",
  },
  {
    pattern: "\\b[A-Za-z0-9+/]{40,}={0,2}\\b",
    category: "obfuscation",
    language: "OTHER",
    weight: 50,
    action: "FLAG",
    description: "Encoded/obfuscated content blob (base64-like)",
  },
  {
    pattern: "pay\\s+\\d+\\s*%\\s+deposit",
    category: "advance_fee",
    language: "EN",
    weight: 70,
    action: "FLAG",
    description: "Percentage deposit demand before delivery",
  },
];

/** Converts the seed catalog into repository-ready inputs (SEED source). */
export function seedPhrasesToInputs(): SuspiciousPhraseInput[] {
  return SEED_SUSPICIOUS_PHRASES.map((p) => ({
    phrase: p.phrase,
    matchType: p.matchType ?? ("SUBSTRING" as const),
    language: p.language ?? ("EN" as const),
    category: p.category,
    description: p.description,
    weight: p.weight ?? 70,
    action: p.action ?? ("FLAG" as const),
    isActive: true,
    source: "SEED" as const,
  }));
}

export function seedRegexToInputs(): SuspiciousPhraseInput[] {
  return SEED_SUSPICIOUS_REGEX.map((p) => ({
    phrase: p.pattern,
    matchType: "REGEX" as const,
    language: p.language ?? ("OTHER" as const),
    category: p.category,
    description: p.description,
    weight: p.weight ?? 70,
    action: p.action ?? ("FLAG" as const),
    isActive: true,
    source: "SEED" as const,
  }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Content normalization — defeats obfuscation so dynamically evolving content
// ("t u m a  p3s@" , "senddd moneyyyy", zero-width tricks) still matches.
// ─────────────────────────────────────────────────────────────────────────────

const ZERO_WIDTH_RE = /[\u200B-\u200F\u2060\u202A-\u202E\uFEFF]/g;

const LEET_MAP: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "7": "t",
  "8": "b",
  "9": "g",
  $: "s",
  "@": "a",
  "€": "e",
  "£": "l",
};

/**
 * Normalizes message text for suspicious-pattern matching:
 *  1. lowercases
 *  2. strips zero-width / bidi control characters
 *  3. decodes leet-speak (tum@ → tuma, $end → send)
 *  4. removes punctuation
 *  5. collapses runs of repeated characters (seeeend → send)
 *  6. joins spaced-out letter sequences (t u m a → tuma)
 */
export function normalizeContent(content: string): string {
  let text = content.toLowerCase().replace(ZERO_WIDTH_RE, "");

  text = text.replace(/[0345789$@€£]/g, (ch) => LEET_MAP[ch] ?? ch);

  // Remove punctuation, keep letters/digits/whitespace
  text = text.replace(/[^a-z0-9\s]/g, " ");

  // Collapse runs of the same character (3+ → 1)
  text = text.replace(/([a-z0-9])\1{2,}/g, "$1");

  // Join runs of 3+ single-letter tokens separated by single spaces, bounded by
  // word gaps ("t u m a  p e s a" → "tuma pesa"; "send m o n e y" → "send money")
  const spacedLetters = /(?:[a-z0-9] ){2,}[a-z0-9]/g;
  text = text.replace(spacedLetters, (match) => match.replace(/ /g, ""));

  // Collapse whitespace
  text = text.replace(/\s+/g, " ").trim();

  return text;
}

export interface MatchedSuspiciousPattern {
  phrase: string;
  category: string;
  description: string | null;
  action: PhraseAction;
  weight: number;
  matchType: PhraseMatchType;
}

/**
 * Builds the human-readable reason shown to users when a message is flagged
 * or blocked. Users must understand exactly why the message was blocked so
 * they can correct the issue.
 */
export function explainModeration(options: {
  matched: MatchedSuspiciousPattern[];
  anomalySignals: string[];
  /** Contextual evidence such as detected phone numbers and their intent. */
  phoneEvidence?: string[];
  status: "FLAGGED" | "BLOCKED";
}): string {
  const { matched, anomalySignals, phoneEvidence = [], status } = options;
  const parts: string[] = [];

  if (matched.length > 0) {
    const descriptions = [
      ...new Set(
        matched.map((m) => m.description ?? `content matching "${m.phrase}"`),
      ),
    ];
    parts.push(descriptions.join("; "));
  }

  if (phoneEvidence.length > 0) {
    parts.push(phoneEvidence.join("; "));
  }

  if (anomalySignals.length > 0) {
    parts.push(
      `automated pattern detection flagged unusual formatting or content structure (${anomalySignals.join(", ")})`,
    );
  }

  if (parts.length === 0) {
    parts.push(
      "it was detected as suspicious by automated abuse-detection heuristics",
    );
  }

  const joined = parts.join("; ");
  if (status === "BLOCKED") {
    return (
      `Your message was not delivered because our safety system identified: ${joined}. ` +
      "Please edit your message to remove this content and try again. " +
      "If you believe this was a mistake, contact support."
    );
  }
  return `This message was flagged for review because it may contain: ${joined}.`;
}
