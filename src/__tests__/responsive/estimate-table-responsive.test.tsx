// @vitest-environment jsdom
import { render } from '@testing-library/react'
import { EstimateItemTable } from '@/components/estimates/estimate-item-table'

const manyItems = Array.from({ length: 5 }, (_, i) => ({
  id: `i${i}`,
  category: 'backend-api',
  description: `Item ${i} com descrição longa para testar overflow no mobile`,
  hoursMin: 10 + i,
  hoursMax: 20 + i,
  hourlyRate: 210,
  riskFactor: 1.0 + i * 0.1,
  costMin: (10 + i) * 210,
  costMax: (20 + i) * 210,
}))

describe('EstimateItemTable — responsiveness', () => {
  it('wraps table in overflow-x-auto container', () => {
    const { container } = render(<EstimateItemTable items={manyItems} />)
    const wrapper = container.querySelector('.overflow-x-auto')
    expect(wrapper).not.toBeNull()
  })

  it('table is inside overflow-x-auto container', () => {
    const { container } = render(<EstimateItemTable items={manyItems} />)
    const table = container.querySelector('table')
    expect(table?.closest('.overflow-x-auto')).not.toBeNull()
  })

  it('description cell truncates long text with title attribute', () => {
    const { container } = render(<EstimateItemTable items={manyItems} />)
    const descCell = container.querySelector('td p.truncate')
    expect(descCell).not.toBeNull()
    expect(descCell?.getAttribute('title')).toBeTruthy()
  })
})
