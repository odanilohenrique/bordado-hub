'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { formatCurrency } from '@/lib/helpers'
import { useRouter } from 'next/navigation'

export default function Checkout({ params }: { params: Promise<{ id: string }> }) {
    const [transactionId, setTransactionId] = useState<string | null>(null)

    useEffect(() => {
        params.then(p => setTransactionId(p.id))
    }, [params])

    const [transaction, setTransaction] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        if (!transactionId) return

        async function fetchTransaction() {
            const { data } = await supabase
                .from('transactions')
                .select('*, jobs(title)')
                .eq('id', transactionId)
                .single()

            setTransaction(data)
            setLoading(false)
        }

        fetchTransaction()
    }, [transactionId])

    const handleMercadoPago = async () => {
        try {
            const response = await fetch('/api/payments/mercadopago/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: transaction.id })
            })
            const data = await response.json()
            if (data.url) {
                window.location.href = data.url
            } else {
                alert('Erro ao criar pagamento MP')
            }
        } catch (error) {
            console.error(error)
            alert('Erro ao conectar com servidor')
        }
    }

    const handlePayPal = async () => {
        // Similar logic for PayPal
        alert('Implementação PayPal em breve')
    }

    if (loading) return <div className="p-8">Carregando...</div>
    if (!transaction) return <div className="p-8">Transação não encontrada</div>

    return (
        <div className="max-w-lg mx-auto bg-white shadow rounded-lg p-8 mt-10">
            <h1 className="text-2xl font-bold mb-4">Checkout</h1>
            <p className="text-gray-600 mb-6">Pagamento para o Job: {transaction.jobs?.title}</p>

            <div className="border-t border-b py-4 mb-6 space-y-2">
                <div className="flex justify-between">
                    <span>Valor do Serviço</span>
                    <span>{formatCurrency(transaction.amount)}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                    <span>Taxa de Serviço (Cliente)</span>
                    <span>{formatCurrency(transaction.taxa_cliente)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg mt-2">
                    <span>Total a Pagar</span>
                    <span>{formatCurrency(transaction.amount + transaction.taxa_cliente)}</span>
                </div>
            </div>

            <div className="space-y-4">
                <button
                    onClick={handleMercadoPago}
                    className="w-full bg-blue-500 text-white py-3 rounded-md font-bold hover:bg-blue-600 flex justify-center items-center"
                >
                    Pagar com Mercado Pago
                </button>
                <button
                    onClick={handlePayPal}
                    className="w-full bg-blue-800 text-white py-3 rounded-md font-bold hover:bg-blue-900 flex justify-center items-center"
                >
                    Pagar com PayPal
                </button>
            </div>
        </div>
    )
}
