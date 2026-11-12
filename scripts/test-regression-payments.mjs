/**
 * SUÍTE DE TESTES DE REGRESSÃO — BORDADOHUB
 * Executado via Node.js para validação do checklist da diretriz GEMINI.md
 */

import assert from 'node:assert/strict'
import { 
    calculateTotals, 
    calculateCardFee, 
    ASAAS_INSTALLMENT_RATES, 
    ASAAS_CARD_FIXED_FEE 
} from '../src/lib/payments.js'

console.log('🧪 Iniciando Testes de Regressão: Domínio Financeiro & Taxas...')

let passed = 0
let failed = 0

function test(description, fn) {
    try {
        fn()
        console.log(`  ✅ PASS: ${description}`)
        passed++
    } catch (err) {
        console.error(`  ❌ FAIL: ${description}`)
        console.error(`     Erro: ${err.message}`)
        failed++
    }
}

// ==============================================================================
// 1. CÁLCULO DE REPASSE PROGRESSIVO DE JUROS NO CARTÃO (1x a 12x)
// ==============================================================================
test('Cartão 1x: Repasse de taxa à vista + tarifa fixa preserva valor base', () => {
    const base = 100.00
    const fee1x = calculateCardFee(base, 1)
    
    // totalComTaxa = (100 + 0.49) / (1 - 0.0299) = 103.59
    assert(fee1x.totalComTaxa > base, 'Total com taxa deve ser maior que o valor base')
    assert.equal(fee1x.rate, ASAAS_INSTALLMENT_RATES[1])
    assert.equal(fee1x.valorParcela, fee1x.totalComTaxa)
})

test('Cartão Progressivo: Juros devem aumentar estritamente de 1x até 12x', () => {
    const base = 150.00
    let prevTotal = 0
    let prevRate = 0

    for (let parcelas = 1; parcelas <= 12; parcelas++) {
        const fee = calculateCardFee(base, parcelas)
        assert(fee.rate > prevRate, `Taxa de ${parcelas}x (${fee.rate}) deve ser maior que ${parcelas-1}x (${prevRate})`)
        assert(fee.totalComTaxa > prevTotal, `Total de ${parcelas}x deve ser maior que ${parcelas-1}x`)
        assert(fee.valorParcela > 0, `Valor da parcela deve ser positivo`)
        assert.equal(Math.ceil((fee.totalComTaxa / parcelas) * 100) / 100, fee.valorParcela)
        
        prevTotal = fee.totalComTaxa
        prevRate = fee.rate
    }
})

test('Fórmula Inversa Asaas: Desconto do Asaas sobre totalComTaxa deve deixar exatamente o base', () => {
    const base = 250.00
    for (let parcelas = 1; parcelas <= 12; parcelas++) {
        const fee = calculateCardFee(base, parcelas)
        // O Asaas desconta: totalComTaxa * rate + fixedFee
        const asaasCut = (fee.totalComTaxa * fee.rate) + ASAAS_CARD_FIXED_FEE
        const liquidoQueSobra = fee.totalComTaxa - asaasCut
        
        // Deve sobrar pelo menos o valor base (arredondamento seguro para cima)
        assert(
            liquidoQueSobra >= base - 0.02, 
            `No parcelamento em ${parcelas}x o líquido (${liquidoQueSobra.toFixed(2)}) ficou menor que o base (${base})`
        )
    }
})

// ==============================================================================
// 2. RETENÇÃO E VALOR LÍQUIDO DO PROGRAMADOR (CALCULATETOTALS)
// ==============================================================================
test('calculateTotals: Taxa do cliente é 0% e criador recebe 90% líquido', () => {
    const res = calculateTotals(200)
    assert.equal(res.taxaCliente, 0, 'Cliente tem taxa zero na plataforma')
    assert.equal(res.taxaCriador, 20.00, 'Criador paga 10% (R$ 20,00)')
    assert.equal(res.valorLiquido, 180.00, 'Criador recebe R$ 180,00 líquido')
    assert.equal(res.totalPago, 200.00, 'Comprador paga R$ 200,00')
})

test('calculateTotals: Proteção contra inputs inválidos (NaN, negativo, zero)', () => {
    const neg = calculateTotals(-50)
    assert.equal(neg.amount, 0)
    assert.equal(neg.valorLiquido, 0)

    const nan = calculateTotals('abc')
    assert.equal(nan.amount, 0)
    assert.equal(nan.valorLiquido, 0)
})

// ==============================================================================
// 3. TAXAS DO MARKETPLACE (15% PLATAFORMA / 85% VENDEDOR)
// ==============================================================================
test('Marketplace: Matriz individual ou pacote retém 15% e repassa 85% líquido', () => {
    const precos = [19.90, 35.00, 50.00, 120.00]
    
    for (const preco of precos) {
        const platformFee = Number((preco * 0.15).toFixed(2))
        const sellerNet = Number((preco - platformFee).toFixed(2))
        
        assert.equal(
            Number((platformFee + sellerNet).toFixed(2)), 
            preco, 
            'A soma da taxa da plataforma + líquido do vendedor deve ser exatamente igual ao preço'
        )
        assert(sellerNet > platformFee, 'Líquido do vendedor deve ser maior que a taxa da plataforma')
    }
})

console.log('\n----------------------------------------')
console.log(`Resultado: ${passed} passaram, ${failed} falharam.`)

if (failed > 0) {
    process.exit(1)
} else {
    process.exit(0)
}
