/**
 * Asaas API v3 Helper Client
 * Documentation: https://asaasv3.docs.apiary.io/
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3'

// Read ASAAS_API_KEY directly from .env.local to avoid dotenv-expand
// interpreting the leading $ as a variable reference
function loadAsaasKey(): string {
    // First try the env var
    const envKey = process.env.ASAAS_API_KEY
    if (envKey && envKey.length > 10) return envKey

    // Fallback: read .env.local directly
    try {
        const envPath = resolve(process.cwd(), '.env.local')
        const content = readFileSync(envPath, 'utf8')
        const match = content.match(/ASAAS_API_KEY=['"]?([^'"\r\n]+)['"]?/)
        if (match) return match[1]
    } catch {}
    return ''
}
const ASAAS_API_KEY = loadAsaasKey()

/**
 * Generic fetch wrapper for Asaas API
 */
async function asaasFetch(endpoint: string, options: RequestInit = {}) {
    if (!ASAAS_API_KEY) {
        console.warn('⚠️ ASAAS_API_KEY environment variable is not set.')
    }

    const headers = {
        'Content-Type': 'application/json',
        'access_token': ASAAS_API_KEY,
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
        throw new Error('Asaas retornou uma resposta inválida.')
    }

    if (!res.ok) {
        console.error('Asaas API Error:', res.status, rawText)
        throw new Error(data?.errors?.[0]?.description || 'Erro na integração com o Asaas')
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
        return searchResult.data[0].id
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
