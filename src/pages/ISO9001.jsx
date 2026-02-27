import React, { useEffect, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, FileSpreadsheet, Search } from 'lucide-react';

const ISO9001 = () => {
    const [data, setData] = useState([]);
    const [headers, setHeaders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchExcel = async () => {
            try {
                const response = await fetch('/master-list.xlsx');
                const blob = await response.blob();
                const reader = new FileReader();

                reader.onload = (e) => {
                    const ab = e.target.result;
                    const wb = XLSX.read(ab, { type: 'array' });
                    const sheetName = wb.SheetNames[0];
                    const sheet = wb.Sheets[sheetName];

                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });

                    if (jsonData.length > 0) {
                        setHeaders(jsonData[0]);
                        setData(jsonData.slice(1));
                    }
                    setLoading(false);
                };

                reader.readAsArrayBuffer(blob);
            } catch (error) {
                console.error("Error loading Excel file:", error);
                setLoading(false);
            }
        };

        fetchExcel();
    }, []);

    const filteredData = data.filter(row =>
        row.some(cell =>
            String(cell).toLowerCase().includes(searchTerm.toLowerCase())
        )
    );

    return (
        <div className="container" style={{ padding: '2rem 1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>ISO 9001: Lista Maestra de Documentos</h1>
                <a
                    href="/master-list.xlsx"
                    download
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: 'var(--color-primary-blue)',
                        color: 'white',
                        padding: '0.75rem 1.5rem',
                        borderRadius: '0.5rem',
                        textDecoration: 'none',
                        fontWeight: '600'
                    }}
                >
                    <Download size={20} />
                    Descargar Excel
                </a>
            </div>

            <div style={{ marginBottom: '1.5rem', position: 'relative' }}>
                <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }} />
                <input
                    type="text"
                    placeholder="Buscar documento..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '0.75rem 1rem 0.75rem 3rem',
                        borderRadius: '0.5rem',
                        border: '1px solid var(--color-border)',
                        fontSize: '1rem'
                    }}
                />
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando documentos...</div>
            ) : (
                <div style={{ overflowX: 'auto', backgroundColor: 'white', borderRadius: '0.5rem', boxShadow: 'var(--shadow-sm)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '800px' }}>
                        <thead>
                            <tr style={{ backgroundColor: 'var(--color-bg)', borderBottom: '2px solid var(--color-border)' }}>
                                {headers.map((header, index) => (
                                    <th key={index} style={{ padding: '1rem', textAlign: 'left', fontWeight: 'bold', color: 'var(--color-dark-blue)' }}>
                                        {header}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredData.length > 0 ? (
                                filteredData.map((row, rowIndex) => (
                                    <tr key={rowIndex} style={{ borderBottom: '1px solid var(--color-border)' }}>
                                        {headers.map((_, colIndex) => (
                                            <td key={colIndex} style={{ padding: '0.75rem 1rem', fontSize: '0.9rem' }}>
                                                {row[colIndex] || ''}
                                            </td>
                                        ))}
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={headers.length} style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        No se encontraron documentos.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ISO9001;
