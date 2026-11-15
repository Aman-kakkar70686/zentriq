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

// 1. Overview Metrics
export async function getOverviewMetrics(params = {}) {
  try {
    const res = await api.get('/evaluation/overview-metrics', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// 2. Benchmark Datasets
export async function listBenchmarkDatasets(params = {}) {
  try {
    const res = await api.get('/evaluation/benchmark-datasets', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function createBenchmarkDataset(payload) {
  try {
    const res = await api.post('/evaluation/benchmark-datasets', payload);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// 3. Benchmark Samples
export async function listBenchmarkSamples(params = {}) {
  try {
    const res = await api.get('/evaluation/benchmark-samples', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function getBenchmarkSample(sampleId) {
  try {
    const res = await api.get(`/evaluation/benchmark-samples/${sampleId}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function createBenchmarkSample(payload) {
  try {
    const res = await api.post('/evaluation/benchmark-samples', payload);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function updateBenchmarkSample(sampleId, payload) {
  try {
    const res = await api.patch(`/evaluation/benchmark-samples/${sampleId}`, payload);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function reviewBenchmarkSample(sampleId, payload) {
  try {
    const res = await api.post(`/evaluation/benchmark-samples/${sampleId}/review`, payload);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// 4. Evaluation Engine
export async function runEvaluation(payload) {
  try {
    const res = await api.post('/evaluation/run', payload, {
      headers: getAiHeaders(),
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// 5. Evaluation Runs
export async function listEvaluationRuns(params = {}) {
  try {
    const res = await api.get('/evaluation/runs', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function getEvaluationRunDetail(runId) {
  try {
    const res = await api.get(`/evaluation/runs/${runId}`);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function downloadRunCSV(runId, runKey = 'run') {
  try {
    const res = await api.get(`/evaluation/runs/${runId}/export-csv`, {
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zentriq-evaluation-${runKey}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// 6. Quality Analysis & AI Errors
export async function getQualityAnalysis(params = {}) {
  try {
    const res = await api.get('/evaluation/quality-analysis', { params });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function generatePromptRecommendations() {
  try {
    const res = await api.post('/evaluation/recommendations', {}, {
      headers: getAiHeaders(),
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// 7. Version Comparison
export async function compareRuns(runAId, runBId) {
  try {
    const res = await api.get('/evaluation/compare-runs', {
      params: { run_a_id: runAId, run_b_id: runBId },
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function listPromptVersions(operation = null) {
  try {
    const res = await api.get('/evaluation/prompt-versions', {
      params: operation ? { operation } : {},
    });
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function createPromptVersion(payload) {
  try {
    const res = await api.post('/evaluation/prompt-versions', payload);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

// 8. Showcase Presentation Builder
export async function getPresentation() {
  try {
    const res = await api.get('/evaluation/presentation');
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function updatePresentation(payload) {
  try {
    const res = await api.put('/evaluation/presentation', payload);
    return res.data;
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

export async function downloadPresentation(format = 'markdown') {
  try {
    const res = await api.get('/evaluation/presentation/export', {
      params: { format },
      responseType: 'blob',
    });
    const ext = format === 'json' ? 'json' : 'md';
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `zentriq-placement-presentation.${ext}`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  } catch (err) {
    throw new Error(errMsg(err));
  }
}

