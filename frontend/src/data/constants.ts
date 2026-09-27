import type { IconName } from '../icons';
import type { OutKey, PlanId } from '../types';

export const AGENT_MODELS = ['Claude Haiku 4.5', 'Claude Sonnet 4.5', 'Claude Opus 4.1', 'GPT-5', 'GPT-5 mini', 'Gemini 2.5 Pro', 'Gemini 2.5 Flash'];

export const CODE_MODELS = [
  { id: 'architect', name: 'Architect', desc: 'Lyzr coding model tuned for agentic apps', mult: 1, group: 'Lyzr' },
  { id: 'architect-fast', name: 'Architect Fast', desc: 'Quick edits, copy and styling', mult: 0.5, group: 'Lyzr' },
  { id: 'architect-max', name: 'Architect Max', desc: 'Long multi-agent refactors', mult: 2, group: 'Lyzr' },
  { id: 'sonnet-4.5', name: 'Claude Sonnet 4.5', desc: 'Anthropic · strong all-round coder', mult: 1.5, group: 'Frontier' },
  { id: 'opus-4.1', name: 'Claude Opus 4.1', desc: 'Anthropic · hardest problems', mult: 5, group: 'Frontier' },
  { id: 'gpt-5', name: 'GPT-5', desc: 'OpenAI · reasoning', mult: 1.5, group: 'Frontier' },
  { id: 'gpt-5-codex', name: 'GPT-5 Codex', desc: 'OpenAI · code-specialised', mult: 1.2, group: 'Frontier' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'Google · 1M context', mult: 1.2, group: 'Frontier' },
  { id: 'qwen3-coder', name: 'Qwen3 Coder', desc: 'Open weights · low cost', mult: 0.6, group: 'Open' },
  { id: 'deepseek-v3.1', name: 'DeepSeek V3.1', desc: 'Open weights · low cost', mult: 0.4, group: 'Open' },
  { id: 'kimi-k2', name: 'Kimi K2', desc: 'Open weights · agentic coding', mult: 0.5, group: 'Open' },
];

export const PLANS: { id: PlanId; name: string; m: number; y: number; credits: number; blurb: string; features: string[] }[] = [
  { id: 'free', name: 'Starter', m: 0, y: 0, credits: 30, blurb: 'For trying an idea on a weekend.', features: ['30 build credits a month', '1 published app', 'Community models', 'architect.app subdomain'] },
  { id: 'builder', name: 'Builder', m: 25, y: 20, credits: 200, blurb: 'For founders running a real product.', features: ['200 build credits a month', 'Unlimited apps and agents', 'Custom domains', 'Bring your own model keys', 'Version history, 90 days'] },
  { id: 'team', name: 'Team', m: 60, y: 48, credits: 500, blurb: 'Per seat. For studios and small teams.', features: ['500 shared credits per seat', 'Shared workspaces and review', 'Design System agent', 'Evals and run traces, 1 year', 'SSO and audit log', 'Priority support'] },
];
export const planCredits = (p: PlanId) => PLANS.find(x => x.id === p)!.credits;

export const PLAN_QS: { t: string; link?: string; confirm?: boolean; o: [string, string][] }[] = [
  { t: 'How should this be built?', link: 'Learn more about GitAgent', confirm: true, o: [['Use default Lyzr agents', 'Agents live in Lyzr Studio — role, goal, instructions and model editable there.'], ['Workbench UI with GitAgent (beta)', 'Agent lives in its own GitHub repo; the app becomes a full AgenticOS workbench (home, journeys, wiki, skills, observe), not in Lyzr Studio.']] },
  { t: 'Who is the primary user, and what should the app optimize first?', o: [['End customers', 'Self-serve answers and actions, around the clock'], ['Front-line staff', 'Faster daily work and fewer handoffs'], ['Managers and operators', 'Oversight, priorities and escalations'], ['Mixed audience', 'Customers and staff in one system']] },
  { t: 'Where should people reach it first?', o: [['Web app', 'A dedicated app with sign-in and a dashboard'], ['Chat widget', 'Embedded on a site you already have'], ['Slack or Teams', 'Inside the tools your team already uses'], ['SMS or WhatsApp', 'Text-first, nothing to install']] },
  { t: 'How much should the agents do on their own?', o: [['Suggest only', 'Agents draft; a person approves every action'], ['Act on low-risk work', 'Handle routine tasks, escalate anything unusual'], ['Fully autonomous', 'Act end to end, with a full audit log']] },
];

