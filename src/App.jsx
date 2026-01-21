import React, { useState, useRef } from 'react';
import { Camera, Car, User, FileText, Wrench, DollarSign, Phone, FileDown, Share2, Save, History as HistoryIcon, PlusCircle } from 'lucide-react';
import { jsPDF } from "jspdf";
import imageCompression from 'browser-image-compression';
import { supabase } from './supabaseClient';
import History from './components/History';
import EditRecord from './components/EditRecord';

function App() {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history' | 'edit'
  const [editingRecord, setEditingRecord] = useState(null);

  const [formData, setFormData] = useState({
    plate: '',
    client: '',
    model: '',
    work: '',
    cost: '',
    contact: '',
    mileage: ''
  });
  const [imageFile, setImageFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const fileInputRef = useRef(null);

  const handleInputChange = (e) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
  };

  const handleSave = async () => {
    if (!formData.plate || !formData.client) {
      alert('Por favor completa al menos la Placa y el Cliente.');
      return;
    }

    setIsSaving(true);
    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('images')
          .getPublicUrl(fileName);

        imageUrl = publicUrlData.publicUrl;
      }

      const { data, error } = await supabase
        .from('registros')
        .insert([
          {
            placa: formData.plate,
            cliente: formData.client,
            modelo: formData.model,
            trabajo: formData.work,
            costo: parseFloat(formData.cost) || 0,
            contacto: formData.contact,
            foto_url: imageUrl,
            estado: 'En proceso',
            kilometraje: formData.mileage
          }
        ]);

      if (error) throw error;

      alert('¡Registro guardado exitosamente en la nube!');
      setFormData({
        plate: '',
        client: '',
        model: '',
        work: '',
        cost: '',
        contact: '',
        mileage: ''
      });
      setImageFile(null);
      setActiveTab('history'); // Switch to history after saving
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error al guardar: ' + error.message);
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
    doc.text("Comprobante de Ingreso", 105, 30, { align: "center" });

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
      doc.text(`${value}`, 70, yPos);
      yPos += lineHeight;
    };

    addField("Cliente", formData.client);
    addField("Contacto", formData.contact);
    addField("Vehículo", formData.model);
    addField("Placa", formData.plate);

    yPos += lineHeight * 0.5;

    doc.setFont("helvetica", "bold");
    doc.text("Trabajo a Realizar:", 20, yPos);
    yPos += lineHeight;
    doc.setFont("helvetica", "normal");

    // Split text to fit page width
    const splitWork = doc.splitTextToSize(formData.work, 170);
    doc.text(splitWork, 20, yPos);
    yPos += (splitWork.length * 7) + lineHeight;

    doc.setFont("helvetica", "bold");
    doc.text(`Costo Estimado: $${formData.cost}`, 20, yPos);

    // Footer
    doc.setFontSize(10);
    doc.setTextColor(100, 100, 100);
    doc.text("Este documento es un comprobante de recepción del vehículo.", 105, 280, { align: "center" });

    doc.save(`Recibo_JYM_${formData.plate || 'Vehiculo'}.pdf`);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Registro Taller JYM',
      text: `Hola ${formData.client}, tu vehículo ${formData.model} (Placa: ${formData.plate}) ha sido ingresado al Taller JYM.\n\nTrabajo: ${formData.work}\nCosto Estimado: $${formData.cost}\n\nGracias por tu confianza.`,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback to WhatsApp link
      const encodedText = encodeURIComponent(shareData.text);
      const waLink = `https://wa.me/${formData.contact.replace(/\D/g, '')}?text=${encodedText}`;
      window.open(waLink, '_blank');
    }
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const options = {
      maxSizeMB: 0.2, // 200KB
      maxWidthOrHeight: 1920,
      useWebWorker: true,
    };

    try {
      const compressedFile = await imageCompression(file, options);
      setImageFile(compressedFile);
      console.log(`Original: ${file.size / 1024} KB`);
      console.log(`Compressed: ${compressedFile.size / 1024} KB`);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Error al procesar la imagen.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden mb-10 flex flex-col h-[90vh]">
  const handleEditRecord = (record) => {
          setEditingRecord(record);
        setActiveTab('edit');
  };

  const handleUpdateRecord = () => {
          setEditingRecord(null);
        setActiveTab('history');
  };
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-6 text-center flex-shrink-0">
          <h1 className="text-2xl font-bold text-white tracking-tight">Taller JYM</h1>
          <div className="flex items-center justify-center gap-2 text-blue-100 mt-1">
            <Car size={16} />
            <span className="font-medium">Gestión de Taller</span>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-100 flex-shrink-0 bg-white">
          <button
            onClick={() => setActiveTab('new')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'new'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <PlusCircle size={18} />
            Nuevo Ingreso
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 py-3 text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${activeTab === 'history'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
              : 'text-gray-400 hover:text-gray-600'
              }`}
          >
            <HistoryIcon size={18} />
            Historial
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto bg-gray-50/50">
          {activeTab === 'edit' ? (
            <EditRecord
              record={editingRecord}
              onBack={() => setActiveTab('history')}
              onUpdate={handleUpdateRecord}
            />
          ) : activeTab === 'new' ? (
            <form className="p-6 space-y-5" onSubmit={(e) => e.preventDefault()}>

              {/* Section: Vehicle Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Datos del Vehículo</h3>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="plate">Placa</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Car size={18} /></div>
                    <input type="text" id="plate" value={formData.plate} onChange={handleInputChange} placeholder="Ej: ABC-123" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none uppercase font-medium" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="model">Modelo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Car size={18} /></div>
                    <input type="text" id="model" value={formData.model} onChange={handleInputChange} placeholder="Ej: Toyota Corolla 2020" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="mileage">Km</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Car size={18} /></div>
                    <input type="number" id="mileage" value={formData.mileage} onChange={handleInputChange} placeholder="Ej: 50000" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                </div>
              </div>

              {/* Section: Client Info */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Datos del Cliente</h3>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="client">Nombre</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><User size={18} /></div>
                    <input type="text" id="client" value={formData.client} onChange={handleInputChange} placeholder="Nombre completo" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="contact">WhatsApp / Contacto</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><Phone size={18} /></div>
                    <input type="tel" id="contact" value={formData.contact} onChange={handleInputChange} placeholder="+569..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                </div>
              </div>

              {/* Section: Work Details */}
              <div className="space-y-4 pt-2">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider border-b pb-1">Detalles del Servicio</h3>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="work">Trabajo a realizar</label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 text-gray-400"><Wrench size={18} /></div>
                    <textarea id="work" value={formData.work} onChange={handleInputChange} placeholder="Descripción detallada de la reparación..." rows="3" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium resize-none"></textarea>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-sm font-semibold text-gray-700 ml-1" htmlFor="cost">Costo Estimado</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400"><DollarSign size={18} /></div>
                    <input type="number" id="cost" value={formData.cost} onChange={handleInputChange} placeholder="0" className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none font-medium" />
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="pt-4 space-y-3 pb-6">
                <button
                  type="button"
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
                      <span>Guardar Registro en Nube</span>
                    </>
                  )}
                </button>

                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleImageUpload}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current.click()}
                  className={`w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-xl shadow-sm flex items-center justify-center gap-2 transition-all active:scale-95 ${imageFile ? 'border-2 border-green-500 bg-green-50' : ''}`}
                >
                  <Camera size={20} className={imageFile ? 'text-green-600' : ''} />
                  <span>{imageFile ? 'Foto Cargada (Comprimida)' : 'Capturar / Subir Foto'}</span>
                </button>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={generatePDF}
                    className="w-full bg-gray-800 hover:bg-gray-900 text-white font-bold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                  >
                    <FileDown size={18} />
                    <span>PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShare}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all active:scale-95 text-sm"
                  >
                    <Share2 size={18} />
                    <span>Enviar</span>
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className="p-4 pb-20">
              <History onEditRecord={handleEditRecord} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
