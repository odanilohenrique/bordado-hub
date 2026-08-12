import Image from 'next/image'
import Link from 'next/link'
import { Download, ShoppingCart, Star, Tag } from 'lucide-react'

// Using format price helper or simple inline format
const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(price)
}

export default function ProductCard({ product }: { product: any }) {
    // Basic rendering of a marketplace product card
    return (
        <div className="bg-[#1A1D23] border border-gray-800 hover:border-[#FFAE00]/50 rounded-2xl overflow-hidden transition-all duration-300 hover:shadow-[0_0_30px_rgba(255,174,0,0.1)] group flex flex-col h-full relative cursor-pointer">
            
            {/* Image Container */}
            <div className="relative w-full h-48 bg-[#0F1115] overflow-hidden">
                <Image
                    src={product.image_url}
                    alt={product.title}
                    fill
                    className="object-cover group-hover:scale-110 transition-transform duration-500"
                    unoptimized
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#1A1D23] via-transparent to-transparent opacity-80" />
                <div className="absolute bottom-3 left-3 flex gap-1">
                    {product.formats?.slice(0, 3).map((fmt: string) => (
                        <span key={fmt} className="bg-[#0F1115]/80 backdrop-blur-sm border border-white/10 text-xs font-bold px-2 py-0.5 rounded text-gray-300">
                            {fmt}
                        </span>
                    ))}
                </div>
            </div>

            {/* Content Container */}
            <div className="p-5 flex flex-col flex-1">
                <h3 className="text-lg font-bold text-[#F3F4F6] mb-1 line-clamp-1 group-hover:text-[#FFAE00] transition-colors">{product.title}</h3>
                
                {/* Seller Info */}
                <div className="flex items-center gap-2 mb-3">
                    {product.seller?.avatar_url ? (
                        <img src={product.seller.avatar_url} alt={product.seller.name} className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                        <div className="w-5 h-5 rounded-full bg-gray-700 flex items-center justify-center">
                            <Star className="w-3 h-3 text-gray-500" />
                        </div>
                    )}
                    <span className="text-xs text-gray-400 truncate">Vendido por <span className="text-gray-300">{product.seller?.name || 'Programador'}</span></span>
                </div>

                {/* Price and Action Row */}
                <div className="mt-auto flex items-center justify-between pt-4 border-t border-gray-800">
                    <div className="flex items-end gap-1">
                        {product.price > 0 ? (
                            <span className="text-2xl font-black text-[#FFAE00] leading-none mb-0.5">{formatPrice(product.price)}</span>
                        ) : (
                            <span className="text-xl font-black text-green-400 uppercase tracking-widest bg-green-500/10 px-2 py-1 rounded inline-flex items-center gap-1">
                                <Download className="w-4 h-4" /> Grátis
                            </span>
                        )}
                    </div>
                    
                    <button className="bg-[#FFAE00] hover:bg-yellow-400 text-[#0F1115] p-2.5 rounded-xl font-bold transition-transform transform active:scale-95 shadow-lg shadow-[#FFAE00]/20">
                        <ShoppingCart className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    )
}
