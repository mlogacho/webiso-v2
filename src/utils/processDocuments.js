export const DOCUMENT_TYPES = [
    {
        id: 'process',
        label: 'Proceso',
        accept: 'application/pdf,.pdf',
        multiple: true,
        description: 'Se pueden cargar uno o varios documentos de proceso en PDF.'
    },
    {
        id: 'risk-matrix',
        label: 'Matriz de Riesgos',
        accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
        multiple: true,
        description: 'Se pueden cargar una o varias matrices de riesgos en Excel.'
    },
    {
        id: 'work-instruction',
        label: 'Instrucciones de Trabajo',
        accept: 'application/pdf,.pdf',
        multiple: true,
        description: 'Se pueden cargar varias instrucciones de trabajo en PDF.'
    },
    {
        id: 'management-indicator',
        label: 'Indicadores de Gestion (KPI)',
        accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
        multiple: true,
        description: 'Se pueden cargar uno o varios KPI / indicadores en Excel.'
    },
    {
        id: 'complementary-doc',
        label: 'Documentos Complementarios al Proceso',
        accept: 'application/pdf,.pdf,.doc,.docx,.xlsx,.xls,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        multiple: true,
        description: 'Se pueden cargar varios documentos complementarios al proceso (PDF, Word, Excel).'
    }
];

export const ISO_STANDARDS = [
    { id: 'iso9001',  label: 'ISO 9001'  },
    { id: 'iso27001', label: 'ISO 27001' }
];

const API_BASE    = '/api/documents';
const UPDATE_EVENT = 'process-documents-updated';

export const processDocumentsUpdatedEvent = UPDATE_EVENT;

const emitDocumentsUpdated = () => {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

const checkResponse = async (response) => {
    if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || `Error del servidor (${response.status})`);
    }
    return response;
};

// ── Queries ──────────────────────────────────────────────────────────────────

export const getAllDocuments = async () => {
    const response = await fetch(API_BASE);
    await checkResponse(response);
    return response.json();
};

export const getDocumentsForProcess = async (processName) => {
    const params   = new URLSearchParams({ process: processName });
    const response = await fetch(`${API_BASE}?${params}`);
    await checkResponse(response);
    return response.json();
};

export const getDocumentUrl = (documentId) => `${API_BASE}/${documentId}/file`;

// ── Mutations ────────────────────────────────────────────────────────────────

export const saveDocuments = async ({ processName, docType, files, standards }) => {
    const config = DOCUMENT_TYPES.find((item) => item.id === docType);
    if (!config) throw new Error('Tipo de documento no soportado.');

    const uploadedFiles = Array.from(files || []);
    if (!uploadedFiles.length) throw new Error('Debes seleccionar al menos un archivo.');

    const notifiedEmailsSet = new Set();

    for (const file of uploadedFiles) {
        const formData = new FormData();
        formData.append('file',         file);
        formData.append('process_name', processName);
        formData.append('doc_type',     docType);
        formData.append('standards',    JSON.stringify(standards));
        // Never replace — all types now support multiple docs; user deletes manually.
        formData.append('replace', 'false');

        const response = await fetch(API_BASE, { method: 'POST', body: formData });
        await checkResponse(response);
        const data = await response.json();
        if (data.notifiedEmails && Array.isArray(data.notifiedEmails)) {
            data.notifiedEmails.forEach(e => notifiedEmailsSet.add(e));
        }
    }

    emitDocumentsUpdated();
    return Array.from(notifiedEmailsSet);
};

export const updateDocumentStandards = async (documentId, standards) => {
    const response = await fetch(`${API_BASE}/${documentId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ standards })
    });
    await checkResponse(response);
    emitDocumentsUpdated();
};

export const deleteDocument = async (documentId) => {
    const response = await fetch(`${API_BASE}/${documentId}`, { method: 'DELETE' });
    if (!response.ok && response.status !== 204) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Error al eliminar el documento.');
    }
    emitDocumentsUpdated();
};

// ── Formatters ───────────────────────────────────────────────────────────────

export const getDocumentTypeLabel = (docType) =>
    DOCUMENT_TYPES.find((item) => item.id === docType)?.label ?? docType;

export const formatFileSize = (bytes) => {
    if (!bytes) return '0 KB';
    const units    = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value    = bytes / (1024 ** exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export const formatDateTime = (isoDate) =>
    new Intl.DateTimeFormat('es-EC', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(isoDate));
