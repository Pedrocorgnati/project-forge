// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EstimateItemTable } from '@/components/estimates/estimate-item-table'

const mockItems = [
  {
    id: 'i1',
    category: 'backend-api',
    description: 'Criar API de autenticação',
    hoursMin: 20,
    hoursMax: 40,
    hourlyRate: 210,
    riskFactor: 1.2,
    costMin: 5040,
    costMax: 10080,
  },
  {
    id: 'i2',
    category: 'frontend-component',
    description: 'Formulário de login',
    hoursMin: 8,
    hoursMax: 14,
    hourlyRate: 210,
    riskFactor: 1.0,
    costMin: 1680,
    costMax: 2940,
  },
  {
    id: 'i3',
    category: 'testing',
    description: 'Testes unitários e integração',
    hoursMin: 10,
    hoursMax: 20,
    hourlyRate: 210,
    riskFactor: 1.0,
    costMin: 2100,
    costMax: 4200,
  },
]

describe('EstimateItemTable', () => {
  it('renders all items with category, description and hour ranges', () => {
    render(<EstimateItemTable items={mockItems} />)
    expect(screen.getByText('Criar API de autenticação')).toBeInTheDocument()
    expect(screen.getByText('Formulário de login')).toBeInTheDocument()
    expect(screen.getByText('Testes unitários e integração')).toBeInTheDocument()
    expect(screen.getAllByText(/h/).length).toBeGreaterThan(0)
  })

  it('renders accessible table with caption', () => {
    render(<EstimateItemTable items={mockItems} />)
    const table = screen.getByRole('table')
    expect(table).toBeInTheDocument()
    const caption = table.querySelector('caption')
    expect(caption).toHaveClass('sr-only')
    expect(caption?.textContent).toContain('horas mínimas')
  })

  it('renders th elements with scope="col"', () => {
    const { container } = render(<EstimateItemTable items={mockItems} />)
    const headers = container.querySelectorAll('th[scope="col"]')
    expect(headers.length).toBeGreaterThanOrEqual(4)
  })

  it('sorts by category when clicking Categoria header', async () => {
    render(<EstimateItemTable items={mockItems} />)
    const categoriaHeader = screen.getByRole('columnheader', { name: /categoria/i })
    await userEvent.click(categoriaHeader)
    const rows = screen.getAllByRole('row')
    expect(rows.length).toBeGreaterThan(3)
  })

  it('renders risk factor with font-mono class', () => {
    const { container } = render(<EstimateItemTable items={mockItems} />)
    const riskCells = container.querySelectorAll('.font-mono')
    expect(riskCells.length).toBeGreaterThan(0)
    expect(riskCells[0]?.textContent).toMatch(/×\d\.\d/)
  })

  it('renders subtotal row for each category group', () => {
    render(<EstimateItemTable items={mockItems} />)
    expect(screen.getAllByText(/Backend \/ API|Frontend/i).length).toBeGreaterThan(0)
  })

  it('renders empty table gracefully', () => {
    render(<EstimateItemTable items={[]} />)
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})
