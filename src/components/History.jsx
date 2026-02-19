import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Trash2, Clock, CheckCircle, Car, User, Calendar, Search } from 'lucide-react';

export default function History({ onEditRecord }) {
    const [registros, setRegistros] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchRegistros();
    }, []);

    const fetchRegistros = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('registros')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setRegistros(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const deleteRecord = async (e, id) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de borrar este registro?')) return;

        try {
            const { error } = await supabase
                .from('registros')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setRegistros(registros.filter(r => r.id !== id));
        } catch (err) {
            alert('Error al borrar: ' + err.message);
        }
    };

    const toggleStatus = async (e, id, currentStatus) => {
        e.stopPropagation();
        const newStatus = currentStatus === 'En proceso' ? 'Terminado' : 'En proceso';

        // Optimistic update
        setRegistros(registros.map(r =>
            r.id === id ? { ...r, estado: newStatus } : r
        ));

        try {
            const { error } = await supabase
                .from('registros')
                .update({ estado: newStatus })
                .eq('id', id);

            if (error) {
                // Revert on error
                setRegistros(registros.map(r =>
                    r.id === id ? { ...r, estado: currentStatus } : r
                ));
                throw error;
            }
        } catch (err) {
            alert('Error al actualizar estado: ' + err.message);
        }
    };

    const filteredRegistros = registros.filter(r => {
        const term = searchTerm.toLowerCase();
        const matchesPlate = r.placa?.toLowerCase().includes(term);
        const matchesClient = r.cliente?.toLowerCase().includes(term);
        const matchesId = r.id?.toString().includes(term);
        return matchesPlate || matchesClient || matchesId;
    });

    if (loading) return <div className="text-center p-10 text-gray-500">Cargando historial...</div>;
    if (error) return <div className="text-center p-10 text-red-500">Error: {error}</div>;

    return (
        <div className="space-y-4">
            {/* Search Bar */}
            <div className="sticky top-0 bg-gray-50 pt-2 pb-2 z-10 block">
                <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <Search size={18} />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por placa, cliente o ID..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-medium"
                    />
                </div>
            </div>

            {filteredRegistros.length === 0 ? (
                <div className="text-center p-10 text-gray-400">
                    {searchTerm ? 'No se encontraron resultados.' : 'No hay registros aún.'}
                </div>
            ) : (
                filteredRegistros.map((registro) => (
                    <div
                        key={registro.id}
                        onClick={() => onEditRecord(registro)}
                        className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]"
                    >

                        {/* Header: Date & Status */}
                        <div className="flex justify-between items-start">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Calendar size={12} />
                                <span>{new Date(registro.created_at).toLocaleDateString()}</span>
                            </div>
                            <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${registro.estado === 'Terminado' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                                {registro.estado || 'En proceso'}
                            </span>
                        </div>

                        {/* Content: Image & Details */}
                        <div className="flex gap-4">
                            {/* Thumbnail */}
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                {registro.foto_url ? (
                                    <img src={registro.foto_url} alt="Vehículo" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Car size={24} />
                                    </div>
                                )}
                            </div>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-gray-800 text-lg leading-tight truncate">
                                    {registro.placa} <span className="text-gray-600 font-semibold text-base">- {registro.modelo || 'Sin Modelo'}</span>
                                </h4>
                                <p className="text-sm text-gray-600 truncate flex items-center gap-1">
                                    <User size={12} /> {registro.cliente}
                                </p>
                                <p className="text-xs text-gray-400 mt-1 line-clamp-1">{registro.trabajo}</p>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex justify-end gap-2 pt-2 border-t border-gray-50 mt-1">
                            <button
                                onClick={(e) => toggleStatus(e, registro.id, registro.estado || 'En proceso')}
                                className={`flex-1 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-xs font-bold transition-colors ${registro.estado === 'Terminado'
                                    ? 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
                                    : 'bg-green-50 text-green-700 hover:bg-green-100'
                                    }`}
                            >
                                {registro.estado === 'Terminado' ? <Clock size={16} /> : <CheckCircle size={16} />}
                                {registro.estado === 'Terminado' ? 'Reabrir' : 'Terminar'}
                            </button>

                            <button
                                onClick={(e) => deleteRecord(e, registro.id)}
                                className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                                title="Borrar registro"
                            >
                                <Trash2 size={18} />
                            </button>
                        </div>

                    </div>
                ))
            )}
        </div>
    );
}
