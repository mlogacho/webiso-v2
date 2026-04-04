import React from 'react';
import { Download, FileSpreadsheet, FileText, Search, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    DOCUMENT_TYPES,
    ISO_STANDARDS,
    formatDateTime,
    formatFileSize,
    getAllDocuments,
    getDocumentTypeLabel,
    getDocumentUrl,
    processDocumentsUpdatedEvent
} from '../utils/processDocuments';
import './DocumentLibrary.css';

const fileIconFor = (docType) => (docType === 'process' || docType === 'work-instruction' ? FileText : FileSpreadsheet);

const DocumentLibrary = ({ standardId, title, description }) => {
    const [documents, setDocuments] = React.useState([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [selectedProcess, setSelectedProcess] = React.useState('all');
    const [selectedDocType, setSelectedDocType] = React.useState('all');
    const [loading, setLoading] = React.useState(true);

    const loadDocuments = React.useCallback(async () => {
        setLoading(true);
        try {
            const allDocuments = await getAllDocuments();
            setDocuments(allDocuments.filter((document) => (document.standards || []).includes(standardId)));
        } finally {
            setLoading(false);
        }
    }, [standardId]);

    React.useEffect(() => {
        loadDocuments();
        const handleUpdate = () => loadDocuments();
        window.addEventListener(processDocumentsUpdatedEvent, handleUpdate);
        return () => window.removeEventListener(processDocumentsUpdatedEvent, handleUpdate);
    }, [loadDocuments]);

    const processOptions = React.useMemo(() => Array.from(new Set(documents.map((document) => document.processName))).sort(), [documents]);

    const filteredDocuments = documents.filter((document) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch = !query || [
            document.fileName,
            document.processName,
            getDocumentTypeLabel(document.docType)
        ].some((value) => String(value).toLowerCase().includes(query));
        const matchesProcess = selectedProcess === 'all' || document.processName === selectedProcess;
        const matchesDocType = selectedDocType === 'all' || document.docType === selectedDocType;
        return matchesSearch && matchesProcess && matchesDocType;
    });

    const openDocument = (document) => {
        window.open(getDocumentUrl(document.id), '_blank', 'noopener,noreferrer');
    };

    return (
        <section className="document-library">
            <div className="document-library__header">
                <div>
                    <div className="document-library__eyebrow">
                        <ShieldCheck size={16} />
                        {ISO_STANDARDS.find((standard) => standard.id === standardId)?.label}
                    </div>
                    <h2>{title}</h2>
                    <p>{description}</p>
                </div>
                <Link to="/process-map" className="document-library__create-btn">
                    Crear documento complementario
                </Link>
            </div>

            <div className="document-library__filters">
                <label className="document-library__search">
                    <Search size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por proceso, nombre o tipo..."
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </label>

                <select value={selectedProcess} onChange={(event) => setSelectedProcess(event.target.value)}>
                    <option value="all">Todos los procesos</option>
                    {processOptions.map((processName) => (
                        <option key={processName} value={processName}>{processName}</option>
                    ))}
                </select>

                <select value={selectedDocType} onChange={(event) => setSelectedDocType(event.target.value)}>
                    <option value="all">Todos los tipos</option>
                    {DOCUMENT_TYPES.map((documentType) => (
                        <option key={documentType.id} value={documentType.id}>{documentType.label}</option>
                    ))}
                </select>
            </div>

            {loading ? (
                <div className="document-library__empty">Cargando documentos...</div>
            ) : filteredDocuments.length === 0 ? (
                <div className="document-library__empty">No hay documentos clasificados para esta norma.</div>
            ) : (
                <div className="document-library__results">
                    {filteredDocuments.map((document) => {
                        const Icon = fileIconFor(document.docType);
                        return (
                            <article key={document.id} className="document-library__card">
                                <div className="document-library__card-left">
                                    <div className="document-library__icon"><Icon size={18} /></div>
                                    <div className="document-library__card-info">
                                        <h3 className="document-library__card-title">{document.fileName}</h3>
                                        <span className="document-library__card-process">{document.processName}</span>
                                    </div>
                                </div>
                                <div className="document-library__card-right">
                                    <div className="document-library__meta">
                                        <span>{getDocumentTypeLabel(document.docType)}</span>
                                        <span>{formatFileSize(document.size)}</span>
                                        <span>{formatDateTime(document.uploadedAt)}</span>
                                    </div>
                                    <button type="button" onClick={() => openDocument(document)} className="document-library__open-btn">
                                        <Download size={16} />
                                        Abrir documento
                                    </button>
                                </div>
                            </article>
                        );
                    })}
                </div>
            )}
        </section>
    );
};

export default DocumentLibrary;
