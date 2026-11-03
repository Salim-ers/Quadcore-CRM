/** Sur téléphone, ouvre le menu de partage (WhatsApp, e-mail…) ; sinon, enregistre le fichier. */
export const canShareFile = (file: File) => !!navigator.canShare?.({ files: [file] })

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file)
  const a = document.createElement('a')
  a.href = url
  a.download = file.name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30000)
}

export async function shareFile(file: File, title: string) {
  try {
    await navigator.share({ files: [file], title })
  } catch (e) {
    if ((e as Error).name !== 'AbortError') downloadFile(file)
  }
}
