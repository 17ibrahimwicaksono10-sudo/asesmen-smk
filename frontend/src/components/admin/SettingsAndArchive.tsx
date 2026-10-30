import React, { useState } from 'react';
import { SystemSettings, ArchivedItem, AIProviderConfig, ModalityRoutingConfig } from '../../types';
import {
  Settings,
  Sparkles,
  Mic,
  Archive,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Save,
  Cpu,
  KeyRound,
  Bot,
  Link2,
  Eye,
  EyeOff,
  Plus,
  Edit2,
  ShieldCheck,
  Layers,
  FileText,
  Image as ImageIcon,
  Volume2,
  AlertCircle
} from 'lucide-react';

interface SettingsAndArchiveProps {
  settings: SystemSettings;
  onUpdateSettings: (newSettings: SystemSettings) => void;
  archives: ArchivedItem[];
  onRestoreArchive: (id: string) => void;
  onDeleteArchive: (id: string) => void;
}

const DEFAULT_PROVIDERS: AIProviderConfig[] = [
  {
    id: 'prov-deepseek-flash',
    name: 'Deepseek v4 Flash',
    type: 'Deepseek',
    model: 'deepseek-v4-flash',
    apiKey: 'sk-987d****************',
    baseUrl: 'https://api.deepseek.com',
    status: 'Active'
  },
  {
    id: 'prov-deepseek-pro',
    name: 'Deepseek v4 Pro',
    type: 'Deepseek',
    model: 'deepseek-v4-pro',
    apiKey: 'sk-987d****************',
    baseUrl: 'https://api.deepseek.com',
    status: 'Active'
  },
  {
    id: 'prov-gemini-flash',
    name: 'gemini-2.5-flash',
    type: 'Gemini',
    model: 'gemini-2.5-flash',
    apiKey: 'AIzaSy****************7I0E',
    status: 'Active'
  }
];

const DEFAULT_MODALITY_ROUTING: ModalityRoutingConfig = {
  text: {
    mode: 'Use API provider',
    providerId: 'prov-deepseek-flash',
    prompt: 'Evaluasi ketepatan konsep kimia analitik, prosedur K3, dan sistematika penulisan jawaban esai teks siswa.'
  },
  image: {
    mode: 'Use API provider',
    providerId: 'prov-gemini-flash',
    prompt: 'Ekstraksi OCR tulisan tangan dan nilai kebenaran alur hitungan, rumus, serta gambar skema laboratorium.'
  },
  audio: {
    mode: 'Use API provider',
    providerId: 'default',
    prompt: 'Transkripsi audio penjelasan verbal siswa dan nilai pemahaman konseptual serta artikulasi istilah kimia.'
  }
};

