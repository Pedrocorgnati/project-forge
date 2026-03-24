import 'client-only'

export async function exportEstimatePdf(estimateId: string, projectName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const html2pdf = (await import('html2pdf.js' as any)).default

  const element = document.getElementById(`estimate-pdf-content-${estimateId}`)
    ?? document.getElementById('estimate-pdf-content')

  if (!element) {
    throw new Error('Elemento de conteúdo PDF não encontrado na página')
  }

  const slug = projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const options = {
    margin: [10, 15, 10, 15],
    filename: `estimativa-${slug}-v${Date.now()}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
    pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
  }

  await html2pdf().from(element).set(options).save()
}
