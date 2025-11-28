'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'

import { useParams } from 'next/navigation'

export default function Checkout() {
    const params = useParams()
    const proposalId = params?.proposalId as string

    if (!proposalId) return <div>Carregando...</div>

    return <CheckoutClient proposalId={proposalId} />
}

function CheckoutClient({ proposalId }: { proposalId: string }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [proposal, setProposal] = useState<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [job, setJob] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const router = useRouter()

    useEffect(() => {
        async function loadData() {
            // Get proposal
            const { data: proposalData } = await supabase
                .from('proposals')
                .select('*')
                .eq('id', proposalId)
                .single()

            if (!proposalData) {
                alert('Proposta não encontrada')
                router.push('/dashboard')
                return
            }

            setProposal(proposalData)

            // Get job
            const { data: jobData } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', proposalData.job_id)
                .single()

            setJob(jobData)
            setLoading(false)
        }

        loadData()
    }, [proposalId, router])

    const handlePayment = async () => {
        setProcessing(true)

        try {
            // Calculate fees
            const baseAmount = proposal.amount
            const clientFee = baseAmount * 0.05 // 5%
            const totalAmount = baseAmount + clientFee

            // Create transaction record
            const { data: { user } } = await supabase.auth.getUser()
            const { data: profile } = await supabase
                .from('users')
                .select('id')
                .eq('supabase_user_id', user!.id)
                .single()

            const { error: txError } = await supabase
                .from('transactions')
                .insert([{
                    job_id: job.id,
                    cliente_id: profile!.id,
                    criador_id: proposal.criador_id,
                    amount: baseAmount,
                    taxa_cliente: clientFee,
                    taxa_criador: baseAmount * 0.05,
                    total_pago: totalAmount,
                    valor_liquido: baseAmount * 0.95,
                    metodo: 'mercadopago',
                    status: 'pendente'
                }])

            if (txError) throw txError

            // For now, simulate payment
            alert(`Pagamento simulado!\n\nValor do trabalho: R$ ${baseAmount.toFixed(2)}\nTaxa (5%): R$ ${clientFee.toFixed(2)}\nTotal: R$ ${totalAmount.toFixed(2)}\n\nEm produção, aqui seria redirecionado para o Mercado Pago.`)

            router.push('/dashboard')
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            alert('Erro: ' + err.message)
        } finally {
            setProcessing(false)
        }
    }

    if (loading) return <div className="p-8">Carregando...</div>

    const baseAmount = proposal.amount
    const clientFee = baseAmount * 0.05
    const totalAmount = baseAmount + clientFee

    return (
        <div className="max-w-2xl mx-auto py-8 px-4">
            <div className="bg-white rounded-lg shadow-lg p-6">
                <h1 className="text-2xl font-bold mb-6">Checkout - Pagamento</h1>

                <div className="border-b pb-4 mb-4">
                    <h2 className="font-semibold text-lg mb-2">{job?.title}</h2>
                    <p className="text-sm text-gray-600">Prazo: {proposal.deadline_text}</p>
                </div>

                <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                        <span>Valor do trabalho:</span>
                        <span className="font-semibold">R$ {baseAmount.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                        <span>Taxa de serviço (5%):</span>
                        <span>R$ {clientFee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold border-t pt-3">
                        <span>Total a pagar:</span>
                        <span className="text-indigo-600">R$ {totalAmount.toFixed(2)}</span>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                    <p className="text-sm text-blue-800">
                        <strong>ℹ️ Como funciona:</strong><br />
                        O valor ficará retido com segurança até a entrega do trabalho.
                        Você terá 12 horas para avaliar a matriz depois da entrega.
                        Se tudo estiver OK, o produtor receberá o pagamento automaticamente.
                    </p>
                </div>

                <button
                    onClick={handlePayment}
                    disabled={processing}
                    className="w-full bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 disabled:opacity-50 font-semibold"
                >
                    {processing ? 'Processando...' : 'Pagar com Mercado Pago'}
                </button>

                <button
                    onClick={() => router.back()}
                    className="w-full mt-2 bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300"
                >
                    Cancelar
                </button>
            </div>
        </div>
    )
}
