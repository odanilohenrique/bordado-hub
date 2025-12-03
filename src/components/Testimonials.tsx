'use client'

import { useState, useEffect } from 'react'
import { Star } from 'lucide-react'

const testimonials = [
    {
        content: "Muito bom site para quem busca profissionais de matrizes. Depois que você faz um projeto aqui, você se pergunta: como eu trabalhava sem esse site? Valeu muito a pena!",
        author: "Rafael Leite",
        role: "Cliente"
    },
    {
        content: "A qualidade dos profissionais disponíveis é muito acima do esperado. A plataforma é limpa e objetiva. Parabéns ao BordadoHub.",
        author: "Lincoln Tamashiro",
        role: "Confecção"
    },
    {
        content: "O BordadoHub foi um achado. Todas as propostas foram bem elaboradas, os profissionais mostram ser plenamente competentes.",
        author: "Jorge Medeiros",
        role: "Cliente"
    },
]

export default function Testimonials() {
    const [currentIndex, setCurrentIndex] = useState(0)

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentIndex((prev) => (prev + 1) % testimonials.length)
        }, 5000)
        return () => clearInterval(timer)
    }, [])

    return (
        <div className="bg-indigo-700 py-16 sm:py-24">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <h2 className="text-3xl font-extrabold text-white text-center mb-12">
                    O que nossos clientes estão dizendo
                </h2>

                <div className="relative h-64 sm:h-48 overflow-hidden">
                    {testimonials.map((testimonial, index) => (
                        <div
                            key={index}
                            className={`absolute inset-0 flex flex-col items-center justify-center transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100' : 'opacity-0'
                                }`}
                        >
                            <div className="max-w-3xl text-center">
                                <div className="flex justify-center mb-4">
                                    {[...Array(5)].map((_, i) => (
                                        <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                                    ))}
                                </div>
                                <p className="text-xl sm:text-2xl font-medium text-white italic mb-6">
                                    &quot;{testimonial.content}&quot;
                                </p>
                                <footer className="text-indigo-200">
                                    <div className="font-semibold text-white">{testimonial.author}</div>
                                    <div className="text-sm">{testimonial.role}</div>
                                </footer>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex justify-center mt-8 space-x-2">
                    {testimonials.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`h-2 w-2 rounded-full transition-colors ${index === currentIndex ? 'bg-white' : 'bg-indigo-400'
                                }`}
                            aria-label={`Go to slide ${index + 1}`}
                        />
                    ))}
                </div>
            </div>
        </div>
    )
}
