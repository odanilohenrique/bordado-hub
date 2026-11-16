/**
 * TEST HELPERS & UTILITIES — BORDADOHUB E2E & REGRESSION SUITE
 * Reusable in-memory mocks, async test runner, financial consolidation simulator,
 * and security/AST assertion helpers.
 *
 * Hardened in Iteration 2 against:
 * - Missing/null arguments (default param = {})
 * - Explicit null/non-array collections (Array.isArray fallback)
 * - Null/invalid entries in collections
 * - Negative amounts (clamped to 0)
 * - NaN contamination on gross, net, and fee
 * - Intra-transaction duplicate rows sharing asaas_payment_id
 * - Inconsistent whitespace and casing (.trim().toLowerCase())
 */

import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Creates an async-first test runner that queues tests and executes them sequentially.
 */
export function createTestRunner(options = {}) {
    const queue = []
    let passed = 0
    let failed = 0
    const errors = []
    const silent = Boolean(options.silent)

    function test(description, fn) {
        queue.push({ description, fn })
    }

    function suite(title) {
        queue.push({ isSuite: true, title })
    }

    async function run(exitOnComplete = true) {
        const startTime = performance.now()
        for (const item of queue) {
            if (item.isSuite) {
                if (!silent) console.log(`\n=== ${item.title} ===`)
                continue
            }
            const { description, fn } = item
            const testStart = performance.now()
            try {
                await fn()
                const duration = (performance.now() - testStart).toFixed(1)
                if (!silent) console.log(`  ✅ PASS: ${description} (${duration}ms)`)
                passed++
            } catch (err) {
                const duration = (performance.now() - testStart).toFixed(1)
                const errMsg = (err && typeof err === 'object' && err.message) ? err.message : String(err)
                if (!silent) console.error(`  ❌ FAIL: ${description} (${duration}ms)`)
                if (!silent) console.error(`     Erro: ${errMsg}`)
                failed++
                errors.push({ description, error: err })
            }
        }

        const totalDuration = ((performance.now() - startTime) / 1000).toFixed(2)
        if (!silent) {
            console.log('\n----------------------------------------')
            console.log(`Resultado da Suíte: ${passed} passaram, ${failed} falharam em ${totalDuration}s.`)
        }

        if (failed > 0) {
            if (!silent) {
                console.error(`\n🚨 ${failed} teste(s) falharam:`)
                errors.forEach(({ description, error }, idx) => {
                    const errMsg = (error && typeof error === 'object' && error.message) ? error.message : String(error)
                    console.error(`  ${idx + 1}. ${description}: ${errMsg}`)
                })
            }
            if (exitOnComplete) process.exit(1)
            return false
        } else {
            if (!silent) console.log(`✨ 100% dos testes passaram com sucesso!`)
            if (exitOnComplete) process.exit(0)
            return true
        }
    }

    return {
        test,
        suite,
        run,
        summary: run,
        getStats: () => ({ passed, failed, errors, total: passed + failed })
    }
}

/**
 * Creates an in-memory fluent mock of the Supabase client.
 * Supports chaining: .from().select().eq().order().single().maybeSingle().update().insert()
 * and storage: .storage.from(bucket).createSignedUrl(path, ttl)
 */
