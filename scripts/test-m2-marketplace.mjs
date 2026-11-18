import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { registerHooks } from 'node:module'
import { pathToFileURL } from 'node:url'
import ts from 'typescript'
import { createTestRunner, verifyFileContent, verifyFileExists } from './test-helpers.mjs'

const runner = createTestRunner()
const { suite, test } = runner

// ==============================================================================
// Stateful Mock Supabase for testing the real route handler (supports .or &
// chainable .update().eq().select().single())
// ==============================================================================
function createStatefulMarketplaceMockSupabase(initialData = {}) {
    const tables = {
        users: JSON.parse(JSON.stringify(initialData.users || [])),
        marketplace_products: JSON.parse(JSON.stringify(initialData.marketplace_products || [])),
    }

    const tokenMap = initialData.tokens || {}

    class Query {
        constructor(tableName) {
            this.tableName = tableName
            this.op = 'select'
            this.patch = null
            this.filters = []
            this.orExpr = null
        }

        select() {
            return this
        }

        eq(col, val) {
            this.filters.push((row) => row && row[col] === val)
            return this
        }

        or(expr) {
            this.orExpr = expr
            return this
        }

        update(patch) {
            this.op = 'update'
            this.patch = JSON.parse(JSON.stringify(patch || {}))
            return this
        }

        _matchingRows() {
            const table = tables[this.tableName] || []
            return table.filter((row) => {
                for (const fn of this.filters) {
                    if (!fn(row)) return false
                }
                if (this.orExpr) {
                    const clauses = this.orExpr.split(',').map((c) => c.trim())
                    const matchedOr = clauses.some((clause) => {
                        const parts = clause.split('.eq.')
                        if (parts.length !== 2) return false
                        const [col, val] = parts
                        return String(row[col]) === val
                    })
                    if (!matchedOr) return false
                }
                return true
            })
        }

        _execute() {
            if (this.op === 'update') {
                const matches = this._matchingRows()
                for (const row of matches) {
                    Object.assign(row, this.patch)
                }
                return { data: matches.map((r) => JSON.parse(JSON.stringify(r))), error: null }
            }
            const matches = this._matchingRows()
            return { data: matches.map((r) => JSON.parse(JSON.stringify(r))), error: null }
        }

        async maybeSingle() {
            const { data, error } = this._execute()
            if (error) return { data: null, error }
            return { data: data[0] ?? null, error: null }
        }

        async single() {
            const { data, error } = this._execute()
            if (error) return { data: null, error }
            if (data.length === 0) {
                return { data: null, error: new Error('PGRST116: no rows returned') }
            }
            return { data: data[0], error: null }
        }

        then(resolve, reject) {
            try {
                resolve(this._execute())
            } catch (err) {
                if (reject) reject(err)
                else throw err
            }
        }
    }

    return {
        from: (tableName) => new Query(tableName),
        auth: {
            getUser: async (token) => {
                const userId = tokenMap[token]
                if (!userId) {
                    return { data: { user: null }, error: new Error('Invalid JWT') }
                }
                return { data: { user: { id: userId } }, error: null }
            },
        },
        _dump: (tableName) => JSON.parse(JSON.stringify(tables[tableName] || [])),
    }
}

let activeMockSupabase = null

const projectRoot = process.cwd()
const targetRouteAbsPath = path.resolve(projectRoot, 'src/app/api/marketplace/products/[id]/route.ts')
const targetRouteUrl = pathToFileURL(targetRouteAbsPath).href

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier === 'next/server') {
            return { shortCircuit: true, url: 'm2-virtual://next-server' }
        }
        if (specifier === '@/lib/supabaseClient') {
            return { shortCircuit: true, url: 'm2-virtual://supabase-client' }
        }
        return nextResolve(specifier, context)
    },
    load(url, context, nextLoad) {
        if (url === 'm2-virtual://next-server') {
            const code = `
                export const NextResponse = {
                    json(body, init = {}) {
                        return {
                            status: init.status ?? 200,
                            ok: (init.status ?? 200) >= 200 && (init.status ?? 200) < 300,
                            async json() { return body },
                        }
                    }
                }
            `
            return { shortCircuit: true, format: 'module', source: code }
        }
        if (url === 'm2-virtual://supabase-client') {
            const code = `
                export function createServiceClient() {
                    if (!globalThis.__M2_MOCK_SUPABASE__) {
                        throw new Error('Mock Supabase not configured')
                    }
                    return globalThis.__M2_MOCK_SUPABASE__
                }
                export const supabase = null
            `
            return { shortCircuit: true, format: 'module', source: code }
        }
        if (url === targetRouteUrl) {
            const tsSource = fs.readFileSync(targetRouteAbsPath, 'utf8')
            const transpiled = ts.transpileModule(tsSource, {
                compilerOptions: {
                    module: ts.ModuleKind.ESNext,
                    target: ts.ScriptTarget.ES2022,
                },
                fileName: targetRouteAbsPath,
            })
            return { shortCircuit: true, format: 'module', source: transpiled.outputText }
        }
        return nextLoad(url, context)
    },
})

