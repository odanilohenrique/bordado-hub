import { useState } from 'react';

export default function AuthToggle({ isLogin, setIsLogin }: { isLogin: boolean; setIsLogin: (v: boolean) => void }) {
    return (
        <div className="relative inline-flex w-48 h-10 bg-indigo-100 rounded-full p-1">
            <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`w-1/2 h-full rounded-full transition ${isLogin ? 'bg-indigo-600 text-white' : 'text-indigo-600'}
        `}
            >
                Entrar
            </button>
            <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`w-1/2 h-full rounded-full transition ${!isLogin ? 'bg-indigo-600 text-white' : 'text-indigo-600'}
        `}
            >
                Cadastrar
            </button>
        </div>
    );
}
