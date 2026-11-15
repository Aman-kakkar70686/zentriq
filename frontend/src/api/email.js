import api, { errMsg } from './client';

/**
 * Send a direct email from Zentriq
 * @param {Object} payload - { to, cc, subject, message, email_type, project_id, related_task_id, related_meeting_id }
 */
export async function sendDirectEmail(payload) {
  try {
    const res = await api.post('/emails/send', payload);
    return res.data;
  } catch (error) {
    throw new Error(errMsg(error));
  }
}

/**
 * Fetch high-level email performance metrics
 */
export async function getEmailMetrics() {
  try {
    const res = await api.get('/emails/metrics');
    return res.data;
  } catch (error) {
    throw new Error(errMsg(error));
  }
}

/**
 * List email audit logs with filtering and search
 * @param {Object} params - { search, email_type, delivery_status, project_id, limit, offset }
 */
export async function getEmailLogs(params = {}) {
  try {
    const res = await api.get('/emails/logs', { params });
    return res.data;
  } catch (error) {
    throw new Error(errMsg(error));
  }
}

/**
 * Get detailed log entry with full rendered HTML body
 * @param {string} logId
 */
export async function getEmailLogDetail(logId) {
  try {
    const res = await api.get(`/emails/logs/${logId}`);
    return res.data;
  } catch (error) {
    throw new Error(errMsg(error));
  }
}

/**
 * Retry sending a failed email
 * @param {string} logId
 */
export async function retryEmailLog(logId) {
  try {
    const res = await api.post(`/emails/logs/${logId}/retry`);
    return res.data;
  } catch (error) {
    throw new Error(errMsg(error));
  }
}

/**
 * Fetch directory of valid team recipients for autocomplete
 */
export async function getEmailRecipients() {
  try {
    const res = await api.get('/emails/recipients');
    return res.data;
  } catch (error) {
    throw new Error(errMsg(error));
  }
}

/**
 * Get current user notification & email preferences
 */
export async function getEmailPreferences() {
  try {
    const res = await api.get('/emails/preferences');
    return res.data;
  } catch (error) {
    throw new Error(errMsg(error));
  }
}

/**
 * Update current user email preferences
 * @param {Object} preferences
 */
export async function updateEmailPreferences(preferences) {
  try {
    const res = await api.put('/emails/preferences', preferences);
    return res.data;
  } catch (error) {
    throw new Error(errMsg(error));
  }
}