const routeModule = await import(targetRouteUrl)
const { PATCH, DELETE } = routeModule

// ==============================================================================
// 1. SQL MIGRATION & STORAGE RLS INVARIANTS
// ==============================================================================
suite('M2.1 — SQL Migration (image_urls, storage_path & marketplace-previews RLS)')

test('SQL migration exists and idempotently adds image_urls, storage_path, backfill, policies & schema reload', () => {
    verifyFileExists('sql/add_marketplace_gallery_and_columns.sql', 200)
    verifyFileContent('sql/add_marketplace_gallery_and_columns.sql', {
        includes: [
            'add column if not exists image_urls text[]',
            'add column if not exists storage_path text',
            'set image_urls = array[image_url]',
            "values ('marketplace-previews', 'marketplace-previews', true)",
            'for select',
            'for insert',
            'for update',
            'for delete',
            'public.users u',
            'u.supabase_user_id = auth.uid()',
            "u.id::text = (storage.foldername(name))[1]",
            'owner = auth.uid()',
            "NOTIFY pgrst, 'reload schema';",
        ],
    })
})

// ==============================================================================
// 2. R4 TEXT REMOVAL & R2/R3/EDIT UI INVARIANTS IN vender/page.tsx
// ==============================================================================
suite('M2.2 — Vender Page (R2 Formats, R3 10 Photos & Cover, R4 Text Removal, Edit & Hydration)')

test('R4: Excludes exact removed promotional paragraph in src/app/marketplace/vender/page.tsx', () => {
    verifyFileContent('src/app/marketplace/vender/page.tsx', {
        excludes: [
            'Publique uma matriz individual',
            '85% líquido',
            'carteira virtual',
        ],
    })
})

test('R2: Includes all 6 standard + 4 native software preset formats, hints, and custom format chips', () => {
    verifyFileContent('src/app/marketplace/vender/page.tsx', {
        includes: [
            "code: 'DST'",
            "code: 'PES'",
            "code: 'JEF'",
            "code: 'XXX'",
            "code: 'VP3'",
            "code: 'HUS'",
            "code: 'PXF'",
            "code: 'EMB'",
            "code: 'EOF'",
            "code: 'EXP'",
            'Tajima',
            'Wilcom',
            'PE-Design',
            'Embird',
            'handleAddCustomFormat',
            'customFormatInput',
            'Outros formatos:',
            "replace(/^\\.+/, '').toUpperCase()",
        ],
    })
})

test('R3: Enforces 10-photo limit, cover selection, image_urls persistence, optimizeImageFile, and SVG/HTML rejection', () => {
    verifyFileContent('src/app/marketplace/vender/page.tsx', {
        includes: [
            'const MAX_PHOTOS = 10',
            'optimizeImageFile',
            'image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif',
            'Definir como capa',
            'image_urls: uploadedUrls',
            'upsert: false',
            'URL.revokeObjectURL',
        ],
        excludes: [
            'accept="image/*"',
        ],
    })
})

test('Edit Flow & Regression Preservation: Suspense around useSearchParams, PATCH edit call, R$ 5 min price, baseline constants intact', () => {
    verifyFileContent('src/app/marketplace/vender/page.tsx', {
        includes: [
            'Suspense',
            'useSearchParams',
            'Editar Anúncio de Matriz',
            'Anunciar Matriz para Venda',
            'method: \'PATCH\'',
            'const MIN_PRICE = 5',
            'MAX_TOTAL_SIZE_MB = 30',
            'MAX_SINGLE_FILE_MB = 2',
            'MAX_BUNDLE_ITEMS = 20',
            'useAuth',
            'safetyTimer',
            "clearCache('marketplace_products')",
            'clearCache(`marketplace_product_${editIdParam}`)',
            'Participação da plataforma',
            'Custo da transação',
            'transactionCost',
            'toSafeStorageFileName',
            'matrixFiles',
            'bundleZip.file(f.name, f)',
            'handleRemoveMatrixFile',
        ],
        excludes: [
            'Taxa Plataforma (15%)',
        ],
    })
})