export function createMockSupabase(initialData = {}) {
    const safeInitial = (initialData && typeof initialData === 'object') ? initialData : {}
    const tables = {}
    for (const [tableName, rows] of Object.entries(safeInitial)) {
        tables[tableName] = Array.isArray(rows) ? JSON.parse(JSON.stringify(rows)) : []
    }

    function getTable(name) {
        if (!tables[name]) {
            tables[name] = []
        }
        return tables[name]
    }

    class QueryBuilder {
        constructor(tableName) {
            this.tableName = tableName
            this.rows = [...getTable(tableName)]
            this.selectedFields = '*'
            this.filters = []
            this.sortOrder = null
            this.limitCount = null
        }

        select(fields = '*') {
            this.selectedFields = fields
            return this
        }

        eq(column, value) {
            this.rows = this.rows.filter(row => {
                if (!row) return false
                if (row[column] === undefined && value === null) return true
                return row[column] === value
            })
            return this
        }

        neq(column, value) {
            this.rows = this.rows.filter(row => row && row[column] !== value)
            return this
        }

        in(column, values) {
            const set = new Set(values)
            this.rows = this.rows.filter(row => row && set.has(row[column]))
            return this
        }

        order(column, { ascending = true } = {}) {
            this.sortOrder = { column, ascending }
            this.rows.sort((a, b) => {
                const valA = a ? a[column] : undefined
                const valB = b ? b[column] : undefined
                if (valA < valB) return ascending ? -1 : 1
                if (valA > valB) return ascending ? 1 : -1
                return 0
            })
            return this
        }

        limit(count) {
            this.limitCount = count
            if (typeof count === 'number' && count >= 0) {
                this.rows = this.rows.slice(0, count)
            }
            return this
        }

        async single() {
            if (this.rows.length === 0) {
                return { data: null, error: new Error('PGRST116: JSON object requested, no rows returned') }
            }
            if (this.rows.length > 1) {
                return { data: null, error: new Error('PGRST116: Multiple rows returned when single was expected') }
            }
            return { data: JSON.parse(JSON.stringify(this.rows[0])), error: null }
        }

        async maybeSingle() {
            if (this.rows.length === 0) {
                return { data: null, error: null }
            }
            return { data: JSON.parse(JSON.stringify(this.rows[0])), error: null }
        }

        async insert(records) {
            const table = getTable(this.tableName)
            const items = Array.isArray(records) ? records : (records ? [records] : [])
            const inserted = []
            for (const item of items) {
                if (!item || typeof item !== 'object') continue
                const record = {
                    id: item.id || `mock_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                    created_at: item.created_at || new Date().toISOString(),
                    ...item
                }
                table.push(record)
                inserted.push(record)
            }
            return { data: Array.isArray(records) ? inserted : (inserted[0] || null), error: null }
        }

        async update(patch) {
            const table = getTable(this.tableName)
            let updatedCount = 0
            const safePatch = (patch && typeof patch === 'object') ? patch : {}
            for (const row of this.rows) {
                if (!row) continue
                const targetInTable = table.find(r => r && r.id === row.id)
                if (targetInTable) {
                    Object.assign(targetInTable, safePatch)
                    updatedCount++
                }
            }
            return { data: safePatch, count: updatedCount, error: null }
        }

        async delete() {
            const table = getTable(this.tableName)
            const idsToDelete = new Set(this.rows.filter(Boolean).map(r => r.id))
            const remaining = table.filter(r => !idsToDelete.has(r.id))
            tables[this.tableName] = remaining
            return { data: null, count: idsToDelete.size, error: null }
        }

        then(resolve, reject) {
            resolve({ data: JSON.parse(JSON.stringify(this.rows)), error: null })
        }
    }

    return {
        from: (tableName) => new QueryBuilder(tableName),
        storage: {
            from: (bucketName) => ({
                createSignedUrl: async (filePath, expiresIn = 60, options = {}) => {
                    if (!filePath || filePath.includes('..')) {
                        return { data: null, error: new Error('Invalid path or path traversal detected') }
                    }
                    const token = `sig_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
                    const signedUrl = `https://mock.supabase.co/storage/v1/object/sign/${bucketName}/${filePath}?token=${token}&expires=${expiresIn}${options.download ? '&download=true' : ''}`
                    return { data: { signedUrl }, error: null }
                },
                getPublicUrl: (filePath) => ({
                    data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${bucketName}/${filePath}` }
                })
            })
        },
        auth: {
            getUser: async (token) => {
                if (!token || token === 'invalid_token' || token === 'expired_token') {
                    return { data: { user: null }, error: new Error('Invalid session token') }
                }
                return {
                    data: {
                        user: {
                            id: token.replace('Bearer ', '').replace('token_', ''),
                            email: 'user@test.com'
                        }
                    },
                    error: null
                }
            }
        },
        _dumpTable: (tableName) => JSON.parse(JSON.stringify(getTable(tableName)))
    }
}

/**
 * Simulates financial consolidation for the Seller Financial Dashboard (/financeiro),
 * enforcing strict deduplication by asaas_payment_id and split rules:
 * - Marketplace Orders: 85% seller net, 15% platform fee, tagged as 'Loja'
 * - Custom Jobs: 90% creator net, 10% platform fee, tagged as 'Sob Medida'
 *
 * Hardened against:
 * - Missing/null arguments (default param = {})
 * - Explicit null/non-array collections (Array.isArray fallback)
 * - Null/invalid entries in collections
 * - Negative amounts (clamped to 0)
 * - NaN contamination on gross, net, and fee
 * - Intra-transaction duplicate rows sharing asaas_payment_id
 * - Inconsistent whitespace and casing (.trim().toLowerCase())
 */
export function simulateFinancialConsolidation({
    marketplaceOrders = [],
    transactions = [],
    proposals = []
} = {}) {
    const safeMarketplaceOrders = Array.isArray(marketplaceOrders) ? marketplaceOrders : []
    const safeTransactions = Array.isArray(transactions) ? transactions : []
    const safeProposals = Array.isArray(proposals) ? proposals : []

    const consolidated = []
    const marketplaceTxAsaasIds = new Set()
    let deduplicatedCount = 0

    // 1. Process paid marketplace orders
    for (const order of safeMarketplaceOrders) {
        if (!order || typeof order !== 'object') continue
        if (order.status !== 'paid') continue

        const rawGross = Number(order.amount)
        const gross = (!Number.isNaN(rawGross) && rawGross >= 0) ? Number(rawGross.toFixed(2)) : 0

        const rawFee = order.platform_fee !== undefined ? Number(order.platform_fee) : null
        const platformFee = (rawFee !== null && !Number.isNaN(rawFee) && rawFee >= 0)
            ? Number(rawFee.toFixed(2))
            : Number((gross * 0.15).toFixed(2))

        const rawNet = order.seller_net !== undefined ? Number(order.seller_net) : null
        const sellerNet = (rawNet !== null && !Number.isNaN(rawNet) && rawNet >= 0)
            ? Number(rawNet.toFixed(2))
            : Number(Math.max(0, gross - platformFee).toFixed(2))

        const asaasId = (typeof order.asaas_payment_id === 'string'
            ? order.asaas_payment_id
            : (order.asaas_payment_id != null ? String(order.asaas_payment_id) : '')
        ).trim().toLowerCase()

        if (asaasId) {
            if (marketplaceTxAsaasIds.has(asaasId)) {
                deduplicatedCount++
                continue // Deduplicate duplicate orders with same asaas_payment_id
            }
            marketplaceTxAsaasIds.add(asaasId)
        }

        consolidated.push({
            id: order.id,
            origin_id: order.id,
            type: 'marketplace',
            badge: 'Loja',
            splitRate: 0.85,
            route: `/marketplace/${order.product_id || (order.product && order.product.id) || ''}`,
            title: (order.product && order.product.title) || order.title || 'Matriz de Bordado',
            client_name: (order.buyer && order.buyer.name) || order.client_name || 'Cliente',
            client_email: (order.buyer && order.buyer.email) || order.client_email || null,
            client_avatar: (order.buyer && order.buyer.avatar_url) || null,
            gross_amount: gross,
            net_amount: sellerNet,
            platform_fee: platformFee,
            payment_method: order.payment_method || 'asaas_pix',
            status: 'liberado',
            asaas_payment_id: order.asaas_payment_id,
            created_at: order.created_at || new Date().toISOString()
        })
    }

    // 2. Process transactions table (custom jobs and legacy transactions)
    for (const tx of safeTransactions) {
        if (!tx || typeof tx !== 'object') continue

        const asaasId = (typeof tx.asaas_payment_id === 'string'
            ? tx.asaas_payment_id
            : (tx.asaas_payment_id != null ? String(tx.asaas_payment_id) : '')
        ).trim().toLowerCase()

        // Anti-duplication check: if transaction is without job_id (orphaned marketplace tx)
        // and matches an existing marketplace order or a previously processed orphaned transaction
        if (!tx.job_id && asaasId) {
            if (marketplaceTxAsaasIds.has(asaasId)) {
                deduplicatedCount++
                continue // Skip duplicate record!
            }
            marketplaceTxAsaasIds.add(asaasId) // Record so subsequent duplicate transactions are deduplicated against each other
        }

        const isCustomJob = Boolean(tx.job_id)
        const rawGross = Number(tx.amount)
        const gross = (!Number.isNaN(rawGross) && rawGross >= 0) ? Number(rawGross.toFixed(2)) : 0

        const rawNet = tx.valor_liquido !== undefined ? Number(tx.valor_liquido) : null
        const net = (rawNet !== null && !Number.isNaN(rawNet) && rawNet >= 0)
            ? Number(rawNet.toFixed(2))
            : (isCustomJob ? Number((gross * 0.90).toFixed(2)) : Number((gross * 0.85).toFixed(2)))

        const fee = Number(Math.max(0, gross - net).toFixed(2))

        consolidated.push({
            id: tx.id,
            origin_id: tx.job_id || tx.id,
            type: isCustomJob ? 'job' : 'marketplace',
            badge: isCustomJob ? 'Sob Medida' : 'Loja',
            splitRate: isCustomJob ? 0.90 : 0.85,
            route: isCustomJob ? `/jobs/${tx.job_id}` : `/marketplace/${tx.product_id || ''}`,
            title: tx.title || (isCustomJob ? `Matriz sob medida #${tx.job_id}` : 'Venda Avulsa'),
            client_name: tx.cliente_nome || 'Cliente',
            client_email: tx.cliente_email || null,
            client_avatar: tx.cliente_avatar || null,
            gross_amount: gross,
            net_amount: net,
            platform_fee: fee,
            payment_method: tx.metodo || 'asaas_pix',
            status: tx.status || 'liberado',
            asaas_payment_id: tx.asaas_payment_id,
            created_at: tx.created_at || new Date().toISOString()
        })
    }

    // Sort descending by date
    consolidated.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))

    // Aggregate KPI metrics with NaN protection
    const totalGross = Number(consolidated.reduce((sum, r) => sum + (Number(r.gross_amount) || 0), 0).toFixed(2))
    const totalNet = Number(consolidated
        .filter(r => r.status === 'liberado')
        .reduce((sum, r) => sum + (Number(r.net_amount) || 0), 0).toFixed(2))
    const totalCustody = Number(consolidated
        .filter(r => r.status === 'custodia')
        .reduce((sum, r) => sum + (Number(r.net_amount) || 0), 0).toFixed(2))
    const totalOrders = consolidated.filter(r => r.status === 'liberado').length

    return {
        records: consolidated,
        totalGross,
        totalNet,
        totalCustody,
        totalOrders,
        deduplicatedCount
    }
}

