import type { Job } from '@/types/domain'

export const seedJobs: Array<Omit<Job, 'id' | 'createdAt' | 'updatedAt'>> = [
  {
    slug: 'frontend-engineer',
    title: 'Frontend Engineer',
    shortDescription: 'Build delightful, accessible UIs with React and TypeScript.',
    longDescription:
      'As a Frontend Engineer you will own a customer-facing web app end-to-end — architecture, state management, accessibility, performance, and testing. You collaborate closely with design and backend, and you write code that other engineers enjoy reading.',
    level: 'mid',
    competencies: ['React', 'TypeScript', 'Accessibility (a11y)', 'State management', 'Testing', 'Performance'],
    questionPack: [
      { id: 'fe-tech-typed-forms', category: 'technical', prompt: 'Walk me through how you would build a type-safe form with validation.' },
      { id: 'fe-tech-state-boundaries', category: 'technical', prompt: 'How do you decide between client state, server state, and URL state?' },
      { id: 'fe-tech-a11y-audit', category: 'technical', prompt: 'How would you audit an existing page for accessibility issues, and what would you fix first?' },
      { id: 'fe-tech-perf-tti', category: 'technical', prompt: "Time-to-interactive is too slow. Walk me through how you'd diagnose and improve it." },
      { id: 'fe-behav-designer-conflict', category: 'behavioral', prompt: 'Tell me about a time you disagreed with a designer — how did you resolve it?' },
      { id: 'fe-behav-ownership', category: 'behavioral', prompt: 'Describe a frontend project you owned end-to-end. What did you ship, and what did you learn?' },
    ],
  },
  {
    slug: 'backend-engineer',
    title: 'Backend Engineer',
    shortDescription: 'Design and ship reliable APIs and data systems at scale.',
    longDescription:
      'You own core services that power our product. You think about correctness, observability, and operational excellence. You are comfortable choosing between SQL and NoSQL, writing migrations without downtime, and defining clean API contracts.',
    level: 'senior',
    competencies: ['API design', 'Databases & SQL', 'Distributed systems', 'Observability', 'Security', 'Testing'],
    questionPack: [
      { id: 'be-sys-url-shortener', category: 'system-design', prompt: 'Design a URL shortener that handles 10k writes/sec.' },
      { id: 'be-sys-rate-limit', category: 'system-design', prompt: 'Design a distributed rate limiter for a public API.' },
      { id: 'be-tech-zero-downtime-mig', category: 'technical', prompt: 'How would you add a NOT NULL column to a 200M-row table without downtime?' },
      { id: 'be-tech-api-versioning', category: 'technical', prompt: 'How do you version a public REST API when you need to make a breaking change?' },
      { id: 'be-behav-incident', category: 'behavioral', prompt: 'Describe a production incident you led to resolution.' },
      { id: 'be-behav-tradeoff', category: 'behavioral', prompt: 'Tell me about a technical tradeoff you made under time pressure.' },
    ],
  },
  {
    slug: 'product-manager',
    title: 'Product Manager',
    shortDescription: 'Drive product strategy and delivery for a B2B SaaS surface.',
    longDescription:
      'You define the roadmap, talk to customers weekly, write crisp specs, and partner with engineering and design from discovery to launch. You balance vision with rigor: metrics, experiments, and hard prioritization calls.',
    level: 'mid',
    competencies: ['Discovery', 'Prioritization', 'Roadmapping', 'Metrics & analytics', 'Stakeholder communication', 'Execution'],
    questionPack: [
      { id: 'pm-sit-feature-slip', category: 'situational', prompt: 'Your engineering lead says a committed feature will slip by 4 weeks. Walk me through what you do.' },
      { id: 'pm-sit-competing-asks', category: 'situational', prompt: 'Sales wants feature A, CS wants feature B, and engineering has capacity for one. How do you decide?' },
      { id: 'pm-behav-wrong-decision', category: 'behavioral', prompt: 'Tell me about a product decision you made that turned out to be wrong.' },
      { id: 'pm-behav-discovery', category: 'behavioral', prompt: 'Walk me through your last customer-discovery cycle. How did it shape what you built?' },
      { id: 'pm-tech-ab-vs-ship', category: 'technical', prompt: 'How do you decide whether to A/B test a change vs. ship to 100%?' },
      { id: 'pm-tech-north-star', category: 'technical', prompt: 'How do you pick a north-star metric for a new product surface?' },
    ],
  },
]
