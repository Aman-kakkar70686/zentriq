// Fallback interactive data engine for Zentriq Vercel Cloud Deployment
// Automatically activates when the backend server is offline or unreachable

const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem('pf_user')) || {
      id: 1,
      name: 'Aman Kakkar',
      email: 'amankakkar70686@gmail.com',
      role: 'Product Manager'
    };
  } catch {
    return { id: 1, name: 'Aman Kakkar', email: 'amankakkar70686@gmail.com', role: 'Product Manager' };
  }
};

export const DEFAULT_USERS = [
  { id: 1, name: 'Aman Kakkar', email: 'amankakkar70686@gmail.com', role: 'Product Manager' },
  { id: 2, name: 'Rahul Sharma', email: 'rahul@zentriq.dev', role: 'Frontend Engineer' },
  { id: 3, name: 'Arjun Verma', email: 'arjun@zentriq.dev', role: 'QA Lead' },
  { id: 4, name: 'Sarah Chen', email: 'sarah@zentriq.dev', role: 'Backend Lead' },
  { id: 5, name: 'David Kim', email: 'david@zentriq.dev', role: 'DevOps Engineer' }
];

export const DEFAULT_TASKS = [
  {
    id: 1,
    title: '1-Click Biometric Auth Flow',
    description: 'Implement biometric WebAuthn credentials login and FaceID/TouchID prompt for zero-friction sign-in.',
    status: 'shipped',
    priority: 'high',
    due_date: '2026-11-10',
    project_id: 1,
    project: 'E-Commerce Platform',
    assignee_id: 1,
    assignee: 'Aman Kakkar',
    assignee_email: 'amankakkar70686@gmail.com',
    is_blocked: false,
    blocked_reason: null,
    blocked_days: 0,
    task_type: 'feature',
    qa_status: 'passed',
    bug_severity: null
  },
  {
    id: 2,
    title: 'Shipment Tracking UI',
    description: 'Real-time telemetry map tracking integration with live courier GPS coordinates.',
    status: 'building',
    priority: 'high',
    due_date: '2026-11-20',
    project_id: 2,
    project: 'VSLL Logistics Portal',
    assignee_id: 2,
    assignee: 'Rahul Sharma',
    assignee_email: 'rahul@zentriq.dev',
    is_blocked: true,
    blocked_reason: 'Carrier Telemetry API credentials',
    blocked_days: 3,
    task_type: 'feature',
    qa_status: null,
    bug_severity: null
  },
  {
    id: 3,
    title: 'Notification Strategy',
    description: 'Multi-channel notification engine routing SMS, WhatsApp and Email alerts for critical events.',
    status: 'review',
    priority: 'medium',
    due_date: '2026-11-22',
    project_id: 1,
    project: 'E-Commerce Platform',
    assignee_id: 4,
    assignee: 'Sarah Chen',
    assignee_email: 'sarah@zentriq.dev',
    is_blocked: false,
    blocked_reason: null,
    blocked_days: 0,
    task_type: 'feature',
    qa_status: null,
    bug_severity: null
  },
  {
    id: 4,
    title: 'Elasticsearch Catalog Indexer',
    description: 'Zero-downtime cluster reindexing and autocomplete token generation for store products.',
    status: 'building',
    priority: 'high',
    due_date: '2026-11-24',
    project_id: 1,
    project: 'E-Commerce Platform',
    assignee_id: 5,
    assignee: 'David Kim',
    assignee_email: 'david@zentriq.dev',
    is_blocked: false,
    blocked_reason: null,
    blocked_days: 0,
    task_type: 'feature',
    qa_status: null,
    bug_severity: null
  },
  {
    id: 5,
    title: 'Stripe & Razorpay Payment Webhooks',
    description: 'Verify HMAC signatures and automate order fulfillment state transitions upon payment receipt.',
    status: 'planned',
    priority: 'high',
    due_date: '2026-11-25',
    project_id: 1,
    project: 'E-Commerce Platform',
    assignee_id: 1,
    assignee: 'Aman Kakkar',
    assignee_email: 'amankakkar70686@gmail.com',
    is_blocked: false,
    blocked_reason: null,
    blocked_days: 0,
    task_type: 'feature',
    qa_status: null,
    bug_severity: null
  },
  {
    id: 6,
    title: 'Automated GST Invoice PDF Generation',
    description: 'Create compliant multi-state GST tax invoices as downloadable PDFs after successful checkout.',
    status: 'ideas',
    priority: 'low',
    due_date: '2026-11-30',
    project_id: 1,
    project: 'E-Commerce Platform',
    assignee_id: 4,
    assignee: 'Sarah Chen',
    assignee_email: 'sarah@zentriq.dev',
    is_blocked: false,
    blocked_reason: null,
    blocked_days: 0,
    task_type: 'feature',
    qa_status: null,
    bug_severity: null
  }
];

