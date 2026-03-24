import { describe, it, expect } from 'vitest'
import {
  GitHubApiUnreachableError,
  GitHubTokenInvalidError,
  GitHubRepoNotFoundError,
  mapGitHubError,
} from '../github-errors'

describe('github-errors', () => {
  describe('GitHubApiUnreachableError', () => {
    it('tem code HANDOFF_060', () => {
      const err = new GitHubApiUnreachableError(new TypeError('Failed to fetch'))
      expect(err.code).toBe('HANDOFF_060')
      expect(err.message).toContain('inacessível')
      expect(err.message).toContain('Failed to fetch')
    })

    it('aceita cause undefined', () => {
      const err = new GitHubApiUnreachableError()
      expect(err.code).toBe('HANDOFF_060')
      expect(err.message).toContain('network error')
    })
  })

  describe('GitHubTokenInvalidError', () => {
    it('tem code HANDOFF_061', () => {
      const err = new GitHubTokenInvalidError()
      expect(err.code).toBe('HANDOFF_061')
      expect(err.message).toContain('GITHUB_TOKEN')
    })
  })

  describe('GitHubRepoNotFoundError', () => {
    it('tem code HANDOFF_062 e inclui repoUrl', () => {
      const url = 'https://github.com/owner/repo'
      const err = new GitHubRepoNotFoundError(url)
      expect(err.code).toBe('HANDOFF_062')
      expect(err.message).toContain(url)
    })
  })

  describe('mapGitHubError', () => {
    it('401 → GitHubTokenInvalidError', () => {
      expect(() => mapGitHubError(401, 'url')).toThrow(GitHubTokenInvalidError)
    })

    it('404 → GitHubRepoNotFoundError', () => {
      expect(() => mapGitHubError(404, 'url')).toThrow(GitHubRepoNotFoundError)
    })

    it('status inesperado → Error genérico com status', () => {
      expect(() => mapGitHubError(503, 'url')).toThrow('HTTP 503')
    })
  })
})
