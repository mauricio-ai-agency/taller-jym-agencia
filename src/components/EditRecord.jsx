import React, { useState } from 'react';
import { Save, ArrowLeft, Car, User, Phone, Wrench, DollarSign, Activity } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function EditRecord({ record, onBack, onUpdate }) {
    const [formData, setFormData] = useState({
        placa: record.placa || '',
        cliente: record.cliente || '',
        contacto: record.contacto || '',
        trabajo: record.trabajo || '',
        costo: record.costo || record.cost || 0,
        estado: record.estado || 'En proceso',
        kilometraje: record.kilometraje || ''
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [id]: value
        }));
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('registros')
                .update({
                    placa: formData.placa,
                    cliente: formData.cliente,
                    contacto: formData.contacto,
                    trabajo: formData.trabajo,
                    costo: parseFloat(formData.costo) || 0,
                    cost: parseFloat(formData.costo) || 0,
                    estado: formData.estado,
                    kilometraje: formData.kilometraje
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

                {/* Trabajo & Costo */}
                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="trabajo">Trabajo</label>
                    <div className="relative">
                        <div className="absolute top-3 left-3 text-gray-400"><Wrench size={18} /></div>
                        <textarea id="trabajo" value={formData.trabajo} onChange={handleInputChange} rows="3" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium resize-none"></textarea>
                    </div>
                </div>

                <div className="space-y-1.5">
                    <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="costo">Costo</label>
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><DollarSign size={18} /></div>
                        <input type="number" id="costo" value={formData.costo} onChange={handleInputChange} className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                    </div>
                </div>

            </div>

            {/* Footer Action */}
            <div className="p-4 border-t border-gray-100 bg-gray-50">
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
