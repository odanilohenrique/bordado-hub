import { useEffect, useState } from 'react';
import Image from 'next/image';

const images = ['/images/carousel1.png', '/images/carousel2.png'];

export default function Carousel() {
    const [index, setIndex] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => {
            setIndex((prev) => (prev + 1) % images.length);
        }, 3000); // 3 seconds per slide
        return () => clearInterval(timer);
    }, []);

    return (
        <div className="relative w-full h-full">
            {images.map((src, i) => (
                <Image
                    key={src}
                    src={src}
                    alt={`Carousel ${i + 1}`}
                    fill
                    className={`object-cover transition-opacity duration-1000 ${i === index ? 'opacity-100' : 'opacity-0'}`}
                    priority={i === 0}
                />
            ))}
        </div>
    );
}
