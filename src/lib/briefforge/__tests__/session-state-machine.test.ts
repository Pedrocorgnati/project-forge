import { describe, it, expect } from 'vitest'
import { SessionStateMachine, InvalidTransitionError, MAX_QUESTIONS } from '../session-state-machine'

describe('SessionStateMachine', () => {
  const makeQuestions = (count: number, answered = true) =>
    Array.from({ length: count }, (_, i) => ({
      answerText: answered ? `resposta ${i + 1}` : null,
    }))

  describe('canContinue', () => {
    it('ACTIVE com 6 respostas → true', () => {
      expect(
        SessionStateMachine.canContinue({ status: 'ACTIVE', questions: makeQuestions(6) }),
      ).toBe(true)
    })

    it('ACTIVE com 7 respostas → false (atingiu MAX_QUESTIONS)', () => {
      expect(
        SessionStateMachine.canContinue({ status: 'ACTIVE', questions: makeQuestions(7) }),
      ).toBe(false)
    })

    it('CANCELLED independente de questionCount → false', () => {
      expect(
        SessionStateMachine.canContinue({ status: 'CANCELLED', questions: [] }),
      ).toBe(false)
    })

    it('COMPLETED → false', () => {
      expect(
        SessionStateMachine.canContinue({ status: 'COMPLETED', questions: makeQuestions(7) }),
      ).toBe(false)
    })

    it('ACTIVE com 0 respostas → true', () => {
      expect(
        SessionStateMachine.canContinue({ status: 'ACTIVE', questions: [] }),
      ).toBe(true)
    })

    it('Perguntas não respondidas (answerText: null) não contam', () => {
      const questions = [
        { answerText: 'resposta 1' },
        { answerText: null },
        { answerText: null },
      ]
      expect(SessionStateMachine.canContinue({ status: 'ACTIVE', questions })).toBe(true)
    })
  })

  describe('shouldComplete', () => {
    it(`${MAX_QUESTIONS} respostas → true`, () => {
      expect(
        SessionStateMachine.shouldComplete({ questions: makeQuestions(MAX_QUESTIONS) }),
      ).toBe(true)
    })

    it('0 respostas → false', () => {
      expect(SessionStateMachine.shouldComplete({ questions: [] })).toBe(false)
    })

    it(`${MAX_QUESTIONS - 1} respostas → false`, () => {
      expect(
        SessionStateMachine.shouldComplete({ questions: makeQuestions(MAX_QUESTIONS - 1) }),
      ).toBe(false)
    })
  })

  describe('assertTransition', () => {
    it('ACTIVE → COMPLETED: válido', () => {
      expect(() => SessionStateMachine.assertTransition('ACTIVE', 'COMPLETED')).not.toThrow()
    })

    it('ACTIVE → CANCELLED: válido', () => {
      expect(() => SessionStateMachine.assertTransition('ACTIVE', 'CANCELLED')).not.toThrow()
    })

    it('COMPLETED → ACTIVE: lança InvalidTransitionError', () => {
      expect(() => SessionStateMachine.assertTransition('COMPLETED', 'ACTIVE')).toThrow(
        InvalidTransitionError,
      )
    })

    it('COMPLETED → CANCELLED: lança InvalidTransitionError', () => {
      expect(() => SessionStateMachine.assertTransition('COMPLETED', 'CANCELLED')).toThrow(
        InvalidTransitionError,
      )
    })

    it('CANCELLED → COMPLETED: lança InvalidTransitionError', () => {
      expect(() => SessionStateMachine.assertTransition('CANCELLED', 'COMPLETED')).toThrow(
        InvalidTransitionError,
      )
    })

    it('InvalidTransitionError tem name correto', () => {
      try {
        SessionStateMachine.assertTransition('COMPLETED', 'ACTIVE')
        expect.unreachable('Deveria ter lançado')
      } catch (err) {
        expect(err).toBeInstanceOf(InvalidTransitionError)
        expect((err as Error).name).toBe('InvalidTransitionError')
      }
    })
  })
})
