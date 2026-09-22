/** Save a file to the user's computer. Nothing is uploaded: the file is created in the browser. */
export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.style.display = 'none'
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers read the URL after click() returns; free it once the download has started.
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
