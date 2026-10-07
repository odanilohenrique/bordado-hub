/**
 * Asaas API v3 Helper Client
 * Documentation: https://asaasv3.docs.apiary.io/
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'

// Read ASAAS_API_KEY from environment or directly from .env.local to avoid dotenv-expand
// interpreting the leading $ as a variable reference
function loadAsaasKey(): string {
    const envKey = process.env.ASAAS_API_KEY
    if (envKey && envKey.trim().length > 10) return envKey.trim().replace(/^['"]|['"]$/g, '')

    try {
        const envPath = resolve(process.cwd(), '.env.local')
        const content = readFileSync(envPath, 'utf8')
        const lines = content.split(/\r?\n/)
        const keyLine = lines.find(l => l.trim().startsWith('ASAAS_API_KEY='))
        if (keyLine) {
            const val = keyLine.substring(keyLine.indexOf('=') + 1).trim()
            return val.replace(/^['"]|['"]$/g, '')
        }
    } catch {}
    return ''
}

function getAsaasKey(): string {
    return loadAsaasKey()
}

/**
 * Generic fetch wrapper for Asaas API
 */
async function asaasFetch(endpoint: string, options: RequestInit = {}) {
    const key = getAsaasKey()
    if (!key) {
        console.error('⚠️ ASAAS_API_KEY environment variable is not configured.')
        throw new Error('Chave de API do Asaas não configurada no servidor.')
    }

    const headers = {
        'Content-Type': 'application/json',
        'access_token': key,
        ...options.headers,
    }

    const res = await fetch(`${ASAAS_API_URL}${endpoint}`, {
        ...options,
        headers,
    })

    const rawText = await res.text()
    let data: any = {}
    try {
        data = rawText ? JSON.parse(rawText) : {}
    } catch (e) {
        console.error('Failed to parse Asaas response:', rawText)
        throw new Error('Asaas retornou uma resposta inválida: ' + (rawText || 'vazio'))
    }

    if (!res.ok) {
        console.error('Asaas API Error:', res.status, rawText)
        const errorDesc = data?.errors?.[0]?.description || data?.message || (typeof rawText === 'string' && rawText.length < 150 ? rawText : 'Erro na integração com o Asaas')
        throw new Error(errorDesc)
    }

    return data
}

export interface CreateCustomerDTO {
    name: string
    cpfCnpj: string
    email?: string
}

export interface CreatePixPaymentDTO {
    customerName: string
    customerCpfCnpj: string
    customerEmail?: string
    amount: number
    description: string
    externalReference: string
}

/**
 * 1. Find or Create Asaas Customer
 */
export async function getOrCreateCustomer(data: CreateCustomerDTO): Promise<string> {
    const cleanCpfCnpj = data.cpfCnpj.replace(/\D/g, '')

    // Search existing customer by CPF/CNPJ
    const searchResult = await asaasFetch(`/customers?cpfCnpj=${cleanCpfCnpj}`)
    if (searchResult.data && searchResult.data.length > 0) {
        const existing = searchResult.data[0]
        // If name or email changed, update the customer in Asaas
        if ((data.name && existing.name !== data.name) || (data.email && existing.email !== data.email)) {
            try {
                await asaasFetch(`/customers/${existing.id}`, {
                    method: 'POST',
                    body: JSON.stringify({
                        name: data.name || existing.name,
                        email: data.email || existing.email,
                    }),
                })
            } catch (updateErr) {
                console.warn('Could not update Asaas customer info:', updateErr)
            }
        }
        return existing.id
    }

    // Create new customer
    const newCustomer = await asaasFetch('/customers', {
        method: 'POST',
        body: JSON.stringify({
            name: data.name,
            cpfCnpj: cleanCpfCnpj,
            email: data.email,
        }),
    })

    return newCustomer.id
}

/**
 * 2. Create PIX Charge & Get QR Code + Copy/Paste
 */
