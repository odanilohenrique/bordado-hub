import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabaseClient'

export async function POST(request: Request) {
    try {
        const formData = await request.formData()
        const file = formData.get('file') as File | null
        const userId = formData.get('userId') as string | null

        if (!file || !userId) {
            return NextResponse.json({ error: 'Arquivo e ID do usuário são obrigatórios.' }, { status: 400 })
        }

        const supabase = createServiceClient()

        // 1. Ensure 'avatars' bucket exists
        const { data: buckets } = await supabase.storage.listBuckets()
        const avatarsBucketExists = buckets?.some(b => b.id === 'avatars')

        if (!avatarsBucketExists) {
            const { error: bucketError } = await supabase.storage.createBucket('avatars', {
                public: true,
                fileSizeLimit: 5242880, // 5MB limit
                allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
            })
            if (bucketError && !bucketError.message?.toLowerCase().includes('already exists')) {
                console.error('Bucket creation error:', bucketError)
            }
        }

        // 2. Upload file
        const fileExt = file.name.split('.').pop() || 'png'
        const fileName = `${userId}-${Date.now()}.${fileExt}`
        const fileBuffer = Buffer.from(await file.arrayBuffer())

        const { error: uploadError } = await supabase.storage
            .from('avatars')
            .upload(fileName, fileBuffer, {
                contentType: file.type || 'image/jpeg',
                upsert: true
            })

        if (uploadError) {
            console.error('Upload error:', uploadError)
            return NextResponse.json({ error: `Erro no upload: ${uploadError.message}` }, { status: 500 })
        }

        // 3. Get Public URL
        const { data: publicData } = supabase.storage.from('avatars').getPublicUrl(fileName)
        const publicUrl = publicData.publicUrl

        // 4. Update user record in database
        await supabase
            .from('users')
            .update({ avatar_url: publicUrl })
            .or(`id.eq.${userId},supabase_user_id.eq.${userId}`)

        return NextResponse.json({ publicUrl }, { status: 200 })
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
        console.error('Server error on upload-avatar:', error)
        return NextResponse.json({ error: `Erro interno: ${error.message}` }, { status: 500 })
    }
}
