import type { Brief, BriefSession, BriefQuestion } from '@/types/briefforge'

export function createBriefFixture(overrides: Partial<Brief> = {}): Brief {
  return {
    id: 'brief_test_001',
    projectId: 'proj_test_001',
    status: 'DRAFT',
    aiMetadata: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    ...overrides,
  }
}

export function createSessionFixture(overrides: Partial<BriefSession> = {}): BriefSession {
  return {
    id: 'session_test_001',
    briefId: 'brief_test_001',
    status: 'ACTIVE',
    startedAt: new Date('2026-01-01'),
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    questions: [],
    ...overrides,
  }
}

export function createQuestionFixture(order: number, overrides: Partial<BriefQuestion> = {}): BriefQuestion {
  return {
    id: `question_test_${String(order).padStart(3, '0')}`,
    sessionId: 'session_test_001',
    order,
    questionText: `Pergunta de teste número ${order}?`,
    answerText: null,
    aiMetadata: null,
    createdAt: new Date('2026-01-01'),
    answeredAt: null,
    ...overrides,
  }
}

export function createAnsweredQuestion(order: number, answer: string): BriefQuestion {
  return createQuestionFixture(order, {
    answerText: answer,
    answeredAt: new Date('2026-01-01'),
  })
}
