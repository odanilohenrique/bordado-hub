import { redirect } from 'next/navigation'

export default async function ProfileIndexPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const query = new URLSearchParams()
    if (params) {
        Object.entries(params).forEach(([key, val]) => {
            if (typeof val === 'string') query.set(key, val)
        })
    }
    const queryString = query.toString() ? `?${query.toString()}` : ''
    redirect(`/profile/me${queryString}`)
}