export const PALETTES = [
  { id: 'harbor', name: 'Harbor', bg: '#f7f5f0', surface: '#ffffff', ink: '#1b1d22', muted: '#6b6e76', accent: '#7a1f3d', on: '#ffffff', soft: '#f3e7eb', line: '#e6e2da', head: 'Georgia,"Times New Roman",serif' },
  { id: 'graphite', name: 'Graphite', bg: '#0f1115', surface: '#171a21', ink: '#eef0f4', muted: '#8b919c', accent: '#7cc4ff', on: '#0b1320', soft: '#18283a', line: '#272b34', head: 'inherit' },
  { id: 'sage', name: 'Sage', bg: '#f2f5f0', surface: '#ffffff', ink: '#18201b', muted: '#65706a', accent: '#2f6b4f', on: '#ffffff', soft: '#e2ede6', line: '#dde4dd', head: 'inherit' },
  { id: 'citrus', name: 'Citrus', bg: '#fffaf2', surface: '#ffffff', ink: '#221c14', muted: '#7a6f60', accent: '#d9661a', on: '#ffffff', soft: '#fbe8d4', line: '#eee2cf', head: 'Georgia,"Times New Roman",serif' },
  { id: 'cobalt', name: 'Cobalt', bg: '#f4f6fb', surface: '#ffffff', ink: '#121a2b', muted: '#5f6b80', accent: '#2d5bff', on: '#ffffff', soft: '#e3e9ff', line: '#dde3ef', head: 'inherit' },
];

export const MOCK_SCREENS: [string, string][] = [['Login', 'Secure access for your team'], ['Command center', 'Priorities, AI briefing and the live queue'], ['Conversations', 'Every thread, with agent handoffs visible'], ['Agents and approvals', 'What agents did, and what needs a yes']];

export const SEL_LABELS: Record<string, string> = { nav: 'Navigation', kicker: 'Kicker', 'hero-title': 'Hero title', 'hero-sub': 'Hero subtitle', cta: 'Primary button', 'cta-2': 'Secondary button', widget: 'Chat widget', features: 'Features', footer: 'Footer' };

export const QUICK: Record<string, string[]> = {
  'hero-title': ['Make it bigger', 'Make it shorter', 'Make it smaller'],
  'hero-sub': ['Make it shorter', 'Friendlier tone'],
  cta: ['Make it solid', 'Change text to "Start free"'],
  kicker: ['Change text to "Built for landlords"'],
  widget: ['Add a greeting photo', 'Make it wider'],
  nav: ['Add a Log in link'],
  features: ['Add icons'],
  footer: ['Add social links'],
  'cta-2': ['Remove it'],
};

export const FULL_STEPS: [string, string][] = [
  ['Reading your request', 'Reading your request'],
  ['Planning agents: router + specialists', 'Deciding which agents you need'],
  ['Writing agents/*.ts', 'Setting up the router and its specialists'],
  ['Wiring tools and integrations', 'Connecting your tools'],
  ['Building app/page.tsx and chat widget', 'Designing the website'],
  ['Running 12 eval conversations — 12 passed', 'Testing with 12 practice conversations'],
];
export const EDIT_STEPS: [string, string][] = [
  ['Reading your request', 'Reading your request'],
  ['Updating agents', 'Updating the agents'],
  ['Editing app/page.tsx', 'Updating the website'],
  ['Re-running 12 evals — 12 passed', 'Re-testing with practice conversations'],
];

export const INTS: [string, string][] = [
  ['Slack', 'Agents post and answer in channels'],
  ['Gmail', 'Read and send email on your behalf'],
  ['Stripe', 'Balances, payment links, refunds'],
  ['Supabase', 'Database, auth and file storage'],
  ['Twilio', 'SMS and voice channels'],
  ['Google Calendar', 'Check availability and book'],
  ['Notion', 'Knowledge from your docs'],
  ['HubSpot', 'Contacts, deals and notes'],
  ['GitHub', "Sync your app's code both ways"],
];

