import api, { errMsg } from './client';
import { getStoredGeminiKey } from './ai';

function getAiHeaders() {
  const customKey = getStoredGeminiKey();
  const headers = {};
  if (customKey) {
    headers['X-Gemini-Key'] = customKey;
  }
  return headers;
}

// ==============================================================================
// GENERATION OPERATIONS
// ==============================================================================

export async function generateUserStories(payload) {
  try {
    const res = await api.post('/stories-qa/generate-user-stories', payload, {
      headers: getAiHeaders(),
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function generateAcceptanceCriteria(payload) {
  try {
    const res = await api.post('/stories-qa/generate-acceptance-criteria', payload, {
      headers: getAiHeaders(),
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function generateEdgeCases(payload) {
  try {
    const res = await api.post('/stories-qa/generate-edge-cases', payload, {
      headers: getAiHeaders(),
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function generateQATestCases(payload) {
  try {
    const res = await api.post('/stories-qa/generate-qa-test-cases', payload, {
      headers: getAiHeaders(),
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function validateArtifact(payload) {
  try {
    const res = await api.post('/stories-qa/validate-artifact', payload, {
      headers: getAiHeaders(),
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// ==============================================================================
// USER STORIES CRUD & CONVERSION
// ==============================================================================

export async function listUserStories(params = {}) {
  try {
    const res = await api.get('/stories-qa/user-stories', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function getUserStory(id) {
  try {
    const res = await api.get(`/stories-qa/user-stories/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function updateUserStory(id, patch) {
  try {
    const res = await api.patch(`/stories-qa/user-stories/${id}`, patch);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function deleteUserStory(id) {
  try {
    const res = await api.delete(`/stories-qa/user-stories/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function convertStoryToTask(id) {
  try {
    const res = await api.post(`/stories-qa/user-stories/${id}/convert-to-task`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// ==============================================================================
// ACCEPTANCE CRITERIA CRUD
// ==============================================================================

export async function listAcceptanceCriteria(params = {}) {
  try {
    const res = await api.get('/stories-qa/acceptance-criteria', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function updateAcceptanceCriterion(id, patch) {
  try {
    const res = await api.patch(`/stories-qa/acceptance-criteria/${id}`, patch);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function bulkReviewCriteria(payload) {
  try {
    const res = await api.post('/stories-qa/acceptance-criteria/bulk-review', payload);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function deleteAcceptanceCriterion(id) {
  try {
    const res = await api.delete(`/stories-qa/acceptance-criteria/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// ==============================================================================
// EDGE CASES CRUD
// ==============================================================================

export async function listEdgeCases(params = {}) {
  try {
    const res = await api.get('/stories-qa/edge-cases', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function updateEdgeCase(id, patch) {
  try {
    const res = await api.patch(`/stories-qa/edge-cases/${id}`, patch);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function deleteEdgeCase(id) {
  try {
    const res = await api.delete(`/stories-qa/edge-cases/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// ==============================================================================
// QA TEST CASES CRUD & EXPORT
// ==============================================================================

export async function listQATestCases(params = {}) {
  try {
    const res = await api.get('/stories-qa/qa-test-cases', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function updateQATestCase(id, patch) {
  try {
    const res = await api.patch(`/stories-qa/qa-test-cases/${id}`, patch);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function deleteQATestCase(id) {
  try {
    const res = await api.delete(`/stories-qa/qa-test-cases/${id}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export function getExportCSVUrl(projectId = null, prdId = null) {
  const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
  const url = new URL(`${baseURL}/stories-qa/qa-test-cases/export-csv`);
  if (projectId) url.searchParams.set('project_id', projectId);
  if (prdId) url.searchParams.set('prd_id', prdId);
  return url.toString();
}

// ==============================================================================
// OVERVIEW METRICS & TRACEABILITY MATRIX
// ==============================================================================

export async function getOverviewMetrics(params = {}) {
  try {
    const res = await api.get('/stories-qa/overview-metrics', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function getTraceabilityMatrix(params = {}) {
  try {
    const res = await api.get('/stories-qa/traceability-matrix', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

