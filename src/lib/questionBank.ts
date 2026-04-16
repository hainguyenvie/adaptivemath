import questionBankJson from '../data/questions.json'
import type { Question, QuestionBank } from '../types/question'

/**
 * Typed handle on the JSON bundle produced by `npm run build:questions`.
 *
 * The JSON import is untyped so we validate the shape once here and expose
 * a typed object to the rest of the app.
 */
export const QUESTION_BANK: QuestionBank = questionBankJson as QuestionBank

/**
 * Return every question that matches the given grade and is usable in CAT.
 *
 * We include questions that have extracted TikZ sources — the renderer now
 * shows a "[Hình vẽ đi kèm]" placeholder + raw code, so the learner can at
 * least read the prompt. Pure-essay questions (no answer macro) are excluded
 * automatically because they have status !== 'ok'.
 */
export function getPoolForGrade(grade: 10 | 11 | 12): Question[] {
  return QUESTION_BANK.questions.filter(
    (q) => q.grade === grade && q.type !== 'essay',
  )
}
