// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
import { ConfidenceBadge } from '@/components/estimates/confidence-badge'
import { RangeDisplay } from '@/components/estimates/range-display'
import { EstimateItemTable } from '@/components/estimates/estimate-item-table'
import { EstimateStatusBadge } from '@/components/estimates/estimate-status-badge'

expect.extend(toHaveNoViolations)

const mockItems = [
  {
    id: 'i1',
    category: 'backend-api',
    description: 'API REST',
    hoursMin: 20,
    hoursMax: 40,
    hourlyRate: 210,
    riskFactor: 1.1,
    costMin: 4620,
    costMax: 9240,
  },
]

describe('Estimate components — Axe accessibility audit', () => {
  it('ConfidenceBadge HIGH has no accessibility violations', async () => {
    const { container } = render(<ConfidenceBadge confidence="HIGH" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('ConfidenceBadge MEDIUM has no accessibility violations', async () => {
    const { container } = render(<ConfidenceBadge confidence="MEDIUM" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('ConfidenceBadge LOW has no accessibility violations', async () => {
    const { container } = render(<ConfidenceBadge confidence="LOW" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('RangeDisplay has no accessibility violations (role=img + aria-label)', async () => {
    const { container } = render(<RangeDisplay min={20} max={40} unit="h" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('EstimateItemTable has no accessibility violations (th scope, caption)', async () => {
    const { container } = render(<EstimateItemTable items={mockItems} />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })

  it('EstimateStatusBadge GENERATING has no accessibility violations', async () => {
    const { container } = render(<EstimateStatusBadge status="GENERATING" />)
    const results = await axe(container)
    expect(results).toHaveNoViolations()
  })
})

describe('Specific a11y requirements', () => {
  it('ConfidenceBadge has aria-label with confidence level', () => {
    const { container } = render(<ConfidenceBadge confidence="LOW" />)
    const badge = container.querySelector('[aria-label]')
    expect(badge?.getAttribute('aria-label')).toContain('Baixa')
  })

  it('RangeDisplay has role="img"', () => {
    const { container } = render(<RangeDisplay min={10} max={50} unit="h" />)
    const bar = container.querySelector('[role="img"]')
    expect(bar).not.toBeNull()
  })

  it('RangeDisplay fill and midpoint markers are aria-hidden', () => {
    const { container } = render(<RangeDisplay min={10} max={50} unit="h" />)
    const hiddenElements = container.querySelectorAll('[aria-hidden="true"]')
    expect(hiddenElements.length).toBeGreaterThan(0)
  })

  it('EstimateStatusBadge has aria-label with status text', () => {
    const { container } = render(<EstimateStatusBadge status="READY" />)
    const badge = container.querySelector('[aria-label]')
    expect(badge?.getAttribute('aria-label')).toContain('Pronto')
  })
})
