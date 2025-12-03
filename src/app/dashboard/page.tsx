'use client'

import { useState } from 'react'
import ClientDashboard from './client/page'
import CreatorDashboard from './creator/page'
import { ShoppingBag, Palette } from 'lucide-react'

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'client' | 'creator'>('client')

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Context Switcher */}
            <div className="flex justify-center mb-8">
                <div className="bg-gray-100 p-1 rounded-xl inline-flex shadow-inner">
                    <button
                        onClick={() => setActiveTab('client')}
                        className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'client'
                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <ShoppingBag className="w-4 h-4 mr-2" />
                        Modo Cliente (Comprar)
                    </button>
                    <button
                        onClick={() => setActiveTab('creator')}
                        className={`flex items-center px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${activeTab === 'creator'
                                ? 'bg-white text-violet-600 shadow-sm ring-1 ring-black/5'
                                : 'text-gray-500 hover:text-gray-700'
                            }`}
                    >
                        <Palette className="w-4 h-4 mr-2" />
                        Modo Criador (Vender)
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <div className="transition-opacity duration-300 ease-in-out">
                {activeTab === 'client' ? (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <ClientDashboard />
                    </div>
                ) : (
                    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <CreatorDashboard />
                    </div>
                )}
            </div>
        </div>
    )
}