export async function createPixCharge(params: CreatePixPaymentDTO) {
    // Ensure customer exists
    const customerId = await getOrCreateCustomer({
        name: params.customerName,
        cpfCnpj: params.customerCpfCnpj,
        email: params.customerEmail,
    })

    // Tomorrow's date for due date
    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    // Create Payment Charge
    const payment = await asaasFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
            customer: customerId,
            billingType: 'PIX',
            value: params.amount,
            dueDate: dueDateStr,
            description: params.description,
            externalReference: params.externalReference,
        }),
    })

    // Get PIX QR Code & Payload String
    const pixData = await asaasFetch(`/payments/${payment.id}/pixQrCode`)

    return {
        paymentId: payment.id,
        invoiceUrl: payment.invoiceUrl,
        status: payment.status,
        encodedImage: pixData.encodedImage, // Base64 QR Code image
        payload: pixData.payload,           // Copy & Paste Pix key string
        expirationDate: pixData.expirationDate,
    }
}

export interface CreateCardPaymentDTO {
    customerName: string
    customerCpfCnpj: string
    customerEmail?: string
    amount: number
    description: string
    externalReference: string
    // Card info (tokenized by Asaas, never stored by us)
    holderName: string
    cardNumber: string
    expiryMonth: string
    expiryYear: string
    ccv: string
    // Installments
    installmentCount?: number
    // Holder address (required by Asaas for anti-fraud)
    postalCode: string
    addressNumber: string
    addressComplement?: string
    phone: string
}

/**
 * 3. Create Credit Card Charge
 */
export async function createCreditCardCharge(params: CreateCardPaymentDTO) {
    const customerId = await getOrCreateCustomer({
        name: params.customerName,
        cpfCnpj: params.customerCpfCnpj,
        email: params.customerEmail,
    })

    const dueDate = new Date()
    dueDate.setDate(dueDate.getDate() + 1)
    const dueDateStr = dueDate.toISOString().split('T')[0]

    const installmentCount = params.installmentCount || 1
    const installmentValue = installmentCount > 1
        ? Math.ceil((params.amount / installmentCount) * 100) / 100
        : params.amount

    const payment = await asaasFetch('/payments', {
        method: 'POST',
        body: JSON.stringify({
            customer: customerId,
            billingType: 'CREDIT_CARD',
            value: params.amount,
            dueDate: dueDateStr,
            description: params.description,
            externalReference: params.externalReference,
            installmentCount: installmentCount > 1 ? installmentCount : undefined,
            installmentValue: installmentCount > 1 ? installmentValue : undefined,
            creditCard: {
                holderName: params.holderName,
                number: params.cardNumber.replace(/\s/g, ''),
                expiryMonth: params.expiryMonth,
                expiryYear: params.expiryYear,
                ccv: params.ccv,
            },
            creditCardHolderInfo: {
                name: params.holderName,
                cpfCnpj: params.customerCpfCnpj.replace(/\D/g, ''),
                email: params.customerEmail || '',
                postalCode: params.postalCode.replace(/\D/g, ''),
                addressNumber: params.addressNumber || 'SN',
                addressComplement: params.addressComplement || undefined,
                phone: params.phone.replace(/\D/g, ''),
            },
        }),
    })

    return {
        paymentId: payment.id,
        status: payment.status,
        invoiceUrl: payment.invoiceUrl,
        installmentCount,
        installmentValue,
    }
}

/**
 * 4. Check Payment Status
 */
export async function checkPaymentStatus(paymentId: string) {
    const payment = await asaasFetch(`/payments/${paymentId}`)
    return {
        status: payment.status,
        confirmedDate: payment.confirmedDate,
    }
}

export interface PixTransferDTO {
    pixKey: string
    pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
    amount: number
    description: string
}

/**
 * 4. Execute PIX Payout to Creator (Escrow Release)
 */
export async function transferPixToCreator(params: PixTransferDTO) {
    // Asaas API mapping for key type
    const keyTypeMap: Record<string, string> = {
        cpf: 'CPF',
        cnpj: 'CNPJ',
        email: 'EMAIL',
        phone: 'PHONE',
        random: 'EVP',
    }

    const transfer = await asaasFetch('/transfers', {
        method: 'POST',
        body: JSON.stringify({
            value: params.amount,
            pixAddressKey: params.pixKey,
            pixAddressKeyType: keyTypeMap[params.pixKeyType] || 'CPF',
            description: params.description,
        }),
    })

    return {
        transferId: transfer.id,
        status: transfer.status,
    }
}
