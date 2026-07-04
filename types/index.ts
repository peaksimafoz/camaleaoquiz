// ── Modelo de dados da plataforma de quiz ─────────────────────────────────────

export type QuizType = 'A' | 'B'
export type QuizStatus = 'draft' | 'active'
export type QuestionType = 'multiple_choice' | 'scale' | 'text'
export type LeadCapturePosition = 'start' | 'middle' | 'end'
export type EventType =
  | 'view'
  | 'start'
  | 'question_answered'
  | 'completed'
  | 'abandoned'

export interface QuizSettings {
  intro_title?: string
  intro_subtitle?: string
  intro_cta?: string
  primary_color?: string
  logo_url?: string
  // Categorias de pontuação do quiz (ex.: 'comunicacao', 'lideranca'). As opções
  // das perguntas somam pesos nessas categorias; os resultados usam-nas para
  // decidir qual mostrar (categoria vencedora / faixa de pontos).
  categories?: string[]
  // Quais campos de contato coletar na captura de lead
  collect_name?: boolean
  collect_email?: boolean
  collect_whatsapp?: boolean
}

export interface Quiz {
  id: string
  name: string
  slug: string
  type: QuizType
  status: QuizStatus
  webhook_url: string | null
  lead_capture_position: LeadCapturePosition
  settings: QuizSettings
  created_at: string
  updated_at: string
}

// ── Perguntas ────────────────────────────────────────────────────────────────
// O campo `options` (jsonb) muda de formato conforme o `type`:

// multiple_choice → Option[]
export interface Option {
  id: string
  label: string
  // Lógica condicional: pular para outra pergunta OU encerrar num resultado.
  // Se ambos vazios, segue para a próxima pergunta na ordem.
  next_question_id?: string | null
  end_result_id?: string | null
  // Pontuação: soma `peso` em cada categoria quando esta opção é escolhida.
  scores?: Record<string, number>
}

// scale → ScaleConfig
export interface ScaleConfig {
  min: number
  max: number
  min_label?: string
  max_label?: string
  // Pontos escolhidos × peso, por categoria (opcional).
  scores_per_point?: Record<string, number>
}

// text → TextConfig (não pontua)
export interface TextConfig {
  placeholder?: string
}

export type QuestionOptions = Option[] | ScaleConfig | TextConfig

export interface Question {
  id: string
  quiz_id: string
  order: number
  text: string
  type: QuestionType
  options: QuestionOptions
}

// ── Resultados ───────────────────────────────────────────────────────────────
// Avaliados por `order`; o primeiro que casar vence. Um resultado com
// score_condition vazio ({}) serve de fallback (deve ficar por último).
// Interface única (não union) para não quebrar o narrowing do TypeScript:
//   - winning_category preenchido → vence a categoria de maior pontuação
//   - category preenchido → faixa de pontos [min, max] naquela categoria
//   - tudo vazio ({}) → fallback (sempre casa)
export interface ScoreCondition {
  winning_category?: string
  category?: string
  min?: number
  max?: number
}

export interface Result {
  id: string
  quiz_id: string
  name: string
  text: string
  cta_label: string | null
  cta_url: string | null
  score_condition: ScoreCondition
  order: number
}

// ── Leads e eventos ──────────────────────────────────────────────────────────
export interface Lead {
  id: string
  quiz_id: string
  name: string | null
  email: string | null
  whatsapp: string | null
  answers: Record<string, unknown>
  scores: Record<string, number>
  result_id: string | null
  created_at: string
}

export interface QuizEvent {
  id: string
  quiz_id: string
  lead_id: string | null
  event_type: EventType
  question_id: string | null
  created_at: string
}

// Payload que a página pública consome (quiz ativo + perguntas + resultados).
export interface PublicQuiz {
  quiz: Quiz
  questions: Question[]
  results: Result[]
}
