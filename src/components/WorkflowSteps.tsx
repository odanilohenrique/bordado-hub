import { ArrowRight } from 'lucide-react'

const steps = [
    {
        role: 'Cliente',
        action: 'Converta esta imagem em matriz de bordado',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900',
    },
    {
        role: 'Programador',
        action: 'Cobro R$35 para criar essa matriz',
        bgColor: 'bg-violet-50',
        borderColor: 'border-violet-200',
        textColor: 'text-violet-900',
    },
    {
        role: 'Cliente',
        action: 'Aceito a proposta\nPedido Pago',
        bgColor: 'bg-blue-50',
        borderColor: 'border-blue-200',
        textColor: 'text-blue-900',
    },
    {
        role: 'Programador',
        action: 'Matriz entregue\nPagamento recebido',
        bgColor: 'bg-violet-50',
        borderColor: 'border-violet-200',
        textColor: 'text-violet-900',
    },
]

export default function WorkflowSteps() {
    return (
        <div className="bg-gray-50 py-12 sm:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    {steps.map((step, index) => (
                        <div key={index} className="relative">
                            <div className={`${step.bgColor} ${step.borderColor} border-2 rounded-lg p-6 min-h-[160px] flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow`}>
                                <div>
                                    <div className={`text-sm font-semibold ${step.textColor} mb-2`}>
                                        {step.role}
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-line">
                                        {step.action}
                                    </p>
                                </div>
                            </div>
                            {index < steps.length - 1 && (
                                <div className="hidden lg:block absolute top-1/2 -right-3 transform -translate-y-1/2 z-10">
                                    <ArrowRight className="h-6 w-6 text-gray-400" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