export const KINDS: { id: string; label: string; icon: IconName; isNew?: boolean }[] = [
  { id: 'agent', label: 'Agent app', icon: 'bot' },
  { id: 'multi', label: 'Multi-agent', icon: 'network', isNew: true },
  { id: 'copilot', label: 'Copilot', icon: 'sparkles' },
  { id: 'workflow', label: 'Workflow', icon: 'workflow' },
  { id: 'website', label: 'Website', icon: 'globe' },
];

export const DS_GROUPS: [string, string[]][] = [['Open source', ['Shadcn', 'Material UI', 'Chakra', 'Radix']], ['Yours', ['Your brand', 'Architect default']]];
export const DS_DOTS: Record<string, string> = { Shadcn: '#e4e4e7', 'Material UI': '#1e88e5', Chakra: '#319795', Radix: '#6e56cf', 'Your brand': '#f59e0b', 'Architect default': '#2f8bff' };

export const ROUTER_TOOLS = new Set(['route_to', 'handoff_to_human']);

export const TOOL_INFO: Record<string, { sub: string; desc: string; icon: IconName }> = {
  route_to: { sub: 'Built-in', desc: 'Hands the conversation to a specialist agent.', icon: 'network' },
  handoff_to_human: { sub: 'Built-in', desc: 'Pages a person with a summary of the conversation.', icon: 'user' },
  create_work_order: { sub: 'Tool · Supabase', desc: 'Creates a row in the work_orders table with unit, issue, urgency and photos.', icon: 'wrench' },
  notify_vendor: { sub: 'Tool · Twilio SMS', desc: 'Texts the preferred vendor for the issue type and waits for a confirmed slot.', icon: 'wrench' },
  upload_photo: { sub: 'Tool · Storage', desc: 'Lets the tenant attach a photo of the problem.', icon: 'image' },
  'stripe.get_balance': { sub: 'Tool · Stripe', desc: "Reads an open balance, last payment and due date from Stripe.", icon: 'card' },
  'stripe.payment_link': { sub: 'Tool · Stripe', desc: 'Creates a one-time payment link for the open balance.', icon: 'card' },
  'stripe.refund': { sub: 'Tool · Stripe', desc: 'Issues a refund for a charge. Usually needs approval.', icon: 'card' },
  'lease_docs.search': { sub: 'Knowledge · 38 PDFs', desc: 'Searches signed leases by unit. Agents cite the clause they used.', icon: 'book' },
  book_viewing: { sub: 'Tool · Google Calendar', desc: "Finds free slots on the landlord's Google Calendar and books viewings.", icon: 'wrench' },
  web_search: { sub: 'Tool · Web', desc: 'Searches the web and returns ranked sources.', icon: 'search' },
  fetch_page: { sub: 'Tool · Web', desc: 'Fetches a page and extracts the readable text.', icon: 'globe' },
  fact_check: { sub: 'Tool · Model', desc: 'Cross-checks each claim against at least two sources.', icon: 'check' },
  draft_brief: { sub: 'Tool · Docs', desc: 'Writes the brief in your house style.', icon: 'file' },
  'notion.publish': { sub: 'Tool · Notion', desc: 'Publishes the finished brief to your Notion workspace.', icon: 'book' },
  'shopify.get_order': { sub: 'Tool · Shopify', desc: 'Looks up an order by number or email.', icon: 'card' },
  track_shipment: { sub: 'Tool · Shippo', desc: 'Returns the carrier status and ETA for a shipment.', icon: 'rocket' },
  create_return: { sub: 'Tool · Shopify', desc: 'Opens a return and emails a prepaid label.', icon: 'rotate' },
  'catalog.search': { sub: 'Tool · Shopify', desc: 'Searches products, sizes and stock levels.', icon: 'search' },
  'hubspot.upsert_contact': { sub: 'Tool · HubSpot', desc: 'Creates or updates the contact and adds notes.', icon: 'user' },
  score_lead: { sub: 'Tool · Model', desc: 'Scores fit against your ICP from 0 to 100.', icon: 'chart' },
  'calendar.book_call': { sub: 'Tool · Google Calendar', desc: 'Books a call on the right rep’s calendar.', icon: 'clock' },
  check_symptoms: { sub: 'Tool · Model', desc: 'Structures symptoms and flags anything urgent.', icon: 'activity' },
  verify_coverage: { sub: 'Tool · Availity', desc: 'Checks insurance eligibility and copay.', icon: 'shield' },
  book_appointment: { sub: 'Tool · Calendar', desc: 'Books the right practitioner at the right length.', icon: 'clock' },
  create_task: { sub: 'Tool · Database', desc: 'Creates and assigns a task.', icon: 'listTodo' },
  notify_team: { sub: 'Tool · Slack', desc: 'Posts an update to the right team channel.', icon: 'network' },
  'docs.search': { sub: 'Knowledge', desc: 'Searches your uploaded documents.', icon: 'book' },
  'slack.post_message': { sub: 'Tool · Slack', desc: 'Posts a message in a channel.', icon: 'network' },
};
export const toolInfo = (name: string) => TOOL_INFO[name] || { sub: 'Tool', desc: 'A custom tool.', icon: 'wrench' as IconName };

