export const TAXA_CLIENTE_PERCENTUAL = 0.05; // 5% de taxa cobrada do comprador
export const TAXA_CRIADOR_PERCENTUAL = 0.05; // 5% de taxa cobrada do produtor

// Compatibilidade
export const TAXA_CLIENTE = 0.05;
export const TAXA_CRIADOR = 0.05;

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

    // 5% cobrados do comprador (adicionados ao valor da matriz)
    const taxaCliente = Math.round(amount * TAXA_CLIENTE_PERCENTUAL * 100) / 100;

    // 5% cobrados do produtor (retidos pela plataforma)
    const taxaCriador = Math.round(amount * TAXA_CRIADOR_PERCENTUAL * 100) / 100;

    // Comprador paga o valor da proposta + 5%
    const totalPago = Math.round((amount + taxaCliente) * 100) / 100;

    // Produtor recebe o valor da proposta - 5% líquido
    const valorLiquido = Math.round((amount - taxaCriador) * 100) / 100;

    return {
        amount,
        taxaCliente,
        taxaCriador,
        totalPago,
        valorLiquido
    };
}
