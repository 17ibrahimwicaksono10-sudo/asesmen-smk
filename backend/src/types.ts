export type Role = 'admin' | 'guru' | 'siswa';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  identityNo: string; // NIS or NIP
  schoolId?: string;
  schoolName?: string;
  classId?: string;
  className?: string;
  targetJobTitle?: string;
  phone?: string;
  password?: string;
  assignedClassIds?: string[];
}

export interface School {
  id: string;
  name: string;
  code: string;
  address: string;
  totalClasses: number;
  totalTeachers: number;
  totalStudents: number;
}

export interface ClassRoom {
  id: string;
  name: string;
  schoolId: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  academicYear: string;
  studentCount: number;
  examCount: number;
  classCode: string;
}

export interface Teacher {
  id: string;
  name: string;
  identityNo: string; // NIP
  schoolId: string;
  schoolName: string;
  email: string;
  phone: string;
  password?: string;
  assignedClassIds: string[];
}

export type QuestionCategory = 'teknis_kimia' | 'employability';

export type QuestionType =
  | 'multiple_choice'
  | 'complex_mcq'
  | 'matching'
  | 'short_answer'
  | 'essay'
  | 'essay_subquestions'
  | 'scenario_assessment'
  | 'analisis_kasus';

export interface SubQuestion {
  id: string;
  text: string;
  points: number;
  answerKey: string;
  rubric: string;
}

export interface StatementItem {
  id: string;
  text: string;
  statement?: string;
  options: string[]; // e.g. ['Sesuai', 'Tidak Sesuai'] or ['Tepat', 'Tidak Tepat'] or ['Benar', 'Salah']
  correctAnswer: string;
}

export interface MatchingItem {
  id: string;
  columnAText: string;
  correctMatch: string; // text from column B
}

export interface RubricComponent {
  name: string;
  maxPoints: number;
  criteria: string;
}

export interface QuestionItem {
  id: string;
  code: string;
  number?: number;
  category: QuestionCategory;
  dimensionId?: 'k3lh' | 'persiapan_analisis' | 'stoikiometri' | 'volumetri' | 'instrumentasi' | 'manajemen_mutu';
  dimensionName?: string;
  topic: string;
  indicator?: string;
  context?: string;
  cognitiveLevel?: 'C3' | 'C4' | 'C5' | string;
  stimulus?: string;
  questionText: string;
  type: QuestionType;
  options?: string[];
  correctAnswer?: string;
  correctAnswers?: string[];
  statements?: StatementItem[];
  matchingColumnA?: MatchingItem[];
  matchingColumnB?: string[];
  shortAnswerKey?: string;
  shortAnswerKey2?: string;
  unit?: string;
  calculationPrompt?: string;
  sampleAnswer?: string;
  rubricGuide?: string;
  rubricComponents?: RubricComponent[];
  subQuestions?: SubQuestion[];
  points?: number;
  maxScore?: number;
  requiresMultimodal?: boolean;
  allowedEvidenceTypes?: string[];
  instructions?: string;
  contextText?: string;
  dataTables?: any[];
}

export interface QuestionPackage {
  id: string;
  code: string;
  title: string;
  description: string;
  category: QuestionCategory;
  durationMinutes: number;
  totalQuestions: number;
  questions: QuestionItem[];
  isActive: boolean;
  version?: number;
  createdAt: string;
  createdBy: string;
}

export type ExamStatus = 'terjadwal' | 'berjalan' | 'selesai';

export interface Exam {
  id: string;
  title: string;
  packageId: string;
  packageTitle: string;
  packageVersion?: number;
  questionSnapshot?: QuestionItem[];
  category: QuestionCategory;
  classId: string;
  className: string;
  schoolId: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  targetScore: number;
  status: ExamStatus;
  randomizeQuestions?: boolean; // Opsi acak urutan soal untuk setiap siswa
  totalStudents: number;
  completedStudents: number;
}

export type AIGradingStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type ModalityType = 'audio' | 'handwriting' | 'document' | 'tulisan_tangan' | 'image';

export interface UnreadableFlag {
  segment: string;
  reason: string;
  confidence: number;
}

export interface ExtractionArtifact {
  artifactId: string;
  sourceEvidenceId: string;
  sourceFileHash?: string;        // SHA-256 cryptographic checksum of original raw file
  sourceFileName: string;         // Original file name
  sourceStorageUrl?: string;      // Persistent URL pointing to original file
  engine: string;                 // Processing engine (e.g. STT / OCR)
  processedAt: string;            // Timestamp
  extractedText: string;          // Extracted text content
  status: 'pending' | 'completed' | 'failed' | 'extraction_failed' | 'warning';
  qualityStatus: 'pass' | 'warning' | 'fail';
  qualityIssues: string[];
  unreadableFlags: UnreadableFlag[];
  confidenceScore?: number;
}

