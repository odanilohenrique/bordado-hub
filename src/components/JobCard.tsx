'use client'

import { formatDate } from '@/lib/helpers'
import Link from 'next/link'

interface Job {
    id: string
    title: string
    status: string
    <p className = "mt-1 max-w-2xl text-sm text-gray-500">
                            Criado em { formatDate(job.created_at) }
                        </p >
                    </div >
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColors[job.status] || 'bg-gray-100 text-gray-800'}`}>
        {job.status.replace('_', ' ').toUpperCase()}
    </span>
                </div >
                <div className="mt-2">
                    <p className="text-sm text-gray-500 line-clamp-2">{job.description}</p>
                </div>
                <div className="mt-4">
                    <span className="text-indigo-600 hover:text-indigo-900 text-sm font-medium">
                        Ver detalhes &rarr;
                    </span>
                </div>
            </div >
        </Link >
    )
}
