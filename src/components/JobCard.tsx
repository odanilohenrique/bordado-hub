import Link from 'next/link'
import { formatDate, formatCurrency } from '@/lib/helpers'
import { useRouter } from 'next/navigation'

interface Job {
    id: string
    title: string
    status: string
    created_at: string
    deadline?: string
    description?: string
}

export default function JobCard({ job, isCreator = false }: { job: Job, isCreator?: boolean }) {
    const router = useRouter()

    const statusColors: Record<string, string> = {
        aberto: 'bg-green-100 text-green-800',
        em_progresso: 'bg-blue-100 text-blue-800',
        entregue: 'bg-yellow-100 text-yellow-800',
        finalizado: 'bg-gray-100 text-gray-800',
        cancelado: 'bg-red-100 text-red-800',
    }

    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault()
        console.log('Navigating to job:', job.id)
        if (!job.id) {
            console.error('Job ID is missing!')
            return
        }
        router.push(`/jobs/${job.id}`)
    }

    return (
        <div className="bg-white overflow-hidden shadow rounded-lg mb-4 hover:shadow-md transition-shadow cursor-pointer" onClick={handleClick}>
            <div className="px-4 py-5 sm:p-6">
                <div className="flex justify-between items-start">
                    <div>
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                            {job.title}
                        </h3>
                        <p className="mt-1 max-w-2xl text-sm text-gray-500">
                            Criado em {formatDate(job.created_at)}
                        </p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-800'}`}>
                        {job.status.replace('_', ' ').toUpperCase()}
                    </span>
                </div>
                <div className="mt-2">
                    <p className="text-sm text-gray-500 line-clamp-2">{job.description}</p>
                </div>
                <div className="mt-4">
                    <span className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                        Ver detalhes &rarr;
                    </span>
                </div>
            </div>
        </div>
    )
}
