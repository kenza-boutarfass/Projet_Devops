const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'

export function getStoredAuth() {
  try {
    const raw = localStorage.getItem('dq_auth')
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function setStoredAuth(authData) {
  try {
    localStorage.setItem('dq_auth', JSON.stringify(authData))
  } catch (err) {
    console.error('Failed to save auth to localStorage:', err)
  }
}

export function clearStoredAuth() {
  try {
    localStorage.removeItem('dq_auth')
  } catch (err) {
    console.error('Failed to clear auth:', err)
  }
}

export async function getHealth({ signal } = {}) {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/health`, {
    signal,
    headers: { Accept: 'application/json' },
  })

  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`)
  }

  return response.json()
}

export async function login({ email, password }) {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Login failed')
  }

  setStoredAuth({ token: data.token, user: data.user })
  return data
}

export async function register({ email, password, fullName, role }) {
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ email, password, fullName, role }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Registration failed')
  }

  setStoredAuth({ token: data.token, user: data.user })
  return data
}

export async function getMe() {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Not authenticated')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/auth/me`, {
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    clearStoredAuth()
    throw new Error(data.message || 'Session expired')
  }

  setStoredAuth({ token: auth.token, user: data.user })
  return data.user
}

export async function getProjects() {
  const auth = getStoredAuth()
  const headers = { Accept: 'application/json' }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects`, {
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch projects')
  }

  return data
}

export async function getProject(id) {
  const auth = getStoredAuth()
  const headers = { Accept: 'application/json' }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${id}`, {
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch project details')
  }

  return data
}

export async function createProject({ name, description, environment, datasetName }) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('You must be signed in to create a project')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ name, description, environment, datasetName }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to create project')
  }

  return data.project
}

export async function updateProject(id, updateData) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(updateData),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update project')
  }

  return data.project
}

export async function deleteProject(id) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${id}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete project')
  }

  return data
}

export async function getDatasets(projectId) {
  const auth = getStoredAuth()
  const headers = { Accept: 'application/json' }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/datasets`, {
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch datasets')
  }

  return data
}

export async function getDataset(projectId, datasetId) {
  const auth = getStoredAuth()
  const headers = { Accept: 'application/json' }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/datasets/${datasetId}`, {
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch dataset')
  }

  return data.dataset
}

export async function uploadDataset(projectId, formData) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/datasets/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/json',
    },
    body: formData,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Upload and profiling failed')
  }

  return data.dataset
}

export async function attachSampleDataset(projectId, sampleType = 'customers') {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/datasets/sample`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ sampleType }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to attach sample dataset')
  }

  return data.dataset
}

export async function getRules(projectId, status) {
  const auth = getStoredAuth()
  const headers = { Accept: 'application/json' }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const queryParam = status && status !== 'ALL' ? `?status=${status}` : ''
  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/rules${queryParam}`, {
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch rules')
  }

  return data
}

export async function discoverRules(projectId, datasetId) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/rules/discover`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ datasetId }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Rule discovery failed')
  }

  return data
}

export async function updateRuleStatus(projectId, ruleId, status) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/rules/${ruleId}/status`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ status }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to update rule status')
  }

  return data.rule
}

export async function deleteRule(projectId, ruleId) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/rules/${ruleId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      Accept: 'application/json',
    },
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to delete rule')
  }

  return data
}

export async function getContract(projectId) {
  const auth = getStoredAuth()
  const headers = { Accept: 'application/json' }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/contract`, {
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch contract')
  }

  return data
}

export async function generateContract(projectId, { datasetId, version = 'v1.0.0' } = {}) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/contract/generate`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ datasetId, version }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to generate contract')
  }

  return data
}

export async function getLatestValidation(projectId) {
  const auth = getStoredAuth()
  const headers = { Accept: 'application/json' }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/validation/latest`, {
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch latest validation')
  }

  return data
}

export async function getValidationRuns(projectId) {
  const auth = getStoredAuth()
  const headers = { Accept: 'application/json' }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/validation/runs`, {
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch validation history')
  }

  return data
}

export async function runValidation(projectId, { contractId, datasetId } = {}) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/validation/run`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ contractId, datasetId }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Validation execution failed')
  }

  return data
}

export async function getQualityReport(projectId) {
  const auth = getStoredAuth()
  const headers = { Accept: 'application/json' }
  if (auth?.token) {
    headers.Authorization = `Bearer ${auth.token}`
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/report`, {
    headers,
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch quality report')
  }

  return data
}

export async function submitProfessorFeedback(projectId, feedback) {
  const auth = getStoredAuth()
  if (!auth?.token) {
    throw new Error('Authentication required')
  }

  const response = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/projects/${projectId}/report/feedback`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${auth.token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify({ feedback }),
  })

  const data = await response.json()
  if (!response.ok) {
    throw new Error(data.message || 'Failed to submit review')
  }

  return data
}