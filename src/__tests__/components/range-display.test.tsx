// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { RangeDisplay } from '@/components/estimates/range-display'

describe('RangeDisplay', () => {
  it('renders with role="img" and descriptive aria-label', () => {
    render(<RangeDisplay min={20} max={40} unit="h" />)
    const bar = screen.getByRole('img')
    expect(bar).toHaveAttribute('aria-label')
    const label = bar.getAttribute('aria-label')!
    expect(label).toContain('20')
    expect(label).toContain('40')
    expect(label).toContain('mínimo')
    expect(label).toContain('máximo')
  })

  it('renders labels with min, midpoint and max when showLabels=true', () => {
    render(<RangeDisplay min={20} max={40} unit="h" showLabels={true} />)
    expect(screen.getByText(/20h/)).toBeInTheDocument()
    expect(screen.getByText(/40h/)).toBeInTheDocument()
    expect(screen.getByText(/30h/)).toBeInTheDocument() // midpoint
  })

  it('hides labels when showLabels=false', () => {
    const { queryByText } = render(<RangeDisplay min={20} max={40} unit="h" showLabels={false} />)
    expect(queryByText(/20h/)).not.toBeInTheDocument()
  })

  it('renders without errors when min === max', () => {
    expect(() => render(<RangeDisplay min={40} max={40} unit="h" />)).not.toThrow()
  })

  it('renders without errors when min === 0', () => {
    expect(() => render(<RangeDisplay min={0} max={100} unit="h" />)).not.toThrow()
  })

  it('returns null when max === 0', () => {
    const { container } = render(<RangeDisplay min={0} max={0} unit="h" />)
    expect(container.firstChild).toBeNull()
  })
})