export const DEFAULT_MEETINGS = [
  {
    id: 1,
    title: 'Weekly Sprint Sync & Release Review',
    starts_at: new Date(Date.now() + 3600000).toISOString(),
    participants: 4,
    location: 'In-App Video Room',
    teams_link: 'https://meet.jit.si/zentriq-room-weekly-sync',
    status: 'scheduled',
    attendees: [
      { id: 1, name: 'Aman Kakkar', email: 'amankakkar70686@gmail.com' },
      { id: 2, name: 'Rahul Sharma', email: 'rahul@zentriq.dev' },
      { id: 3, name: 'Arjun Verma', email: 'arjun@zentriq.dev' },
      { id: 4, name: 'Sarah Chen', email: 'sarah@zentriq.dev' }
    ],
    agenda: 'Review sprint deliverables, unblock telemetry API, and verify Vercel cloud deployment.'
  }
];

export const DEFAULT_OVERVIEW = {
  me: { id: 1, name: 'Aman Kakkar', email: 'amankakkar70686@gmail.com' },
  metrics: { decisions: 2, blockers: 1, deadlines: 4, active_tasks: 7 },
  next_best_action: {
    kind: 'decision',
    title: 'Checkout Experience Decision',
    text: 'Rahul proposed: Email + WhatsApp vs Email only. Waiting for your review.',
    action: 'Review decision',
    target: { type: 'decision', id: 1 }
  },
  focus: [
    {
      id: 'task-1',
      kind: 'decision',
      ref: 1,
      title: 'Checkout Experience',
      project: 'E-Commerce Platform',
      context: 'Rahul proposed: Email + WhatsApp vs Email only',
      action: 'Review decision'
    },
    {
      id: 'task-2',
      kind: 'blocked',
      ref: 2,
      title: 'Shipment Tracking UI',
      project: 'VSLL Logistics Portal',
      context: 'Blocked by Carrier Telemetry API for 3 days',
      action: 'Open task'
    },
    {
      id: 'task-3',
      kind: 'review',
      ref: 3,
      title: 'Notification Strategy',
      project: 'E-Commerce Platform',
      context: 'Multi-channel SMS vs Push notifications ready for approval',
      action: 'Review'
    },
    {
      id: 'task-4',
      kind: 'moving',
      ref: 1,
      title: 'E-Commerce Platform Core',
      project: 'E-Commerce Platform',
      context: '6 tasks completed today. Target velocity accelerating',
      action: 'View progress'
    }
  ],
  decisions: [
    {
      id: 1,
      title: 'Checkout Experience',
      question: 'Should we support WhatsApp notifications along with Email?',
      options: ['Email only', 'Email + WhatsApp'],
      project: 'E-Commerce Platform'
    },
    {
      id: 2,
      title: 'API Architecture',
      question: 'REST vs GraphQL for mobile apps?',
      options: ['REST API', 'GraphQL'],
      project: 'E-Commerce Platform'
    }
  ],
  flow: [
    { key: 'ideas', label: 'Ideas', count: 1 },
    { key: 'planned', label: 'Planned', count: 5 },
    { key: 'building', label: 'Building', count: 11 },
    { key: 'review', label: 'Review', count: 2 },
    { key: 'ready', label: 'Ready', count: 2 },
    { key: 'shipped', label: 'Shipped', count: 13 }
  ],
  bottleneck: 'Building',
  projects: [
    {
      id: 1,
      name: 'E-Commerce Platform',
      description: 'Online store with checkout, payments, and multi-vendor catalogue.',
      progress: 50,
      status: 'At Risk',
      momentum: 'up',
      momentum_label: 'Accelerating',
      note: '5 overdue tasks',
      end_date: '2026-11-28',
      tasks: 12,
      shipped: 6,
      overdue: 5,
      has_roadmap: true,
      has_proposal: true,
      has_srs: true,
      members: [
        { id: 1, name: 'Aman Kakkar', role: 'Product Manager' },
        { id: 2, name: 'Rahul Sharma', role: 'Frontend Engineer' },
        { id: 3, name: 'Arjun Verma', role: 'QA Lead' }
      ]
    },
    {
      id: 2,
      name: 'VSLL Logistics Portal',
      description: 'Fleet tracking, driver assignments, rate cards, and route planning.',
      progress: 35,
      status: 'On Track',
      momentum: 'flat',
      momentum_label: 'Stable',
      note: '4 tasks completed this week',
      end_date: '2026-12-15',
      tasks: 20,
      shipped: 7,
      overdue: 10,
      has_roadmap: true,
      has_proposal: true,
      has_srs: false,
      members: [
        { id: 1, name: 'Aman Kakkar', role: 'Product Manager' },
        { id: 4, name: 'Sarah Chen', role: 'Backend Lead' }
      ]
    }
  ],
  deadlines: [
    { id: 1, title: 'Carrier Telemetry API unblock', project: 'VSLL Logistics Portal', due_date: '2026-11-20', days: 3 },
    { id: 2, title: 'Rate card import', project: 'VSLL Logistics Portal', due_date: '2026-11-22', days: 5 },
    { id: 3, title: 'Razorpay Webhook verification', project: 'E-Commerce Platform', due_date: '2026-11-24', days: 7 }
  ],
  team: {
    members: [
      { id: 1, name: 'Aman Kakkar', count: 3, dots: ['active', 'active', 'review'] },
      { id: 2, name: 'Rahul Sharma', count: 7, dots: ['blocked', 'active', 'active', 'review'] },
      { id: 3, name: 'Arjun Verma', count: 4, dots: ['active', 'upcoming'] }
    ],
    signal: { level: 'ok', text: 'Team capacity looks healthy' },
    limit: 8
  },
  activity: [
    {
      id: 1,
      kind: 'updated',
      actor: 'Aman Kakkar',
      action: 'updated',
      subject: 'Custom Tree Roadmap',
      detail: 'with organic branches',
      created_at: new Date(Date.now() - 15 * 60000).toISOString()
    },
    {
      id: 2,
      kind: 'review',
      actor: 'Rahul Sharma',
      action: 'submitted',
      subject: 'Checkout Experience',
      detail: 'for decision review',
      created_at: new Date(Date.now() - 60 * 60000).toISOString()
    },
    {
      id: 3,
      kind: 'completed',
      actor: 'Arjun Verma',
      action: 'passed QA testing for',
      subject: '1-Click Biometric Auth Flow',
      detail: 'on staging environment',
      created_at: new Date(Date.now() - 180 * 60000).toISOString()
    }
  ],
  meeting: null
};

