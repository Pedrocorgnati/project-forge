'use client'

import { useRef, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Send } from 'lucide-react'
import { Textarea } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { TIMING } from '@/lib/constants/timing'

const answerSchema = z.object({
  answer: z
    .string()
    .trim()
    .min(10, 'Resposta muito curta (mínimo 10 caracteres)')
    .max(2000, 'Resposta muito longa (máximo 2000 caracteres)'),
})

type AnswerFormData = z.infer<typeof answerSchema>

interface AnswerInputProps {
  onSubmit: (answer: string) => void | Promise<void>
  isLoading?: boolean
  disabled?: boolean
}

export function AnswerInput({ onSubmit, isLoading = false, disabled = false }: AnswerInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<AnswerFormData>({
    resolver: zodResolver(answerSchema),
    defaultValues: { answer: '' },
  })

  const answerValue = watch('answer')
  const charCount = answerValue?.length ?? 0

  const charCountColor = cn(
    'text-xs transition-colors',
    charCount >= 2000
      ? 'text-red-500 dark:text-red-400'
      : charCount > 1800
        ? 'text-amber-500 dark:text-amber-400'
        : 'text-slate-400',
  )

  const { ref: formRef, ...registerRest } = register('answer')

  const handleFormSubmit = handleSubmit(async (data) => {
    await onSubmit(data.answer)
    reset()
    // Devolver foco ao textarea após envio
    setTimeout(() => textareaRef.current?.focus(), TIMING.FOCUS_DELAY_MS)
  })

  // Foco inicial no textarea quando habilitar
  useEffect(() => {
    if (!isLoading && !disabled) {
      textareaRef.current?.focus()
    }
  }, [isLoading, disabled])

  const errorId = errors.answer ? 'answer-error' : undefined
  const counterId = 'answer-counter'

  return (
    <form
      onSubmit={handleFormSubmit}
      data-testid="briefforge-input-area"
      className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-3"
    >
      <Textarea
        data-testid="briefforge-answer-input"
        placeholder="Digite sua resposta..."
        disabled={isLoading || disabled}
        rows={3}
        maxLength={2000}
        className="resize-none border-0 shadow-none focus:ring-0 p-0"
        aria-describedby={[errorId, counterId].filter(Boolean).join(' ')}
        aria-invalid={errors.answer ? 'true' : undefined}
        ref={(el) => {
          formRef(el)
          ;(textareaRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el
        }}
        {...registerRest}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleFormSubmit()
          }
        }}
      />

      {errors.answer && (
        <p id="answer-error" className="text-xs text-red-500 dark:text-red-400 mt-1" role="alert">
          {errors.answer.message}
        </p>
      )}

      <div className="flex items-center justify-between mt-2">
        <span id={counterId} className={charCountColor} aria-live="off">
          {charCount}/2000
        </span>
        <Button
          type="submit"
          data-testid="briefforge-send-button"
          variant="primary"
          size="sm"
          disabled={isLoading || disabled}
          loading={isLoading}
        >
          <Send size={14} aria-hidden="true" />
          Enviar
        </Button>
      </div>
    </form>
  )
}
