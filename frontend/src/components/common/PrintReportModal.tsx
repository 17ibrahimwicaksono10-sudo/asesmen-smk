import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { JobPosition, PortfolioItem } from '../../types';
import { Printer, X, Award } from 'lucide-react';

interface PrintReportModalProps {
  studentName: string;
  studentNis: string;
  className: string;
  schoolName: string;
  targetJob: JobPosition;
  technicalScore: number;
  employabilityScore: number;
  technicalRadarData?: Array<{ skill: string; Student: number; Target: number; fullName?: string }>;
  employabilityRadarData?: Array<{ skill: string; Student: number; Target: number; fullName?: string }>;
  aiResult: any;
  jobFitScore?: number;
  portfolios: PortfolioItem[];
  teacherName?: string;
  teacherNip?: string;
  onClose: () => void;
}

export const PrintReportModal: React.FC<PrintReportModalProps> = ({
  studentName,
  studentNis,
  className,
  schoolName,
  targetJob,
  technicalScore,
  employabilityScore,
  technicalRadarData = [],
  employabilityRadarData = [],
  aiResult,
  jobFitScore,
  portfolios,
  teacherName,
  teacherNip,
  onClose
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handlePrintTrigger = () => {
    window.print();
  };

  return createPortal(
    <div id="print-modal-container" className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex flex-col">
      {/* Actions Bar - always visible at top, never scrolls, hidden during print */}
      <div className="flex-shrink-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
          <Award className="w-5 h-5" />
          <span>Preview Rapor Kesiapan Kerja Vokasi SMK (Tes 6 Dimensi + Non-Tes 9 Aspek)</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrintTrigger}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer shadow-md"
          >
            <Printer className="w-4 h-4" /> Cetak / Simpan PDF
          </button>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Scrollable content area */}
      <div id="print-modal-scroll" className="flex-1 overflow-y-auto p-4 sm:p-8">
        <div id="print-modal-card" className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-4xl mx-auto p-6 sm:p-8 space-y-6 shadow-2xl my-4">

          {/* PRINTABLE DOCUMENT AREA */}
          <div id="printable-report" className="bg-white text-slate-900 p-8 rounded-xl shadow-lg space-y-6 font-sans text-xs">
            {/* Header Document */}
            <div className="border-b-2 border-slate-900 pb-4 flex justify-between items-start print-avoid-break">
              <div>
                <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500">KEMENTERIAN PENDIDIKAN, KEBUDAYAAN, RISET DAN TEKNOLOGI</div>
                <h2 className="text-base font-black text-slate-900 mt-0.5">{(schoolName || 'SMK').toUpperCase()}</h2>
                <p className="text-[11px] text-slate-600">MODEL ASESMEN KOMPETENSI VOKASI KIMIA INDUSTRI & EMPLOYABILITY SKILLS</p>
              </div>
              <div className="text-right">
                <div className="w-10 h-10 rounded-xl bg-slate-900 text-white font-black text-lg flex items-center justify-center ml-auto mb-1">
                  K
                </div>
                <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-300">
                  LDP-SKKNI-2025
                </span>
              </div>
            </div>

            {/* Title */}
            <div className="text-center py-2 bg-slate-100 rounded-lg border border-slate-300 print-avoid-break">
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                RAPOR PROFIL KESIAPAN KERJA (JOB READINESS PROFILE)
              </h1>
            </div>

            {/* Student & Target Job Info */}
            <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-lg border border-slate-200 print-avoid-break">
              <div className="space-y-1">
                <div><strong className="text-slate-600">Nama Siswa:</strong> <span className="font-bold text-slate-900">{studentName}</span></div>
                <div><strong className="text-slate-600">NIS / Identitas:</strong> {studentNis}</div>
                <div><strong className="text-slate-600">Rombel Kelas:</strong> {className}</div>
              </div>
              <div className="space-y-1">
                <div><strong className="text-slate-600">Target Posisi Pekerjaan:</strong> <span className="font-bold text-slate-900">{targetJob.title}</span></div>
                <div><strong className="text-slate-600">Departemen / Unit:</strong> {targetJob.department}</div>
                <div><strong className="text-slate-600">Tingkat Keselarasan (Job Fit):</strong> <span className={`font-black ${(typeof jobFitScore === 'number' ? jobFitScore : (aiResult?.jobFitPercentage ?? 0)) >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>{(typeof jobFitScore === 'number' ? jobFitScore : (aiResult?.jobFitPercentage ?? 0))}%</span></div>
              </div>
            </div>

            {/* 1. Ringkasan Skor Utama */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1">1. Ringkasan Asesmen Tes & Non-Tes</h3>
              <table className="w-full border-collapse border border-slate-300 text-left">
                <thead>
                  <tr className="bg-slate-100 font-bold text-slate-800">
                    <th className="border border-slate-300 p-2">Rumpun Asesmen</th>
                    <th className="border border-slate-300 p-2">Bentuk Instrumen</th>
                    <th className="border border-slate-300 p-2 text-center">Rata-Rata Capaian (%)</th>
                    <th className="border border-slate-300 p-2 text-center">Benchmark DUDI (%)</th>
                    <th className="border border-slate-300 p-2 text-center">Status Kesiapan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-2 font-medium">1. Kemampuan Teknis Kimia</td>
                    <td className="border border-slate-300 p-2 text-slate-600">Tes Komprehensif (24 Soal - 6 Dimensi)</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-900">{technicalScore}%</td>
                    <td className="border border-slate-300 p-2 text-center text-slate-600">80%</td>
                    <td className={`border border-slate-300 p-2 text-center font-bold ${technicalScore >= 80 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {technicalScore >= 80 ? 'SANGAT BAIK' : technicalScore >= 60 ? 'CUKUP' : 'PERLU PEMBEKALAN'}
                    </td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-2 font-medium">2. Employability Skills</td>
                    <td className="border border-slate-300 p-2 text-slate-600">Non-Tes Situasional (18 Butir - 9 Aspek)</td>
                    <td className="border border-slate-300 p-2 text-center font-bold text-slate-900">{employabilityScore}%</td>
                    <td className="border border-slate-300 p-2 text-center text-slate-600">85%</td>
                    <td className={`border border-slate-300 p-2 text-center font-bold ${employabilityScore >= 85 ? 'text-emerald-700' : 'text-amber-700'}`}>
                      {employabilityScore >= 85 ? 'SANGAT TINGGI' : employabilityScore >= 60 ? 'SEDANG' : (employabilityScore === 0 ? 'BELUM ASESMEN' : 'PERLU PENGUATAN')}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* 2. Breakdown 6 Dimensi Tes Teknis Kimia */}
            {technicalRadarData.length > 0 && (
              <div className="space-y-2 print-avoid-break">
                <h3 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1">
                  2. Breakdown Capaian 6 Dimensi Kemampuan Teknis Kimia (Tes 24 Soal)
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-left">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800">
                      <th className="border border-slate-300 p-1.5">No</th>
                      <th className="border border-slate-300 p-1.5">Dimensi Kemampuan Teknis</th>
                      <th className="border border-slate-300 p-1.5 text-center">Skor Siswa (%)</th>
                      <th className="border border-slate-300 p-1.5 text-center">Target DUDI (%)</th>
                      <th className="border border-slate-300 p-1.5 text-center">Gap Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {technicalRadarData.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 font-medium">{item.fullName || item.skill}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold">{item.Student}%</td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-600">{item.Target}%</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold font-mono">
                          {item.Student - item.Target >= 0 ? `+${item.Student - item.Target}%` : `${item.Student - item.Target}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 3. Breakdown 9 Aspek Employability Skills Non-Tes */}
            {employabilityRadarData.length > 0 && (
              <div className="space-y-2 print-avoid-break">
                <h3 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1">
                  3. Breakdown Capaian 9 Aspek Employability Skills (Non-Tes 18 Butir)
                </h3>
                <table className="w-full border-collapse border border-slate-300 text-left">
                  <thead>
                    <tr className="bg-slate-100 font-bold text-slate-800">
                      <th className="border border-slate-300 p-1.5">No</th>
                      <th className="border border-slate-300 p-1.5">Aspek Employability Skills</th>
                      <th className="border border-slate-300 p-1.5 text-center">Skor Siswa (%)</th>
                      <th className="border border-slate-300 p-1.5 text-center">Target DUDI (%)</th>
                      <th className="border border-slate-300 p-1.5 text-center">Gap Delta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {employabilityRadarData.map((item, idx) => (
                      <tr key={idx}>
                        <td className="border border-slate-300 p-1.5 text-center font-mono">{idx + 1}</td>
                        <td className="border border-slate-300 p-1.5 font-medium">{item.fullName || item.skill}</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold">{item.Student}%</td>
                        <td className="border border-slate-300 p-1.5 text-center text-slate-600">{item.Target}%</td>
                        <td className="border border-slate-300 p-1.5 text-center font-bold font-mono">
                          {item.Student - item.Target >= 0 ? `+${item.Student - item.Target}%` : `${item.Student - item.Target}%`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* 4. AI Gap & Remedial Notes */}
            <div className="space-y-2 print-avoid-break">
              <h3 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1">4. Catatan Pembekalan</h3>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <p className="italic text-slate-700">"{aiResult?.summary || 'Siswa menunjukkan kesiapan tinggi untuk penempatan magang industri.'}"</p>
                {aiResult?.remedialActions && (
                  <div className="pt-2 border-t border-slate-200 space-y-1">
                    <strong className="text-slate-800">Rencana Pembekalan Lanjutan:</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-slate-700">
                      {aiResult.remedialActions.map((act: any, idx: number) => (
                        <li key={idx}><strong>{act.title}:</strong> {act.detail}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* 5. Portfolios & Practicum Table */}
            <div className="space-y-3 print-avoid-break">
              <h3 className="font-bold text-slate-900 uppercase border-b border-slate-300 pb-1">
                5. Lampiran Portofolio, Sertifikasi & Laporan Praktikum
              </h3>
              
              {/* Sub-A: Sertifikat Kompetensi */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-800">A. Sertifikat Kompetensi & Pelatihan:</div>
                {portfolios.filter(p => p.category !== 'laporan_praktikum').length === 0 ? (
                  <div className="text-[10px] text-slate-500 italic p-1.5 bg-slate-50 rounded border border-slate-200">
                    Tidak ada sertifikat kompetensi terlampir.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {portfolios.filter(p => p.category !== 'laporan_praktikum').map(p => (
                      <div key={p.id} className="p-2 border border-slate-200 rounded bg-slate-50 text-[11px]">
                        <div className="font-bold text-slate-900">{p.title}</div>
                        <div className="text-[10px] text-slate-600">{p.issuer} • {p.date}</div>
                        {p.isValidatedByTeacher && (
                          <div className="text-[9px] font-semibold text-emerald-700 mt-0.5">✓ Terverifikasi Guru / Admin</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sub-B: Laporan Praktikum Kimia (Maks 3 Dokumen) */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold text-slate-800">
                  B. Laporan Praktikum Kimia Laboratorium (Maks 3 Dokumen):
                </div>
                {portfolios.filter(p => p.category === 'laporan_praktikum').length === 0 ? (
                  <div className="text-[10px] text-slate-500 italic p-1.5 bg-slate-50 rounded border border-slate-200">
                    Tidak ada laporan praktikum terlampir.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {portfolios.filter(p => p.category === 'laporan_praktikum').map(p => (
                      <div key={p.id} className="p-2 border border-emerald-200 rounded bg-emerald-50/50 text-[11px]">
                        <div className="font-bold text-slate-900 flex items-center justify-between gap-1">
                          <span>{p.title}</span>
                          <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-200 text-emerald-900 font-bold shrink-0">PDF</span>
                        </div>
                        {p.practicumTopic && (
                          <div className="text-[10px] text-emerald-800">Topik: {p.practicumTopic}</div>
                        )}
                        <div className="text-[10px] text-slate-600">Lab: {p.issuer} • {p.date}</div>
                        {p.isValidatedByTeacher && (
                          <div className="text-[9px] font-semibold text-emerald-700 mt-0.5">✓ Terverifikasi Guru / Admin</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Signatures Footer */}
            <div className="pt-8 grid grid-cols-2 text-center text-slate-800 print-avoid-break">
              <div>
                <div className="text-[11px]">Siswa Peserta,</div>
                <div className="h-12"></div>
                <div className="font-bold underline">{studentName || '................................'}</div>
                <div className="text-[10px] text-slate-500">NIS: {studentNis || '....................'}</div>
              </div>
              <div>
                <div className="text-[11px]">Guru Pembimbing Vokasi,</div>
                <div className="h-12"></div>
                <div className="font-bold underline">{teacherName || '(........................................)'}</div>
                <div className="text-[10px] text-slate-500">NIP: {teacherNip || '................................'}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
