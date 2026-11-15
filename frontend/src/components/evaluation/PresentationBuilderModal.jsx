import { useState, useEffect } from 'react';
import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Layers,
  MoveDown,
  MoveUp,
  Plus,
  Save,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';
import { getPresentation, updatePresentation, downloadPresentation } from '../../api/evaluation';

export default function PresentationBuilderModal({ isOpen, onClose }) {
  const [presentation, setPresentation] = useState(null);
  const [slides, setSlides] = useState([]);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadPresentation();
    }
  }, [isOpen]);

  const loadPresentation = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await getPresentation();
      setPresentation(data);
      setSlides(data.slides || []);
    } catch (err) {
      setError(err.message || 'Failed to load presentation.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      await updatePresentation({
        title: presentation?.title || 'Zentriq Placement Presentation',
        slides_data: slides,
      });
      setSuccessMsg('Presentation saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save presentation.');
    } finally {
      setSaving(false);
    }
  };

  const handleSlideChange = (field, value) => {
    const updated = [...slides];
    updated[activeSlideIndex] = {
      ...updated[activeSlideIndex],
      [field]: value,
    };
    setSlides(updated);
  };

  const handleTalkingPointChange = (pointIdx, text) => {
    const updated = [...slides];
    const points = [...(updated[activeSlideIndex].talking_points || [])];
    points[pointIdx] = text;
    updated[activeSlideIndex].talking_points = points;
    setSlides(updated);
  };

  const handleAddTalkingPoint = () => {
    const updated = [...slides];
    const points = [...(updated[activeSlideIndex].talking_points || []), 'New talking point...'];
    updated[activeSlideIndex].talking_points = points;
    setSlides(updated);
  };

  const handleRemoveTalkingPoint = (pointIdx) => {
    const updated = [...slides];
    const points = (updated[activeSlideIndex].talking_points || []).filter((_, i) => i !== pointIdx);
    updated[activeSlideIndex].talking_points = points;
    setSlides(updated);
  };

  const handleMoveSlide = (direction) => {
    if (direction === 'up' && activeSlideIndex > 0) {
      const updated = [...slides];
      const temp = updated[activeSlideIndex];
      updated[activeSlideIndex] = updated[activeSlideIndex - 1];
      updated[activeSlideIndex - 1] = temp;
      // Re-number
      updated.forEach((s, i) => (s.slide_number = i + 1));
      setSlides(updated);
      setActiveSlideIndex(activeSlideIndex - 1);
    } else if (direction === 'down' && activeSlideIndex < slides.length - 1) {
      const updated = [...slides];
      const temp = updated[activeSlideIndex];
      updated[activeSlideIndex] = updated[activeSlideIndex + 1];
      updated[activeSlideIndex + 1] = temp;
      updated.forEach((s, i) => (s.slide_number = i + 1));
      setSlides(updated);
      setActiveSlideIndex(activeSlideIndex + 1);
    }
  };

  if (!isOpen) return null;

  const currentSlide = slides[activeSlideIndex] || null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-6xl h-[92vh] flex flex-col shadow-2xl border border-[#E5EAE5] overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-[#E5EAE5] bg-[#F7F8F5] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#174B3A] text-white grid place-items-center">
              <FileText size={18} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#202923]">Placement Presentation Builder</h2>
              <p className="text-[11px] text-[#78847C]">
                18-slide executive presentation outline for interviews, design reviews, and portfolio showcases.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadPresentation('markdown')}
              className="px-3 py-1.5 rounded-lg border border-[#E5EAE5] bg-white hover:bg-[#F7F8F5] text-xs font-semibold text-[#202923] flex items-center gap-1.5 transition"
              title="Download presentation as Markdown"
            >
              <Download size={13} />
              Markdown
            </button>
            <button
              onClick={() => downloadPresentation('json')}
              className="px-3 py-1.5 rounded-lg border border-[#E5EAE5] bg-white hover:bg-[#F7F8F5] text-xs font-semibold text-[#202923] flex items-center gap-1.5 transition"
              title="Download presentation as JSON"
            >
              <Download size={13} />
              JSON
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-1.5 rounded-lg bg-[#174B3A] hover:bg-[#2F765A] text-white text-xs font-bold flex items-center gap-1.5 transition"
            >
              <Save size={13} />
              {saving ? 'Saving...' : 'Save Deck'}
            </button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-[#E5EAE5] text-[#78847C] grid place-items-center transition ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Status Alerts */}
        {error && (
          <div className="mx-6 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
            <AlertCircle size={15} />
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mx-6 mt-3 p-3 bg-green-50 border border-green-200 rounded-xl text-xs text-green-700 flex items-center gap-2">
            <CheckCircle2 size={15} />
            {successMsg}
          </div>
        )}

        {/* Main Workspace: Left Slide Navigator & Right Slide Editor */}
        <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
          {/* Left: Slide Navigator (18 Slides) */}
          <div className="w-full md:w-80 border-r border-[#E5EAE5] bg-[#F7F8F5] overflow-y-auto p-3 space-y-1.5 shrink-0">
            <div className="px-2 py-1 text-[11px] font-bold text-[#78847C] uppercase tracking-wider flex items-center justify-between">
              <span>Slides Outline ({slides.length})</span>
              <span className="text-[10px]">Select to Edit</span>
            </div>

            {loading ? (
              <div className="py-12 text-center text-xs text-[#78847C]">Loading slides...</div>
            ) : (
              slides.map((s, idx) => {
                const isActive = activeSlideIndex === idx;
                return (
                  <button
                    key={idx}
                    onClick={() => setActiveSlideIndex(idx)}
                    className={`w-full text-left p-2.5 rounded-xl border text-xs transition flex items-start gap-2.5 ${
                      isActive
                        ? 'bg-white border-[#174B3A] text-[#174B3A] shadow-xs'
                        : 'bg-white/60 border-transparent hover:bg-white hover:border-[#E5EAE5] text-[#202923]'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-md grid place-items-center text-[10px] font-bold shrink-0 mt-0.5 ${
                      isActive ? 'bg-[#174B3A] text-white' : 'bg-[#E5EAE5] text-[#78847C]'
                    }`}>
                      {s.slide_number || idx + 1}
                    </span>
                    <div className="truncate flex-1">
                      <p className="font-bold truncate text-[11px]">{s.title}</p>
                      <span className="text-[10px] text-[#78847C] block truncate">{s.category}</span>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Right: Slide Editor */}
          <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-white">
            {currentSlide ? (
              <>
                {/* Reorder and Meta Actions */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E5EAE5]">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-md bg-[#DCE9DF] text-[#174B3A] font-bold text-xs">
                      Slide {currentSlide.slide_number || activeSlideIndex + 1} of {slides.length}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-semibold text-[#78847C] bg-[#F7F8F5] border border-[#E5EAE5]">
                      Category: {currentSlide.category}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleMoveSlide('up')}
                      disabled={activeSlideIndex === 0}
                      className="p-1.5 rounded-lg border border-[#E5EAE5] text-[#78847C] hover:text-[#202923] hover:bg-[#F7F8F5] disabled:opacity-30 transition"
                      title="Move slide up"
                    >
                      <MoveUp size={14} />
                    </button>
                    <button
                      onClick={() => handleMoveSlide('down')}
                      disabled={activeSlideIndex === slides.length - 1}
                      className="p-1.5 rounded-lg border border-[#E5EAE5] text-[#78847C] hover:text-[#202923] hover:bg-[#F7F8F5] disabled:opacity-30 transition"
                      title="Move slide down"
                    >
                      <MoveDown size={14} />
                    </button>
                  </div>
                </div>

                {/* Title & Category Input */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-[#202923] mb-1">Slide Title</label>
                    <input
                      type="text"
                      value={currentSlide.title || ''}
                      onChange={(e) => handleSlideChange('title', e.target.value)}
                      className="w-full text-xs font-bold p-2.5 rounded-lg border border-[#E5EAE5] focus:outline-hidden focus:border-[#174B3A]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-[#202923] mb-1">Category</label>
                    <input
                      type="text"
                      value={currentSlide.category || ''}
                      onChange={(e) => handleSlideChange('category', e.target.value)}
                      className="w-full text-xs p-2 rounded-lg border border-[#E5EAE5] focus:outline-hidden focus:border-[#174B3A]"
                    />
                  </div>
                </div>

                {/* Talking Points List */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-[#202923]">
                      Key Talking Points (Bullet Points)
                    </label>
                    <button
                      type="button"
                      onClick={handleAddTalkingPoint}
                      className="text-xs font-bold text-[#174B3A] hover:underline flex items-center gap-1"
                    >
                      <Plus size={12} />
                      Add Bullet Point
                    </button>
                  </div>

                  <div className="space-y-2">
                    {(currentSlide.talking_points || []).map((point, pIdx) => (
                      <div key={pIdx} className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#174B3A] shrink-0" />
                        <input
                          type="text"
                          value={point}
                          onChange={(e) => handleTalkingPointChange(pIdx, e.target.value)}
                          className="flex-1 text-xs p-2 rounded-lg border border-[#E5EAE5] focus:outline-hidden focus:border-[#174B3A]"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveTalkingPoint(pIdx)}
                          className="p-1.5 text-[#78847C] hover:text-red-600 transition"
                          title="Remove bullet point"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Speaker Notes */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#202923]">
                    Speaker Notes & Interview Talking Script
                  </label>
                  <p className="text-[11px] text-[#78847C] mb-1">
                    What to say verbally during the slide presentation.
                  </p>
                  <textarea
                    rows={5}
                    value={currentSlide.speaker_notes || ''}
                    onChange={(e) => handleSlideChange('speaker_notes', e.target.value)}
                    placeholder="Enter what you would say to interviewers or stakeholders..."
                    className="w-full text-xs p-3 rounded-lg border border-[#E5EAE5] bg-[#F7F8F5] focus:bg-white focus:outline-hidden focus:border-[#174B3A] leading-relaxed"
                  />
                </div>
              </>
            ) : (
              <div className="py-24 text-center text-xs text-[#78847C]">Select a slide from the left to edit.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

