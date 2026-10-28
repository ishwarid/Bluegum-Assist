/*
 * Bluegum Bank's help centre. Bluegum is fictional: every product detail,
 * fee and timeframe below is invented for this demo.
 *
 * Articles are short on purpose. Each one answers one question well, which
 * keeps search results focused and gives the model less to misread.
 */

export type Topic = "Payments" | "Cards" | "Fees" | "Accounts" | "Security" | "Support";

export type Article = {
  id: string;
  title: string;
  topic: Topic;
  /** Extra search terms people use that the article text doesn't. */
  keywords: string[];
  /** Plain paragraphs separated by blank lines. Lines starting "- " are list items. */
  body: string;
};

export const ARTICLES: Article[] = [
  {
    id: "international-transfers",
    title: "Sending money internationally",
    topic: "Payments",
    keywords: ["overseas", "abroad", "swift", "foreign currency", "wire"],
    body: `You can send money to more than 60 countries from the Bluegum app. Go to Pay, then International transfer, and add the recipient's name, bank and account details (IBAN or SWIFT/BIC code).

Most international transfers arrive within 1 to 3 business days. Transfers to Europe, the UK and New Zealand usually arrive in 1 business day. Transfers made after 4pm Sydney time, or on weekends and public holidays, start processing the next business day.

Each international transfer costs a $6 fee. We show the exchange rate and the exact amount your recipient will get before you confirm. The recipient's bank may also charge a fee.

You can track a transfer under Activity. If a transfer hasn't arrived after 5 business days, contact us and we'll trace it.`,
  },
  {
    id: "payid-and-osko",
    title: "Instant payments with PayID and Osko",
    topic: "Payments",
    keywords: ["fast payment", "instant transfer", "phone number payment", "email payment"],
    body: `Payments to other Australian banks that support Osko usually arrive in under a minute, any time of day, including weekends.

A PayID lets people pay you using your mobile number or email address instead of your BSB and account number. To create one, go to Profile, then PayID, and choose which account it links to.

The default limit for PayID and Osko payments is $5,000 per day. You can change it in the app (see Changing your payment limits).

If a payment to a new payee is unusually large, we may hold it for up to 24 hours to protect you from scams.`,
  },
  {
    id: "bpay-and-scheduled-payments",
    title: "BPAY and scheduled payments",
    topic: "Payments",
    keywords: ["bill payment", "recurring payment", "future payment", "biller code"],
    body: `Use BPAY to pay bills that show a biller code and reference number. BPAY payments made before 5pm Sydney time on a business day usually reach the biller the next business day.

You can schedule any payment for a future date, or set it to repeat weekly, fortnightly or monthly. Scheduled payments run early in the morning on the chosen day, so make sure the money is in your account the night before.

To change or cancel a scheduled payment, go to Pay, then Scheduled. Changes must be made before midnight the day before the payment is due.`,
  },
  {
    id: "payment-limits",
    title: "Changing your payment limits",
    topic: "Payments",
    keywords: ["daily limit", "transfer limit", "increase limit", "maximum payment"],
    body: `Your daily limits control how much you can send each day. The defaults are:

- $5,000 for PayID, Osko and bank transfers
- $10,000 for BPAY
- $20,000 for international transfers

To change a limit, go to Profile, then Limits. Lowering a limit takes effect straight away. Raising a limit needs a one-time code sent to your phone, and the new limit applies after 24 hours.`,
  },
  {
    id: "lost-or-stolen-card",
    title: "Lost or stolen card",
    topic: "Cards",
    keywords: ["missing card", "can't find card", "stolen wallet", "report card"],
    body: `If your card is lost or stolen, freeze it straight away in the app or by asking our chat assistant. Freezing stops new purchases and withdrawals but keeps your account open.

If you find your card, you can unfreeze it and keep using it. If you don't find it, order a replacement (see Replacing a card), which cancels the old card number for good.

If you see transactions you don't recognise, tell us as soon as possible. You won't pay for unauthorised transactions you report promptly.`,
  },
  {
    id: "freeze-a-card",
    title: "Freezing and unfreezing a card",
    topic: "Cards",
    keywords: ["lock card", "block card", "pause card", "temporary block"],
    body: `Freezing a card is temporary. While a card is frozen, new purchases, cash withdrawals and contactless payments are declined. Direct debits and recurring payments set up on the card may also be declined.

Freezing does not cancel the card. You can unfreeze it at any time in the app or through the chat assistant, and it works again within a few seconds.

If you think the card has been used by someone else, freeze it and then order a replacement.`,
  },
  {
    id: "replace-a-card",
    title: "Replacing a card",
    topic: "Cards",
    keywords: ["new card", "damaged card", "card not working", "expired card", "card delivery"],
    body: `To replace a lost, stolen or damaged card, go to Cards, choose the card, then Replace card. Replacing a card cancels the old card number.

A digital card is available in your app and phone wallet straight away. Your physical card arrives by post within 5 to 7 business days. Replacement cards are free.

We send a new card automatically about a month before your current one expires.`,
  },
  {
    id: "dispute-a-transaction",
    title: "Disputing a transaction",
    topic: "Cards",
    keywords: [
      "chargeback",
      "refund",
      "unrecognised transaction",
      "don't recognise",
      "statement",
      "wrong charge",
      "fraud",
    ],
    body: `If a card transaction is wrong, or you didn't make it, you can dispute it. First, try contacting the merchant. Many problems are fixed fastest that way.

If that doesn't work, go to Activity, choose the transaction, then Dispute. Tell us what happened and attach any receipts or emails.

You need to raise a dispute within 120 days of the transaction. We'll update you within 5 business days and usually resolve disputes within 45 days.

If you didn't make the transaction at all, freeze your card first.`,
  },
  {
    id: "overseas-card-fees",
    title: "Using your card overseas",
    topic: "Fees",
    keywords: [
      "travel",
      "foreign transaction fee",
      "international purchase",
      "currency conversion",
    ],
    body: `Bluegum Everyday debit cards have no foreign transaction fees. You pay the Mastercard exchange rate with nothing added.

Low Rate credit cards charge a 3% foreign transaction fee on purchases in a foreign currency, or with an overseas merchant even if charged in Australian dollars.

When a terminal or website offers to charge you in Australian dollars, choose the local currency instead. Merchant conversion rates are usually worse than ours.

You don't need to tell us before you travel.`,
  },
  {
    id: "account-fees",
    title: "Account fees",
    topic: "Fees",
    keywords: ["monthly fee", "atm fee", "charges", "cost", "pricing"],
    body: `Bluegum Everyday and Goal Saver accounts have no monthly account fees.

We don't charge for using any ATM in Australia, but some ATM owners add their own fee. The ATM shows it before you confirm.

Fees we do charge:

- $6 per international transfer
- $5 for an overseas ATM withdrawal
- 3% foreign transaction fee on Low Rate credit card purchases

The full list is in the Fees and charges guide in the app.`,
  },
  {
    id: "savings-interest",
    title: "How Goal Saver interest works",
    topic: "Accounts",
    keywords: ["bonus interest", "interest rate", "savings account", "earn interest"],
    body: `Goal Saver pays a base interest rate on your whole balance, plus a bonus rate in any month you meet both conditions:

- deposit at least $1,000 from outside Bluegum
- make no withdrawals from the Goal Saver

Interest is calculated daily and paid on the last day of each month. The current rates are shown in the app on the Goal Saver page.

Transfers between your own Bluegum accounts don't count towards the $1,000 deposit.`,
  },
  {
    id: "open-an-account",
    title: "Opening an account",
    topic: "Accounts",
    keywords: ["sign up", "join", "new customer", "eligibility", "requirements"],
    body: `You can open a Bluegum account in the app in about 5 minutes. You need to:

- be 18 or older
- live in Australia
- have an Australian driver licence, passport or Medicare card

We verify your identity online. If we can't verify it automatically, we'll ask you to upload a photo of your ID, which usually takes one business day to check.

Your account and digital card are ready as soon as you're verified.`,
  },
  {
    id: "close-an-account",
    title: "Closing an account",
    topic: "Accounts",
    keywords: ["cancel account", "leave", "shut account"],
    body: `To close an account, move any remaining money out, cancel scheduled payments, and move direct debits to another account. Then go to the account in the app and choose Close account.

Interest earned up to the day of closing is paid into the account before it closes. You can't close an account that has a negative balance or a pending dispute.

If you want to close every account and leave Bluegum, contact us and we'll help.`,
  },
  {
    id: "scams-and-security",
    title: "Scams and keeping your account safe",
    topic: "Security",
    keywords: ["scam", "phishing", "suspicious message", "fraud", "hacked", "security code"],
    body: `Bluegum will never ask for your passcode, password or one-time codes, by phone, text, email or chat. Anyone who asks for them is a scammer, even if they say they're from Bluegum.

Never move money to a "safe account" because someone tells you to. Banks never ask you to do this.

If you think you've been scammed, freeze your cards, change your passcode, and contact us straight away. The sooner we know, the better chance we have of recovering the money.`,
  },
  {
    id: "app-login-help",
    title: "Trouble logging in",
    topic: "Security",
    keywords: ["forgot passcode", "locked out", "new phone", "reset password", "can't log in"],
    body: `If you forget your passcode, choose Forgot passcode on the login screen. We'll verify you with a code sent to your phone and a selfie check.

After 5 wrong attempts, the app locks for 30 minutes to protect your account.

On a new phone, download the app and log in with your email address. We'll send a code to your registered mobile number. If you've also changed your number, contact us to verify your identity.`,
  },
  {
    id: "contact-us",
    title: "Contacting Bluegum support",
    topic: "Support",
    keywords: ["talk to a person", "human", "phone", "complaint", "hardship", "help"],
    body: `Our support team is available 8am to 8pm Sydney time, 7 days a week. In the app, go to Help, then Message us, to chat with a person. For lost or stolen cards and suspected fraud, help is available 24 hours a day.

If you're having trouble making repayments, ask for our hardship team. We can talk through options such as a payment pause.

If you're not happy with how we've handled something, you can make a complaint through Help. We aim to resolve complaints within 30 days.`,
  },
];

export function getArticle(id: string): Article | undefined {
  return ARTICLES.find((article) => article.id === id);
}

export function articleUrl(id: string) {
  return `/help/${id}`;
}
