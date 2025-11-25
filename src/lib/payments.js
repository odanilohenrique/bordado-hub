export const TAXA_CLIENTE = 5.00;
export const TAXA_CRIADOR = 5.00;

export function calculateTotals(jobAmount) {
    const amount = parseFloat(jobAmount);
    if (isNaN(amount)) return { totalPago: 0, valorLiquido: 0, taxaCliente: 0, taxaCriador: 0 };

    const totalPago = amount + TAXA_CLIENTE;
    const valorLiquido = amount - TAXA_CRIADOR;

    return {
        amount,
        taxaCliente: TAXA_CLIENTE,
        taxaCriador: TAXA_CRIADOR,
        totalPago,
        valorLiquido
    };
}
