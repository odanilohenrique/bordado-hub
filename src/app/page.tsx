import Link from 'next/link'

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center">
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl md:text-6xl">
        <span className="block xl:inline">O Marketplace de</span>{' '}
        <span className="block text-indigo-600 xl:inline">Matrizes de Bordado</span>
      </h1>
      <p className="mt-3 max-w-md mx-auto text-base text-gray-500 sm:text-lg md:mt-5 md:text-xl md:max-w-3xl">
        Conecte-se com os melhores criadores de matrizes ou ofereça seus serviços para clientes de todo o Brasil.
        Segurança no pagamento e qualidade na entrega.
      </p>
      <div className="mt-5 max-w-md mx-auto sm:flex sm:justify-center md:mt-8">
        <div className="rounded-md shadow">
          <Link
            href="/register"
            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
          >
            Começar Agora
          </Link>
        </div>
        <div className="mt-3 rounded-md shadow sm:mt-0 sm:ml-3">
          <Link
            href="/jobs"
            className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-600 bg-white hover:bg-gray-50 md:py-4 md:text-lg md:px-10"
          >
            Ver Jobs
          </Link>
        </div>
      </div>

      <div className="mt-20 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <div className="text-lg font-medium text-gray-900">Para Clientes</div>
          <p className="mt-2 text-gray-500">
            Publique seu pedido com referências e receba propostas de criadores talentosos.
            Pague com segurança e só libere o dinheiro após aprovar a matriz.
          </p>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <div className="text-lg font-medium text-gray-900">Para Criadores</div>
          <p className="mt-2 text-gray-500">
            Encontre jobs que combinam com seu estilo. Envie propostas, entregue o arquivo
            e receba seu pagamento garantido.
          </p>
        </div>
        <div className="bg-white overflow-hidden shadow rounded-lg p-6">
          <div className="text-lg font-medium text-gray-900">Segurança</div>
          <p className="mt-2 text-gray-500">
            Pagamentos via Mercado Pago ou PayPal. Sistema de Escrow protege ambos os lados.
            Taxa fixa justa de R$ 5,00 para cada lado.
          </p>
        </div>
      </div>
    </div>
  )
}
