export const TAXA_CLIENTE_PERCENTUAL = 0.0; // 0% de taxa cobrada do comprador (taxa zero)
export const TAXA_CRIADOR_PERCENTUAL = 0.10; // 10% de taxa descontada do produtor

// Compatibilidade
export const TAXA_CLIENTE = 0.0;
export const TAXA_CRIADOR = 0.10;

export function calculateTotals(jobAmount) {
    const amount = parseFloat(jobAmount);
    if (isNaN(amount) || amount <= 0) {
        return { 
            amount: 0, 
            totalPago: 0, 
            valorLiquido: 0, 
            taxaCliente: 0, 
            taxaCriador: 0 
        };
    }

    // 0% cobrados do comprador (comprador paga exatamente o valor da proposta)
    const taxaCliente = 0;

    // 10% cobrados do produtor (retidos pela plataforma)
    const taxaCriador = Math.round(amount * TAXA_CRIADOR_PERCENTUAL * 100) / 100;

    // Comprador paga o valor integral da proposta
    const totalPago = Math.round(amount * 100) / 100;

    // Produtor recebe o valor da proposta - 10% líquido
    const valorLiquido = Math.round((amount - taxaCriador) * 100) / 100;

    return {
        amount,
        taxaCliente,
        taxaCriador,
        totalPago,
        valorLiquido
    };
}