export const DEFAULT_PROJECT_DETAIL = {
  id: 1,
  name: 'E-Commerce Platform',
  description: 'Online store with checkout, payments, and multi-vendor catalogue.',
  status: 'active',
  progress: 50,
  start_date: '2026-08-24',
  end_date: '2026-11-28',
  tasks: 12,
  shipped_tasks: 6,
  has_roadmap: true,
  has_proposal: true,
  has_srs: true,
  members: [
    { id: 1, name: 'Aman Kakkar', role: 'Product Manager', email: 'aman@zentriq.dev' },
    { id: 2, name: 'Rahul Sharma', role: 'Frontend Engineer', email: 'rahul@zentriq.dev' },
    { id: 3, name: 'Arjun Verma', role: 'QA Lead', email: 'arjun@zentriq.dev' },
    { id: 4, name: 'Sarah Chen', role: 'Backend Lead', email: 'sarah@zentriq.dev' },
    { id: 5, name: 'David Kim', role: 'DevOps Engineer', email: 'david@zentriq.dev' }
  ],
  proposal: {
    title: 'E-Commerce Platform Project Proposal',
    executive_summary: 'Full-stack enterprise e-commerce platform with multi-vendor support, automated GST invoicing, and real-time carrier telemetry tracking.',
    target_audience: 'B2B & B2C enterprise retailers in Indian and global markets.',
    tech_stack: ['React', 'Vite', 'Tailwind CSS', 'FastAPI', 'PostgreSQL / SQLite', 'Vercel'],
    key_deliverables: [
      'JWT and 1-Click Biometric Auth Flow',
      'Elasticsearch Catalog & Dynamic Filters',
      'Stripe & Razorpay Payment Integration',
      'Automated GST Invoices & Logistics Dispatch'
    ]
  },
  srs: {
    title: 'Software Requirements Specification (SRS) v2.4',
    scope: 'Covers end-to-end functional specifications, authentication protocols, security standards, and sprint milestones.',
    functional_requirements: [
      'FR-1: User authentication via JWT with refresh token rotation.',
      'FR-2: Product search with faceted filtering under 150ms latency.',
      'FR-3: Secure checkout gateway handling multi-currency and webhooks.',
      'FR-4: Real-time inventory deduction and order state machines.'
    ]
  },
  roadmap_tree: {
    branches: [
      { id: 'limb-1', title: 'Core Architecture & Auth', status: 'shipped', assignee: 'Aman Kakkar', priority: 'high' },
      { id: 'limb-2', title: 'Product Catalog & Search', status: 'building', assignee: 'David Kim', priority: 'high' },
      { id: 'limb-3', title: 'Payment & Checkout Engine', status: 'planned', assignee: 'Aman Kakkar', priority: 'high' },
      { id: 'limb-4', title: 'Fulfillment & Logistics', status: 'planned', assignee: 'Sarah Chen', priority: 'medium' },
      { id: 'limb-5', title: 'AI Intelligence & Growth', status: 'ideas', assignee: 'Arjun Verma', priority: 'medium' }
    ]
  },
  task_list: DEFAULT_TASKS
};

