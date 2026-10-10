import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const rawFiles = formData.getAll('files') as File[]
        const singleFile = formData.get('file') as File | null
        const userId = formData.get('userId') as string | null
        const isPortfolio = formData.get('isPortfolio') === 'true' || formData.get('type') === 'portfolio'

        const filesToProcess: File[] = (rawFiles && rawFiles.length > 0)
            ? rawFiles
            : (singleFile ? [singleFile] : [])

        if (filesToProcess.length === 0 || !userId) {
            return NextResponse.json({ error: 'Arquivo e ID do usuário são obrigatórios.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Ensure 'avatars' bucket exists
        const { data: buckets } = await supabase.storage.listBuckets()
        const avatarsBucketExists = buckets?.some(b => b.id === 'avatars')

        if (!avatarsBucketExists) {
            const { error: bucketError } = await supabase.storage.createBucket('avatars', {
                public: true,
                fileSizeLimit: 10485760, // 10MB limit
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
            })
            if (bucketError && !bucketError.message?.toLowerCase().includes('already exists')) {
                console.error('Bucket creation error:', bucketError)
            }
        }

        const uploadedUrls: string[] = []

        // 2. Upload each file
        for (let i = 0; i < filesToProcess.length; i++) {
            const file = filesToProcess[i]
            const fileExt = file.name.split('.').pop() || 'png'
            const fileName = isPortfolio 
                ? `portfolio-${userId}-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}.${fileExt}`
                : `${userId}-${Date.now()}.${fileExt}`
            const fileBuffer = Buffer.from(await file.arrayBuffer())

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, fileBuffer, {
                    contentType: file.type || 'image/jpeg',
                    upsert: true
                })

            if (uploadError) {
                console.error('Upload error:', uploadError)
                continue
            }

            const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName)
            if (publicData?.publicUrl) {
                uploadedUrls.push(publicData.publicUrl)
            }
        }

        if (uploadedUrls.length === 0) {
            return NextResponse.json({ error: 'Falha ao processar imagens.' }, { status: 500 })
        }

        // 3. Update user record in database ONLY if it's an avatar upload
        if (!isPortfolio && uploadedUrls.length > 0) {
            await supabase
                .from('users')
                .update({ avatar_url: uploadedUrls[0] })
                .or(`id.eq.${userId},supabase_user_id.eq.${userId}`)
        }

        return NextResponse.json({
            publicUrl: uploadedUrls[0],
            avatarUrl: uploadedUrls[0],
            urls: uploadedUrls
        }, { status: 200 })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Server error on upload-avatar:', error)
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 })
    }
}
