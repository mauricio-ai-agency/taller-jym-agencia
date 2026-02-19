import React, { useState, useEffect } from 'react';
import { Save, ArrowLeft, Car, User, Phone, Wrench, DollarSign, Activity, FileDown, Plus, Trash2 } from 'lucide-react';
import { jsPDF } from "jspdf";
import { supabase } from '../supabaseClient';

export default function EditRecord({ record, onBack, onUpdate }) {
    // Helper to parse JSON or return as single item array
    const parseDynamicField = (fieldValue) => {
        if (!fieldValue) return [{ description: '', price: '' }];
        try {
            const parsed = JSON.parse(fieldValue);
            if (Array.isArray(parsed)) return parsed;
            return [{ description: fieldValue, price: '' }];
        } catch (e) {
            // If not JSON, treat as legacy string
            return [{ description: fieldValue, price: '' }];
        }
    };

    const [formData, setFormData] = useState({
        placa: record.placa || '',
        cliente: record.cliente || '',
        contacto: record.contacto || '',
        work: parseDynamicField(record.trabajo),
        costo: record.costo || record.cost || 0,
        estado: record.estado || 'En proceso',
        kilometraje: record.kilometraje || '',
        repuestos: parseDynamicField(record.repuestos)
    });
    const [isSaving, setIsSaving] = useState(false);

    // Calculate total cost automatically
    useEffect(() => {
        const workTotal = formData.work.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        const partsTotal = formData.repuestos.reduce((sum, item) => sum + (parseFloat(item.price) || 0), 0);
        // Only update if it's different to avoid loops, though strict equality check on number is fine
        // However, we want to respect manually entered cost if it was legacy? 
        // No, moving forward we want auto-calc. 
        // But for legacy records, prices might be 0 in the rows.
        // Let's only auto-calculate if there are prices. 
        // Integrating legacy cost: If we parsed a string, price is '', so total is 0. 
        // We might want to preserve the original cost if the calculated cost is 0 and we haven't touched the rows?
        // Actually, if we open a legacy record, cost is X. work is [{desc: '...', price: ''}]. Calculated is 0.
        // We shouldn't overwrite the cost immediately to 0.
        // Let's initialize cost from record, and then update it ONLY when rows change?
        // Or better: valid prices in rows override the total.

        if (workTotal + partsTotal > 0) {
            setFormData(prev => ({ ...prev, costo: workTotal + partsTotal }));
        }
    }, [formData.work, formData.repuestos]);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    // Dynamic Row Handlers
    const handleDynamicChange = (section, index, field, value) => {
        const newSection = [...formData[section]];
        newSection[index][field] = value;
        setFormData(prev => ({ ...prev, [section]: newSection }));
    };

    const addRow = (section) => {
        setFormData(prev => ({
            ...prev,
            [section]: [...prev[section], { description: '', price: '' }]
        }));
    };

    const removeRow = (section, index) => {
        if (formData[section].length > 1) {
            const newSection = formData[section].filter((_, i) => i !== index);
            setFormData(prev => ({ ...prev, [section]: newSection }));
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Serialize dynamic data
            const workJson = JSON.stringify(formData.work);
            const repuestosJson = JSON.stringify(formData.repuestos);

            const { error } = await supabase
                .from('registros')
                .update({
                    placa: formData.placa,
                    cliente: formData.cliente,
                    contacto: formData.contacto,
                    trabajo: workJson,
                    costo: parseFloat(formData.costo) || 0,
                    cost: parseFloat(formData.costo) || 0, // Keep legacy field in sync if it exists in DB
                    estado: formData.estado,
                    kilometraje: formData.kilometraje,
                    repuestos: repuestosJson
                })
                .eq('id', record.id);

            if (error) throw error;

            alert('Registro actualizado correctamente.');
            onUpdate();
        } catch (err) {
            console.error('Error updating:', err);
            alert('Error al actualizar: ' + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const generatePDF = () => {
        const doc = new jsPDF();
        const currentDate = new Date().toLocaleDateString();

        // Header / Logo area
        doc.setFillColor(37, 99, 235); // Blue header
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("TALLER JYM", 105, 20, { align: "center" });
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text("Reporte de Servicio", 105, 30, { align: "center" });

        // Details
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(12);

        let yPos = 55;
        const lineHeight = 10;

        doc.setFont("helvetica", "bold");
        doc.text(`Fecha: ${currentDate}`, 20, yPos);
        yPos += lineHeight * 1.5;

        const addField = (label, value) => {
            doc.setFont("helvetica", "bold");
            doc.text(`${label}:`, 20, yPos);
            doc.setFont("helvetica", "normal");
            doc.text(`${value || ''}`, 70, yPos);
            yPos += lineHeight;
        };

        addField("ID Referencia", record.id);
        addField("Cliente", formData.cliente);
        addField("Contacto", formData.contacto);
        addField("Placa", formData.placa);
        addField("Kilometraje", formData.kilometraje + " Km");
        addField("Estado", formData.estado);

        yPos += lineHeight * 0.5;

        // Helper to render table
        const renderTable = (title, items) => {
            if (!items || items.length === 0) return;

            doc.setFont("helvetica", "bold");
            doc.text(title, 20, yPos);
            yPos += lineHeight;

            // Table Header
            doc.setFillColor(240, 240, 240);
            doc.rect(20, yPos - 6, 170, 8, 'F');
            doc.setFontSize(10);
            doc.text("Descripción", 25, yPos);
            doc.text("Precio (Bs)", 160, yPos);
            yPos += lineHeight;
            doc.setFontSize(12);
            doc.setFont("helvetica", "normal");

            items.forEach(item => {
                if (!item.description && !item.price) return;
                const desc = item.description || '-';
                const price = item.price ? `Bs ${parseFloat(item.price).toFixed(2)}` : 'Bs 0.00';

                const splitDesc = doc.splitTextToSize(desc, 130);
                doc.text(splitDesc, 25, yPos);
                doc.text(price, 160, yPos);

                yPos += (Math.max(splitDesc.length, 1) * 7) + 3;
            });
            yPos += lineHeight / 2;
        };

        renderTable("Trabajos Realizados:", formData.work);
        renderTable("Repuestos / Otros:", formData.repuestos);

        yPos += lineHeight;
        doc.setFont("helvetica", "bold");
        doc.text(`Costo Total: Bs ${parseFloat(formData.costo).toFixed(2)}`, 20, yPos);

        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text("Taller JYM - Servicio Profesional", 105, 280, { align: "center" });

        doc.save(`Reporte_JYM_${formData.placa || 'Vehiculo'}.pdf`);
    };

    return (
        <div className="flex flex-col h-full bg-white">
            {/* Header */}
            <div className="flex items-center gap-3 p-4 border-b border-gray-100 bg-white sticky top-0 z-10">
                <button onClick={onBack} className="p-2 -ml-2 text-gray-600 hover:bg-gray-100 rounded-full transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-lg font-bold text-gray-800">Editar Registro</h2>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Placa & Estado & Km */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="placa">Placa</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Car size={18} /></div>
                            <input type="text" id="placa" value={formData.placa} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-bold" />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="estado">Estado</label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Activity size={18} /></div>
                            <select id="estado" value={formData.estado} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium appearance-none">
                                <option value="En proceso">En proceso</option>
                                <option value="Terminado">Terminado</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Kilometraje */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="kilometraje">Kilometraje (Km)</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Car size={18} /></div>
                        <input type="number" id="kilometraje" value={formData.kilometraje} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                    </div>
                </div>

                {/* Cliente & Contacto */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="cliente">Cliente</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><User size={18} /></div>
                        <input type="text" id="cliente" value={formData.cliente} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="contacto">Teléfono / Contacto</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Phone size={18} /></div>
                        <input type="tel" id="contacto" value={formData.contacto} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                    </div>
                </div>

                {/* Dynamic Work Rows */}
                <div className="space-y-2 pt-2">
                    <label className="block text-sm font-semibold text-gray-700 ml-1">Trabajos Realizados</label>
                    {formData.work.map((row, index) => (
                        <div key={index} className="flex gap-2 items-start">
                            <input
                                type="text"
                                placeholder="Descripción"
                                value={row.description}
                                onChange={(e) => handleDynamicChange('work', index, 'description', e.target.value)}
                                className="flex-1 pl-3 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                            <input
                                type="number"
                                placeholder="Bs"
                                value={row.price}
                                onChange={(e) => handleDynamicChange('work', index, 'price', e.target.value)}
                                className="w-20 pl-2 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right"
                            />
                            {formData.work.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeRow('work', index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => addRow('work')}
                        className="text-sm text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-800"
                    >
                        <Plus size={16} /> Agregar Trabajo
                    </button>
                </div>

                {/* Dynamic Parts Rows */}
                <div className="space-y-2 pt-2">
                    <label className="block text-sm font-semibold text-gray-700 ml-1">Repuestos</label>
                    {formData.repuestos.map((row, index) => (
                        <div key={index} className="flex gap-2 items-start">
                            <input
                                type="text"
                                placeholder="Repuesto"
                                value={row.description}
                                onChange={(e) => handleDynamicChange('repuestos', index, 'description', e.target.value)}
                                className="flex-1 pl-3 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            />
                            <input
                                type="number"
                                placeholder="Bs"
                                value={row.price}
                                onChange={(e) => handleDynamicChange('repuestos', index, 'price', e.target.value)}
                                className="w-20 pl-2 pr-2 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm text-right"
                            />
                            {formData.repuestos.length > 1 && (
                                <button
                                    type="button"
                                    onClick={() => removeRow('repuestos', index)}
                                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={() => addRow('repuestos')}
                        className="text-sm text-blue-600 font-semibold flex items-center gap-1 hover:text-blue-800"
                    >
                        <Plus size={16} /> Agregar Repuesto
                    </button>
                </div>

                <div className="space-y-1.5 pt-2">
                    <div className="flex justify-between items-center bg-gray-100 p-3 rounded-xl">
                        <span className="font-bold text-gray-700">Costo Total (Bs):</span>
                        <div className="relative">
                            <span className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none text-gray-500">Bs</span>
                            <input
                                type="number"
                                id="costo"
                                value={formData.costo}
                                onChange={handleInputChange}
                                className="w-32 pl-8 pr-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-right font-bold text-blue-600"
                            />
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 text-right pr-1">* Se calcula automáticamente, pero puedes editarlo manual si es necesario.</p>
                </div>

            </div>

            {/* Footer Action */}
            <div className="p-4 border-top border-gray-100 bg-gray-50 grid grid-cols-2 gap-3">
                <button
                    onClick={generatePDF}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95"
                >
                    <FileDown size={20} />
                    <span>Generar Reporte</span>
                </button>
                <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? (
                        <>
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Guardando...</span>
                        </>
                    ) : (
                        <>
                            <Save size={20} />
                            <span>Guardar Cambios</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}
