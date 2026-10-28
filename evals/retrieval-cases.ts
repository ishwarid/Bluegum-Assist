/*
 * Questions written the way customers actually ask them, each labelled with
 * the article that should answer it. Most deliberately avoid the article's
 * own wording; that's what makes the eval useful.
 *
 * `expected: null` marks questions the help centre does NOT cover. Search
 * should return nothing for those, so the assistant falls back honestly.
 */
export type RetrievalCase = { question: string; expected: string | null };

export const RETRIEVAL_CASES: RetrievalCase[] = [
  // Payments
  {
    question: "How long does an international transfer take?",
    expected: "international-transfers",
  },
  { question: "I sent money overseas, when will it arrive?", expected: "international-transfers" },
  { question: "What's the fee to send money to the UK?", expected: "international-transfers" },
  { question: "Can I pay someone with just their phone number?", expected: "payid-and-osko" },
  { question: "Are Osko payments instant on weekends?", expected: "payid-and-osko" },
  {
    question: "How do I pay my electricity bill with a biller code?",
    expected: "bpay-and-scheduled-payments",
  },
  {
    question: "Can I set up a recurring payment every fortnight?",
    expected: "bpay-and-scheduled-payments",
  },
  { question: "How do I increase my daily transfer limit?", expected: "payment-limits" },
  { question: "What's the maximum I can send in a day?", expected: "payment-limits" },

  // Cards
  { question: "I lost my wallet with my card in it", expected: "lost-or-stolen-card" },
  { question: "My card was stolen, what do I do?", expected: "lost-or-stolen-card" },
  { question: "How do I lock my card temporarily?", expected: "freeze-a-card" },
  { question: "Will direct debits still work if my card is frozen?", expected: "freeze-a-card" },
  { question: "My card is damaged and won't tap", expected: "replace-a-card" },
  { question: "How long does a new card take to arrive in the post?", expected: "replace-a-card" },
  {
    question: "There's a charge on my statement I don't recognise",
    expected: "dispute-a-transaction",
  },
  {
    question: "How do I get a refund for something that never arrived?",
    expected: "dispute-a-transaction",
  },

  // Fees
  { question: "Are there fees for using my debit card in Japan?", expected: "overseas-card-fees" },
  {
    question: "Should I pay in AUD or local currency when travelling?",
    expected: "overseas-card-fees",
  },
  { question: "Do you charge a monthly account fee?", expected: "account-fees" },
  { question: "Will I be charged for using another bank's ATM?", expected: "account-fees" },

  // Accounts
  { question: "How do I get the bonus interest on my savings?", expected: "savings-interest" },
  { question: "When is interest paid into my Goal Saver?", expected: "savings-interest" },
  { question: "What do I need to sign up for an account?", expected: "open-an-account" },
  { question: "Can I open an account if I'm 17?", expected: "open-an-account" },
  { question: "I want to shut my savings account", expected: "close-an-account" },

  // Security
  {
    question: "Someone called saying they're from Bluegum and asked for my code",
    expected: "scams-and-security",
  },
  { question: "I think I've been scammed", expected: "scams-and-security" },
  { question: "I forgot my passcode", expected: "app-login-help" },
  { question: "How do I log in on my new phone?", expected: "app-login-help" },

  // Support
  { question: "Can I talk to a real person?", expected: "contact-us" },
  { question: "I'm struggling to make my repayments", expected: "contact-us" },
  { question: "How do I make a complaint?", expected: "contact-us" },

  // Not covered by the help centre
  { question: "What is Bluegum's share price?", expected: null },
  { question: "Write me a poem about the ocean", expected: null },
  { question: "Who won the cricket last night?", expected: null },
];
