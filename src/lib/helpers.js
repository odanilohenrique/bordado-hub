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
 * Converte BMP, PNG pesado, JPEG gigante em JPEG de ~200KB a 400KB em alta qualidade.
 */
export async function optimizeImageFile(file, maxDimension = 1920, quality = 0.85) {
    if (typeof window === 'undefined') return file
    if (!file || !file.type) return file

    const isImage = file.type.startsWith('image/') || /\.(bmp|jpg|jpeg|png|webp)$/i.test(file.name)
    if (!isImage || file.type === 'image/svg+xml') {
        return file
    }

    // Se já tiver menos de 400KB e não for BMP, pode subir direto
    if (file.size < 400 * 1024 && !/\.bmp$/i.test(file.name)) {
        return file
    }

    return new Promise((resolve) => {
        try {
            const reader = new FileReader()
            reader.onload = (e) => {
                const img = new Image()
                img.onload = () => {
                    try {
                        let { width, height } = img
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
                            resolve(file)
                            return
                        }

                        // Fundo branco caso haja transparência
                        ctx.fillStyle = '#FFFFFF'
                        ctx.fillRect(0, 0, width, height)
                        ctx.drawImage(img, 0, 0, width, height)

                        canvas.toBlob((blob) => {
                            if (!blob || blob.size >= file.size) {
                                resolve(file)
                                return
                            }
                            const newName = file.name.replace(/\.[^/.]+$/, '') + '.jpg'
                            const optimizedFile = new File([blob], newName, { type: 'image/jpeg' })
                            resolve(optimizedFile)
                        }, 'image/jpeg', quality)
                    } catch (canvasErr) {
                        console.warn('Canvas optimization failed, using original file:', canvasErr)
                        resolve(file)
                    }
                }
                img.onerror = () => resolve(file)
                img.src = e.target?.result
            }
            reader.onerror = () => resolve(file)
            reader.readAsDataURL(file)
        } catch (err) {
            console.warn('optimizeImageFile error, using original:', err)
            resolve(file)
        }
    })
}
