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

const DEFAULT_OVERVIEW = {
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
      has_srs: true
    },
    {
      id: 2,
      name: 'VSLL Logistics Portal',
      description: 'Carrier management, rate card imports, and warehouse tracking telemetry.',
      progress: 29,
      status: 'At Risk',
      momentum: 'flat',
      momentum_label: 'Stable',
      note: '10 overdue tasks',
      end_date: '2026-12-05',
      tasks: 14,
      shipped: 4,
      overdue: 10,
      has_roadmap: true,
      has_proposal: true,
      has_srs: false
    }
  ],
  deadlines: [
    { id: 1, title: 'Customs documents', project: 'VSLL Logistics Portal', due_date: '2026-11-20', days: 3 },
    { id: 2, title: 'Rate card import', project: 'VSLL Logistics Portal', due_date: '2026-11-22', days: 5 },
    { id: 3, title: 'Razorpay Webhook verification', project: 'E-Commerce Platform', due_date: '2026-11-24', days: 7 }
  ],
  team: [
    { id: 1, name: 'Aman Kakkar', role: 'Product Manager', active_tasks: 3, capacity: 8, load: 'normal' },
    { id: 2, name: 'Rahul Sharma', role: 'Frontend Engineer', active_tasks: 7, capacity: 8, load: 'heavy' },
    { id: 3, name: 'Arjun Verma', role: 'QA Tester', active_tasks: 4, capacity: 8, load: 'normal' }
  ],
  activity: [
    { id: 1, user: 'Aman Kakkar', text: 'pushed updates to Custom Tree Roadmap', time: '15m ago' },
    { id: 2, user: 'Rahul Sharma', text: 'submitted Checkout Experience for review', time: '1h ago' },
    { id: 3, user: 'Arjun Verma', text: 'passed QA testing for Biometric Auth', time: '3h ago' }
  ],
  meeting: null
};

const DEFAULT_PROJECT_DETAIL = {
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
  }
};

const DEFAULT_TEAM_WORKSPACE = {
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

  // 3. Projects List & Details
  if (url.includes('/projects/')) {
    const id = parseInt(url.split('/projects/')[1], 10) || 1;
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

  // 4. Team Workspace
  if (url.includes('/team/workspace')) {
    return ok(DEFAULT_TEAM_WORKSPACE);
  }

  if (url.includes('/team/capacity')) {
    return ok(DEFAULT_OVERVIEW.team);
  }

  // 5. Tasks & Sprints
  if (url.includes('/tasks')) {
    return ok([]);
  }

  // 6. Generic safe fallback for all other API calls
  return ok({ success: true, message: 'Cloud Demo Mode Active' });
}