// ==============================================================================
// 3. CONSUMER PAGES & DISPLAY INVARIANTS
// ==============================================================================
suite('M2.3 — Marketplace Consumers (Dot-Stripping, Gallery, Owner Edit & R1 Sync)')

test('ProductCard strips leading dots, uppercases, deduplicates formats, and falls back safely on image_url', () => {
    verifyFileContent('src/components/ProductCard.tsx', {
        includes: [
            "replace(/^\\.+/, '').toUpperCase()",
            "product.image_url || '/brand/icon-dark.png'",
            'object-cover object-center',
        ],
    })
})

test('Marketplace [id] page fixes SSR hydration, aligns timers, renders multi-photo gallery, strips dots, and adds owner Editar link', () => {
    verifyFileContent('src/app/marketplace/[id]/page.tsx', {
        includes: [
            'useState<any>(null)',
            'useState<boolean>(true)',
            'safetyTimer',
            'marketplace_product_',
            'PGRST116',
            'Tentar novamente',
            'product.image_urls',
            'activeImage',
            "replace(/^\\.+/, '').toUpperCase()",
            '/marketplace/vender?edit=${product.id}',
            'Editar Matriz',
            'supabase_user_id',
        ],
    })
})

test('Marketplace [id] layout preserves Server Component & OpenGraph invariants with robust dot stripping', () => {
    verifyFileContent('src/app/marketplace/[id]/layout.tsx', {
        includes: [
            "product.image_url || '/brand/icon-dark.png'",
            "replace(/^\\.+/, '').toUpperCase()",
            'return <>{children}</>',
        ],
        excludes: ["'use client'"],
    })
})

test('Marketplace catalog & Loja seller store preserve T5-PERF-01, align timeouts, add error retry & owner Editar button', () => {
    verifyFileContent('src/app/marketplace/page.tsx', {
        includes: ['safetyTimer', ".eq('is_active', true)", 'Tentar novamente', '8000', '8500'],
    })
    verifyFileContent('src/app/loja/[sellerId]/page.tsx', {
        includes: [
            'safetyTimer',
            'clearTimeout(safetyTimer)',
            'Este vendedor ainda não publicou matrizes ativas.',
            'fetchedScopeRef',
            '/marketplace/vender?edit=${product.id}',
            "replace(/^\\.+/, '').toUpperCase()",
            'Tentar novamente',
        ],
        excludes: ['if (authLoading) return'],
    })
})

// ==============================================================================
// 4. REAL API HANDLER TESTS (PATCH & DELETE in route.ts)
// ==============================================================================
suite('M2.4 — Real PATCH & DELETE Route Handler Security and Validation')

const PRODUCT_ID = '11111111-1111-4111-8111-111111111111'
const SELLER_PROFILE_ID = '22222222-2222-4222-8222-222222222222'
const SELLER_AUTH_ID = '33333333-3333-4333-8333-333333333333'
const OTHER_PROFILE_ID = '44444444-4444-4444-8444-444444444444'
const OTHER_AUTH_ID = '55555555-5555-4555-8555-555555555555'

function setupMockDb() {
    activeMockSupabase = createStatefulMarketplaceMockSupabase({
        tokens: {
            seller_token: SELLER_AUTH_ID,
            other_token: OTHER_AUTH_ID,
        },
        users: [
            { id: SELLER_PROFILE_ID, supabase_user_id: SELLER_AUTH_ID },
            { id: OTHER_PROFILE_ID, supabase_user_id: OTHER_AUTH_ID },
        ],
        marketplace_products: [
            {
                id: PRODUCT_ID,
                seller_id: SELLER_PROFILE_ID,
                title: 'Matriz Original',
                description: 'Descrição original',
                price: 25.0,
                category: 'geral',
                formats: ['PES', 'DST'],
                image_url: 'https://abc.supabase.co/storage/v1/object/public/marketplace-previews/cover.jpg',
                image_urls: ['https://abc.supabase.co/storage/v1/object/public/marketplace-previews/cover.jpg'],
                file_url: 'https://abc.supabase.co/storage/v1/object/public/marketplace-files/file.zip',
                storage_path: `${SELLER_PROFILE_ID}/file.zip`,
                is_bundle: false,
                items_count: 1,
                sales_count: 7,
                is_active: true,
            },
        ],
    })
    globalThis.__M2_MOCK_SUPABASE__ = activeMockSupabase
    return activeMockSupabase
}

