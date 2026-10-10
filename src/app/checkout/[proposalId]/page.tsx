'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { QrCode, Copy, CheckCircle2, ShieldCheck, ArrowLeft, Loader2, Zap, CreditCard, Lock } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { calculateTotals } from '@/lib/payments'

type PaymentMethod = 'pix' | 'cartao'

export default function Checkout() {
    const params = useParams()
    const proposalId = params?.proposalId as string

    if (!proposalId) return <div className="min-h-screen bg-[#0F1115] flex items-center justify-center text-white">Carregando...</div>

    return <CheckoutClient proposalId={proposalId} />
}

function CheckoutClient({ proposalId }: { proposalId: string }) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [proposal, setProposal] = useState<any>(null)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [job, setJob] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState(false)
    const [cpfCnpj, setCpfCnpj] = useState('')
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('pix')

    // PIX State
    const [pixData, setPixData] = useState<{
        paymentId: string
        pixQrCode: string
        pixCopyPaste: string
        expirationDate: string
        transactionId: string
    } | null>(null)

    // Card State
    const [cardData, setCardData] = useState({
        holderName: '',
        cardNumber: '',
        expiryMonth: '',
        expiryYear: '',
        ccv: '',
        postalCode: '',
        addressNumber: '',
        phone: '',
        installmentCount: 1,
    })

    const [copied, setCopied] = useState(false)
    const [isPaid, setIsPaid] = useState(false)
    const router = useRouter()

    useEffect(() => {
        async function loadData() {
            const { data: proposalData } = await supabase
                .from('proposals')
                .select('*, criador:criador_id(name)')
                .eq('id', proposalId)
                .single()

            if (!proposalData) {
                toast('Proposta não encontrada')
                router.push('/pedidos')
                return
            }

            setProposal(proposalData)

            const { data: jobData } = await supabase
                .from('jobs')
                .select('*')
                .eq('id', proposalData.job_id)
                .single()

            setJob(jobData)

            const { data: { session } } = await supabase.auth.getSession()
            const user = session?.user
            if (user) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('cpf_cnpj, name')
                    .eq('supabase_user_id', user.id)
                    .single()

                if (profile?.cpf_cnpj) setCpfCnpj(profile.cpf_cnpj)
                if (profile?.name) setCardData(prev => ({ ...prev, holderName: profile.name }))
            }

            setLoading(false)
        }

        loadData()
    }, [proposalId, router])

    // Poll for payment confirmation (PIX)
    const checkStatus = useCallback(async () => {
        if (!pixData) return
        try {
            const res = await fetch(`/api/payments/asaas/check-status?paymentId=${pixData.paymentId}&transactionId=${pixData.transactionId}`)
            const data = await res.json()
            if (data.isPaid) {
                setIsPaid(true)
                setTimeout(() => router.push('/pedidos'), 3000)
            }
        } catch (err) {
            console.error('Error polling payment status:', err)
        }
    }, [pixData, router])

    useEffect(() => {
        if (!pixData || isPaid) return
        const interval = setInterval(checkStatus, 4000)
        return () => clearInterval(interval)
    }, [pixData, isPaid, checkStatus])

    // Create Transaction helper
    const createTransaction = async (metodo: string) => {
        const baseAmount = Number(proposal.amount)
        const { taxaCliente, taxaCriador, totalPago, valorLiquido } = calculateTotals(baseAmount)

        const { data: { session } } = await supabase.auth.getSession()
        const user = session?.user
        const { data: profile } = await supabase
            .from('users')
            .select('id')
            .eq('supabase_user_id', user!.id)
            .single()

        const { data: tx, error: txError } = await supabase
            .from('transactions')
            .insert([{
                job_id: job.id,
                cliente_id: profile!.id,
                criador_id: proposal.criador_id,
                amount: baseAmount,
                taxa_cliente: taxaCliente,
                taxa_criador: taxaCriador,
                total_pago: totalPago,
                valor_liquido: valorLiquido,
                metodo,
                status: 'pendente'
            }])
            .select()
            .single()

        if (txError) throw txError

        await supabase.from('proposals').update({ status: 'aceita' }).eq('id', proposal.id)

        return tx
    }

    // PIX Payment Handler
    const handleGeneratePix = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!cpfCnpj || cpfCnpj.trim().length < 11) {
            toast('Por favor, informe um CPF ou CNPJ válido.')
            return
        }

        setProcessing(true)
        try {
            const tx = await createTransaction('asaas_pix')

            const res = await fetch('/api/payments/asaas/create-charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ transactionId: tx.id, cpfCnpj }),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao gerar cobrança PIX')

            setPixData({
                paymentId: result.paymentId,
                pixQrCode: result.pixQrCode,
                pixCopyPaste: result.pixCopyPaste,
                expirationDate: result.expirationDate,
                transactionId: tx.id,
            })

            // Save CPF
            const { data: { session: cpfSession } } = await supabase.auth.getSession()
            const cpfUser = cpfSession?.user
            if (cpfUser) {
                const { data: profile } = await supabase
                    .from('users')
                    .select('id')
                    .eq('supabase_user_id', cpfUser.id)
                    .single()
                if (profile) {
                    await supabase.from('users').update({ cpf_cnpj: cpfCnpj }).eq('id', profile.id)
                }
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast.error('Erro: ' + err.message)
        } finally {
            setProcessing(false)
        }
    }

    // Credit Card Payment Handler
    const handleCardPayment = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!cpfCnpj || cpfCnpj.trim().length < 11) {
            toast('Por favor, informe um CPF ou CNPJ válido.')
            return
        }
        if (!cardData.cardNumber || !cardData.ccv || !cardData.expiryMonth || !cardData.expiryYear) {
            toast('Preencha todos os dados do cartão.')
            return
        }

        setProcessing(true)
        try {
            const tx = await createTransaction('asaas_cartao')

            const res = await fetch('/api/payments/asaas/create-card-charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    transactionId: tx.id,
                    cpfCnpj,
                    holderName: cardData.holderName,
                    cardNumber: cardData.cardNumber,
                    expiryMonth: cardData.expiryMonth,
                    expiryYear: cardData.expiryYear,
                    ccv: cardData.ccv,
                    installmentCount: cardData.installmentCount,
                    postalCode: cardData.postalCode,
                    addressNumber: cardData.addressNumber || 'SN',
                    phone: cardData.phone,
                }),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao processar cartão')

            if (result.isPaid) {
                setIsPaid(true)
                setTimeout(() => router.push('/pedidos'), 3000)
            } else {
                // Payment is pending analysis
                toast('Pagamento em análise. Você será notificado quando for confirmado.')
                router.push('/pedidos')
            }
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } catch (err: any) {
            toast('Erro ao processar cartão: ' + err.message)
        } finally {
            setProcessing(false)
        }
    }

    const copyToClipboard = () => {
        if (!pixData) return
        navigator.clipboard.writeText(pixData.pixCopyPaste)
        setCopied(true)
        setTimeout(() => setCopied(false), 2500)
    }

    const handleCardChange = (field: string, value: string | number) => {
        setCardData(prev => ({ ...prev, [field]: value }))
    }

    if (loading) {
        return (
            <div className="min-h-screen bg-[#0F1115] flex flex-col items-center justify-center text-[#F3F4F6]">
                <Loader2 className="w-10 h-10 text-[#FFAE00] animate-spin mb-4" />
                <p className="text-gray-400">Carregando detalhes do checkout...</p>
            </div>
        )
    }

    const baseAmount = Number(proposal.amount)
    const { taxaCliente: clientFee, totalPago: totalAmount } = calculateTotals(baseAmount)

    // Generate installment options
    const installmentOptions = []
    for (let i = 1; i <= 12; i++) {
        const value = Math.ceil((totalAmount / i) * 100) / 100
        if (value >= 5) {
            installmentOptions.push({ count: i, value })
        }
    }

    return (
        <div className="min-h-screen bg-[#0B0D11] py-12 px-4 sm:px-6 lg:px-8 text-slate-100">
            <div className="max-w-xl mx-auto">
                <button
                    onClick={() => router.back()}
                    className="inline-flex items-center gap-2 text-gray-400 hover:text-[#F5A623] text-sm mb-6 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar
                </button>

                <div className="bg-[#12151C] rounded-2xl border border-white/[0.07] shadow-2xl p-6 sm:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-white/[0.07] pb-6 mb-6">
                        <div>
                            <span className="text-xs uppercase tracking-widest text-[#F5A623] font-bold">Checkout Seguro</span>
                            <h1 className="text-2xl font-black text-white mt-1">Pagamento</h1>
                        </div>
                        <div className="bg-[#181C26] p-3 rounded-xl border border-white/[0.07]">
                            <Lock className="w-6 h-6 text-[#F5A623]" />
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-[#181C26] rounded-xl p-4 border border-white/[0.07] mb-6 space-y-3">
                        <div>
                            <h3 className="font-bold text-white text-base">{job?.title}</h3>
                            <p className="text-xs text-gray-400">Programador: {proposal.criador?.name || 'Criador'}</p>
                            <p className="text-xs text-gray-400">Prazo: {proposal.deadline_text}</p>
                        </div>
                        <div className="border-t border-white/[0.07] pt-3 space-y-2 text-sm">
                            <div className="flex justify-between text-gray-400">
                                <span>Valor da Matriz:</span>
                                <span className="font-semibold text-white">R$ {baseAmount.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-gray-400 text-xs">
                                <span>Taxa de Intermediação (5%):</span>
                                <span>R$ {clientFee.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-base font-extrabold text-white border-t border-white/[0.07] pt-2">
                                <span>Total:</span>
                                <span className="text-[#F5A623]">R$ {totalAmount.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Safe Escrow Notice */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <ShieldCheck className="w-6 h-6 text-emerald-400 flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-emerald-300 leading-relaxed">
                            <strong className="text-white">Garantia BordadoHUB:</strong> O valor pago fica sob custódia e só é repassado ao programador após a entrega e sua aprovação.
                        </p>
                    </div>

                    {/* Payment Method Tabs */}
                    {!pixData && !isPaid && (
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setPaymentMethod('pix')}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                    paymentMethod === 'pix'
                                        ? 'bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-black shadow-lg shadow-[#FFB703]/20 font-extrabold'
                                        : 'bg-[#181C26] text-gray-400 border border-white/[0.07] hover:border-white/20'
                                }`}
                            >
                                <QrCode className="w-4 h-4" />
                                PIX
                            </button>
                            <button
                                onClick={() => setPaymentMethod('cartao')}
                                className={`flex-1 py-3 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                                    paymentMethod === 'cartao'
                                        ? 'bg-gradient-to-r from-[#FFB703] to-[#FB8500] text-black shadow-lg shadow-[#FFB703]/20 font-extrabold'
                                        : 'bg-[#181C26] text-gray-400 border border-white/[0.07] hover:border-white/20'
                                }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                Cartão de Crédito
                            </button>
                        </div>
                    )}

                    {/* SUCCESS STATE */}
                    {isPaid ? (
                        <div className="text-center py-8 space-y-4 animate-in zoom-in-95">
                            <div className="w-16 h-16 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto border border-green-500/30">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-white">Pagamento Confirmado!</h2>
                            <p className="text-sm text-gray-300">
                                O programador já foi notificado para iniciar a produção da sua matriz!
                            </p>
                            <p className="text-xs text-gray-500">Redirecionando para seus pedidos...</p>
                        </div>
                    ) : pixData ? (
                        /* PIX DISPLAY STATE */
                        <div className="space-y-6 text-center animate-in fade-in">
                            <div className="bg-white p-4 rounded-2xl inline-block mx-auto shadow-xl">
                                <Image
                                    src={pixData.pixQrCode.startsWith('data:image')
                                        ? pixData.pixQrCode
                                        : `data:image/png;base64,${pixData.pixQrCode}`}
                                    alt="PIX QR Code"
                                    width={200}
                                    height={200}
                                    className="mx-auto"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="block text-xs font-semibold text-gray-400 uppercase">Copia e Cola PIX</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={pixData.pixCopyPaste}
                                        className="w-full bg-[#0F1115] border border-gray-800 rounded-xl px-3 py-2.5 text-xs text-gray-400 font-mono truncate"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className="bg-[#FFAE00] text-[#0F1115] hover:bg-yellow-400 font-bold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-all flex-shrink-0"
                                    >
                                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-xs text-gray-400 bg-[#0F1115] py-3 rounded-xl border border-gray-800">
                                <Loader2 className="w-4 h-4 text-[#FFAE00] animate-spin" />
                                Aguardando confirmação do pagamento...
                            </div>
                        </div>
                    ) : paymentMethod === 'pix' ? (
                        /* PIX FORM */
                        <form onSubmit={handleGeneratePix} className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">CPF ou CNPJ</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="000.000.000-00"
                                    value={cpfCnpj}
                                    onChange={(e) => setCpfCnpj(e.target.value)}
                                    className="w-full bg-[#181C26] border border-white/[0.07] rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#F5A623] transition-all text-sm font-mono"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 text-black font-extrabold py-4 px-6 rounded-xl transition-all shadow-lg shadow-[#FFB703]/20 disabled:opacity-50 text-base active:scale-95"
                            >
                                {processing ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Gerando PIX...</>
                                ) : (
                                    <><Zap className="w-5 h-5 fill-current" /> Gerar PIX Instantâneo</>
                                )}
                            </button>

                            <p className="text-[11px] text-gray-500 text-center">PIX Instantâneo • Confirmação em segundos</p>
                        </form>
                    ) : (
                        /* CREDIT CARD FORM */
                        <form onSubmit={handleCardPayment} className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">CPF ou CNPJ</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="000.000.000-00"
                                    value={cpfCnpj}
                                    onChange={(e) => setCpfCnpj(e.target.value)}
                                    className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all text-sm font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">Nome no Cartão</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="NOME COMO ESTÁ NO CARTÃO"
                                    value={cardData.holderName}
                                    onChange={(e) => handleCardChange('holderName', e.target.value.toUpperCase())}
                                    className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all text-sm uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">Número do Cartão</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={19}
                                    placeholder="0000 0000 0000 0000"
                                    value={cardData.cardNumber}
                                    onChange={(e) => {
                                        const v = e.target.value.replace(/\D/g, '').replace(/(.{4})/g, '$1 ').trim()
                                        handleCardChange('cardNumber', v)
                                    }}
                                    className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all text-sm font-mono tracking-wider"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">Mês</label>
                                    <select
                                        required
                                        value={cardData.expiryMonth}
                                        onChange={(e) => handleCardChange('expiryMonth', e.target.value)}
                                        className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-[#FFAE00] transition-all text-sm"
                                    >
                                        <option value="">MM</option>
                                        {Array.from({ length: 12 }, (_, i) => (
                                            <option key={i + 1} value={String(i + 1).padStart(2, '0')}>
                                                {String(i + 1).padStart(2, '0')}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">Ano</label>
                                    <select
                                        required
                                        value={cardData.expiryYear}
                                        onChange={(e) => handleCardChange('expiryYear', e.target.value)}
                                        className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-3 py-3 text-white focus:outline-none focus:border-[#FFAE00] transition-all text-sm"
                                    >
                                        <option value="">AAAA</option>
                                        {Array.from({ length: 10 }, (_, i) => {
                                            const year = new Date().getFullYear() + i
                                            return <option key={year} value={String(year)}>{year}</option>
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">CVV</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={4}
                                        placeholder="000"
                                        value={cardData.ccv}
                                        onChange={(e) => handleCardChange('ccv', e.target.value.replace(/\D/g, ''))}
                                        className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all text-sm font-mono text-center"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">CEP</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={9}
                                        placeholder="00000-000"
                                        value={cardData.postalCode}
                                        onChange={(e) => handleCardChange('postalCode', e.target.value)}
                                        className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">Nº do Endereço</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: 123 ou S/N"
                                        value={cardData.addressNumber}
                                        onChange={(e) => handleCardChange('addressNumber', e.target.value)}
                                        className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">Telefone</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="(00) 00000-0000"
                                        value={cardData.phone}
                                        onChange={(e) => handleCardChange('phone', e.target.value)}
                                        className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#FFAE00] transition-all text-sm font-mono"
                                    />
                                </div>
                            </div>

                            {/* Installments */}
                            <div>
                                <label className="block text-xs font-semibold text-gray-300 mb-1.5 uppercase">Parcelas</label>
                                <select
                                    value={cardData.installmentCount}
                                    onChange={(e) => handleCardChange('installmentCount', Number(e.target.value))}
                                    className="w-full bg-[#0F1115] border border-gray-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FFAE00] transition-all text-sm"
                                >
                                    {installmentOptions.map(opt => (
                                        <option key={opt.count} value={opt.count}>
                                            {opt.count}x de R$ {opt.value.toFixed(2)} {opt.count === 1 ? '(à vista)' : ''}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#FFB703] to-[#FB8500] hover:brightness-110 text-black font-extrabold py-4 px-6 rounded-xl transition-all shadow-lg shadow-[#FFB703]/20 disabled:opacity-50 text-base active:scale-95"
                            >
                                {processing ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                                ) : (
                                    <><CreditCard className="w-5 h-5" /> Pagar R$ {totalAmount.toFixed(2)}</>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-2 text-[11px] text-gray-500">
                                <Lock className="w-3 h-3" />
                                Dados criptografados e processados pelo Asaas. O BordadoHub não armazena dados do seu cartão.
                            </div>
                        </form>
                    )}
                </div>
            </div>
        </div>
    )
}