export const DEFAULT_TEAM_WORKSPACE = {
  overview: {
    total_members: 6,
    active_now: 4,
    bottlenecks: 1,
    velocity_score: 94
  },
  members: [
    { id: 1, name: 'Aman Kakkar', role: 'Product Manager', email: 'amankakkar70686@gmail.com', tasks_assigned: 3, completed: 8, status: 'Active' },
    { id: 2, name: 'Rahul Sharma', role: 'Frontend Engineer', email: 'rahul@zentriq.dev', tasks_assigned: 7, completed: 14, status: 'Heavy' },
    { id: 3, name: 'Arjun Verma', role: 'QA Lead', email: 'arjun@zentriq.dev', tasks_assigned: 4, completed: 11, status: 'Active' },
    { id: 4, name: 'Sarah Chen', role: 'Backend Lead', email: 'sarah@zentriq.dev', tasks_assigned: 5, completed: 19, status: 'Active' }
  ],
  workload: {
    blocked_tasks: [
      { id: 1, title: 'Shipment Tracking UI', assignee: 'Rahul Sharma', project: 'VSLL Logistics Portal', reason: 'Waiting for Telemetry API credentials' }
    ]
  },
  github: {
    is_connected: true,
    repository: 'Aman-kakkar70686/zentriq',
    last_sync: 'Just now',
    recent_commits: [
      { sha: '6e48d5e', message: 'fix(cors): allow vercel domains and add Procfile', author: 'Aman Kakkar', time: '10m ago' },
      { sha: '2a08ef0', message: 'feat: fast voice interaction with hover task narration', author: 'Aman Kakkar', time: '1h ago' },
      { sha: 'aeb263a', message: 'feat: compact project header and fancy focus modal', author: 'Aman Kakkar', time: '2h ago' }
    ]
  },
  qa: {
    bugs_awaiting_fixes: []
  }
};

