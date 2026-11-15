import { useState, useEffect, useMemo } from 'react';
import { 
  X, Mail, Send, Eye, Edit3, User, Check, AlertCircle, 
  Paperclip, ExternalLink, ShieldAlert, Sparkles, Building
} from 'lucide-react';
import { sendDirectEmail, getEmailRecipients } from '../../api/email';
import { Btn } from '../ui';

export default function EmailComposerModal({
  isOpen,
  onClose,
  initialData = {},
  onSent,
  toast,
}) {
  const [recipientsList, setRecipientsList] = useState([]);
  const [toList, setToList] = useState([]);
  const [toInput, setToInput] = useState('');
  const [ccList, setCcList] = useState([]);
  const [ccInput, setCcInput] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [emailType, setEmailType] = useState('direct');
  const [projectId, setProjectId] = useState(null);
  const [relatedTaskId, setRelatedTaskId] = useState(null);
  const [relatedMeetingId, setRelatedMeetingId] = useState(null);
  const [contextTitle, setContextTitle] = useState('');

  const [activeTab, setActiveTab] = useState('edit'); // 'edit' | 'preview'
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [successNotice, setSuccessNotice] = useState('');

  // Load team directory on open
  useEffect(() => {
    if (isOpen) {
      getEmailRecipients()
        .then((res) => {
          if (res?.recipients) {
            setRecipientsList(res.recipients);
          }
        })
        .catch((err) => console.warn('Could not load email recipients', err));
    }
  }, [isOpen]);

  // Sync initialData when modal opens
  useEffect(() => {
    if (isOpen) {
      setError('');
      setSuccessNotice('');
      setActiveTab('edit');

      // Populate To
      let rawTo = initialData.to || initialData.recipient_emails || [];
      let initialTo = [];
      if (Array.isArray(rawTo)) {
        initialTo = rawTo.map((item) => (typeof item === 'string' ? item.trim() : String(item))).filter(Boolean);
      } else if (typeof rawTo === 'string' && rawTo.trim()) {
        initialTo = rawTo.split(',').map((s) => s.trim()).filter(Boolean);
      }
      setToList(initialTo);

      // Populate CC
      let initialCc = [];
      if (Array.isArray(initialData.cc)) {
        initialCc = initialData.cc;
      } else if (typeof initialData.cc === 'string' && initialData.cc.trim()) {
        initialCc = initialData.cc.split(',').map((s) => s.trim()).filter(Boolean);
      }
      setCcList(initialCc);
      if (initialCc.length > 0) setShowCc(true);

      setSubject(initialData.subject || '');
      setMessage(initialData.message || '');
      setEmailType(initialData.emailType || 'direct');
      setProjectId(initialData.projectId || null);
      setRelatedTaskId(initialData.relatedTaskId || null);
      setRelatedMeetingId(initialData.relatedMeetingId || null);
      setContextTitle(initialData.contextTitle || '');
    }
  }, [isOpen, initialData]);

  // Filter autocomplete suggestions for TO
  const toSuggestions = useMemo(() => {
    if (!toInput.trim()) return [];
    const query = toInput.toLowerCase();
    return recipientsList.filter(
      (r) =>
        (r.name?.toLowerCase().includes(query) || r.email?.toLowerCase().includes(query)) &&
        !toList.includes(r.email)
    ).slice(0, 5);
  }, [toInput, recipientsList, toList]);

  // Filter autocomplete suggestions for CC
  const ccSuggestions = useMemo(() => {
    if (!ccInput.trim()) return [];
    const query = ccInput.toLowerCase();
    return recipientsList.filter(
      (r) =>
        (r.name?.toLowerCase().includes(query) || r.email?.toLowerCase().includes(query)) &&
        !ccList.includes(r.email)
    ).slice(0, 5);
  }, [ccInput, recipientsList, ccList]);

  if (!isOpen) return null;

  const addRecipient = (emailOrName, type = 'to') => {
    const trimmed = (emailOrName || '').trim();
    if (!trimmed) return;

    // Check if trimmed matches a team member's name or email from directory
    const matched = recipientsList.find(
      (r) =>
        r.email?.toLowerCase() === trimmed.toLowerCase() ||
        r.name?.toLowerCase() === trimmed.toLowerCase()
    );
    const resolvedEmail = matched ? matched.email.toLowerCase() : trimmed.toLowerCase();

    // basic email regex
    const isValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(resolvedEmail);
    if (!isValid) {
      setError(`"${trimmed}" is not a valid email address.`);
      return;
    }
    setError('');
    if (type === 'to') {
      if (!toList.includes(resolvedEmail)) setToList([...toList, resolvedEmail]);
      setToInput('');
    } else {
      if (!ccList.includes(resolvedEmail)) setCcList([...ccList, resolvedEmail]);
      setCcInput('');
    }
  };

  const removeRecipient = (email, type = 'to') => {
    if (type === 'to') {
      setToList(toList.filter((e) => e !== email));
    } else {
      setCcList(ccList.filter((e) => e !== email));
    }
  };

  const handleKeyDown = (e, type = 'to') => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = type === 'to' ? toInput : ccInput;
      addRecipient(val, type);
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    setError('');

    // Ensure at least one recipient
    const finalTo = [...toList];
    if (toInput.trim()) {
      const val = toInput.trim().toLowerCase();
      if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && !finalTo.includes(val)) {
        finalTo.push(val);
      }
    }

    if (finalTo.length === 0) {
      setError('Please add at your least one recipient email address.');
      return;
    }

    if (!subject.trim()) {
      setError('Please provide an email subject line.');
      return;
    }

    if (!message.trim()) {
      setError('Email message body cannot be empty.');
      return;
    }

    setSending(true);

    try {
      const res = await sendDirectEmail({
        to: finalTo,
        recipient_emails: finalTo,
        cc: ccList.length > 0 ? ccList : undefined,
        subject: subject.trim(),
        message: message.trim(),
        email_type: emailType,
        project_id: projectId,
        related_task_id: relatedTaskId,
        related_meeting_id: relatedMeetingId,
      });

      setSending(false);

      if (res && res.failed_count > 0 && res.sent_count === 0) {
        const failDetail = res.errors?.[0] || res.logs?.[0]?.error_message || 'Email delivery failed. Please check your recipient addresses and domain configuration.';
        setError(failDetail);
        return;
      }

      if (toast) toast('Email sent successfully!');
      if (onSent) onSent(res);
      onClose();
    } catch (err) {
      setSending(false);
      setError(err.message || 'Failed to send email. Please try again.');
    }
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4 transition-all"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-3xl bg-white border border-[#E5EAE5] rounded-2xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5EAE5] bg-[#F7F8F5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#174B3A] text-white flex items-center justify-center shadow-sm">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[#202923]">Compose Email</h2>
              <p className="text-xs text-[#78847C]">Send direct communications with enterprise branding</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* View Switcher: Edit / Live Preview */}
            <div className="flex items-center bg-[#DCE9DF]/50 p-1 rounded-lg border border-[#E5EAE5]">
              <button
                type="button"
                onClick={() => setActiveTab('edit')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'edit'
                    ? 'bg-white text-[#174B3A] shadow-xs'
                    : 'text-[#78847C] hover:text-[#202923]'
                }`}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Edit
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'preview'
                    ? 'bg-white text-[#174B3A] shadow-xs'
                    : 'text-[#78847C] hover:text-[#202923]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                Live Preview
              </button>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#78847C] hover:text-[#202923] hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error notification banner */}
        {error && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span>{error}</span>
          </div>
        )}

        {/* Linked Context Pill */}
        {contextTitle && (
          <div className="mx-6 mt-3 px-3 py-1.5 bg-[#DCE9DF]/40 border border-[#DCE9DF] rounded-lg flex items-center gap-2 text-xs text-[#174B3A]">
            <Sparkles className="w-3.5 h-3.5 text-[#2F765A]" />
            <span className="font-medium">Context Linked:</span>
            <span className="truncate">{contextTitle}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'edit' ? (
            <div className="space-y-4">
              
              {/* TO Field */}
              <div className="relative">
                <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                  To <span className="text-red-500">*</span>
                </label>
                <div className="min-h-[42px] p-1.5 border border-[#E5EAE5] rounded-xl flex flex-wrap items-center gap-1.5 focus-within:border-[#174B3A] bg-white transition-colors">
                  {toList.map((email) => {
                    const match = recipientsList.find((r) => r.email === email);
                    return (
                      <span
                        key={email}
                        className="inline-flex items-center gap-1.5 bg-[#F7F8F5] text-[#202923] border border-[#E5EAE5] text-xs px-2.5 py-1 rounded-lg"
                      >
                        <span className="font-medium">{match ? match.name : email}</span>
                        {match && <span className="text-[#78847C] text-[10px]">({match.email})</span>}
                        <button
                          type="button"
                          onClick={() => removeRecipient(email, 'to')}
                          className="hover:text-red-500 ml-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                  <input
                    type="text"
                    value={toInput}
                    onChange={(e) => setToInput(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, 'to')}
                    placeholder={toList.length === 0 ? "Type employee name or email and press Enter..." : "Add more..."}
                    className="flex-1 min-w-[200px] border-none outline-none text-xs text-[#202923] bg-transparent p-1"
                  />
                  {!showCc && (
                    <button
                      type="button"
                      onClick={() => setShowCc(true)}
                      className="text-xs text-[#2F765A] hover:underline px-2 font-medium"
                    >
                      + Add CC
                    </button>
                  )}
                </div>

                {/* Suggestions dropdown */}
                {toSuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5EAE5] rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-[#E5EAE5]">
                    {toSuggestions.map((user) => (
                      <div
                        key={user.id}
                        onClick={() => addRecipient(user.email, 'to')}
                        className="p-2.5 hover:bg-[#F7F8F5] cursor-pointer flex items-center justify-between text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-[#174B3A]/10 text-[#174B3A] font-semibold text-[10px] grid place-items-center">
                            {(user.name || 'U').slice(0, 1)}
                          </div>
                          <div>
                            <div className="font-medium text-[#202923]">{user.name}</div>
                            <div className="text-[11px] text-[#78847C]">{user.email}</div>
                          </div>
                        </div>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-[#DCE9DF]/50 text-[#174B3A] font-medium">
                          {user.role}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* CC Field (Optional/Toggleable) */}
              {showCc && (
                <div className="relative animate-in fade-in duration-150">
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-[#202923]">CC</label>
                    <button
                      type="button"
                      onClick={() => {
                        setShowCc(false);
                        setCcList([]);
                      }}
                      className="text-[11px] text-[#78847C] hover:text-red-500"
                    >
                      Remove CC
                    </button>
                  </div>
                  <div className="min-h-[42px] p-1.5 border border-[#E5EAE5] rounded-xl flex flex-wrap items-center gap-1.5 focus-within:border-[#174B3A] bg-white transition-colors">
                    {ccList.map((email) => {
                      const match = recipientsList.find((r) => r.email === email);
                      return (
                        <span
                          key={email}
                          className="inline-flex items-center gap-1.5 bg-[#F7F8F5] text-[#202923] border border-[#E5EAE5] text-xs px-2.5 py-1 rounded-lg"
                        >
                          <span className="font-medium">{match ? match.name : email}</span>
                          <button
                            type="button"
                            onClick={() => removeRecipient(email, 'cc')}
                            className="hover:text-red-500 ml-0.5"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      );
                    })}
                    <input
                      type="text"
                      value={ccInput}
                      onChange={(e) => setCcInput(e.target.value)}
                      onKeyDown={(e) => handleKeyDown(e, 'cc')}
                      placeholder="Type colleague email and press Enter..."
                      className="flex-1 min-w-[200px] border-none outline-none text-xs text-[#202923] bg-transparent p-1"
                    />
                  </div>

                  {ccSuggestions.length > 0 && (
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#E5EAE5] rounded-xl shadow-lg z-20 overflow-hidden divide-y divide-[#E5EAE5]">
                      {ccSuggestions.map((user) => (
                        <div
                          key={user.id}
                          onClick={() => addRecipient(user.email, 'cc')}
                          className="p-2.5 hover:bg-[#F7F8F5] cursor-pointer flex items-center justify-between text-xs transition-colors"
                        >
                          <div>
                            <div className="font-medium text-[#202923]">{user.name}</div>
                            <div className="text-[11px] text-[#78847C]">{user.email}</div>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                            {user.role}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Subject Line */}
              <div>
                <label className="block text-xs font-semibold text-[#202923] mb-1.5">
                  Subject <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Project Update: Sprint 4 Deliverables & QA Signoff"
                  className="w-full px-3 py-2 text-xs border border-[#E5EAE5] rounded-xl focus:outline-none focus:border-[#174B3A] transition-colors"
                />
              </div>

              {/* Message Body */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-[#202923]">
                    Message Body <span className="text-red-500">*</span>
                  </label>
                  <span className="text-[11px] text-[#78847C]">
                    {message.length} characters
                  </span>
                </div>
                <textarea
                  rows={8}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Write your email message here... Line breaks and paragraphs are formatted automatically."
                  className="w-full px-3 py-2 text-xs border border-[#E5EAE5] rounded-xl focus:outline-none focus:border-[#174B3A] font-sans leading-relaxed resize-y transition-colors"
                />
              </div>

            </div>
          ) : (
            /* Live Email Preview */
            <div className="bg-[#F7F8F5] p-4 rounded-xl border border-[#E5EAE5] font-sans">
              <div className="max-w-[560px] mx-auto bg-white rounded-xl shadow-xs overflow-hidden border border-[#E5EAE5]">
                {/* Email Header */}
                <div className="bg-[#174B3A] px-6 py-5 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center font-bold text-sm">
                      Z
                    </div>
                    <div>
                      <div className="font-semibold text-sm tracking-wide">ZENTRIQ</div>
                      <div className="text-[10px] text-[#DCE9DF]">Product Intelligence Platform</div>
                    </div>
                  </div>
                  <span className="text-[11px] bg-white/15 px-2 py-0.5 rounded-full text-white/90">
                    Direct Notification
                  </span>
                </div>

                {/* Email Body Preview */}
                <div className="p-6 text-[#202923]">
                  <div className="text-xs text-[#78847C] mb-3 pb-3 border-b border-[#E5EAE5]">
                    <div><span className="font-medium text-[#202923]">To:</span> {toList.join(', ') || 'recipient@zentriq.ai'}</div>
                    {ccList.length > 0 && <div><span className="font-medium text-[#202923]">CC:</span> {ccList.join(', ')}</div>}
                    <div><span className="font-medium text-[#202923]">Subject:</span> {subject || '(No Subject)'}</div>
                  </div>

                  <div className="text-xs font-semibold text-[#174B3A] mb-3">
                    Hello Team Member,
                  </div>

                  <div className="text-xs leading-relaxed text-[#202923] whitespace-pre-wrap">
                    {message || 'Type your message in the Edit tab to preview how it looks in this template.'}
                  </div>

                  {contextTitle && (
                    <div className="mt-5 p-3 rounded-lg bg-[#F7F8F5] border border-[#E5EAE5] text-xs">
                      <div className="font-semibold text-[#174B3A] mb-1">Related Context</div>
                      <div className="text-[#78847C]">{contextTitle}</div>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-[#E5EAE5] text-[11px] text-[#78847C]">
                    Best regards,<br />
                    <strong className="text-[#202923]">Zentriq Team</strong>
                  </div>
                </div>

                {/* Email Footer */}
                <div className="bg-[#F7F8F5] px-6 py-3 border-t border-[#E5EAE5] text-center text-[10px] text-[#78847C]">
                  Sent via Zentriq Email & Notification Center • Confidential Enterprise Communication
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#E5EAE5] bg-[#F7F8F5]">
          <div className="text-xs text-[#78847C]">
            {toList.length > 0 && (
              <span>Sending to {toList.length} recipient{toList.length > 1 ? 's' : ''}</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="px-4 py-2 rounded-xl text-xs font-medium text-[#78847C] hover:text-[#202923] hover:bg-black/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={sending || toList.length === 0 || !subject.trim() || !message.trim()}
              className="px-5 py-2 rounded-xl text-xs font-medium bg-[#174B3A] text-white hover:bg-[#2F765A] disabled:opacity-50 disabled:pointer-events-none transition-colors shadow-sm flex items-center gap-2"
            >
              {sending ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  Send Email
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