/**
 * Helper to compute exact 85% marketplace split with 2 decimal precision without drift.
 * In accordance with baseline test 6:
 * platformFee = Number((price * 0.15).toFixed(2))
 * sellerNet = Number((price - platformFee).toFixed(2))
 *
 * Hardened against negative / NaN inputs.
 */
export function calculateMarketplaceSplit(price) {
    const raw = Number(price)
    const gross = (!Number.isNaN(raw) && raw >= 0) ? Number(raw.toFixed(2)) : 0
    const platformFee = Number((gross * 0.15).toFixed(2))
    const sellerNet = Number((gross - platformFee).toFixed(2))
    return {
        price: gross,
        platformFee,
        sellerNet,
        isExactSum: Number((platformFee + sellerNet).toFixed(2)) === gross
    }
}

/**
 * File assertion helper for verifying static codebase contents and AppSec policies.
 */
export function verifyFileContent(relativeFilePath, { includes = [], excludes = [] } = {}) {
    const fullPath = path.resolve(relativeFilePath)
    assert(fs.existsSync(fullPath), `Arquivo não encontrado: ${relativeFilePath}`)
    const content = fs.readFileSync(fullPath, 'utf8')

    const safeIncludes = Array.isArray(includes) ? includes : [includes]
    const safeExcludes = Array.isArray(excludes) ? excludes : [excludes]

    for (const needle of safeIncludes) {
        if (typeof needle === 'string') {
            assert(content.includes(needle), `Conteúdo esperado não encontrado em ${relativeFilePath}: "${needle}"`)
        } else if (needle instanceof RegExp) {
            assert(needle.test(content), `Padrão regex esperado não encontrado em ${relativeFilePath}: ${needle}`)
        }
    }

    for (const needle of safeExcludes) {
        if (typeof needle === 'string') {
            assert(!content.includes(needle), `Conteúdo proibido encontrado em ${relativeFilePath}: "${needle}"`)
        } else if (needle instanceof RegExp) {
            assert(!needle.test(content), `Padrão regex proibido encontrado em ${relativeFilePath}: ${needle}`)
        }
    }

    return true
}

/**
 * Verifies that a file exists and is not empty.
 */
export function verifyFileExists(relativeFilePath, minSizeBytes = 1) {
    const fullPath = path.resolve(relativeFilePath)
    assert(fs.existsSync(fullPath), `Arquivo obrigatório ausente: ${relativeFilePath}`)
    const stats = fs.statSync(fullPath)
    assert(stats.size >= minSizeBytes, `Arquivo ${relativeFilePath} existe mas está vazio (tamanho: ${stats.size}b)`)
    return true
}
