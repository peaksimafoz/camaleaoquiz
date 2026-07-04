import { QuizEditor } from '@/components/quizzes/QuizEditor'

export default function QuizEditorPage({ params }: { params: { id: string } }) {
  return <QuizEditor quizId={params.id} />
}
