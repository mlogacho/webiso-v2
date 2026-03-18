import React from 'react';
import { Download, Eye, FileSpreadsheet, FileText, Trash2, Upload } from 'lucide-react';
import Modal from '../Modal';
import {
    deleteDocument,
    DOCUMENT_TYPES,
    formatDateTime,
    formatFileSize,
    getDocumentTypeLabel,
    getDocumentsForProcess,
    getDocumentUrl,
    ISO_STANDARDS,
    processDocumentsUpdatedEvent,
    saveDocuments,
    updateDocumentStandards
} from '../../utils/processDocuments';
import './ProcessMap.css';

const ProcessNode = ({ label, onClick, className = '' }) => (
    <div className={`process-node ${className}`} onClick={(event) => { event.stopPropagation(); onClick?.(label); }}>
        {label}
    </div>
);

const iconForType = (docType) => (docType === 'process' || docType === 'work-instruction' ? FileText : FileSpreadsheet);

const createInitialUploadState = () => Object.fromEntries(
    DOCUMENT_TYPES.map((documentType) => [documentType.id, { files: [], standards: ['iso9001'] }])
);

const SUMMARY_LABELS = {
    process: 'PROCESO',
    'work-instruction': 'INSTRUCCIONES DE TRABAJO',
    'risk-matrix': 'MATRIZ DE RIESGO',
    'management-indicator': 'KPI',
    'complementary-doc': 'DOCS. COMPLEMENTARIOS'
};

