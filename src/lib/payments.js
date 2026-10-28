export const TAXA_CLIENTE_PERCENTUAL = 0.0; // 0% de taxa cobrada do comprador (taxa zero para plataforma)
export const TAXA_CRIADOR_PERCENTUAL = 0.10; // 10% de taxa descontada do produtor

// Compatibilidade
export const TAXA_CLIENTE = 0.0;
export const TAXA_CRIADOR = 0.10;

// Taxas reais do gateway Asaas para cartão de crédito (repassadas ao comprador)
// Inclui a tarifa fixa (R$ 0,49) + taxa de transação parcelada + taxa de antecipação (~1.35% a 1.5% ao mês)
// para garantir que a plataforma receba o valor integral à vista para repassar ao produtor via PIX.
export const ASAAS_CARD_FIXED_FEE = 0.49; // R$0,49 tarifa fixa por cobrança

export const ASAAS_INSTALLMENT_RATES = {
    1: 0.0299,  // 2.99% à vista
    2: 0.0450,  // 4.50% (2x)
    3: 0.0600,  // 6.00% (3x)
    4: 0.0750,  // 7.50% (4x)
    5: 0.0900,  // 9.00% (5x)
    6: 0.1050,  // 10.50% (6x)
    7: 0.1200,  // 12.00% (7x)
    8: 0.1350,  // 13.50% (8x)
    9: 0.1500,  // 15.00% (9x)
    10: 0.1650, // 16.50% (10x)
    11: 0.1800, // 18.00% (11x)
    12: 0.1950  // 19.50% (12x)
};

// Compatibilidade retroativa
export const ASAAS_CARD_RATE_AVISTA = 0.0299;
export const ASAAS_CARD_RATE_PARCELADO = 0.0450;

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
 * @returns {{ taxaCartao: number, totalComTaxa: number, valorParcela: number, rate: number }}
 */
export function calculateCardFee(baseAmount, installments = 1) {
    const amount = parseFloat(baseAmount);
    if (isNaN(amount) || amount <= 0) {
        return { taxaCartao: 0, totalComTaxa: 0, valorParcela: 0, rate: 0.0299 };
    }

    const count = Math.max(1, Math.min(12, parseInt(installments) || 1));
    const rate = ASAAS_INSTALLMENT_RATES[count] || (0.03 + (count * 0.014));
    const fixedFee = ASAAS_CARD_FIXED_FEE;

    // Fórmula inversa para garantir que o valor líquido recebido no Asaas = baseAmount
    const totalComTaxa = Math.ceil(((amount + fixedFee) / (1 - rate)) * 100) / 100;
    const taxaCartao = Math.round((totalComTaxa - amount) * 100) / 100;
    const valorParcela = count > 1
        ? Math.ceil((totalComTaxa / count) * 100) / 100
        : totalComTaxa;

    return {
        taxaCartao,
        totalComTaxa,
        valorParcela,
        rate
    };
}

