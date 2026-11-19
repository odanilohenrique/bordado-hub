'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter, useParams } from 'next/navigation'
import { QrCode, Copy, CheckCircle2, ShieldCheck, ArrowLeft, Loader2, Zap, CreditCard, Lock } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { calculateTotals, calculateCardFee } from '@/lib/payments'
import { useAuth } from '@/contexts/AuthContext'

type PaymentMethod = 'pix' | 'cartao'

export default function Checkout() {
    const params = useParams()
    const proposalId = params?.proposalId as string

    if (!proposalId) return <div className="min-h-screen bg-[var(--bg-primary)] flex items-center justify-center text-[var(--text-primary)]">Carregando...</div>

    return <CheckoutClient proposalId={proposalId} />
}

function CheckoutClient({ proposalId }: { proposalId: string }) {
    const [proposal, setProposal] = useState<any>(null)
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

    const { profile: authProfile } = useAuth()

    useEffect(() => {
        let isMounted = true
        const safetyTimer = setTimeout(() => {
            if (isMounted) setLoading(false)
        }, 5000)

        async function loadData() {
            try {
                const { data: proposalData } = await supabase
                    .from('proposals')
                    .select('*, criador:criador_id(name)')
                    .eq('id', proposalId)
                    .single()

                if (!isMounted) return

                if (!proposalData) {
                    toast('Proposta não encontrada')
                    router.push('/pedidos')
                    return
                }

                setProposal(proposalData)

                const [{ data: jobData }, sessionResult] = await Promise.all([
                    supabase
                        .from('jobs')
                        .select('*')
                        .eq('id', proposalData.job_id)
                        .single(),
                    Promise.race([
                        supabase.auth.getSession(),
                        new Promise<any>((resolve) => setTimeout(() => resolve({ data: { session: null } }), 3000))
                    ])
                ])

                if (!isMounted) return
                setJob(jobData)

                if (authProfile?.cpf_cnpj) setCpfCnpj(authProfile.cpf_cnpj)
                if (authProfile?.name) setCardData(prev => ({ ...prev, holderName: authProfile.name }))

                const user = sessionResult?.data?.session?.user
                if (user && !authProfile?.cpf_cnpj) {
                    const { data: profile } = await supabase
                        .from('users')
                        .select('cpf_cnpj, name')
                        .eq('supabase_user_id', user.id)
                        .maybeSingle()

                    if (!isMounted) return
                    if (profile?.cpf_cnpj) setCpfCnpj(profile.cpf_cnpj)
                    if (profile?.name) setCardData(prev => ({ ...prev, holderName: profile.name }))
                }
            } catch (err) {
                console.error('Erro ao carregar checkout:', err)
                toast.error('Erro ao carregar dados do pagamento.')
            } finally {
                clearTimeout(safetyTimer)
                if (isMounted) setLoading(false)
            }
        }

        loadData()

        return () => {
            isMounted = false
            clearTimeout(safetyTimer)
        }
    }, [proposalId, router, authProfile?.cpf_cnpj, authProfile?.name])

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

    // PIX Payment Handler
    const handleGeneratePix = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!cpfCnpj || cpfCnpj.trim().length < 11) {
            toast('Por favor, informe um CPF ou CNPJ válido.')
            return
        }

        setProcessing(true)
        try {
            const res = await fetch('/api/payments/asaas/create-charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proposalId: proposal.id, cpfCnpj }),
            })

            const result = await res.json()
            if (!res.ok) throw new Error(result.error || 'Erro ao gerar cobrança PIX')

            setPixData({
                paymentId: result.paymentId,
                pixQrCode: result.pixQrCode,
                pixCopyPaste: result.pixCopyPaste,
                expirationDate: result.expirationDate,
                transactionId: result.transactionId,
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
            const res = await fetch('/api/payments/asaas/create-card-charge', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    proposalId: proposal.id,
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
            <div className="min-h-screen bg-[var(--bg-primary)] flex flex-col items-center justify-center text-[var(--text-primary)]">
                <Loader2 className="w-10 h-10 text-[#2563EB] dark:text-[#3B82F6] animate-spin mb-4" />
                <p className="text-[var(--text-secondary)]">Carregando detalhes do checkout...</p>
            </div>
        )
    }

    const baseAmount = Number(proposal.amount)
    const { totalPago: totalAmount } = calculateTotals(baseAmount)

    // Taxa do cartão de crédito (repassada ao comprador)
    const { taxaCartao: cardFee, totalComTaxa: cardTotalAmount, rate: cardRate } = calculateCardFee(baseAmount, cardData.installmentCount)

    // Valor efetivo dependendo do método de pagamento
    const effectiveTotal = paymentMethod === 'cartao' ? cardTotalAmount : totalAmount

    // Generate installment options com taxa do cartão incluída
    const installmentOptions = []
    for (let i = 1; i <= 12; i++) {
        const { totalComTaxa: instTotal, valorParcela, taxaCartao: instFee } = calculateCardFee(baseAmount, i)
        if (valorParcela >= 5) {
            installmentOptions.push({ count: i, value: valorParcela, total: instTotal, fee: instFee })
        }
    }

    return (
        <div className="min-h-screen bg-[var(--bg-primary)] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 text-[var(--text-primary)]">
            <div className="max-w-xl mx-auto">
                <button
                    onClick={() => {
                        if (job?.id) {
                            router.push(`/jobs/${job.id}`)
                        } else {
                            router.back()
                        }
                    }}
                    className="inline-flex items-center gap-2 min-h-[44px] px-1 text-[var(--text-secondary)] hover:text-[#2563EB] dark:hover:text-[#60A5FA] text-sm mb-4 transition-colors font-medium"
                >
                    <ArrowLeft className="w-4 h-4" /> Voltar ao Pedido
                </button>

                <div className="bg-[var(--bg-surface)] rounded-2xl border border-[var(--border-hairline)] shadow-xl p-5 sm:p-8">
                    {/* Header */}
                    <div className="flex items-center justify-between border-b border-[var(--border-hairline)] pb-6 mb-6">
                        <div>
                            <span className="text-xs uppercase tracking-widest text-[var(--cobalt-text)] font-bold">Checkout Seguro</span>
                            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)] mt-1">Pagamento</h1>
                        </div>
                        <div className="bg-[var(--bg-surface-elevated)] p-3 rounded-xl border border-[var(--border-hairline)]">
                            <Lock className="w-6 h-6 text-[var(--cobalt)]" />
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="bg-[var(--bg-surface-elevated)] rounded-xl p-4 border border-[var(--border-hairline)] mb-6 space-y-3">
                        <div>
                            <h3 className="font-bold text-[var(--text-primary)] text-base">{job?.title}</h3>
                            <p className="text-xs text-[var(--text-secondary)]">Programador: {proposal.criador?.name || 'Criador'}</p>
                            <p className="text-xs text-[var(--text-secondary)]">Prazo: {proposal.deadline_text}</p>
                        </div>
                        <div className="border-t border-[var(--border-hairline)] pt-3 space-y-2 text-sm">
                            <div className="flex justify-between text-[var(--text-secondary)]">
                                <span>Valor da Matriz:</span>
                                <span className="font-semibold text-[var(--text-primary)]">R$ {baseAmount.toFixed(2)}</span>
                            </div>
                            {paymentMethod === 'pix' ? (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--text-secondary)]">Taxa de Processamento:</span>
                                    <span className="text-[#0F766E] dark:text-[#14B8A6] font-bold bg-[#0D9488]/10 dark:bg-[#14B8A6]/15 px-2 py-0.5 rounded border border-[#0D9488]/25 dark:border-[#14B8A6]/30">Grátis (PIX)</span>
                                </div>
                            ) : (
                                <div className="flex justify-between items-center text-xs">
                                    <span className="text-[var(--text-secondary)]">Taxa do Cartão ({cardData.installmentCount}x • {((cardRate || 0.0299) * 100).toFixed(1).replace('.', ',')}% + R$0,49):</span>
                                    <span className="text-[#1D4ED8] dark:text-[#60A5FA] font-semibold bg-[#2563EB]/10 dark:bg-[#3B82F6]/15 px-2 py-0.5 rounded border border-[#2563EB]/25 dark:border-[#3B82F6]/30">+ R$ {cardFee.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-base font-extrabold text-[var(--text-primary)] border-t border-[var(--border-hairline)] pt-2">
                                <span>Total a Pagar:</span>
                                <span className="text-[#2563EB] dark:text-[#60A5FA]">R$ {effectiveTotal.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Safe Escrow Notice */}
                    <div className="bg-[#0D9488]/10 dark:bg-[#14B8A6]/10 border border-[#0D9488]/25 dark:border-[#14B8A6]/25 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <ShieldCheck className="w-6 h-6 text-[#0F766E] dark:text-[#14B8A6] flex-shrink-0 mt-0.5" />
                        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                            <strong className="text-[var(--text-primary)]">Garantia BordadoHUB:</strong> O valor pago fica sob custódia e só é repassado ao programador após a entrega e sua aprovação.
                        </p>
                    </div>

                    {/* Payment Method Tabs */}
                    {!pixData && !isPaid && (
                        <div className="flex gap-2 mb-6">
                            <button
                                onClick={() => setPaymentMethod('pix')}
                                className={`flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${
                                    paymentMethod === 'pix'
                                        ? 'bg-[#2563EB] text-white font-bold border border-[#2563EB]'
                                        : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-glass)] font-semibold'
                                }`}
                            >
                                <QrCode className="w-4 h-4" />
                                PIX
                            </button>
                            <button
                                onClick={() => setPaymentMethod('cartao')}
                                className={`flex-1 min-h-[48px] py-3 px-4 rounded-xl text-sm transition-colors flex items-center justify-center gap-2 ${
                                    paymentMethod === 'cartao'
                                        ? 'bg-[#2563EB] text-white font-bold border border-[#2563EB]'
                                        : 'bg-[var(--bg-surface-elevated)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-hairline)] hover:border-[var(--border-glass)] font-semibold'
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
                            <div className="w-16 h-16 bg-[#0D9488]/15 text-[#0F766E] dark:text-[#14B8A6] rounded-full flex items-center justify-center mx-auto border border-[#0D9488]/30 animate-success-pop">
                                <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <h2 className="text-2xl font-extrabold text-[var(--text-primary)]">Pagamento Confirmado!</h2>
                            <p className="text-sm text-[var(--text-secondary)]">
                                O programador já foi notificado para iniciar a produção da sua matriz!
                            </p>
                            <p className="text-xs text-[var(--text-secondary)]">Redirecionando para seus pedidos...</p>
                        </div>
                    ) : pixData ? (
                        /* PIX DISPLAY STATE */
                        <div className="space-y-6 text-center animate-in fade-in">
                            <div className="bg-white p-4 rounded-2xl inline-block mx-auto border border-[var(--border-hairline)] shadow-md">
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
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] uppercase">Copia e Cola PIX</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        readOnly
                                        value={pixData.pixCopyPaste}
                                        className="w-full min-h-[44px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-3 py-2.5 text-xs text-[var(--text-primary)] font-mono truncate"
                                    />
                                    <button
                                        onClick={copyToClipboard}
                                        className="min-h-[44px] bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 text-xs transition-colors flex-shrink-0"
                                    >
                                        {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                        {copied ? 'Copiado!' : 'Copiar'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-2 text-xs text-[var(--text-secondary)] bg-[var(--bg-surface-elevated)] py-3 rounded-xl border border-[var(--border-hairline)]">
                                <Loader2 className="w-4 h-4 text-[var(--cobalt)] animate-spin" />
                                Aguardando confirmação do pagamento...
                            </div>
                        </div>
                    ) : paymentMethod === 'pix' ? (
                        /* PIX FORM */
                        <form onSubmit={handleGeneratePix} className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">CPF ou CNPJ</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="000.000.000-00"
                                    value={cpfCnpj}
                                    onChange={(e) => setCpfCnpj(e.target.value)}
                                    className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm font-mono"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] font-semibold py-3.5 px-6 rounded-lg transition-colors disabled:opacity-50 text-base active:scale-[0.99]"
                            >
                                {processing ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Gerando PIX...</>
                                ) : (
                                    <><Zap className="w-5 h-5 fill-current" /> Gerar PIX Instantâneo</>
                                )}
                            </button>

                            <p className="text-[11px] text-[var(--text-secondary)] text-center">PIX Instantâneo • Confirmação em segundos</p>
                        </form>
                    ) : (
                        /* CREDIT CARD FORM */
                        <form onSubmit={handleCardPayment} className="space-y-4 animate-in fade-in">
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">CPF ou CNPJ</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="000.000.000-00"
                                    value={cpfCnpj}
                                    onChange={(e) => setCpfCnpj(e.target.value)}
                                    className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm font-mono"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Nome no Cartão</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="NOME COMO ESTÁ NO CARTÃO"
                                    value={cardData.holderName}
                                    onChange={(e) => handleCardChange('holderName', e.target.value.toUpperCase())}
                                    className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm uppercase"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Número do Cartão</label>
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
                                    className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm font-mono tracking-wider"
                                />
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Mês</label>
                                    <select
                                        required
                                        value={cardData.expiryMonth}
                                        onChange={(e) => handleCardChange('expiryMonth', e.target.value)}
                                        className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-3 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm"
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
                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Ano</label>
                                    <select
                                        required
                                        value={cardData.expiryYear}
                                        onChange={(e) => handleCardChange('expiryYear', e.target.value)}
                                        className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-3 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm"
                                    >
                                        <option value="">AAAA</option>
                                        {Array.from({ length: 10 }, (_, i) => {
                                            const year = new Date().getFullYear() + i
                                            return <option key={year} value={String(year)}>{year}</option>
                                        })}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">CVV</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={4}
                                        placeholder="000"
                                        value={cardData.ccv}
                                        onChange={(e) => handleCardChange('ccv', e.target.value.replace(/\D/g, ''))}
                                        className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm font-mono text-center"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">CEP</label>
                                    <input
                                        type="text"
                                        required
                                        maxLength={9}
                                        placeholder="00000-000"
                                        value={cardData.postalCode}
                                        onChange={(e) => handleCardChange('postalCode', e.target.value)}
                                        className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Nº do Endereço</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: 123 ou S/N"
                                        value={cardData.addressNumber}
                                        onChange={(e) => handleCardChange('addressNumber', e.target.value)}
                                        className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm font-mono"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Telefone</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="(00) 00000-0000"
                                        value={cardData.phone}
                                        onChange={(e) => handleCardChange('phone', e.target.value)}
                                        className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/60 focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm font-mono"
                                    />
                                </div>
                            </div>

                            {/* Installments */}
                            <div>
                                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1.5 uppercase">Parcelas</label>
                                <select
                                    value={cardData.installmentCount}
                                    onChange={(e) => handleCardChange('installmentCount', Number(e.target.value))}
                                    className="w-full min-h-[48px] bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:border-[#2563EB] dark:focus:border-[#3B82F6] transition-colors text-sm"
                                >
                                    {installmentOptions.map(opt => (
                                        <option key={opt.count} value={opt.count}>
                                            {opt.count}x de R$ {opt.value.toFixed(2)} {opt.count === 1 ? '(à vista)' : ''} — Total: R$ {opt.total.toFixed(2)}
                                        </option>
                                    ))}
                                </select>
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">
                                    Taxa do cartão de R$ {cardFee.toFixed(2)} inclusa no valor total.
                                </p>
                            </div>

                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full min-h-[48px] flex items-center justify-center gap-2 bg-[var(--btn-primary-bg)] hover:bg-[var(--btn-primary-hover)] text-[var(--btn-primary-text)] font-semibold py-3.5 px-6 rounded-lg transition-colors disabled:opacity-50 text-base active:scale-[0.99]"
                            >
                                {processing ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Processando...</>
                                ) : (
                                    <><CreditCard className="w-5 h-5" /> Pagar R$ {cardTotalAmount.toFixed(2)}</>
                                )}
                            </button>

                            <div className="flex items-center justify-center gap-2 text-[11px] text-[var(--text-secondary)]">
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