const ProcessMap = () => {
    const [selectedProcess, setSelectedProcess] = React.useState(null);
    const [documents, setDocuments] = React.useState([]);
    const [uploadState, setUploadState] = React.useState(createInitialUploadState);
    const [feedback, setFeedback] = React.useState('');
    const [isLoadingDocs, setIsLoadingDocs] = React.useState(false);

    const handleNodeClick = (nodeName) => {
        setSelectedProcess(nodeName);
        setFeedback('');
    };

    const closeModal = () => {
        setSelectedProcess(null);
        setFeedback('');
    };

    const loadDocuments = React.useCallback(async (processName) => {
        if (!processName) {
            setDocuments([]);
            return;
        }

        setIsLoadingDocs(true);
        try {
            const processDocuments = await getDocumentsForProcess(processName);
            setDocuments(processDocuments);
        } finally {
            setIsLoadingDocs(false);
        }
    }, []);

    React.useEffect(() => {
        loadDocuments(selectedProcess);
    }, [loadDocuments, selectedProcess]);

    React.useEffect(() => {
        const handleDocumentsUpdated = () => loadDocuments(selectedProcess);
        window.addEventListener(processDocumentsUpdatedEvent, handleDocumentsUpdated);
        return () => window.removeEventListener(processDocumentsUpdatedEvent, handleDocumentsUpdated);
    }, [loadDocuments, selectedProcess]);

    const handleFileSelection = (docType, fileList) => {
        setUploadState((previousState) => ({
            ...previousState,
            [docType]: {
                ...previousState[docType],
                files: Array.from(fileList || [])
            }
        }));
    };

    const toggleUploadStandard = (docType, standardId) => {
        setUploadState((previousState) => {
            const currentStandards = previousState[docType].standards;
            const nextStandards = currentStandards.includes(standardId)
                ? currentStandards.filter((item) => item !== standardId)
                : [...currentStandards, standardId];

            return {
                ...previousState,
                [docType]: {
                    ...previousState[docType],
                    standards: nextStandards
                }
            };
        });
    };

    const handleUpload = async (docType) => {
        const currentState = uploadState[docType];
        if (!selectedProcess || !currentState.files.length || !currentState.standards.length) {
            setFeedback('Debes seleccionar archivo(s) y al menos una norma antes de guardar.');
            return;
        }

        try {
            await saveDocuments({
                processName: selectedProcess,
                docType,
                files: currentState.files,
                standards: currentState.standards
            });

            setUploadState((previousState) => ({
                ...previousState,
                [docType]: {
                    ...previousState[docType],
                    files: []
                }
            }));
            setFeedback(`${getDocumentTypeLabel(docType)} guardado correctamente.`);
        } catch (error) {
            setFeedback(error.message || 'No fue posible guardar el documento.');
        }
    };

    const toggleDocumentStandard = async (document, standardId) => {
        const currentStandards = document.standards || [];
        const nextStandards = currentStandards.includes(standardId)
            ? currentStandards.filter((item) => item !== standardId)
            : [...currentStandards, standardId];

        await updateDocumentStandards(document.id, nextStandards);
    };

    const handleDeleteDocument = async (documentId) => {
        await deleteDocument(documentId);
        setFeedback('Documento eliminado correctamente.');
    };

    const openDocument = (document) => {
        window.open(getDocumentUrl(document.id), '_blank', 'noopener,noreferrer');
    };

    const downloadDocument = (document) => {
        const link = window.document.createElement('a');
        link.href = getDocumentUrl(document.id);
        link.download = document.fileName;
        link.rel = 'noopener';
        window.document.body.appendChild(link);
        link.click();
        link.remove();
    };

    const documentSummary = React.useMemo(() => {
        return DOCUMENT_TYPES.map((documentType) => ({
            id: documentType.id,
            label: SUMMARY_LABELS[documentType.id] || documentType.label.toUpperCase(),
            items: documents.filter((document) => document.docType === documentType.id)
        }));
    }, [documents]);

    return (
        <div className="process-map-container">
            <Modal
                isOpen={!!selectedProcess}
                onClose={closeModal}
                title={selectedProcess}
                className="modal-content--wide"
            >
                <div className="process-documents-panel">
                    <div className="process-documents-panel__intro">
                        <div>
                            <h4>Informacion del Proceso</h4>
                            <p>
                                Carga y administra la documentacion del proceso <strong>{selectedProcess}</strong>.
                                Cada documento puede clasificarse para ISO 9001, ISO 27001 o ambas normas.
                            </p>
                        </div>
                        {feedback && <div className="process-documents-panel__feedback">{feedback}</div>}
                    </div>

                    <section className="process-summary-card">
                        <h5>Resumen de documentacion cargada</h5>
                        <div className="process-summary-grid">
                            {documentSummary.map((summaryItem) => (
                                <div key={summaryItem.id} className="process-summary-item">
                                    <strong>{summaryItem.label}:</strong>
                                    {summaryItem.items.length > 0 ? (
                                        <ul className="process-summary-list">
                                            {summaryItem.items.map((document) => (
                                                <li key={document.id}>
                                                    <span>{document.fileName}</span>
                                                    <div className="process-summary-actions">
                                                        <button type="button" onClick={() => openDocument(document)}>
                                                            <Eye size={14} />
                                                            Ver
                                                        </button>
                                                        <button type="button" onClick={() => downloadDocument(document)}>
                                                            <Download size={14} />
                                                            Descargar
                                                        </button>
                                                    </div>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <span>No cargado</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <div className="process-documents-grid">
                        {DOCUMENT_TYPES.map((documentType) => {
                            const currentUpload = uploadState[documentType.id];
                            const typeDocuments = documents.filter((document) => document.docType === documentType.id);

                            return (
                                <section key={documentType.id} className="document-upload-card">
                                    <div className="document-upload-card__header">
                                        <h5>{documentType.label}</h5>
                                        <span>{documentType.multiple ? 'Multiple' : 'Unico por proceso'}</span>
                                    </div>
                                    <p>{documentType.description}</p>

                                    <input
                                        type="file"
                                        accept={documentType.accept}
                                        multiple={documentType.multiple}
                                        onChange={(event) => handleFileSelection(documentType.id, event.target.files)}
                                    />

                                    <div className="document-upload-card__standards">
                                        {ISO_STANDARDS.map((standard) => (
                                            <label key={standard.id}>
                                                <input
                                                    type="checkbox"
                                                    checked={currentUpload.standards.includes(standard.id)}
                                                    onChange={() => toggleUploadStandard(documentType.id, standard.id)}
                                                />
                                                {standard.label}
                                            </label>
                                        ))}
                                    </div>

                                    {!!currentUpload.files.length && (
                                        <ul className="document-upload-card__selected-files">
                                            {currentUpload.files.map((file) => (
                                                <li key={`${documentType.id}-${file.name}`}>{file.name}</li>
                                            ))}
                                        </ul>
                                    )}

                                    <button type="button" className="document-action-btn" onClick={() => handleUpload(documentType.id)}>
                                        <Upload size={16} />
                                        Guardar {documentType.label}
                                    </button>

                                    <div className="document-upload-card__existing">
                                        <h6>Documentos cargados</h6>
                                        {isLoadingDocs ? (
                                            <p>Cargando documentos...</p>
                                        ) : typeDocuments.length === 0 ? (
                                            <p>No hay documentos cargados.</p>
                                        ) : (
                                            typeDocuments.map((document) => {
                                                const Icon = iconForType(document.docType);
                                                return (
                                                    <article key={document.id} className="document-record">
                                                        <div className="document-record__top">
                                                            <div className="document-record__icon"><Icon size={16} /></div>
                                                            <div>
                                                                <strong>{document.fileName}</strong>
                                                                <span>{formatFileSize(document.size)} · {formatDateTime(document.uploadedAt)}</span>
                                                            </div>
                                                        </div>

                                                        <div className="document-record__standards">
                                                            {ISO_STANDARDS.map((standard) => (
                                                                <label key={`${document.id}-${standard.id}`}>
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={(document.standards || []).includes(standard.id)}
                                                                        onChange={() => toggleDocumentStandard(document, standard.id)}
                                                                    />
                                                                    {standard.label}
                                                                </label>
                                                            ))}
                                                        </div>

                                                        <div className="document-record__actions">
                                                            <button type="button" onClick={() => openDocument(document)}>
                                                                <Download size={14} />
                                                                Abrir
                                                            </button>
                                                            <button type="button" className="document-record__delete" onClick={() => handleDeleteDocument(document.id)}>
                                                                <Trash2 size={14} />
                                                                Eliminar
                                                            </button>
                                                        </div>
                                                    </article>
                                                );
                                            })
                                        )}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </div>
            </Modal>

            <div className="client-bar">
                <span>CLIENTE</span>
            </div>

            <div className="process-content">
                <div className="map-header">
                    <div style={{ width: 100 }} />
                    <div className="map-title">MACROPROCESO DataCom</div>
                    <div className="map-meta">
                        Version 1.0<br />
                        Fecha: 12/02/2026<br />
                        MAPA-PR-SGIC-1.0
                    </div>
                </div>

                <div className="operativos-container">
                    <span className="layer-label">PROCESOS OPERATIVOS</span>
                    <div className="operativos-flow">
                        <ProcessNode label="VENTAS" className="node-ventas" onClick={handleNodeClick} />
                        <div style={{ fontSize: '2rem' }}>↔</div>
                        <ProcessNode label="INSTALACION" className="node-instalacion" onClick={handleNodeClick} />
                        <div style={{ fontSize: '2rem' }}>↔</div>
                        <div className="node-soporte-container">
                            <span className="soporte-title">SOPORTE</span>
                            <div className="soporte-subnode" onClick={() => handleNodeClick('Operaciones de Red y Soporte (NOC)')}>
                                Operaciones de Red y Soporte (NOC)
                            </div>
                            <div className="soporte-subnode" onClick={() => handleNodeClick('Gestion Data Center')}>
                                Gestion Data Center
                            </div>
                        </div>
                        <div style={{ fontSize: '2rem' }}>↔</div>
                        <ProcessNode label="GESTION COMERCIAL" className="node-gestion-comercial" onClick={handleNodeClick} />
                    </div>
                </div>

                <div className="apoyo-container">
                    <span className="layer-label">PROCESOS DE APOYO</span>

                    <div className="financiero-section">
                        <span className="layer-label" style={{ position: 'static', marginRight: '1rem', alignSelf: 'center' }}>FINANCIERO</span>
                        <ProcessNode label="CONTABLE" className="node-contable" onClick={handleNodeClick} />
                        <ProcessNode label="FACTURACION" className="node-facturacion" onClick={handleNodeClick} />
                    </div>

                    <div className="talento-humano-section">
                        <span className="layer-label" style={{ position: 'static', marginRight: '1rem' }}>TALENTO HUMANO</span>
                        <ProcessNode label="GESTION TH" className="node-th" onClick={handleNodeClick} />
                        <div className="connector-circle">1</div>
                        <ProcessNode label="SISO" className="node-siso" onClick={handleNodeClick} />
                    </div>

                    <div className="bar-node bar-soporte-ti" onClick={() => handleNodeClick('SOPORTE TI')}>
                        SOPORTE TI
                    </div>

                    <div className="bar-node bar-calidad" onClick={() => handleNodeClick('SISTEMA DE GESTION DE CALIDAD')}>
                        SISTEMA DE GESTION DE CALIDAD
                    </div>

                    <div className="bar-node bar-compras" onClick={() => handleNodeClick('COMPRAS Y GESTION DE PROVEEDORES')}>
                        COMPRAS Y GESTION DE PROVEEDORES
                    </div>

                    <div className="proveedores-row">
                        <ProcessNode label="CARRIER/ULTIMAS MILLAS" className="node-proveedor" onClick={handleNodeClick} />
                        <ProcessNode label="EQUIPOS TELECOMUNICACIONES" className="node-proveedor" onClick={handleNodeClick} />
                        <ProcessNode label="OUTSOURCING TI" className="node-proveedor" onClick={handleNodeClick} />
                        <ProcessNode label="DATACENTER" className="node-proveedor" onClick={handleNodeClick} />
                    </div>
                </div>

                <div className="estrategicos-container">
                    <span className="layer-label">PROCESOS ESTRATEGICOS</span>
                    <div className="estrategicos-row">
                        <ProcessNode label="Gestion de la Direccion" className="node-estrategico" onClick={handleNodeClick} />
                        <ProcessNode label="Planificacion Estrategica y Financiera" className="node-estrategico" onClick={handleNodeClick} />
                        <ProcessNode label="Gestion de Riesgos y Oportunidades" className="node-estrategico" onClick={handleNodeClick} />
                    </div>
                </div>

                <div className="signatures-row">
                    <div className="signature-box">
                        <div className="signature-header">Aprobado por:</div>
                        <div>Cesar Cobo<br />Gerente General<br />DataCom</div>
                    </div>
                    <div className="signature-box">
                        <div className="signature-header">Revisado por:</div>
                        <div>Sofia Cabrera<br />Representante de Calidad SIGC-SI<br />DataCom</div>
                    </div>
                    <div className="signature-box">
                        <div className="signature-header">Elaborado por:</div>
                        <div>Marco Logacho<br />Oficial de Calidad SIGC-SI<br />DataCom</div>
                    </div>
                </div>
            </div>

            <div className="client-bar">
                <span>CLIENTE</span>
            </div>
        </div>
    );
};

export default ProcessMap;
