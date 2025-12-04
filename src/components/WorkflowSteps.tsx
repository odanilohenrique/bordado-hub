import { ArrowRight, Image as ImageIcon, DollarSign, CheckCircle, Download } from 'lucide-react'
import Image from 'next/image'

const steps = [
    {
        role: 'Cliente',
        title: 'Solicita Matriz',
        description: 'Converta esta imagem em matriz de bordado',
        detail: 'Logo Empresa X • Formato: DST',
        icon: ImageIcon,
        image: '/assets/workflow/step1-request.png',
        bgColor: 'bg-[#1A1D23]',
        borderColor: 'border-[#FFAE00]',
        textColor: 'text-[#FFAE00]',
        iconBg: 'bg-[#FFAE00]/10',
    },
    {
        role: 'Programador',
        title: 'Envia Proposta',
        description: 'Cobro R$35 para criar essa matriz',
        detail: '2 dias de prazo',
        icon: DollarSign,
        image: '/assets/workflow/step2-proposal.png',
        bgColor: 'bg-[#1A1D23]',
        borderColor: 'border-[#2DD4BF]',
        textColor: 'text-[#2DD4BF]',
        iconBg: 'bg-[#2DD4BF]/10',
    },
    {
        role: 'Cliente',
        title: 'Aceita & Paga',
        description: 'Aceito a proposta',
        detail: 'R$35,00 • Pagamento em Garantia',
        icon: CheckCircle,
        image: '/assets/workflow/step3-payment.png',
        bgColor: 'bg-[#1A1D23]',
        borderColor: 'border-[#FFAE00]',
        textColor: 'text-[#FFAE00]',
        iconBg: 'bg-[#FFAE00]/10',
    },
    {
        role: 'Programador',
        title: 'Entrega Concluída',
        description: 'Matriz entregue',
        detail: 'Cliente aprovou • Pagamento liberado',
        icon: Download,
        image: '/assets/workflow/step4-delivery.png',
        bgColor: 'bg-[#1A1D23]',
        borderColor: 'border-[#2DD4BF]',
        textColor: 'text-[#2DD4BF]',
        iconBg: 'bg-[#2DD4BF]/10',
    },
]

export default function WorkflowSteps() {
    return (
        <div className="bg-[#0F1115] py-12 sm:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    {steps.map((step, index) => (
                        <div key={index} className="relative">
                            <div className={`${step.bgColor} ${step.borderColor} border-2 rounded-xl p-4 min-h-[320px] flex flex-col justify-between shadow-lg hover:shadow-2xl hover:scale-105 transition-all duration-300 group`}>
                                {/* Header */}
                                <div>
                                    <div className="flex items-center justify-between mb-4">
                                        <span className={`text-xs font-bold ${step.textColor} uppercase tracking-wider`}>
                                            {step.role}
                                        </span>
                                        <div className={`${step.iconBg} ${step.textColor} p-2 rounded-lg`}>
                                            <step.icon className="h-5 w-5" />
                                        </div>
                                    </div>

                                    {/* Illustration */}
                                    <div className="relative w-full h-32 mb-4 rounded-lg overflow-hidden bg-black/20 border border-white/5 group-hover:border-white/10 transition-colors">
                                        <Image
                                            src={step.image}
                                            alt={step.title}
                                            fill
                                            className="object-cover object-center opacity-90 group-hover:opacity-100 transition-opacity"
                                        />
                                    </div>

                                    <h4 className={`text-base font-bold ${step.textColor} mb-2`}>
                                        {step.title}
                                    </h4>

                                    <p className="text-sm text-gray-300 mb-3">
                                        {step.description}
                                    </p>
                                </div>

                                {/* Footer with details */}
                                <div className={`pt-3 border-t ${step.borderColor}/20`}>
                                    <p className="text-xs text-gray-400 font-medium">
                                        {step.detail}
                                    </p>
                                </div>
                            </div>

                            {/* Arrow connector */}
                            {index < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                                    <ArrowRight className="h-6 w-6 text-[#FFAE00]" strokeWidth={2.5} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

