export const DOCUMENT_TYPES = [
    {
        id: 'process',
        label: 'Proceso',
        accept: 'application/pdf,.pdf',
        multiple: false,
        description: 'Procedimiento principal del proceso en PDF.'
    },
    {
        id: 'risk-matrix',
        label: 'Matriz de Riesgos',
        accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
        multiple: false,
        description: 'Matriz de riesgos en Excel.'
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
        label: 'Indicadores de Gestion',
        accept: '.xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel',
        multiple: false,
        description: 'Indicadores o KPIs en Excel.'
    }
];

export const ISO_STANDARDS = [
    { id: 'iso9001', label: 'ISO 9001' },
    { id: 'iso27001', label: 'ISO 27001' }
];

const DB_NAME = 'webiso-process-documents';
const DB_VERSION = 1;
const STORE_NAME = 'documents';
const UPDATE_EVENT = 'process-documents-updated';

const openDatabase = () => new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            store.createIndex('processName', 'processName', { unique: false });
            store.createIndex('docType', 'docType', { unique: false });
        }
    };
});

const runTransaction = async (mode, executor) => {
    const db = await openDatabase();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const store = transaction.objectStore(STORE_NAME);

        transaction.oncomplete = () => {
            db.close();
        };
        transaction.onerror = () => {
            reject(transaction.error);
            db.close();
        };

        executor(store, resolve, reject);
    });
};

const emitDocumentsUpdated = () => {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT));
};

export const processDocumentsUpdatedEvent = UPDATE_EVENT;

export const getAllDocuments = async () => runTransaction('readonly', (store, resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve((request.result || []).sort((left, right) => right.uploadedAt.localeCompare(left.uploadedAt)));
    request.onerror = () => reject(request.error);
});

export const getDocumentsForProcess = async (processName) => {
    const docs = await getAllDocuments();
    return docs.filter((document) => document.processName === processName);
};

export const saveDocuments = async ({ processName, docType, files, standards }) => {
    const config = DOCUMENT_TYPES.find((item) => item.id === docType);
    if (!config) {
        throw new Error('Tipo de documento no soportado.');
    }

    const uploadedFiles = Array.from(files || []);
    if (!uploadedFiles.length) {
        throw new Error('Debes seleccionar al menos un archivo.');
    }

    const docs = await getAllDocuments();
    const documentsToReplace = !config.multiple
        ? docs.filter((document) => document.processName === processName && document.docType === docType)
        : [];

    await runTransaction('readwrite', (store, resolve, reject) => {
        documentsToReplace.forEach((document) => store.delete(document.id));

        uploadedFiles.forEach((file) => {
            const record = {
                id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
                processName,
                docType,
                standards,
                file,
                fileName: file.name,
                mimeType: file.type || '',
                size: file.size,
                uploadedAt: new Date().toISOString()
            };
            store.put(record);
        });

        resolve();
    });

    emitDocumentsUpdated();
};

export const updateDocumentStandards = async (documentId, standards) => {
    await runTransaction('readwrite', (store, resolve, reject) => {
        const request = store.get(documentId);
        request.onsuccess = () => {
            const document = request.result;
            if (!document) {
                reject(new Error('Documento no encontrado.'));
                return;
            }
            store.put({ ...document, standards });
            resolve();
        };
        request.onerror = () => reject(request.error);
    });

    emitDocumentsUpdated();
};

export const deleteDocument = async (documentId) => {
    await runTransaction('readwrite', (store, resolve) => {
        store.delete(documentId);
        resolve();
    });

    emitDocumentsUpdated();
};

export const getDocumentTypeLabel = (docType) => DOCUMENT_TYPES.find((item) => item.id === docType)?.label || docType;

export const formatFileSize = (bytes) => {
    if (!bytes) {
        return '0 KB';
    }

    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / (1024 ** exponent);
    return `${value.toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
};

export const formatDateTime = (isoDate) => new Intl.DateTimeFormat('es-EC', {
    dateStyle: 'medium',
    timeStyle: 'short'
}).format(new Date(isoDate));