export const OUTPUTS: [OutKey, string, string][] = [
  ['text', 'Example replies', 'Show the agent sample conversations to copy the tone'],
  ['json', 'Structured output (JSON)', 'Return data in a fixed schema your app can read'],
  ['image', 'Images as output', 'Let the agent create or return images'],
  ['file', 'Files as output', 'Share results as PDF, CSV or DOCX downloads'],
];

export const FEATS: [string, string, string, IconName, string][] = [
  ['memory', 'Memory', 'Remembers each user across conversations', 'sparkles', '#a78bfa'],
  ['query', 'Data query', 'Reads your database tables to answer', 'database', '#60a5fa'],
  ['safety', 'Responsible AI', 'Blocks unsafe replies and personal data leaks', 'shield', '#34d399'],
  ['voice', 'Voice', 'Answers phone calls with a natural voice', 'mic', '#f59e0b'],
  ['context', 'Context', 'Adds fixed background info to every run', 'file', '#f472b6'],
  ['reflection', 'Self-check', 'Reviews its own answer before sending', 'check', '#22d3ee'],
];

export const CHANNELS: [string, string, IconName, string][] = [
  ['web', 'Website chat', 'globe', 'The chat widget on your site'],
  ['sms', 'SMS', 'phone', 'People text your Architect number'],
  ['slack', 'Slack', 'network', 'Answer in a Slack channel for your team'],
  ['api', 'API', 'code', 'Call this agent from any app'],
];

export const TOOL_LIBRARY = ['slack.post_message', 'web_search', 'fetch_page', 'create_task', 'notify_team', 'stripe.payment_link', 'calendar.book_call', 'docs.search'];
export const SKILL_LIBRARY = ['Web research', 'Document Q&A', 'Photo triage', 'Clause citation', 'Tone matching', 'Summarisation'];
export const KNOWLEDGE_LIBRARY = ['FAQ.docx', 'Policies.pdf', 'Price list.csv', 'Onboarding guide.pdf'];

export const RELEASES = [
  { v: '2.0', date: 'Sep 22, 2026', items: ['Multi-agent builder with visual agent graph', 'Simulation Engine: auto-written test scenarios', 'Improvement Engine: judge-scored fixes you approve', 'Drafts: try ideas without touching Main', 'GitAgent protocol (beta)'] },
  { v: '1.9', date: 'Aug 30, 2026', items: ['Select mode: batch visual edits for one credit', 'Live database tab with SQL editor', 'Bring your own model keys'] },
  { v: '1.8', date: 'Aug 4, 2026', items: ['SMS and Slack channels', 'Version history with one-click restore'] },
];

export const HELP_FAQ: [string, string][] = [
  ['What is a build credit?', 'One build step: writing a file, wiring a tool, running a batch of evals. A new agent app takes 15–25 credits; a batch of visual notes costs one.'],
  ['How do agents hand off?', 'A router agent reads each message and hands it to a specialist. Specialists can hand back, or page a person for anything sensitive.'],
  ['Can I edit the code?', 'Yes. Open the Code tab to read every file, run the terminal and add any selection to chat with ⌘L.'],
  ['What does publishing do?', 'It deploys the current version to yourname.architect.app with SSL. Drafts and later edits stay private until you publish again.'],
  ['Where is my data?', 'Each project gets its own Postgres database. Browse it in the Database tab or query it with SQL.'],
];
