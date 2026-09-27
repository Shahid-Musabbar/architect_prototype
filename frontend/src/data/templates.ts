import type { Agent, Table } from '../types';

type AgentSeed = Partial<Agent> & Pick<Agent, 'id' | 'name' | 'kind' | 'role' | 'goal' | 'instructions' | 'reply'>;

export interface Template {
  id: string;
  app: string;
  brand?: string;
  match: RegExp;
  channel: { title: string; sub: string };
  agents: AgentSeed[];
  urgent?: { keywords: string[]; reply: string; human: string };
  site: { kicker: string; title: string; sub: string; cta: string; features: [string, string, string][]; greeting: string; placeholder: string; widgetTitle: string };
  samples: string[];
  fallback: string;
  mainTable: string;
  db: Record<string, Table>;
  stats: [string, string][];
}

export function mkAgent(s: AgentSeed): Agent {
  return {
    model: s.kind === 'router' ? 'Claude Haiku 4.5' : 'Claude Sonnet 4.5',
    tools: [],
    handoffs: [],
    memory: true,
    temp: s.kind === 'router' ? 0.2 : 0.3,
    maxTok: s.kind === 'router' ? 512 : 1024,
    out: { text: true, json: false, image: false, file: false },
    knowledge: [],
    skills: [],
    feats: { safety: true },
    sched: [],
    keywords: [],
    runs: 0,
    ...s,
  };
}

const t = (desc: string, cols: [string, string][], rows: string[][], count?: number): Table => ({ desc, cols, rows, count: count ?? rows.length });

