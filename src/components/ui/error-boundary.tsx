'use client'

import { Component, ReactNode } from 'react'
import * as Sentry from '@sentry/nextjs'
import { ErrorState } from './error-state'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    Sentry.captureException(error, { extra: { componentStack: info.componentStack } })
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <ErrorState
          title="Algo deu errado"
          description="Um erro inesperado ocorreu neste componente."
          retryFn={() => {
            this.setState({ hasError: false })
            window.location.reload()
          }}
          variant="retry"
        />
      )
    }

    return this.props.children
  }
}