export const SettingsAndArchive: React.FC<SettingsAndArchiveProps> = ({
  settings,
  onUpdateSettings,
  archives,
  onRestoreArchive,
  onDeleteArchive
}) => {
  const [activeTab, setActiveTab] = useState<'general' | 'ai_providers' | 'stt' | 'archive'>('ai_providers');
  const [currentSettings, setCurrentSettings] = useState<SystemSettings>(() => ({
    ...settings,
    providers: settings.providers && settings.providers.length > 0 ? settings.providers : DEFAULT_PROVIDERS,
    modalityRouting: settings.modalityRouting || DEFAULT_MODALITY_ROUTING
  }));
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Provider Modal state
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [editingProvider, setEditingProvider] = useState<AIProviderConfig | null>(null);
  const [providerForm, setProviderForm] = useState<{
    name: string;
    type: 'Deepseek' | 'Gemini' | 'OpenAI' | 'Anthropic' | 'Custom';
    model: string;
    apiKey: string;
    baseUrl: string;
    status: 'Active' | 'Inactive';
  }>({
    name: '',
    type: 'Deepseek',
    model: 'deepseek-v4-flash',
    apiKey: '',
    baseUrl: 'https://api.deepseek.com',
    status: 'Active'
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings(currentSettings);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const openAddProviderModal = () => {
    setEditingProvider(null);
    setProviderForm({
      name: '',
      type: 'Deepseek',
      model: 'deepseek-v4-flash',
      apiKey: '',
      baseUrl: 'https://api.deepseek.com',
      status: 'Active'
    });
    setShowProviderModal(true);
  };

  const openEditProviderModal = (prov: AIProviderConfig) => {
    setEditingProvider(prov);
    setProviderForm({
      name: prov.name,
      type: prov.type,
      model: prov.model,
      apiKey: prov.apiKey,
      baseUrl: prov.baseUrl || '',
      status: prov.status
    });
    setShowProviderModal(true);
  };

  const handleSaveProvider = (e: React.FormEvent) => {
    e.preventDefault();
    const providersList = currentSettings.providers || DEFAULT_PROVIDERS;

    if (editingProvider) {
      const updated = providersList.map(p =>
        p.id === editingProvider.id
          ? {
              ...p,
              name: providerForm.name.trim(),
              type: providerForm.type,
              model: providerForm.model.trim(),
              apiKey: providerForm.apiKey.trim(),
              baseUrl: providerForm.baseUrl.trim(),
              status: providerForm.status
            }
          : p
      );
      const newSettings = { ...currentSettings, providers: updated };
      setCurrentSettings(newSettings);
      onUpdateSettings(newSettings);
    } else {
      const newProv: AIProviderConfig = {
        id: `prov-${Date.now()}`,
        name: providerForm.name.trim(),
        type: providerForm.type,
        model: providerForm.model.trim(),
        apiKey: providerForm.apiKey.trim() || 'sk-****************',
        baseUrl: providerForm.baseUrl.trim(),
        status: providerForm.status
      };
      const updated = [...providersList, newProv];
      const newSettings = { ...currentSettings, providers: updated };
      setCurrentSettings(newSettings);
      onUpdateSettings(newSettings);
    }

    setShowProviderModal(false);
  };

  const handleDeleteProvider = (provId: string) => {
    if (confirm('Hapus provider API key ini?')) {
      const providersList = currentSettings.providers || DEFAULT_PROVIDERS;
      const updated = providersList.filter(p => p.id !== provId);
      const newSettings = { ...currentSettings, providers: updated };
      setCurrentSettings(newSettings);
      onUpdateSettings(newSettings);
    }
  };

  const maskApiKey = (key: string) => {
    if (!key) return '****************';
    if (key.includes('****')) return key;
    if (key.length <= 8) return '********';
    return `****************${key.slice(-4)}`;
  };

  const currentProviders = currentSettings.providers || DEFAULT_PROVIDERS;
  const currentRouting = currentSettings.modalityRouting || DEFAULT_MODALITY_ROUTING;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-400" />
          Pengaturan Sistem & Manajamen Arsip
        </h2>
        <p className="text-xs text-slate-400">
          Konfigurasi Multi-API AI (Text, Image, Audio), Speech to Text, variabel umum, dan manajemen data terarsip.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800 gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab('ai_providers')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-3 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'ai_providers'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5 text-blue-400" />
          Integrasi Model AI & API Keys (3 Modality)
        </button>

        <button
          onClick={() => setActiveTab('general')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-3 whitespace-nowrap cursor-pointer ${
            activeTab === 'general'
              ? 'border-blue-500 text-blue-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          Pengaturan Umum
        </button>

        <button
          onClick={() => setActiveTab('stt')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-3 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'stt'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Mic className="w-3.5 h-3.5 text-amber-400" />
          Speech to Text
        </button>

        <button
          onClick={() => setActiveTab('archive')}
          className={`pb-3 text-xs font-bold transition-all border-b-2 px-3 flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
            activeTab === 'archive'
              ? 'border-purple-500 text-purple-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Archive className="w-3.5 h-3.5 text-purple-400" />
          Data Arsip ({archives.length})
        </button>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Konfigurasi Provider & Routing Modality berhasil disimpan!</span>
        </div>
      )}

      {/* AI PROVIDERS & 3 MODALITY ROUTING TAB (SESUAI GAMBAR 2) */}
      {activeTab === 'ai_providers' && (
        <div className="space-y-6">
          {/* SECTION 1: PROVIDERS / API KEYS TABLE */}
          <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-3 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Providers / API Keys</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Keys are encrypted in the database. Existing .env keys are still used as fallback when no provider key is selected.
                </p>
              </div>

              <button
                onClick={openAddProviderModal}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md shadow-blue-600/20 transition"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Provider</span>
              </button>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 text-[11px] uppercase font-semibold border-b border-slate-800">
                  <tr>
                    <th className="py-3 px-4">Name</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Model</th>
                    <th className="py-3 px-4">API Key</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {currentProviders.map(prov => (
                    <tr key={prov.id} className="hover:bg-slate-800/30 transition">
                      <td className="py-3.5 px-4 font-bold text-white flex items-center gap-2">
                        <span>{prov.name}</span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300">{prov.type}</td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 text-[11px]">{prov.model}</td>
                      <td className="py-3.5 px-4 font-mono text-rose-400 text-[11px]">
                        {maskApiKey(prov.apiKey)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            prov.status === 'Active'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : 'bg-slate-800 text-slate-400 border border-slate-700'
                          }`}
                        >
                          {prov.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => openEditProviderModal(prov)}
                            className="px-2.5 py-1 rounded-lg border border-blue-500/40 text-blue-400 hover:bg-blue-500/10 font-semibold text-xs cursor-pointer transition"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteProvider(prov.id)}
                            className="px-2.5 py-1 rounded-lg border border-rose-500/40 text-rose-400 hover:bg-rose-500/10 font-semibold text-xs cursor-pointer transition"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* SECTION 2: 3 MODALITY PIPELINE BOXES (GENERAL / TEXT, IMAGE, AUDIO) */}
          <div className="grid md:grid-cols-3 gap-5">
            {/* BOX 1: GENERAL / PRIMARY / TEXT */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">General / Primary / Text</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Primary scoring provider and reusable text prompt.</p>
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Mode</label>
                  <select
                    value={currentRouting.text?.mode || 'Use API provider'}
                    onChange={(e) => {
                      const newSettings = {
                        ...currentSettings,
                        modalityRouting: {
                          ...currentRouting,
                          text: { ...currentRouting.text, mode: e.target.value }
                        }
                      };
                      setCurrentSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Use API provider">Use API provider</option>
                    <option value="Local/Fallback">Local / Fallback</option>
                    <option value="Rule Engine">Direct Rule Engine</option>
                  </select>
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Provider</label>
                  <select
                    value={currentRouting.text?.providerId || 'prov-deepseek-flash'}
                    onChange={(e) => {
                      const newSettings = {
                        ...currentSettings,
                        modalityRouting: {
                          ...currentRouting,
                          text: { ...currentRouting.text, providerId: e.target.value }
                        }
                      };
                      setCurrentSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="default">Use default / .env fallback</option>
                    {currentProviders.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Format / Prompt */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Format/type instruction prompt
                  </label>
                  <textarea
                    rows={4}
                    value={currentRouting.text?.prompt || ''}
                    onChange={(e) => {
                      const newSettings = {
                        ...currentSettings,
                        modalityRouting: {
                          ...currentRouting,
                          text: { ...currentRouting.text, prompt: e.target.value }
                        }
                      };
                      setCurrentSettings(newSettings);
                    }}
                    placeholder="Instruksi sistem untuk penilaian jawaban teks..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                  />
                </div>
              </div>
            </div>

            {/* BOX 2: IMAGE */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <ImageIcon className="w-4 h-4 text-emerald-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Image</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Choose direct API scoring or local extraction before text scoring.
                    </p>
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Mode</label>
                  <select
                    value={currentRouting.image?.mode || 'Use API provider'}
                    onChange={(e) => {
                      const newSettings = {
                        ...currentSettings,
                        modalityRouting: {
                          ...currentRouting,
                          image: { ...currentRouting.image, mode: e.target.value }
                        }
                      };
                      setCurrentSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Use API provider">Use API provider</option>
                    <option value="Local extraction">Local extraction</option>
                    <option value="Multimodal Vision API">Multimodal Vision API</option>
                  </select>
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Provider</label>
                  <select
                    value={currentRouting.image?.providerId || 'prov-gemini-flash'}
                    onChange={(e) => {
                      const newSettings = {
                        ...currentSettings,
                        modalityRouting: {
                          ...currentRouting,
                          image: { ...currentRouting.image, providerId: e.target.value }
                        }
                      };
                      setCurrentSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 font-semibold"
                  >
                    <option value="default">Use default / .env fallback</option>
                    {currentProviders.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Format / Prompt */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Format/type instruction prompt
                  </label>
                  <textarea
                    rows={4}
                    value={currentRouting.image?.prompt || ''}
                    onChange={(e) => {
                      const newSettings = {
                        ...currentSettings,
                        modalityRouting: {
                          ...currentRouting,
                          image: { ...currentRouting.image, prompt: e.target.value }
                        }
                      };
                      setCurrentSettings(newSettings);
                    }}
                    placeholder="Instruksi sistem untuk OCR tulisan tangan & gambar..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-emerald-500 leading-relaxed font-sans"
                  />
                </div>
              </div>
            </div>

            {/* BOX 3: AUDIO */}
            <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between shadow-xl">
              <div className="space-y-3">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
                  <Volume2 className="w-4 h-4 text-purple-400" />
                  <div>
                    <h4 className="text-sm font-bold text-white">Audio</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Choose direct API scoring or local extraction before text scoring.
                    </p>
                  </div>
                </div>

                {/* Mode */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Mode</label>
                  <select
                    value={currentRouting.audio?.mode || 'Use API provider'}
                    onChange={(e) => {
                      const newSettings = {
                        ...currentSettings,
                        modalityRouting: {
                          ...currentRouting,
                          audio: { ...currentRouting.audio, mode: e.target.value }
                        }
                      };
                      setCurrentSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500"
                  >
                    <option value="Use API provider">Use API provider</option>
                    <option value="Local extraction (STT)">Local extraction (STT)</option>
                    <option value="Speech-to-Text then AI Scoring">Speech-to-Text then AI Scoring</option>
                  </select>
                </div>

                {/* Provider */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Provider</label>
                  <select
                    value={currentRouting.audio?.providerId || 'default'}
                    onChange={(e) => {
                      const newSettings = {
                        ...currentSettings,
                        modalityRouting: {
                          ...currentRouting,
                          audio: { ...currentRouting.audio, providerId: e.target.value }
                        }
                      };
                      setCurrentSettings(newSettings);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 font-semibold"
                  >
                    <option value="default">Use default / .env fallback</option>
                    {currentProviders.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type.toLowerCase()})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Format / Prompt */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Format/type instruction prompt
                  </label>
                  <textarea
                    rows={4}
                    value={currentRouting.audio?.prompt || ''}
                    onChange={(e) => {
                      const newSettings = {
                        ...currentSettings,
                        modalityRouting: {
                          ...currentRouting,
                          audio: { ...currentRouting.audio, prompt: e.target.value }
                        }
                      };
                      setCurrentSettings(newSettings);
                    }}
                    placeholder="Instruksi sistem untuk transkrip suara & evaluasi audio..."
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-purple-500 leading-relaxed font-sans"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SAVE BUTTON FOR MODALITY ROUTING */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={handleSave}
              className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 cursor-pointer transition"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Konfigurasi Provider &amp; Modality AI</span>
            </button>
          </div>
        </div>
      )}

      {/* GENERAL TAB */}
      {activeTab === 'general' && (
        <form onSubmit={handleSave} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-2xl">
          <h3 className="text-sm font-bold text-white">Variabel Umum Aplikasi</h3>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Nama Aplikasi / Portal</label>
            <input
              type="text"
              value={currentSettings.appName}
              onChange={(e) => setCurrentSettings({ ...currentSettings, appName: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Tahun Ajaran Aktif</label>
            <input
              type="text"
              value={currentSettings.academicYear}
              onChange={(e) => setCurrentSettings({ ...currentSettings, academicYear: e.target.value })}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
            />
          </div>

          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="emailNotif"
              checked={currentSettings.emailNotifications}
              onChange={(e) => setCurrentSettings({ ...currentSettings, emailNotifications: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0"
            />
            <label htmlFor="emailNotif" className="text-xs text-slate-300">
              Kirim Notifikasi Email Otomatis untuk Pengumuman Ujian &amp; Hasil
            </label>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Simpan Pengaturan
          </button>

          {/* RESET DATABASE UNTUK PILOT TESTING */}
          <div className="p-5 rounded-2xl bg-rose-950/20 border border-rose-900/40 space-y-3 mt-6">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
              <Trash2 className="w-4 h-4" />
              Reset Basis Data untuk Pilot Testing (Mulai dari Nol)
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Tindakan ini akan mengosongkan seluruh data sekolah, kelas, guru, siswa, jadwal ujian, dan submission, menyisakan hanya akun Admin (<code className="text-rose-300">admin@app.com</code>) dan Master Paket Soal riset. Seluruh cache browser lokal juga akan dibersihkan.
            </p>
            <button
              type="button"
              onClick={async () => {
                if (confirm('PERINGATAN: Apakah Anda yakin ingin mereset seluruh data (sekolah, kelas, guru, siswa, ujian) menjadi kosong untuk memulai pilot testing baru?')) {
                  try {
                    localStorage.removeItem('voc_registered_users');
                    localStorage.removeItem('voc_teachers');
                    localStorage.removeItem('voc_portfolios');
                    await fetch('/api/admin/reset-database', { method: 'POST' });
                    alert('Basis data berhasil direset bersih ke kondisi awal. Halaman akan dimuat ulang.');
                    window.location.reload();
                  } catch (e) {
                    alert('Gagal menghubungi server untuk reset basis data.');
                  }
                }
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-lg shadow-rose-900/30 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset Bersih Seluruh Data (Fresh State)
            </button>
          </div>
        </form>
      )}

      {/* SPEECH TO TEXT TAB */}
      {activeTab === 'stt' && (
        <form onSubmit={handleSave} className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 max-w-2xl">
          <div className="flex items-center gap-2">
            <Mic className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-bold text-white">Konfigurasi Voice Input (Speech to Text)</h3>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="sttEnable"
              checked={currentSettings.speechToTextEnabled}
              onChange={(e) => setCurrentSettings({ ...currentSettings, speechToTextEnabled: e.target.checked })}
              className="rounded bg-slate-950 border-slate-800 text-amber-600"
            />
            <label htmlFor="sttEnable" className="text-xs text-slate-300">
              Izinkan Siswa/Guru Menggunakan Dikte Suara (Voice-to-Text) untuk Menjawab Esai
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Bahasa Dikte</label>
              <select
                value={currentSettings.speechLanguage}
                onChange={(e) => setCurrentSettings({ ...currentSettings, speechLanguage: e.target.value })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              >
                <option value="id-ID">Bahasa Indonesia (id-ID)</option>
                <option value="en-US">English (en-US)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Sensitivitas Mikrofon</label>
              <select
                value={currentSettings.micSensitivity}
                onChange={(e) => setCurrentSettings({ ...currentSettings, micSensitivity: e.target.value as any })}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs"
              >
                <option value="rendah">Rendah (Filter Bising)</option>
                <option value="sedang">Sedang (Standar Lab)</option>
                <option value="tinggi">Tinggi (Sensitif)</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Simpan Konfigurasi Suara
          </button>
        </form>
      )}

      {/* ARCHIVE TAB */}
      {activeTab === 'archive' && (
        <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Archive className="w-4 h-4 text-purple-400" />
              Kelola &amp; Pemulihan Data Terarsip
            </h3>
            <span className="text-xs text-slate-400">{archives.length} Item Diarsip</span>
          </div>

          {archives.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 bg-slate-950 rounded-xl">
              Tidak ada data dalam arsip saat ini.
            </div>
          ) : (
            <div className="space-y-2">
              {archives.map(item => (
                <div key={item.id} className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between items-center text-xs">
                  <div>
                    <div className="font-bold text-white">{item.title}</div>
                    <div className="text-slate-400 mt-0.5">
                      Diarsip pada: {item.archivedAt} • Alasan: {item.reason}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onRestoreArchive(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-white font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" /> Restore
                    </button>
                    <button
                      onClick={() => onDeleteArchive(item.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-600/20 hover:bg-rose-600 text-rose-300 hover:text-white font-semibold flex items-center gap-1 transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Hapus Permanen
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: ADD / EDIT PROVIDER */}
      {showProviderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">
                {editingProvider ? 'Edit Provider / API Key' : 'Add New Provider / API Key'}
              </h3>
              <button
                onClick={() => setShowProviderModal(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProvider} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Provider Name</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Deepseek v4 Flash"
                  value={providerForm.name}
                  onChange={(e) => setProviderForm({ ...providerForm, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Type</label>
                  <select
                    value={providerForm.type}
                    onChange={(e) => setProviderForm({ ...providerForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Deepseek">Deepseek</option>
                    <option value="Gemini">Gemini</option>
                    <option value="OpenAI">OpenAI</option>
                    <option value="Anthropic">Anthropic</option>
                    <option value="Custom">Custom</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Status</label>
                  <select
                    value={providerForm.status}
                    onChange={(e) => setProviderForm({ ...providerForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500"
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Model Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: deepseek-v4-flash / gemini-2.5-flash"
                  value={providerForm.model}
                  onChange={(e) => setProviderForm({ ...providerForm, model: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">API Key</label>
                <input
                  type="text"
                  placeholder="sk-xxxxxxxxxxxxxxxxxxxxxxxx"
                  value={providerForm.apiKey}
                  onChange={(e) => setProviderForm({ ...providerForm, apiKey: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
                <p className="text-[10px] text-slate-500 mt-1">API key akan disimpan secara terenkripsi.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Base URL (Opsional)</label>
                <input
                  type="text"
                  placeholder="https://api.deepseek.com"
                  value={providerForm.baseUrl}
                  onChange={(e) => setProviderForm({ ...providerForm, baseUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-white text-xs focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowProviderModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold cursor-pointer"
                >
                  Save Provider
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