export const TEMPLATES: Template[] = [
  {
    id: 'concierge',
    app: 'Tenant concierge',
    brand: 'Keystone',
    match: /tenant|landlord|propert|rent|lease|apartment|building/i,
    channel: { title: 'Tenant', sub: 'Web chat · SMS' },
    agents: [
      { id: 'concierge', name: 'Concierge', kind: 'router', role: 'Front desk for every tenant conversation', goal: 'Understand what the tenant needs and route it to the right specialist in one step', instructions: "You greet tenants of Keystone properties and decide who should help.\n\nRoute repairs and anything broken to Maintenance, rent and payments to Billing, and lease questions to Leasing. If a tenant is upset or mentions safety (gas, fire, flooding), hand off to the landlord immediately.", tools: [{ name: 'route_to', on: true }, { name: 'handoff_to_human', on: true }], handoffs: ['Maintenance', 'Billing', 'Leasing', 'Landlord'], reply: "I can help with repairs, rent and your lease. What's going on?", skills: ['Intent routing'], feats: { memory: true, safety: true }, runs: 142, out: { text: true, json: true, image: false, file: false } },
      { id: 'maintenance', name: 'Maintenance', kind: 'specialist', role: 'Maintenance coordinator', goal: 'Turn every repair request into a scheduled work order with a confirmed vendor', instructions: "Collect what's broken, where, and how urgent. Ask for a photo when useful. Create one work order per issue and notify the preferred vendor. Never promise a time the vendor hasn't confirmed.", tools: [{ name: 'create_work_order', on: true }, { name: 'notify_vendor', on: true }, { name: 'upload_photo', on: false }], handoffs: ['Concierge', 'Landlord'], keywords: ['leak', 'broken', 'heat', 'repair', 'drip', 'fix', 'mold', 'toilet', 'sink', 'shower', 'door', 'light', 'water', 'noise'], reply: "Sorry about that. I've logged work order #{wo} for your unit and asked Dana's Plumbing for a slot. You'll get a text as soon as they confirm a time.", knowledge: ['Vendor list.csv'], skills: ['Photo triage'], sched: ['Daily 8:00 · chase unconfirmed vendors'], feats: { memory: true, safety: true, query: true }, runs: 61, out: { text: true, json: false, image: true, file: false } },
      { id: 'billing', name: 'Billing', kind: 'specialist', role: 'Billing assistant', goal: 'Answer rent and fee questions accurately from Stripe and collect payment', instructions: 'Answer balance, receipt and due-date questions from Stripe. Offer a payment link or autopay. Do not waive fees; pass fee disputes to the landlord.', tools: [{ name: 'stripe.get_balance', on: true }, { name: 'stripe.payment_link', on: true }, { name: 'stripe.refund', on: false }], handoffs: ['Concierge', 'Landlord'], keywords: ['rent', 'pay', 'owe', 'invoice', 'late', 'fee', 'deposit', 'balance', 'receipt', 'autopay'], reply: 'You owe $1,450, due on 1 October. Would you like a payment link now, or should I set up autopay?', knowledge: ['Fee policy.pdf'], memory: false, temp: 0.1, maxTok: 768, feats: { safety: true, query: true }, sched: ['1st of month · send rent reminders'], runs: 48, out: { text: true, json: true, image: false, file: true } },
      { id: 'leasing', name: 'Leasing', kind: 'specialist', role: 'Leasing specialist', goal: 'Answer lease questions with the exact clause, and book viewings and renewals', instructions: "Answer from the tenant's own lease and cite the clause. For viewings and renewals, offer times from the landlord's calendar.", tools: [{ name: 'lease_docs.search', on: true }, { name: 'book_viewing', on: true }], handoffs: ['Concierge', 'Landlord'], keywords: ['lease', 'renew', 'tour', 'move', 'pet', 'cat', 'dog', 'sublet', 'viewing', 'clause'], reply: 'Clause 12 of your lease allows one cat or small dog with a $300 deposit. Shall I ask your landlord to approve it?', knowledge: ['Lease documents (38 PDFs)'], skills: ['Clause citation'], temp: 0.2, runs: 33 },
    ],
    urgent: { keywords: ['gas', 'fire', 'flood', 'smoke', 'emergency'], reply: "That sounds urgent. I've alerted your landlord right now and they'll call you within minutes. If you're in danger, leave the unit and call 911.", human: 'Landlord' },
    site: { kicker: 'Concierge for small landlords', title: 'Your tenants get answers at 2 a.m. You get to sleep.', sub: 'Keystone gives every tenant a concierge that knows their lease, logs repairs with your vendors and answers rent questions from Stripe. It only wakes you for emergencies.', cta: 'Try the concierge', greeting: "Hi, I'm the Keystone concierge. Ask me about repairs, rent or your lease.", placeholder: 'e.g. My kitchen sink is leaking', widgetTitle: 'Keystone concierge',
      features: [['01 · Maintenance', 'Repairs, logged and booked', 'Tenants describe the problem; the agent opens a work order and asks your vendor for a slot.'], ['02 · Billing', 'Rent questions, answered', 'Balances, receipts and payment links straight from Stripe.'], ['03 · Leasing', 'The lease, read for them', "Pets, renewals, move-outs: answered from the tenant's own lease, clause cited."]] },
    samples: ['My sink is leaking', 'How much rent do I owe?', 'Can I get a cat?', 'I smell gas'],
    fallback: "I can help with repairs, rent and your lease. What's going on?",
    mainTable: 'work_orders',
    stats: [['142', 'conversations'], ['9', 'work orders opened'], ['2', 'handed to you']],
    db: {
      work_orders: t('Written by the Maintenance agent', [['id', 'uuid'], ['unit', 'text'], ['issue', 'text'], ['urgency', 'enum'], ['status', 'enum'], ['vendor', 'text'], ['created_at', 'timestamptz']], [
        ['4820', '12A', 'No hot water', 'emergency', 'scheduled', "Dana's Plumbing", '2026-09-26 07:52'],
        ['4819', '5C', "Bedroom window won't latch", 'low', 'open', 'NULL', '2026-09-25 21:30'],
        ['4818', '7D', 'Heater making clicking noise', 'normal', 'scheduled', 'Bay Heating Co.', '2026-09-25 16:02'],
        ['4817', '3B', 'Bathroom fan not working', 'low', 'done', 'Voltworks', '2026-09-24 11:45'],
        ['4816', '9A', 'Front door lock sticking', 'normal', 'done', 'KeyFix', '2026-09-23 09:18'],
        ['4815', '2F', 'Ceiling stain after rain', 'normal', 'done', 'Ridge Roofing', '2026-09-22 14:40'],
        ['4814', '14C', 'Dishwasher not draining', 'normal', 'done', "Dana's Plumbing", '2026-09-21 10:05'],
        ['4813', '5C', 'Hallway light out', 'low', 'done', 'Voltworks', '2026-09-20 19:12'],
      ], 118),
      tenants: t('One row per leaseholder', [['id', 'uuid'], ['name', 'text'], ['unit', 'text'], ['phone', 'text'], ['email', 'text'], ['lease_end', 'date']], [
        ['t_01', 'Maria Lopez', '3B', '(415) 555-0181', 'maria.lopez@gmail.com', '2027-03-31'],
        ['t_02', 'James Okafor', '12A', '(415) 555-0112', 'j.okafor@outlook.com', '2026-12-31'],
        ['t_03', 'Dev Patel', '5C', '(415) 555-0149', 'dev.patel@yahoo.com', '2027-06-30'],
        ['t_04', 'Sam Chen', '7D', '(415) 555-0173', 'sam.chen@icloud.com', '2026-11-30'],
        ['t_05', 'Rosa Nguyen', '9A', '(415) 555-0126', 'r.nguyen@gmail.com', '2027-01-31'],
      ], 38),
      units: t('Properties and units', [['id', 'text'], ['building', 'text'], ['beds', 'int'], ['rent', 'numeric'], ['occupied', 'bool']], [
        ['3B', 'Harbor View', '2', '1450.00', 'true'], ['5C', 'Harbor View', '1', '1180.00', 'true'], ['7D', 'Elm Court', '2', '1520.00', 'true'], ['9A', 'Elm Court', '3', '2100.00', 'true'], ['12A', 'Harbor View', '2', '1490.00', 'true'], ['14C', 'Elm Court', '1', '1150.00', 'false'],
      ], 40),
      payments: t('Synced from Stripe', [['id', 'text'], ['tenant', 'text'], ['amount', 'numeric'], ['status', 'enum'], ['paid_at', 'timestamptz']], [
        ['pi_3Q8a', 'Maria Lopez', '1450.00', 'paid', '2026-09-01 08:02'], ['pi_3Q7x', 'James Okafor', '1490.00', 'paid', '2026-09-01 09:41'], ['pi_3Q7c', 'Dev Patel', '1180.00', 'open', 'NULL'], ['pi_3Q6z', 'Sam Chen', '1520.00', 'paid', '2026-09-02 18:20'],
      ], 412),
      conversations: t('Every agent conversation', [['id', 'uuid'], ['user', 'text'], ['channel', 'text'], ['routed_to', 'text'], ['tools_used', 'text[]'], ['turns', 'int']], [
        ['c_9f21', 'Maria Lopez', 'web', 'Maintenance', '{create_work_order}', '4'], ['c_9f20', 'James Okafor', 'sms', 'Maintenance', '{create_work_order,notify_vendor}', '6'], ['c_9f1e', 'Dev Patel', 'web', 'Billing', '{stripe.get_balance}', '3'], ['c_9f1d', 'Sam Chen', 'sms', 'Leasing', '{lease_docs.search}', '2'],
      ], 3418),
    },
  },
  {
    id: 'research',
    app: 'Research desk',
    match: /research|brief|analyst|scout|report|news|market/i,
    channel: { title: 'Analyst', sub: 'Slack · Web' },
    agents: [
      { id: 'editor', name: 'Editor', kind: 'router', role: 'Assigns research questions to the right desk', goal: 'Break each request into search, verification and writing work', instructions: 'You run the research desk. Send discovery work to the Scout, verification to the Analyst and drafting to the Writer. Ask one clarifying question if the scope is unclear.', tools: [{ name: 'route_to', on: true }, { name: 'handoff_to_human', on: true }], handoffs: ['Scout', 'Analyst', 'Writer'], reply: 'Tell me the topic and the decision this brief should support, and I’ll put the desk on it.', runs: 64 },
      { id: 'scout', name: 'Scout', kind: 'specialist', role: 'Source finder', goal: 'Find the ten most credible, recent sources on a topic', instructions: 'Search broadly, prefer primary sources, and return titles, dates and one-line relevance notes. Never cite a source you did not open.', tools: [{ name: 'web_search', on: true }, { name: 'fetch_page', on: true }], handoffs: ['Editor', 'Analyst'], keywords: ['find', 'source', 'search', 'look', 'latest', 'news', 'who'], reply: 'I found 11 sources from the last 90 days — 4 primary filings, 5 trade reports and 2 interviews. Want me to pass them to the Analyst?', runs: 58 },
      { id: 'analyst', name: 'Analyst', kind: 'specialist', role: 'Fact checker', goal: 'Verify every claim against at least two independent sources', instructions: 'Check each claim, mark confidence as high, medium or low, and flag contradictions between sources.', tools: [{ name: 'fact_check', on: true }], knowledge: ['Style guide.pdf', 'Past briefs (42)'], handoffs: ['Editor', 'Writer'], keywords: ['verify', 'check', 'true', 'accurate', 'confirm', 'claim'], reply: '7 of 9 claims check out with two sources each. Two are single-sourced — I’ve marked them medium confidence.', runs: 41 },
      { id: 'writer', name: 'Writer', kind: 'specialist', role: 'Brief writer', goal: 'Turn verified findings into a one-page brief', instructions: 'Write in plain English, lead with the answer, keep it under 400 words and link every figure to its source.', tools: [{ name: 'draft_brief', on: true }, { name: 'notion.publish', on: true }], handoffs: ['Editor'], keywords: ['write', 'draft', 'brief', 'summary', 'summarize', 'memo'], reply: 'Draft is ready: 360 words, three takeaways up top, every number linked. I’ve saved it to Notion as “Weekly brief — Sep 27”.', runs: 37 },
    ],
    site: { kicker: 'Research desk', title: 'Research briefs, written overnight.', sub: 'A scout finds sources, an analyst checks every claim and a writer drafts the brief your team reads with coffee.', cta: 'Request a brief', greeting: "Hi, I'm the research desk. What should we look into?", placeholder: 'e.g. Find the latest on EU AI rules', widgetTitle: 'Research desk',
      features: [['01 · Scout', 'Sources, found fast', 'Primary filings, trade press and interviews, ranked by credibility.'], ['02 · Analyst', 'Every claim checked', 'Two independent sources per claim, with confidence marked.'], ['03 · Writer', 'One page, no fluff', 'The answer first, figures linked, ready by morning.']] },
    samples: ['Find the latest on EU AI rules', 'Verify these market numbers', 'Write this week’s brief'],
    fallback: 'Tell me the topic and the decision this brief should support.',
    mainTable: 'briefs',
    stats: [['64', 'requests'], ['12', 'briefs written'], ['1', 'needs review']],
    db: {
      briefs: t('Drafted by the Writer agent', [['id', 'uuid'], ['title', 'text'], ['sources', 'int'], ['status', 'enum'], ['created_at', 'timestamptz']], [
        ['b_31', 'EU AI Act: what changes in Q4', '11', 'published', '2026-09-26 06:10'], ['b_30', 'Battery supply chain update', '9', 'published', '2026-09-19 06:02'], ['b_29', 'Competitor pricing moves', '7', 'draft', '2026-09-18 22:40'], ['b_28', 'Rate cut scenarios', '12', 'published', '2026-09-12 06:05'],
      ], 31),
      sources: t('Found by the Scout agent', [['id', 'uuid'], ['url', 'text'], ['publisher', 'text'], ['confidence', 'enum']], [
        ['s_901', 'eur-lex.europa.eu/…/2024-1689', 'EUR-Lex', 'high'], ['s_900', 'ft.com/content/…', 'Financial Times', 'high'], ['s_899', 'techcrunch.com/2026/09/…', 'TechCrunch', 'medium'],
      ], 904),
      conversations: t('Every agent conversation', [['id', 'uuid'], ['user', 'text'], ['channel', 'text'], ['routed_to', 'text'], ['turns', 'int']], [
        ['c_4410', 'Priya Shah', 'slack', 'Scout', '5'], ['c_4409', 'Tom Reyes', 'web', 'Writer', '3'],
      ], 640),
    },
  },
  {
    id: 'support',
    app: 'Store support',
    brand: 'Counter',
    match: /shop|store|order|return|refund|ecommerce|e-commerce|customer support|support copilot/i,
    channel: { title: 'Shopper', sub: 'Storefront chat · Email' },
    agents: [
      { id: 'frontdesk', name: 'Front desk', kind: 'router', role: 'Greets shoppers and routes them', goal: 'Resolve the shopper’s question in the fewest turns', instructions: 'Route order status to Orders, returns and refunds to Returns, and product questions to Products. Escalate angry customers to the owner with a summary.', tools: [{ name: 'route_to', on: true }, { name: 'handoff_to_human', on: true }], handoffs: ['Orders', 'Returns', 'Products', 'Owner'], reply: 'I can help with orders, returns and products. What do you need?', runs: 188 },
      { id: 'orders', name: 'Orders', kind: 'specialist', role: 'Order status', goal: 'Tell shoppers exactly where their order is', instructions: 'Look up the order by number or email, give carrier status and ETA, and never guess a delivery date.', tools: [{ name: 'shopify.get_order', on: true }, { name: 'track_shipment', on: true }], handoffs: ['Front desk'], keywords: ['order', 'where', 'shipping', 'ship', 'deliver', 'track', 'arrive'], reply: 'Order #1042 shipped yesterday with UPS and is due Tuesday by 8 p.m. Here’s your tracking link.', runs: 96 },
      { id: 'returns', name: 'Returns', kind: 'specialist', role: 'Returns and refunds', goal: 'Make returns painless within policy', instructions: 'Check the 30-day window, open the return and email a prepaid label. Refunds over $200 need owner approval.', tools: [{ name: 'create_return', on: true }, { name: 'stripe.refund', on: true }], knowledge: ['Return policy.pdf'], handoffs: ['Front desk', 'Owner'], keywords: ['return', 'refund', 'exchange', 'wrong', 'damaged', 'size'], reply: 'You’re within the 30-day window. I’ve opened return R-2231 and emailed a prepaid label — your refund lands 3–5 days after it’s scanned.', runs: 52 },
      { id: 'products', name: 'Products', kind: 'specialist', role: 'Product expert', goal: 'Help shoppers pick the right product', instructions: 'Answer from the catalog: sizes, materials, stock. Suggest one alternative if out of stock.', tools: [{ name: 'catalog.search', on: true }], handoffs: ['Front desk'], keywords: ['product', 'stock', 'color', 'material', 'fit', 'available', 'recommend'], reply: 'The Linen Shirt runs true to size. Medium is in stock in sand and navy; olive is back on Oct 3.', runs: 40 },
    ],
    urgent: { keywords: ['angry', 'lawyer', 'furious', 'terrible', 'scam'], reply: 'I’m sorry — that’s not the experience we want. I’ve passed this to the owner with your order details; they’ll reply personally within the hour.', human: 'Owner' },
    site: { kicker: 'Support for independent stores', title: 'Every order question, answered.', sub: 'Counter answers order status, handles returns in Shopify and knows your catalog — and only pings you when a customer is upset.', cta: 'Ask a question', greeting: 'Hi! Ask me about an order, a return or a product.', placeholder: 'e.g. Where is my order?', widgetTitle: 'Counter support',
      features: [['01 · Orders', 'Where’s my order?', 'Live carrier status and ETAs from Shopify and your shipper.'], ['02 · Returns', 'Returns in one message', 'Window checked, return opened, label emailed.'], ['03 · Products', 'Knows the catalog', 'Sizes, stock and materials, with alternatives.']] },
    samples: ['Where is my order?', 'I want to return a shirt', 'Is the linen shirt in stock?'],
    fallback: 'I can help with orders, returns and products. What do you need?',
    mainTable: 'orders',
    stats: [['188', 'conversations'], ['23', 'returns opened'], ['1', 'handed to you']],
    db: {
      orders: t('Synced from Shopify', [['id', 'text'], ['customer', 'text'], ['total', 'numeric'], ['status', 'enum'], ['placed_at', 'timestamptz']], [
        ['#1042', 'Ana Silva', '128.00', 'shipped', '2026-09-24 10:12'], ['#1041', 'Ben Wu', '64.00', 'delivered', '2026-09-22 18:30'], ['#1040', 'Cara Dunn', '212.50', 'open', '2026-09-26 09:02'], ['#1039', 'Dmitri K.', '48.00', 'delivered', '2026-09-20 14:45'],
      ], 1042),
      returns: t('Opened by the Returns agent', [['id', 'text'], ['order', 'text'], ['reason', 'text'], ['status', 'enum']], [
        ['R-2230', '#1031', 'Wrong size', 'refunded'], ['R-2229', '#1027', 'Damaged in transit', 'label sent'],
      ], 230),
      conversations: t('Every agent conversation', [['id', 'uuid'], ['user', 'text'], ['channel', 'text'], ['routed_to', 'text'], ['turns', 'int']], [
        ['c_7702', 'Ana Silva', 'web', 'Orders', '3'], ['c_7701', 'Ben Wu', 'email', 'Returns', '4'],
      ], 5210),
    },
  },
  {
    id: 'leads',
    app: 'Lead qualifier',
    brand: 'Warm Lead',
    match: /lead|sales|prospect|qualif|book.*call|demo/i,
    channel: { title: 'Visitor', sub: 'Website chat' },
    agents: [
      { id: 'greeter', name: 'Greeter', kind: 'router', role: 'Welcomes visitors', goal: 'Start a conversation with every serious visitor', instructions: 'Greet visitors, learn what brought them here, and hand qualified interest to the Qualifier. Keep it short and friendly.', tools: [{ name: 'route_to', on: true }], handoffs: ['Qualifier', 'Scheduler'], reply: 'Hi! What brought you here today?', runs: 310 },
      { id: 'qualifier', name: 'Qualifier', kind: 'specialist', role: 'Lead qualifier', goal: 'Score fit and capture the contact in HubSpot', instructions: 'Ask about team size, timeline and budget in a natural way. Score against the ICP and save the contact with notes.', tools: [{ name: 'hubspot.upsert_contact', on: true }, { name: 'score_lead', on: true }], handoffs: ['Greeter', 'Scheduler'], keywords: ['team', 'budget', 'price', 'cost', 'company', 'looking', 'need', 'evaluate'], reply: 'Thanks! A 40-person team on a Q4 timeline is a great fit (score 86). Want to see a demo this week?', runs: 122 },
      { id: 'scheduler', name: 'Scheduler', kind: 'specialist', role: 'Books calls', goal: 'Book qualified leads onto the right rep’s calendar', instructions: 'Offer three times in the visitor’s time zone and send a calendar invite.', tools: [{ name: 'calendar.book_call', on: true }], handoffs: ['Greeter'], keywords: ['demo', 'call', 'meet', 'book', 'schedule', 'time', 'talk'], reply: 'Booked: Thursday at 11:00 your time with Jordan. The invite is in your inbox.', runs: 38 },
    ],
    site: { kicker: 'Sales on autopilot', title: 'Talk to visitors while you sleep.', sub: 'Warm Lead chats with every visitor, scores fit against your ideal customer and books calls straight onto your calendar.', cta: 'Talk to us', greeting: 'Hi! What brought you here today?', placeholder: 'e.g. We’re a 40-person team looking at options', widgetTitle: 'Warm Lead',
      features: [['01 · Greet', 'Every visitor, welcomed', 'A friendly first message at the right moment.'], ['02 · Qualify', 'Fit, scored', 'Team size, timeline and budget, saved to HubSpot.'], ['03 · Book', 'Calls on your calendar', 'Three times offered, invite sent, no back and forth.']] },
    samples: ['We’re a 40-person team evaluating tools', 'Can I book a demo?', 'How much does it cost?'],
    fallback: 'Hi! What brought you here today?',
    mainTable: 'leads',
    stats: [['310', 'visitors chatted'], ['17', 'calls booked'], ['0', 'handed to you']],
    db: {
      leads: t('Captured by the Qualifier agent', [['id', 'uuid'], ['name', 'text'], ['company', 'text'], ['score', 'int'], ['stage', 'enum']], [
        ['l_88', 'Grace Kim', 'Northwind', '86', 'booked'], ['l_87', 'Omar Haddad', 'Fabrikam', '72', 'qualified'], ['l_86', 'Lena Vogel', 'Tailspin', '41', 'nurture'],
      ], 88),
      conversations: t('Every agent conversation', [['id', 'uuid'], ['user', 'text'], ['channel', 'text'], ['routed_to', 'text'], ['turns', 'int']], [
        ['c_2201', 'Grace Kim', 'web', 'Scheduler', '6'], ['c_2200', 'Omar Haddad', 'web', 'Qualifier', '4'],
      ], 1204),
    },
  },
  {
    id: 'clinic',
    app: 'Clinic intake',
    brand: 'Frontdesk',
    match: /clinic|patient|health|medical|doctor|intake|dental|therap/i,
    channel: { title: 'Patient', sub: 'Web · SMS' },
    agents: [
      { id: 'intake', name: 'Intake', kind: 'router', role: 'Welcomes patients', goal: 'Route every patient to the right next step safely', instructions: 'Greet the patient, route symptoms to Triage, insurance to Coverage and appointments to Booking. Never give a diagnosis. Emergencies go to staff immediately.', tools: [{ name: 'route_to', on: true }, { name: 'handoff_to_human', on: true }], handoffs: ['Triage', 'Coverage', 'Booking', 'Front desk staff'], reply: 'Hi, I can help you book, check insurance or tell us how you’re feeling.', runs: 97 },
      { id: 'triage', name: 'Triage', kind: 'specialist', role: 'Symptom intake', goal: 'Collect symptoms and flag anything urgent', instructions: 'Ask structured questions, summarise for the practitioner and flag red-flag symptoms. Never diagnose.', tools: [{ name: 'check_symptoms', on: true }], knowledge: ['Care guidelines.pdf'], handoffs: ['Intake', 'Booking'], keywords: ['pain', 'sick', 'fever', 'hurt', 'symptom', 'cough', 'rash', 'feel'], reply: 'Thanks — I’ve noted a sore throat for three days with a mild fever. Nothing urgent flagged. Shall I book you with Dr. Ahmed tomorrow?', runs: 44 },
      { id: 'coverage', name: 'Coverage', kind: 'specialist', role: 'Insurance checks', goal: 'Confirm coverage and copay before the visit', instructions: 'Verify eligibility, explain the copay in plain words and note anything that needs pre-authorisation.', tools: [{ name: 'verify_coverage', on: true }], handoffs: ['Intake'], keywords: ['insurance', 'cover', 'copay', 'plan', 'cost', 'bill'], reply: 'You’re covered under Blue Shield PPO. Your copay for this visit is $25.', runs: 31 },
      { id: 'booking', name: 'Booking', kind: 'specialist', role: 'Appointments', goal: 'Book the right practitioner at the right length', instructions: 'Offer the earliest suitable slot, confirm by SMS and send prep instructions.', tools: [{ name: 'book_appointment', on: true }], handoffs: ['Intake'], keywords: ['book', 'appointment', 'schedule', 'visit', 'see', 'reschedule'], reply: 'You’re booked with Dr. Ahmed tomorrow at 9:40. I’ve texted you a confirmation and what to bring.', runs: 52 },
    ],
    urgent: { keywords: ['chest pain', 'breathe', 'bleeding', 'unconscious', 'emergency'], reply: 'This could be an emergency. Please call 911 now. I’ve alerted our front desk staff as well.', human: 'Front desk staff' },
    site: { kicker: 'Intake for independent clinics', title: 'Intake before the waiting room.', sub: 'Frontdesk collects symptoms, checks insurance and books the right practitioner — so your team starts every visit prepared.', cta: 'Start intake', greeting: 'Hi, I can help you book, check insurance or tell us how you’re feeling.', placeholder: 'e.g. I have a sore throat and fever', widgetTitle: 'Frontdesk',
      features: [['01 · Triage', 'Symptoms, structured', 'A clear summary for the practitioner, red flags escalated.'], ['02 · Coverage', 'Insurance, checked', 'Eligibility and copay confirmed before the visit.'], ['03 · Booking', 'The right slot', 'Practitioner, length and prep instructions handled.']] },
    samples: ['I have a sore throat and fever', 'Is my insurance accepted?', 'Book me for tomorrow'],
    fallback: 'Hi, I can help you book, check insurance or tell us how you’re feeling.',
    mainTable: 'appointments',
    stats: [['97', 'patients helped'], ['38', 'appointments booked'], ['1', 'escalated']],
    db: {
      appointments: t('Booked by the Booking agent', [['id', 'uuid'], ['patient', 'text'], ['practitioner', 'text'], ['slot', 'timestamptz'], ['status', 'enum']], [
        ['a_510', 'Lucy Park', 'Dr. Ahmed', '2026-09-28 09:40', 'confirmed'], ['a_509', 'Marco Ruiz', 'Dr. Ohana', '2026-09-28 11:00', 'confirmed'], ['a_508', 'Jin Lee', 'Dr. Ahmed', '2026-09-27 15:20', 'done'],
      ], 510),
      conversations: t('Every agent conversation', [['id', 'uuid'], ['user', 'text'], ['channel', 'text'], ['routed_to', 'text'], ['turns', 'int']], [
        ['c_3301', 'Lucy Park', 'sms', 'Booking', '4'], ['c_3300', 'Marco Ruiz', 'web', 'Triage', '6'],
      ], 2210),
    },
  },
  {
    id: 'ops',
    app: 'Operations copilot',
    match: /.*/,
    channel: { title: 'User', sub: 'Web app · Slack' },
    agents: [
      { id: 'router', name: 'Router', kind: 'router', role: 'Reads every message and routes it', goal: 'Hand each request to the right specialist in one step', instructions: 'Read every message, hand tasks to Operations, questions to Knowledge, and anything sensitive to a person with a summary.', tools: [{ name: 'route_to', on: true }, { name: 'handoff_to_human', on: true }], handoffs: ['Operations', 'Knowledge', 'Manager'], reply: 'I can create tasks, answer from your docs, or loop in a person. What do you need?', runs: 0 },
      { id: 'operations', name: 'Operations', kind: 'specialist', role: 'Task coordinator', goal: 'Turn requests into assigned, tracked tasks', instructions: 'Create one task per request, assign an owner and a due date, and follow up if it slips.', tools: [{ name: 'create_task', on: true }, { name: 'notify_team', on: true }], handoffs: ['Router', 'Manager'], keywords: ['task', 'do', 'assign', 'fix', 'need', 'request', 'urgent', 'schedule'], reply: 'Done — I created task T-104, assigned it to the on-call owner and posted it in #ops. I’ll follow up if it isn’t picked up in 30 minutes.', runs: 0 },
      { id: 'knowledge', name: 'Knowledge', kind: 'specialist', role: 'Answers from your documents', goal: 'Answer accurately with a source', instructions: 'Answer from the knowledge base and cite the document. If the answer isn’t there, say so.', tools: [{ name: 'docs.search', on: true }], knowledge: ['Uploaded documents'], handoffs: ['Router'], keywords: ['how', 'what', 'policy', 'where', 'why', 'when', 'explain'], reply: 'According to the Operations handbook (section 3.2), requests over $500 need manager approval. Want me to start that approval?', runs: 0 },
    ],
    site: { kicker: 'Your operations copilot', title: 'Requests in, work done.', sub: 'A router agent reads every request, specialists handle tasks and questions, and people only see what needs them.', cta: 'Try it now', greeting: 'Hi! I can create tasks, answer from your docs, or loop in a person.', placeholder: 'e.g. The projector in room 4 is broken', widgetTitle: 'Copilot',
      features: [['01 · Route', 'Every request, sorted', 'The router hands each message to the right specialist.'], ['02 · Act', 'Tasks created and tracked', 'Owners assigned, follow-ups automatic.'], ['03 · Answer', 'From your documents', 'Grounded answers with the source cited.']] },
    samples: ['The projector in room 4 is broken', 'What is our expense policy?', 'Assign the audit prep to Sam'],
    fallback: 'I can create tasks, answer from your docs, or loop in a person. What do you need?',
    mainTable: 'tasks',
    stats: [['0', 'conversations'], ['0', 'tasks created'], ['0', 'escalations']],
    db: {
      tasks: t('Created by the Operations agent', [['id', 'text'], ['title', 'text'], ['owner', 'text'], ['status', 'enum'], ['due', 'date']], [
        ['T-103', 'Restock meeting room supplies', 'Sam', 'open', '2026-09-29'], ['T-102', 'Renew SSL certificate', 'Priya', 'done', '2026-09-25'],
      ], 103),
      conversations: t('Every agent conversation', [['id', 'uuid'], ['user', 'text'], ['channel', 'text'], ['routed_to', 'text'], ['turns', 'int']], [], 0),
    },
  },
];

export const templateById = (id: string) => TEMPLATES.find(x => x.id === id) || TEMPLATES[TEMPLATES.length - 1];
export const templateForPrompt = (prompt: string) => TEMPLATES.find(x => x.id !== 'ops' && x.match.test(prompt)) || templateById('ops');

export const BLUEPRINTS = [
  { k: '4 agents', t: 'Research desk', b: 'A scout finds sources, an analyst checks them, a writer drafts the brief.', p: 'A research team: a scout that finds sources, an analyst that fact-checks them and a writer that drafts a weekly brief.' },
  { k: '4 agents', t: 'Store support copilot', b: 'Answers order questions, handles returns in Shopify, escalates angry customers.', p: 'A support copilot for my Shopify store that answers order questions, processes returns and escalates angry customers to me.' },
  { k: '3 agents', t: 'Lead qualifier', b: 'Chats with site visitors, scores fit and books a call on your calendar.', p: 'A lead qualifier that chats with website visitors, scores them and books sales calls on my calendar.' },
  { k: '4 agents', t: 'Clinic intake', b: 'Collects symptoms, checks insurance and books the right practitioner.', p: 'A clinic intake assistant that collects symptoms, checks insurance and books the right practitioner.' },
];
