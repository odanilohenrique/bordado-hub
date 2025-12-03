import { Upload, UserCheck, ShieldCheck } from 'lucide-react'

const steps = [
    {
        title: 'Peça uma Matriz',
        description: 'Descreva o bordado que você precisa: envie imagens, cores, tamanho. Você receberá propostas de programadores especializados em minutos.',
        icon: Upload,
    },
    {
        title: 'Escolha o Melhor Criador',
        description: 'Compare propostas, veja avaliações de outros clientes, portfólios e histórico. Converse pelo chat e escolha quem melhor atende suas necessidades.',
        icon: UserCheck,
    },
    {
        title: 'Pagamento Protegido',
        description: 'Seu dinheiro fica seguro na plataforma. O programador só recebe quando você aprovar a matriz entregue. Segurança total para ambas as partes.',
        icon: ShieldCheck,
    },
]

export default function HowItWorks() {
    return (
        <div className="bg-white py-16 sm:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
                        Como Funciona?
                    </h2>
                    <p className="mt-4 text-lg text-gray-500">
                        Anuncie o seu trabalho facilmente, contrate freelancers e pague com segurança.
                    </p>
                </div>

                <div className="mt-16">
                    <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                        {steps.map((step) => (
                            <div key={step.title} className="relative text-center">
                                <div className="flex items-center justify-center h-20 w-20 rounded-full bg-indigo-100 text-indigo-600 mx-auto mb-6">
                                    <step.icon className="h-10 w-10" aria-hidden="true" />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                                <p className="text-base text-gray-500">{step.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
