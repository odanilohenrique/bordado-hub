export const TAXA_CLIENTE_PERCENTUAL = 0.0; // 0% de taxa cobrada do comprador (taxa zero para plataforma)
export const TAXA_CRIADOR_PERCENTUAL = 0.10; // 10% de taxa descontada do produtor

// Compatibilidade
export const TAXA_CLIENTE = 0.0;
export const TAXA_CRIADOR = 0.10;

// Taxas reais do gateway Asaas para cartão de crédito (repassadas ao comprador)
export const ASAAS_CARD_RATE_AVISTA = 0.0299;      // 2.99% à vista
export const ASAAS_CARD_RATE_PARCELADO = 0.0199;    // 1.99% parcelado
export const ASAAS_CARD_FIXED_FEE = 0.49;           // R$0,49 tarifa fixa por cobrança

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

    // 0% cobrados do comprador pela plataforma (comprador paga exatamente o valor da proposta no PIX)
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

/**
 * Calcula a taxa do cartão de crédito do Asaas que será repassada ao comprador.
 * Fórmula inversa: para que o valor líquido recebido no Asaas seja exatamente `baseAmount`,
 * precisamos cobrar: totalComTaxa = (baseAmount + fixedFee) / (1 - rate)
 * Assim o Asaas desconta a taxa e sobra exatamente `baseAmount` na conta.
 *
 * @param {number} baseAmount - Valor base da proposta (sem taxa)
 * @param {number} installments - Número de parcelas (1 = à vista)
 * @returns {{ taxaCartao: number, totalComTaxa: number, valorParcela: number }}
 */
export function calculateCardFee(baseAmount, installments = 1) {
    const amount = parseFloat(baseAmount);
    if (isNaN(amount) || amount <= 0) {
        return { taxaCartao: 0, totalComTaxa: 0, valorParcela: 0 };
    }

    const rate = installments <= 1 ? ASAAS_CARD_RATE_AVISTA : ASAAS_CARD_RATE_PARCELADO;
    const fixedFee = ASAAS_CARD_FIXED_FEE;

    // Fórmula inversa para garantir que o valor líquido recebido = baseAmount
    const totalComTaxa = Math.ceil(((amount + fixedFee) / (1 - rate)) * 100) / 100;
    const taxaCartao = Math.round((totalComTaxa - amount) * 100) / 100;
    const valorParcela = installments > 1
        ? Math.ceil((totalComTaxa / installments) * 100) / 100
        : totalComTaxa;

    return {
        taxaCartao,
        totalComTaxa,
        valorParcela
    };
}

