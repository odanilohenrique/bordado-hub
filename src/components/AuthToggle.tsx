export default function AuthToggle({ isLogin, setIsLogin }: { isLogin: boolean; setIsLogin: (v: boolean) => void }) {
    return (
        <div className="relative inline-flex w-52 bg-[var(--bg-surface-elevated)] border border-[var(--border-hairline)] rounded-xl p-1">
            <button
                type="button"
                onClick={() => setIsLogin(true)}
                className={`w-1/2 min-h-[44px] rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center ${
                    isLogin
                        ? 'bg-[#2563EB] text-white font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
                }`}
            >
                Entrar
            </button>
            <button
                type="button"
                onClick={() => setIsLogin(false)}
                className={`w-1/2 min-h-[44px] rounded-lg text-sm transition-colors cursor-pointer flex items-center justify-center ${
                    !isLogin
                        ? 'bg-[#2563EB] text-white font-semibold'
                        : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium'
                }`}
            >
                Cadastrar
            </button>
        </div>
    );
}