export function handleMockRequest(config) {
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  // Helper to package mock Axios response
  const ok = (data) => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config
  });

  // 1. Auth: Login & Register
  if (url.includes('/auth/login') || url.includes('/auth/register')) {
    let body = {};
    try {
      body = typeof config.data === 'string' ? JSON.parse(config.data) : (config.data || {});
    } catch {
      body = {};
    }

    const userName = body.name || (body.email ? body.email.split('@')[0].replace(/[._]/g, ' ') : 'Aman Kakkar');
    const userEmail = body.email || 'amankakkar70686@gmail.com';

    const userObj = {
      id: Math.floor(Math.random() * 1000) + 1,
      name: userName.charAt(0).toUpperCase() + userName.slice(1),
      email: userEmail,
      role: 'Product Manager'
    };

    return ok({
      access_token: `zentriq-cloud-token-${Date.now()}`,
      token_type: 'bearer',
      user: userObj
    });
  }

  // 2. Dashboard Overview
  if (url.includes('/dashboard/overview')) {
    const u = getStoredUser();
    return ok({
      ...DEFAULT_OVERVIEW,
      me: { id: u.id || 1, name: u.name || 'Aman Kakkar', email: u.email || 'amankakkar70686@gmail.com' }
    });
  }

  // 3. Users List
  if (url.includes('/users')) {
    return ok(DEFAULT_USERS);
  }

  // 4. Projects List & Details
  if (url.includes('/projects/')) {
    const parts = url.split('/projects/')[1] || '';
    const id = parseInt(parts.split('/')[0], 10) || 1;
    if (parts.includes('/members')) {
      return ok(DEFAULT_PROJECT_DETAIL.members);
    }
    return ok({
      ...DEFAULT_PROJECT_DETAIL,
      id
    });
  }

  if (url.endsWith('/projects') || url.includes('/projects?')) {
    if (method === 'post') {
      let body = {};
      try { body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data; } catch {}
      return ok({
        ...DEFAULT_PROJECT_DETAIL,
        id: Date.now(),
        name: body.name || 'New Project'
      });
    }
    return ok(DEFAULT_OVERVIEW.projects);
  }

  // 5. Team Workspace & Capacity
  if (url.includes('/team/workspace')) {
    return ok(DEFAULT_TEAM_WORKSPACE);
  }

  if (url.includes('/team/capacity')) {
    return ok(DEFAULT_OVERVIEW.team);
  }

  if (url.includes('/team/github/activity')) {
    return ok(DEFAULT_TEAM_WORKSPACE.github);
  }

  // 6. Meetings
  if (url.includes('/meetings')) {
    if (method === 'post') {
      return ok({ success: true, message: 'Meeting scheduled successfully' });
    }
    return ok(DEFAULT_MEETINGS);
  }

  // 7. Activity
  if (url.includes('/activity')) {
    return ok(DEFAULT_OVERVIEW.activity);
  }

  // 8. Decisions
  if (url.includes('/decisions/')) {
    const id = parseInt(url.split('/decisions/')[1], 10) || 1;
    const match = DEFAULT_OVERVIEW.decisions.find((d) => d.id === id) || DEFAULT_OVERVIEW.decisions[0];
    return ok(match);
  }

  if (url.includes('/decisions')) {
    return ok(DEFAULT_OVERVIEW.decisions);
  }

  // 9. Tasks & Sprints
  if (url.includes('/tasks/')) {
    const parts = url.split('/tasks/')[1] || '';
    const id = parseInt(parts.split('/')[0], 10) || 1;
    // Action endpoints e.g. /tasks/1/advance, /tasks/1/resolve, /tasks/1/snooze
    if (parts.includes('/')) {
      return ok({ success: true, message: 'Task updated successfully' });
    }
    const match = DEFAULT_TASKS.find((t) => t.id === id) || DEFAULT_TASKS[0];
    return ok(match);
  }

  if (url.includes('/tasks')) {
    if (method === 'post') {
      let body = {};
      try { body = typeof config.data === 'string' ? JSON.parse(config.data) : config.data; } catch {}
      const newTask = {
        id: Date.now(),
        title: body.title || 'New Task',
        description: body.description || '',
        status: body.status || 'planned',
        priority: body.priority || 'medium',
        due_date: body.due_date || '2026-11-28',
        project: 'E-Commerce Platform',
        project_id: body.project_id || 1,
        assignee: 'Aman Kakkar',
        assignee_id: 1,
        assignee_email: 'amankakkar70686@gmail.com',
        is_blocked: false,
        blocked_reason: null,
        blocked_days: 0,
        task_type: body.task_type || 'feature'
      };
      return ok(newTask);
    }
    return ok(DEFAULT_TASKS);
  }

  // 10. Email & Notification Center
  if (url.includes('/emails/recipients')) {
    return ok({ recipients: DEFAULT_USERS });
  }

  if (url.includes('/emails/metrics')) {
    return ok({ sent: 24, delivered: 24, failed: 0 });
  }

  if (url.includes('/emails/logs')) {
    return ok({ logs: [], total: 0 });
  }

  if (url.includes('/emails')) {
    return ok({ success: true, message: 'Email action executed successfully' });
  }

  // 11. Generic safe fallback for all other API calls
  return ok({ success: true, message: 'Cloud Demo Mode Active' });
}
