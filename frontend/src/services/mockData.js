export const demoMetrics = [
  { label: 'Projects', value: '12', change: '+12%', note: 'demo data' },
  { label: 'Analyses', value: '28', change: '+8%', note: 'demo data' },
  { label: 'Quality score', value: '92%', change: '+4%', note: 'demo data' },
  { label: 'Failed checks', value: '07', change: '-3%', note: 'demo data' },
]

export const demoProjects = [
  {
    id: 'customer-core',
    name: 'Customer Core',
    description: 'Customer identity and account reference data.',
    dataset: 'customers_2025.csv',
    updated: 'Today, 09:42',
    score: 96,
    status: 'Healthy',
  },
  {
    id: 'commerce-events',
    name: 'Commerce Events',
    description: 'Order lifecycle events from digital channels.',
    dataset: 'orders_stream.parquet',
    updated: 'Yesterday, 16:18',
    score: 84,
    status: 'Needs review',
  },
  {
    id: 'finance-ledger',
    name: 'Finance Ledger',
    description: 'Monthly ledger exports for reconciliation.',
    dataset: 'ledger_q4.xlsx',
    updated: 'Oct 04, 11:06',
    score: 68,
    status: 'Failed',
  },
]

export const demoChecks = [
  { label: 'Passed', value: 126, color: 'pass' },
  { label: 'Warnings', value: 18, color: 'warning' },
  { label: 'Failed', value: 7, color: 'fail' },
]