function makeReq(method, { token = null, body = null } = {}) {
    const headers = new Headers({ 'Content-Type': 'application/json' })
    if (token) headers.set('authorization', `Bearer ${token}`)
    return new Request(`http://localhost/api/marketplace/products/${PRODUCT_ID}`, {
        method,
        headers,
        body: body !== null ? JSON.stringify(body) : undefined,
    })
}

const makeContext = (id = PRODUCT_ID) => ({ params: Promise.resolve({ id }) })

test('Auth & Anti-Spoofing: rejects missing token (even with body.userId), invalid token, and mismatched userId', async () => {
    setupMockDb()

    // 1. Missing Authorization header even with body.userId -> 401 (no unauthenticated bodyUserId fallback!)
    const resNoAuth = await PATCH(
        makeReq('PATCH', { body: { userId: SELLER_PROFILE_ID, action: 'pause' } }),
        makeContext()
    )
    assert.equal(resNoAuth.status, 401)

    // 2. Invalid Bearer token -> 401
    const resBadToken = await PATCH(
        makeReq('PATCH', { token: 'invalid_token', body: { action: 'pause' } }),
        makeContext()
    )
    assert.equal(resBadToken.status, 401)

    // 3. Mismatched body.userId -> 403
    const resSpoof = await PATCH(
        makeReq('PATCH', { token: 'other_token', body: { userId: SELLER_PROFILE_ID, action: 'pause' } }),
        makeContext()
    )
    assert.equal(resSpoof.status, 403)

    // 4. Non-owner valid token -> 403
    const resNonOwner = await PATCH(
        makeReq('PATCH', { token: 'other_token', body: { title: 'Hacked' } }),
        makeContext()
    )
    assert.equal(resNonOwner.status, 403)

    // 5. Invalid product ID -> 400
    const resBadId = await PATCH(
        makeReq('PATCH', { token: 'seller_token', body: { action: 'pause' } }),
        makeContext('../etc/passwd')
    )
    assert.equal(resBadId.status, 400)

    // 6. Missing product -> 404
    const resMissing = await PATCH(
        makeReq('PATCH', { token: 'seller_token', body: { action: 'pause' } }),
        makeContext('99999999-9999-4999-8999-999999999999')
    )
    assert.equal(resMissing.status, 404)
})

test('Backward compatibility: owner can pause and resume listing via PATCH', async () => {
    const db = setupMockDb()

    const resPause = await PATCH(
        makeReq('PATCH', { token: 'seller_token', body: { action: 'pause' } }),
        makeContext()
    )
    assert.equal(resPause.status, 200)
    const pauseJson = await resPause.json()
    assert.equal(pauseJson.success, true)
    assert.equal(pauseJson.is_active, false)

    const resResume = await PATCH(
        makeReq('PATCH', { token: 'seller_token', body: { is_active: true } }),
        makeContext()
    )
    assert.equal(resResume.status, 200)
    const resumeJson = await resResume.json()
    assert.equal(resumeJson.is_active, true)
    assert.equal(db._dump('marketplace_products')[0].is_active, true)
})

