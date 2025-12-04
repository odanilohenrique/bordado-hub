import { PenTool, Edit, FileCode, Image as ImageIcon } from 'lucide-react'

const categories = [
    {
        name: 'Criação de Matriz',
        description: 'Desenho completo a partir de uma imagem ou ideia.',
        icon: PenTool,
        color: 'bg-pink-500',
    },
    {
        name: 'Edição e Ajustes',
        description: 'Alterar tamanho, pontos ou detalhes de uma matriz existente.',
        icon: Edit,
        color: 'bg-blue-500',
    },
    {
        name: 'Conversão de Formato',
        description: 'Converter entre .PES, .DST, .JEF e outros formatos.',
        icon: FileCode,
        color: 'bg-green-500',
    },
    {
        name: 'Logotipos Bordados',
        description: 'Transforme a marca da sua empresa em bordado.',
        icon: ImageIcon,
        color: 'bg-purple-500',
    },
]

export default function Categories() {
    return (
        <div className="bg-[#0F1115] py-12 sm:py-16 lg:py-20">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center">
                    <h2 className="text-3xl font-extrabold text-[#F3F4F6] sm:text-4xl">
                        Encontre programadores talentosos para...
                    </h2>
                    <p className="mt-4 text-lg text-gray-300">
                        Qualquer tipo de serviço relacionado a bordados computadorizados.
                    </p>
                </div>
                <div className="mt-12 grid gap-8 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                    {categories.map((category) => (
                        <div
                            key={category.name}
                            className="bg-[#1A1D23] overflow-hidden shadow-md rounded-lg hover:shadow-xl hover:border hover:border-[#FFAE00]/30 transition-all duration-300"
                        >
                            <div className="p-5">
                                <div className="flex items-center">
                                    <div className={`flex-shrink-0 rounded-md p-3 ${category.color}`}>
                                        <category.icon className="h-6 w-6 text-white" aria-hidden="true" />
                                    </div>
                                    <div className="ml-5 w-0 flex-1">
                                        <h3 className="text-lg font-medium text-[#F3F4F6] truncate">
                                            {category.name}
                                        </h3>
                                    </div>
                                </div>
                                <div className="mt-4">
                                    <p className="text-sm text-gray-300">
                                        {category.description}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
