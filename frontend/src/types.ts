export type Theme = 'dark' | 'light';
export type Exp = 'guided' | 'pro';
export type PlanId = 'free' | 'builder' | 'team';
export type Layout = 'Split' | 'Focus' | 'Studio';
export type StepState = 0 | 1 | 2;

export interface Step { l: [string, string]; st: StepState }
export interface CodeCtx { file: string; from: number; to: number; text: string }
export interface Note { id: string; target: string; text: string }

export interface Msg {
  id: string;
  role: 'user' | 'ai';
  text?: string;
  ctx?: CodeCtx[];
  notes?: Note[];
  attachments?: string[];
  steps?: Step[];
  version?: number;
  q?: { qi: number; picked: number | null; sel: number; custom?: string };
  plan?: string[];
  planPending?: boolean;
  summary?: { from: string; tokens: string; points: string[] };
  cta?: { label: string; to: 'pricing' | 'usage' };
  feedback?: 'up' | 'down';
  pending?: { kind: 'chat'; text: string };
}

export type OutKey = 'text' | 'json' | 'image' | 'file';

export interface Agent {
  id: string;
  name: string;
  kind: 'router' | 'specialist';
  model: string;
  role: string;
  goal: string;
  instructions: string;
  tools: { name: string; on: boolean }[];
  handoffs: string[];
  memory: boolean;
  temp: number;
  maxTok: number;
  out: Record<OutKey, boolean>;
  knowledge: string[];
  skills: string[];
  feats: Record<string, boolean>;
  sched: string[];
  keywords: string[];
  reply: string;
  runs: number;
}

export interface PV {
  kicker: string;
  title: string;
  sub: string;
  cta: string;
  size: number;
  ctaSolid: boolean;
  cta2Hidden: boolean;
  widgetWide: boolean;
  widgetAvatar: boolean;
  navLogin: boolean;
  featureIcons: boolean;
  footerSocial: boolean;
  accent: string | null;
  dark: boolean;
  features: [string, string, string][];
  greeting: string;
}

export interface Version { n: number; title: string; ts: number; meta: string; snap: { pv: PV; agents: Agent[] } }
export interface Draft { id: string; name: string; pv: PV | null }
export interface Chat { id: string; title: string; msgs: Msg[]; ts: number }
export interface Bubble { r: 'u' | 'a'; t: string; trace?: string }
export interface Table { desc: string; cols: [string, string][]; rows: string[][]; count: number }
export interface Invite { email: string; role: 'edit' | 'view' }
export interface Planning { prompt: string; answers: string[]; ready: boolean; notes: string[] }

export interface Project {
  id: string;
  name: string;
  templateId: string;
  status: 'Live' | 'Draft' | 'Paused';
  starred: boolean;
  shared: boolean;
  createdAt: number;
  updatedAt: number;
  viewedAt: number;
  msgs: Msg[];
  chatId: string;
  chatTitle: string | null;
  chats: Chat[];
  versions: Version[];
  current: number;
  pv: PV;
  agents: Agent[];
  chans: Record<string, boolean>;
  drafts: Draft[];
  draftId: string;
  draftN: number;
  widget: Bubble[];
  pg: Bubble[];
  db: Record<string, Table>;
  planning: Planning | null;
  palette: string;
  buildMode: 'lyzr' | 'gitagent';
  appReady: boolean;
  published: boolean;
  publishedAt: number | null;
  domain: string | null;
  invites: Invite[];
  linkAccess: 'off' | 'view' | 'edit';
  wsAccess: 'edit' | 'view' | 'none';
  psAgent: 'arch' | 'ds';
  spent: number;
}

export interface Secret { key: string; tail: string; used: string; ts: number }

export type SettingsTab = 'general' | 'appearance' | 'models' | 'integrations' | 'secrets' | 'usage';
export type ProjFilter = 'all' | 'starred' | 'recent' | 'shared';

export type Route =
  | { name: 'auth' }
  | { name: 'home' }
  | { name: 'projects'; filter: ProjFilter }
  | { name: 'settings'; tab: SettingsTab }
  | { name: 'pricing' }
  | { name: 'workspace'; pid: string }
  | { name: 'projectSettings'; pid: string; page: string }
  | { name: 'site'; pid: string; path: string };

export type WsTab = 'preview' | 'agents' | 'code' | 'database' | 'history';

export interface WsUi {
  pid: string | null;
  tab: WsTab;
  selectMode: boolean;
  hover: { id: string; r: Rect } | null;
  selected: { id: string; r: Rect } | null;
  notes: Note[];
  batchOpen: boolean;
  input: string;
  codeCtx: CodeCtx[];
  attachments: string[];
  planMode: boolean;
  paneHidden: boolean;
  focusThread: boolean;
  device: 'desktop' | 'mobile';
  sitePath: string;
  reloadKey: number;
  planOpen: boolean;
  planView: 'plan' | 'mockup';
  mockScreen: number;
  editAgent: string | null;
  edTab: 'build' | 'play' | 'deploy';
  agentSel: string;
  insp: 'config' | 'test';
  file: string;
  fsTab: 'files' | 'search';
  termTabs: string[];
  termTab: string;
  termOpen: boolean;
  termN: number;
  termHist: { t: string; k?: string }[];
  termCwd: string;
  dbView: 'tables' | 'sql' | 'auth';
  dbTable: string;
  sql: string;
  sqlResult: { cols: string[]; rows: string[][]; ms: number } | { error: string } | null;
  publishOpen: boolean;
  pubStep: 'config' | 'deploying' | 'live';
  deploy: number;
  shareOpen: boolean;
  agentChat: boolean;
}

export interface Rect { top: number; left: number; w: number; h: number }

export interface Confirm {
  title: string;
  body: string;
  confirmLabel: string;
  danger?: boolean;
  input?: { label: string; expect: string };
  onConfirm: () => void;
}

export interface UiState {
  route: Route;
  toast: { id: number; text: string; tone: 'ok' | 'warn' | 'err' } | null;
  building: Record<string, boolean>;
  typing: Record<string, string>;
  active: string[];
  palette: boolean;
  info: null | 'help' | 'release' | 'status';
  confirm: Confirm | null;
  ws: WsUi;
}

export interface AppState {
  v: number;
  signedIn: boolean;
  user: { name: string; email: string; workspace: string; region: string };
  /** Supabase auth user id once a real Google session has been synced; null for the simulated sign-in paths. */
  supabaseUserId: string | null;
  theme: Theme;
  exp: Exp;
  plan: PlanId;
  billing: 'monthly' | 'yearly';
  credits: number;
  codeModel: string;
  ds: string;
  ints: Record<string, boolean>;
  keys: Record<string, string>;
  secrets: Secret[];
  roleModels: { router: string; specialist: string; builder: string };
  layout: Layout;
  paneSide: 'left' | 'right';
  paneW: number | null;
  sound: boolean;
  projects: Project[];
  ui: UiState;
}