test('PATCH validation rejects price < 5, empty/invalid formats, > 10 photos, blob URLs, invalid bundle count, and empty payload', async () => {
    setupMockDb()

    const invalidCases = [
        { price: 4.99 },
        { price: 0 },
        { price: 'abc' },
        { title: '   ' },
        { category: 'categoria_inexistente' },
        { formats: [] },
        { formats: ['.pes', 'bad!fmt'] },
        { image_url: 'blob:https://bordadohub.com/1234' },
        { image_url: 'https://evil.tracker.example/pixel.svg' },
        { image_urls: ['javascript:alert(1)'] },
        {
            file_url: 'https://evil.attacker.example/marketplace-files/malware.exe',
            storage_path: `${SELLER_PROFILE_ID}/good.zip`,
        },
        {
            file_url: `https://abc.supabase.co/storage/v1/object/public/marketplace-files/${OTHER_PROFILE_ID}/stolen.zip`,
            storage_path: `${SELLER_PROFILE_ID}/good.zip`,
        },
        {
            image_urls: Array.from({ length: 11 }, (_, i) => `https://abc.supabase.co/storage/v1/object/public/marketplace-previews/${i}.jpg`),
        },
        { is_bundle: true, items_count: 1 },
        { is_bundle: true, items_count: 21 },
        {},
    ]

    for (const payload of invalidCases) {
        const res = await PATCH(
            makeReq('PATCH', { token: 'seller_token', body: payload }),
            makeContext()
        )
        assert.equal(res.status, 400, `Expected 400 for payload ${JSON.stringify(payload)}, got ${res.status}`)
    }

    const forbiddenStorageCases = [
        {
            file_url: `https://abc.supabase.co/storage/v1/object/public/marketplace-files/${SELLER_PROFILE_ID}/good.zip`,
            storage_path: `${SELLER_PROFILE_ID}/`,
        },
        {
            file_url: `https://abc.supabase.co/storage/v1/object/public/marketplace-files/${SELLER_PROFILE_ID}/good.zip`,
            storage_path: `${SELLER_PROFILE_ID}/%2e%2e/${OTHER_PROFILE_ID}/secret.zip`,
        },
    ]

    for (const payload of forbiddenStorageCases) {
        const res = await PATCH(
            makeReq('PATCH', { token: 'seller_token', body: payload }),
            makeContext()
        )
        assert.equal(res.status, 403, `Expected 403 for payload ${JSON.stringify(payload)}, got ${res.status}`)
    }
})

test('PATCH full edit normalizes formats (no dots, deduped), orders cover first in image_urls (<=10), and prevents mass assignment', async () => {
    const db = setupMockDb()

    const photo1 = 'https://abc.supabase.co/storage/v1/object/public/marketplace-previews/p1.jpg'
    const photo2 = 'https://abc.supabase.co/storage/v1/object/public/marketplace-previews/p2.jpg'
    const photo3 = 'https://abc.supabase.co/storage/v1/object/public/marketplace-previews/p3.jpg'

    const res = await PATCH(
        makeReq('PATCH', {
            token: 'seller_token',
            body: {
                title: '  Leão Floral Atualizado  ',
                description: '  Matriz revisada  ',
                price: 39.9,
                category: 'floral',
                formats: ['.pes', ' PXF ', 'emb', '.EOF', 'PES', '.art'],
                image_url: photo2,
                image_urls: [photo1, photo2, photo3, photo2],
                is_bundle: true,
                items_count: 5,
                // Mass assignment attempts that MUST be ignored:
                seller_id: OTHER_PROFILE_ID,
                sales_count: 9999,
            },
        }),
        makeContext()
    )

    assert.equal(res.status, 200)
    const json = await res.json()
    assert.equal(json.success, true)
    assert.equal(json.product.title, 'Leão Floral Atualizado')
    assert.equal(json.product.price, 39.9)
    assert.equal(json.product.category, 'floral')
    assert.deepEqual(json.product.formats, ['PES', 'PXF', 'EMB', 'EOF', 'ART'])
    // Cover photo2 must be image_url AND first in image_urls, deduplicated
    assert.equal(json.product.image_url, photo2)
    assert.deepEqual(json.product.image_urls, [photo2, photo1, photo3])
    assert.equal(json.product.is_bundle, true)
    assert.equal(json.product.items_count, 5)

    // Verify DB integrity: seller_id and sales_count untouched!
    const stored = db._dump('marketplace_products')[0]
    assert.equal(stored.seller_id, SELLER_PROFILE_ID)
    assert.equal(stored.sales_count, 7)
})

test('DELETE enforces Bearer auth, ownership, and performs soft-delete (is_active = false)', async () => {
    const db = setupMockDb()

    const resUnauth = await DELETE(
        makeReq('DELETE', { body: { userId: SELLER_PROFILE_ID } }),
        makeContext()
    )
    assert.equal(resUnauth.status, 401)

    const resOther = await DELETE(
        makeReq('DELETE', { token: 'other_token' }),
        makeContext()
    )
    assert.equal(resOther.status, 403)

    const resOwner = await DELETE(
        makeReq('DELETE', { token: 'seller_token' }),
        makeContext()
    )
    assert.equal(resOwner.status, 200)
    const rows = db._dump('marketplace_products')
    assert.equal(rows.length, 1)
    assert.equal(rows[0].is_active, false)
})

await runner.run()