export interface MultimodalEvidence {
  id: string;
  studentNis: string;
  studentName: string;
  uploadTime: string;
  examId?: string;
  questionId: string;
  modalityType: ModalityType;
  fileName: string;
  fileSize: number; // bytes
  mimeType: string;
  fileData?: string; // base64 or dataUrl (persisted in safe store)
  previewUrl?: string; // preview URL (storageUrl or dataUrl, never rely on temporary blob alone)
  audioDurationSeconds?: number;
  
  // Audit-Ready & Storage Traceability (Jaminan Bukti Asli Persisten)
  storageUrl?: string;       // URL persisten ke server arsip (e.g. /api/evidence/file/...)
  storagePath?: string;      // Path fisik penyimpanan pada server
  fileHash?: string;         // SHA-256 checksum untuk pembuktian keaslian (tamper-evident audit)
  isArchived?: boolean;      // Status tersimpan dalam repositori arsip persisten

  // Artefak Ekstraksi Terpisah (Separation of Raw Evidence vs Derivative STT/OCR Artifact)
  extractionArtifact?: ExtractionArtifact;

  // Tahap 4: Pemrosesan Multimodal (Backward-compatible fields)
  extractedText?: string;
  extractionStatus?: 'saved' | 'pending' | 'completed' | 'failed' | 'extraction_failed' | 'warning';
  extractionTimestamp?: string;
  qualityStatus?: 'pass' | 'warning' | 'fail';
  qualityIssues?: string[];
  unreadableFlags?: UnreadableFlag[];
}

export interface IndicatorScore {
  indicatorName: string;
  maxPoints: number;
  scoreGiven: number;
  rationale: string;
}

export interface EvidenceHighlight {
  quote: string;
  sourceModality: 'teks' | 'audio' | 'tulisan_tangan' | 'dokumen';
  supportingIndicator: string;
  relevanceExplanation: string;
}

export interface AIRubricScoreResult {
  evaluatedAt: string;
  modelUsed: string;
  promptVersion: string;
  totalScoreGiven: number;
  maxTotalScore: number;
  scoresPerIndicator: IndicatorScore[];
  evidenceHighlights: EvidenceHighlight[];
  confidenceStatus: 'Sangat Yakin' | 'Yakin Cukup' | 'Ragu / Perlu Review Guru';
  confidenceLevel: 'high' | 'medium' | 'low';
  uncertaintyReason?: string;
  requiresTeacherReview: boolean;
  constructiveFeedback: string;
  keyMasteredConcepts: string[];
  areasForImprovement: string[];
}

export interface Exam {
  id: string;
  title: string;
  packageId: string;
  packageTitle: string;
  category: QuestionCategory;
  classId: string;
  className: string;
  schoolId: string;
  schoolName: string;
  teacherId: string;
  teacherName: string;
  scheduleDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  targetScore: number;
  status: ExamStatus;
  aiGradingStatus?: AIGradingStatus;
  totalStudents: number;
  completedStudents: number;
}

export interface StudentAnswer {
  questionId: string;
  selectedOption?: string;
  selectedOptions?: string[]; // Pilihan Ganda Kompleks checkbox answers
  complexAnswers?: Record<string, string>; // statementId -> answer
  matchingAnswers?: Record<string, string>; // columnAId -> columnB text
  shortAnswerText?: string;
  shortAnswerCalculation?: string;
  essayAnswer?: string;
  subQuestionAnswers?: Record<string, string>;
  multimodalEvidences?: MultimodalEvidence[];
  aiRubricScoring?: AIRubricScoreResult;
  score?: number;
  maxScore?: number;
  teacherFeedback?: string;
}

export type TeacherAction = 'approve' | 'revise' | 'return';

export interface IndicatorEditChange {
  indicatorName: string;
  aiScore: number;
  teacherScore: number;
  reason?: string;
}

export interface TeacherEditLog {
  id: string;
  submissionId: string;
  examId: string;
  questionId: string;
  studentNis: string;
  studentName: string;
  originalAIScore: number;
  finalTeacherScore: number;
  teacherId: string;
  teacherName: string;
  timestamp: string;
  actionTaken: TeacherAction;
  reason: string;
  indicatorChanges?: IndicatorEditChange[];
}

export interface ReassessmentCycleItem {
  id: string;
  attemptNumber: number;
  date: string;
  examTitle: string;
  technicalScore: number;
  employabilityScore: number;
  verifiedEvidencesCount: number;
  notes: string;
}

