'use client'

import { useState } from 'react'
import ClientDashboard from './client/page'
import CreatorDashboard from './creator/page'
import { ShoppingBag, Palette } from 'lucide-react'

export default function Dashboard() {
    const [activeTab, setActiveTab] = useState<'client' | 'creator'>('client')

    return (
        <div className="min-h-screen bg-[#0F1115] py-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-extrabold text-[#F3F4F6] mb-2">
                        Dashboard
                    </h1>
                    <p className="text-gray-400">
                        Gerencie seus pedidos e encontre oportunidades
                    </p>
                </div>

                {/* Tab Switcher */}
                <div className="flex justify-center mb-10">
                    <div className="bg-[#1A1D23] p-1.5 rounded-xl inline-flex border border-[#FFAE00]/20 shadow-lg">
                        <button
                            onClick={() => setActiveTab('client')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'client'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-lg shadow-[#FFAE00]/30'
                                    : 'text-gray-400 hover:text-[#F3F4F6]'
                                }`}
                        >
                            <ShoppingBag className="w-4 h-4" />
                            Modo Cliente
                        </button>
                        <button
                            onClick={() => setActiveTab('creator')}
                            className={`flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all duration-300 ${activeTab === 'creator'
                                    ? 'bg-[#FFAE00] text-[#0F1115] shadow-lg shadow-[#FFAE00]/30'
                                    : 'text-gray-400 hover:text-[#F3F4F6]'
                                }`}
                        >
                            <Palette className="w-4 h-4" />
                            Modo Programador
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
        </div>
    )
}
