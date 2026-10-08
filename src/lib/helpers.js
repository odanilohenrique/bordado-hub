export function formatCurrency(amount) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
    }).format(amount)
}

export function formatDate(dateString) {
    if (!dateString) return ''
    return new Date(dateString).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

/**
 * Comprime e redimensiona imagens no cliente antes de enviar ao servidor.
 * 100% seguro para dispositivos móveis (iOS Safari, Android Chrome, navegadores embutidos):
 * - Usa URL.createObjectURL (zero sobrecarga de memória comparado a base64 DataURL)
 * - Usa createImageBitmap nativo com fallback para <img>
 * - Timeout rígido de 4 segundos (garante que NUNCA trava a tela ou o envio)
 * - Suporta com segurança a falta de suporte ao construtor File no WebKit antigo
 */
export async function optimizeImageFile(file, maxDimension = 1600, quality = 0.82) {
    if (typeof window === 'undefined') return file
    if (!file) return file

    const fileName = file.name || 'imagem'
    const isImage = (file.type && file.type.startsWith('image/')) || /\.(bmp|jpg|jpeg|png|webp|heic|heif)$/i.test(fileName)
    if (!isImage || file.type === 'image/svg+xml') {
        return file
    }

    // Se já tiver menos de 300KB e não for BMP, não precisa recomprimir
    if (file.size < 300 * 1024 && !/\.bmp$/i.test(fileName)) {
        return file
    }

    // Race com timeout rígido de 4 segundos para NUNCA travar a interface
    return new Promise((resolve) => {
        let isResolved = false
        const finish = (result) => {
            if (!isResolved) {
                isResolved = true
                clearTimeout(safetyTimeout)
                resolve(result || file)
            }
        }

        const safetyTimeout = setTimeout(() => {
            console.warn('optimizeImageFile excedeu 4s, prosseguindo com arquivo original')
            finish(file)
        }, 4000)

        const processElement = (sourceWidth, sourceHeight, drawFn) => {
            try {
                let width = sourceWidth
                let height = sourceHeight

                if (width > maxDimension || height > maxDimension) {
                    if (width > height) {
                        height = Math.round((height * maxDimension) / width)
                        width = maxDimension
                    } else {
                        width = Math.round((width * maxDimension) / height)
                        height = maxDimension
                    }
                }

                const canvas = document.createElement('canvas')
                canvas.width = width
                canvas.height = height
                const ctx = canvas.getContext('2d')
                if (!ctx) {
                    finish(file)
                    return
                }

                // Fundo branco caso haja transparência
                ctx.fillStyle = '#FFFFFF'
                ctx.fillRect(0, 0, width, height)
                drawFn(ctx, width, height)

                canvas.toBlob((blob) => {
                    try {
                        if (!blob || blob.size >= file.size) {
                            finish(file)
                            return
                        }
                        const newName = fileName.replace(/\.[^/.]+$/, '') + '.jpg'
                        let finalResult = blob
                        try {
                            finalResult = new File([blob], newName, { type: 'image/jpeg' })
                        } catch (fileConstErr) {
                            // Compatibilidade para WebKit / iOS Safari onde new File() pode falhar
                            blob.name = newName
                            finalResult = blob
                        }
                        finish(finalResult)
                    } catch (blobErr) {
                        console.warn('Erro ao finalizar blob:', blobErr)
                        finish(file)
                    }
                }, 'image/jpeg', quality)
            } catch (err) {
                console.warn('Erro em processElement:', err)
                finish(file)
            }
        }

        // Tenta primeiro createImageBitmap (muito mais rápido, assíncrono e respeita EXIF)
        if (typeof window.createImageBitmap === 'function') {
            createImageBitmap(file)
                .then((bitmap) => {
                    processElement(bitmap.width, bitmap.height, (ctx, w, h) => {
                        ctx.drawImage(bitmap, 0, 0, w, h)
                        if (typeof bitmap.close === 'function') bitmap.close()
                    })
                })
                .catch(() => {
                    fallbackImageTag()
                })
        } else {
            fallbackImageTag()
        }

        function fallbackImageTag() {
            try {
                const objectUrl = URL.createObjectURL(file)
                const img = new Image()
                img.onload = () => {
                    try {
                        processElement(img.naturalWidth || img.width, img.naturalHeight || img.height, (ctx, w, h) => {
                            ctx.drawImage(img, 0, 0, w, h)
                        })
                    } finally {
                        URL.revokeObjectURL(objectUrl)
                    }
                }
                img.onerror = () => {
                    URL.revokeObjectURL(objectUrl)
                    finish(file)
                }
                img.src = objectUrl
            } catch (fallbackErr) {
                console.warn('Erro em fallbackImageTag:', fallbackErr)
                finish(file)
            }
        }
    })
}
