import { useState } from 'react';
import { AlertCircle, Check, X } from 'lucide-react';

export default function EditArtifactModal({
  isOpen,
  onClose,
  artifactType, // 'user_story' | 'acceptance_criteria' | 'edge_case' | 'qa_test_case'
  artifact,
  onSave,
}) {
  if (!isOpen || !artifact) return null;

  const [formData, setFormData] = useState(() => {
    if (artifactType === 'user_story') {
      return {
        title: artifact.title || '',
        user_role: artifact.user_role || '',
        functionality: artifact.functionality || '',
        business_benefit: artifact.business_benefit || '',
        priority: artifact.priority || 'P1',
        business_value: artifact.business_value || 'High',
        review_status: artifact.review_status || 'pending',
        review_notes: artifact.review_notes || '',
      };
    }
    if (artifactType === 'acceptance_criteria') {
      return {
        title: artifact.title || '',
        scenario_type: artifact.scenario_type || 'happy_path',
        given_text: artifact.given_text || '',
        when_text: artifact.when_text || '',
        then_text: artifact.then_text || '',
        review_status: artifact.review_status || 'pending',
        review_notes: artifact.review_notes || '',
      };
    }
    if (artifactType === 'edge_case') {
      return {
        scenario: artifact.scenario || '',
        trigger_condition: artifact.trigger_condition || '',
        expected_behaviour: artifact.expected_behaviour || '',
        severity: artifact.severity || 'Medium',
        category: artifact.category || 'boundary_values',
        clarification_required: artifact.clarification_required || '',
        review_status: artifact.review_status || 'pending',
        review_notes: artifact.review_notes || '',
      };
    }
    if (artifactType === 'qa_test_case') {
      return {
        title: artifact.title || '',
        category: artifact.category || 'positive',
        preconditions: artifact.preconditions || '',
        test_data: artifact.test_data || '',
        test_steps: Array.isArray(artifact.test_steps) ? artifact.test_steps.join('\n') : '',
        expected_result: artifact.expected_result || '',
        priority: artifact.priority || 'P1',
        risk_level: artifact.risk_level || 'Medium',
        review_status: artifact.review_status || 'pending',
        execution_status: artifact.execution_status || 'not_run',
        actual_result: artifact.actual_result || '',
        execution_notes: artifact.execution_notes || '',
      };
    }
    return {};
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, val) => {
    setFormData((prev) => ({ ...prev, [field]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = { ...formData };
      if (artifactType === 'qa_test_case' && typeof payload.test_steps === 'string') {
        payload.test_steps = payload.test_steps
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean);
      }
      await onSave(artifact.id, payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const typeLabels = {
    user_story: 'User Story',
    acceptance_criteria: 'Acceptance Criterion',
    edge_case: 'Edge Case',
    qa_test_case: 'QA Test Case',
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-card border border-line rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4.5 border-b border-line flex items-center justify-between bg-card2/50">
          <div>
            <div className="text-[11px] font-semibold text-brand uppercase tracking-wider">
              EDIT {typeLabels[artifactType]}
            </div>
            <h3 className="text-base font-semibold text-ink mt-0.5">
              {artifact.story_key || artifact.criteria_key || artifact.edge_case_key || artifact.test_case_key || 'Edit Record'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-ink2 hover:text-ink hover:bg-hov transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-amber/10 border border-amber/20 text-amber text-xs flex items-center gap-2">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* USER STORY FIELDS */}
          {artifactType === 'user_story' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Story Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand focus:ring-1 focus:ring-brand outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    User Role (As a...)
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.user_role}
                    onChange={(e) => handleChange('user_role', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                    placeholder="e.g. mobile shopper"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Priority & Value
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={formData.priority}
                      onChange={(e) => handleChange('priority', e.target.value)}
                      className="flex-1 h-9 px-2 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                    >
                      <option value="P0">P0 - Blocker</option>
                      <option value="P1">P1 - Critical</option>
                      <option value="P2">P2 - Major</option>
                      <option value="P3">P3 - Minor</option>
                    </select>
                    <select
                      value={formData.business_value}
                      onChange={(e) => handleChange('business_value', e.target.value)}
                      className="flex-1 h-9 px-2 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                    >
                      <option value="Critical">Critical</option>
                      <option value="High">High</option>
                      <option value="Medium">Medium</option>
                      <option value="Low">Low</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Functionality (I want to...)
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.functionality}
                  onChange={(e) => handleChange('functionality', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Business Benefit (So that...)
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.business_benefit}
                  onChange={(e) => handleChange('business_benefit', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                />
              </div>
            </>
          )}

          {/* ACCEPTANCE CRITERIA FIELDS */}
          {artifactType === 'acceptance_criteria' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Criterion Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Scenario Category
                </label>
                <select
                  value={formData.scenario_type}
                  onChange={(e) => handleChange('scenario_type', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                >
                  <option value="happy_path">Happy Path (Successful Workflow)</option>
                  <option value="failure_workflow">Failure Workflow (Handled Error)</option>
                  <option value="input_validation">Input Validation</option>
                  <option value="permissions">Permissions & Access Control</option>
                  <option value="boundary">Boundary & Threshold Conditions</option>
                  <option value="business_rule">Business Rule Verification</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Given (Precondition)
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.given_text}
                  onChange={(e) => handleChange('given_text', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                  placeholder="Given the user is logged in with valid token..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  When (Action / Trigger)
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.when_text}
                  onChange={(e) => handleChange('when_text', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                  placeholder="When the user confirms the transaction..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Then (Verifiable Outcome)
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.then_text}
                  onChange={(e) => handleChange('then_text', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                  placeholder="Then the payment succeeds and receipt is rendered..."
                />
              </div>
            </>
          )}

          {/* EDGE CASE FIELDS */}
          {artifactType === 'edge_case' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                  >
                    <option value="boundary_values">Boundary Values</option>
                    <option value="duplicate_submissions">Duplicate Submissions</option>
                    <option value="network_failures">Network Failures</option>
                    <option value="api_failures">API Failures</option>
                    <option value="empty_input">Empty Input</option>
                    <option value="invalid_input">Invalid Input</option>
                    <option value="session_expiration">Session Expiration</option>
                    <option value="permission_restrictions">Permission Restrictions</option>
                    <option value="concurrent_actions">Concurrent Actions</option>
                    <option value="missing_data">Missing Data</option>
                    <option value="integration_failures">Integration Failures</option>
                    <option value="recovery_scenarios">Recovery Scenarios</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Severity
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => handleChange('severity', e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Scenario
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.scenario}
                  onChange={(e) => handleChange('scenario', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Trigger Condition
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.trigger_condition}
                  onChange={(e) => handleChange('trigger_condition', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Expected System Behaviour
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.expected_behaviour}
                  onChange={(e) => handleChange('expected_behaviour', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Clarification Required (Optional)
                </label>
                <input
                  type="text"
                  value={formData.clarification_required}
                  onChange={(e) => handleChange('clarification_required', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                  placeholder="Set if expected outcome is not fully defined in PRD"
                />
              </div>
            </>
          )}

          {/* QA TEST CASE FIELDS */}
          {artifactType === 'qa_test_case' && (
            <>
              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Test Case Title
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => handleChange('title', e.target.value)}
                  className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => handleChange('category', e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                  >
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                    <option value="boundary">Boundary</option>
                    <option value="validation">Validation</option>
                    <option value="error_handling">Error Handling</option>
                    <option value="integration">Integration</option>
                    <option value="security_permission">Security & Roles</option>
                    <option value="regression">Regression</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Priority
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => handleChange('priority', e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                  >
                    <option value="P0">P0 - Blocker</option>
                    <option value="P1">P1 - Critical</option>
                    <option value="P2">P2 - Major</option>
                    <option value="P3">P3 - Minor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                    Risk Level
                  </label>
                  <select
                    value={formData.risk_level}
                    onChange={(e) => handleChange('risk_level', e.target.value)}
                    className="w-full h-9 px-2 rounded-lg border border-line bg-card text-xs text-ink outline-none"
                  >
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Preconditions
                </label>
                <textarea
                  rows={2}
                  value={formData.preconditions}
                  onChange={(e) => handleChange('preconditions', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Test Steps (One step per line)
                </label>
                <textarea
                  required
                  rows={4}
                  value={formData.test_steps}
                  onChange={(e) => handleChange('test_steps', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none font-mono"
                  placeholder="1. Navigate to page&#10;2. Click submit&#10;3. Verify response"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                  Expected Result
                </label>
                <textarea
                  required
                  rows={2}
                  value={formData.expected_result}
                  onChange={(e) => handleChange('expected_result', e.target.value)}
                  className="w-full p-2.5 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                />
              </div>
            </>
          )}

          {/* COMMON REVIEW & STATUS SECTION */}
          <div className="pt-3 border-t border-line grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Review Status
              </label>
              <select
                value={formData.review_status}
                onChange={(e) => handleChange('review_status', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink outline-none"
              >
                <option value="pending">Pending Review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="needs_clarification">Needs Clarification</option>
                <option value="draft">Draft</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-ink uppercase tracking-wider mb-1.5">
                Review Note / Reason
              </label>
              <input
                type="text"
                value={formData.review_notes || ''}
                onChange={(e) => handleChange('review_notes', e.target.value)}
                className="w-full h-9 px-3 rounded-lg border border-line bg-card text-xs text-ink focus:border-brand outline-none"
                placeholder="Audit trail note..."
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-xl border border-line bg-card hover:bg-hov text-ink text-xs font-medium transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="h-9 px-5 rounded-xl bg-brand hover:bg-brandh text-white text-xs font-medium transition inline-flex items-center gap-1.5 shadow-sm disabled:opacity-50"
            >
              <Check size={14} />
              <span>{saving ? 'Saving...' : 'Save Changes'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

