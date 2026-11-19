'use client'

type BrandLogoVariant = 'horizontal' | 'stacked' | 'card' | 'icon'

interface BrandLogoProps {
    variant?: BrandLogoVariant
    className?: string
    alt?: string
    priority?: boolean
}

const VARIANT_META: Record<
    BrandLogoVariant,
    { dark: string; light: string; width: number; height: number; defaultClass: string }
> = {
    horizontal: {
        dark: '/brand/v2/logo-horizontal-dark.svg',
        light: '/brand/v2/logo-horizontal-light.svg',
        width: 211,
        height: 36,
        defaultClass: 'h-6 sm:h-7 w-auto',
    },
    stacked: {
        dark: '/brand/v2/logo-stacked-dark.svg',
        light: '/brand/v2/logo-stacked-light.svg',
        width: 641,
        height: 292,
        defaultClass: 'h-14 w-auto',
    },
    card: {
        dark: '/brand/v2/logo-bg-dark.svg',
        light: '/brand/v2/logo-bg-light.svg',
        width: 720,
        height: 720,
        defaultClass: 'w-12 h-12',
    },
    icon: {
        dark: '/brand/v2/icon.svg',
        light: '/brand/v2/icon.svg',
        width: 512,
        height: 512,
        defaultClass: 'w-9 h-9',
    },
}

export default function BrandLogo({
    variant = 'horizontal',
    className = '',
    alt = 'BordadoHub',
    priority = false,
}: BrandLogoProps) {
    const meta = VARIANT_META[variant]
    const sizeClass = className || meta.defaultClass

    if (variant === 'icon') {
        return (
            <img
                src={meta.dark}
                alt={alt}
                width={meta.width}
                height={meta.height}
                decoding={priority ? 'sync' : 'async'}
                className={`object-contain select-none ${sizeClass}`}
            />
        )
    }

    return (
        <>
            <img
                src={meta.dark}
                alt={alt}
                width={meta.width}
                height={meta.height}
                decoding={priority ? 'sync' : 'async'}
                className={`hidden dark:block object-contain select-none ${sizeClass}`}
            />
            <img
                src={meta.light}
                alt={alt}
                width={meta.width}
                height={meta.height}
                decoding={priority ? 'sync' : 'async'}
                className={`block dark:hidden object-contain select-none ${sizeClass}`}
            />
        </>
    )
}