export interface ExamSubmission {
  id: string;
  examId: string;
  examTitle: string;
  packageId?: string;
  packageTitle?: string;
  packageVersion?: number;
  questionSnapshot?: QuestionItem[];
  studentId: string;
  studentName: string;
  studentNis: string;
  studentEmail?: string;
  schoolId?: string;
  schoolName?: string;
  classId?: string;
  className: string;
  submitTime: string;
  attemptNumber?: number;
  allowRetake?: boolean;
  answers: Record<string, StudentAnswer>;
  totalScore: number;
  rawScoreTotal?: number;
  maxRawScore?: number;
  technicalScore: number;
  employabilityScore: number;
  autoScore?: number;
  essayScore?: number;
  originalAIScoreTotal?: number; // Preserves raw AI score for audit comparison
  teacherScoreTotal?: number;    // Final score confirmed by human teacher
  status: 'perlu_pemeriksaan' | 'dinilai';
  validationStatus?: 'pending_review' | 'approved' | 'revised' | 'returned';
  validatedBy?: string;          // Teacher name/NIP validator identity
  validatedAt?: string;          // Timestamp of teacher validation
  aiGradingStatus?: AIGradingStatus;
  aiGradedAt?: string;
  teacherFollowUp?: string;
  aiEvaluation?: string;
  evidences?: MultimodalEvidence[];
  aiScoringSummary?: Record<string, AIRubricScoreResult>;
  requiresTeacherReview?: boolean;
  teacherEditLogs?: TeacherEditLog[];
  correctionTimeSeconds?: number; // Time saved during grading
}

export interface ResearchAnalyticsSummary {
  totalSubmissionsEvaluated: number;
  totalAIQuestionsGraded: number;
  teacherApprovalRate: number; // %
  teacherRevisionRate: number; // %
  averageCorrectionTimeManualSeconds: number;
  averageCorrectionTimeAIAssistedSeconds: number;
  timeEfficiencyImprovementPercent: number; // %
  weightedCohensKappa: number;
  iccScore: number;
  maeScore: number;
  rmseScore: number;
  qualityGateWarningRate: number; // %
}

export interface JobPosition {
  id: string;
  title: string;
  department: string;
  description: string;
  requiredTechnicalSkills: Record<string, number>; // skillName -> score benchmark (1-100)
  requiredEmployabilitySkills: Record<string, number>;
}

export type PortfolioCategory = 'sertifikat' | 'pkl' | 'proyek' | 'uji_kompetensi' | 'laporan_praktikum';

export interface PortfolioItem {
  id: string;
  studentId: string;
  title: string;
  category: PortfolioCategory;
  issuer: string;
  date: string;
  description: string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: number;
  pdfBase64?: string;
  targetJobTitle?: string;
  aiScore?: number;
  aiRelevance?: 'Sangat Tinggi' | 'Tinggi' | 'Cukup' | 'Dasar' | 'Rendah';
  aiFeedback?: string;
  aiEvaluatedAt?: string;
  aiKeySkills?: string[];
  isVerified?: boolean;
  isValidatedByTeacher?: boolean;
  verifiedByTeacher?: string;
  validatedAt?: string;
  teacherNotes?: string;
  linkedEvidenceId?: string;
  practicumTopic?: string;
  gradeScore?: number;
}

export interface AIProviderConfig {
  id: string;
  name: string;
  type: 'Deepseek' | 'Gemini' | 'OpenAI' | 'Anthropic' | 'Custom';
  model: string;
  apiKey: string;
  baseUrl?: string;
  status: 'Active' | 'Inactive';
}

export interface ModalityRoutingSetting {
  mode: string;
  providerId: string;
  prompt: string;
}

export interface ModalityRoutingConfig {
  text: ModalityRoutingSetting;
  image: ModalityRoutingSetting;
  audio: ModalityRoutingSetting;
}

export interface SystemSettings {
  appName: string;
  academicYear: string;
  emailNotifications: boolean;
  geminiModel: string;
  autoGradeEssays: boolean;
  aiReadinessAnalysis: boolean;
  speechToTextEnabled: boolean;
  speechLanguage: string;
  micSensitivity: 'rendah' | 'sedang' | 'tinggi';
  providers?: AIProviderConfig[];
  modalityRouting?: ModalityRoutingConfig;
  deepseekApiKey?: string;
  deepseekModel?: string;
  deepseekEnabled?: boolean;
  deepseekBaseUrl?: string;
}

export interface ArchivedItem {
  id: string;
  type: 'paket_soal' | 'ujian' | 'pengguna';
  title: string;
  archivedAt: string;
  reason: string;
}

export interface StudentReadinessProfileData {
  studentId: string;
  studentName: string;
  studentNis: string;
  targetJobId: string;
  targetJobTitle: string;
  aiResult?: any;
  deepProfileResult?: any;
  aiProvider?: string;
  deepProfileProvider?: string;
  isTeacherValidated: boolean;
  teacherApprovalStatus?: 'approved' | 'revised' | 'rejected';
  teacherNotes?: string;
  validatedBy?: string;
  validatedAt?: string;
}



