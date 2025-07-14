import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, addDoc, onSnapshot, doc, deleteDoc, serverTimestamp, query, updateDoc } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// --- DATA STATIS (WHO & GIZI AWAL) ---
const initialNutritionDB = {
    'nasi putih': { carbs: 28, protein: 2.7, fat: 0.3 }, 'beras merah': { carbs: 23, protein: 2.6, fat: 0.9 },
    'kentang': { carbs: 17, protein: 2, fat: 0.1 }, 'ubi jalar': { carbs: 20, protein: 1.6, fat: 0.1 },
    'roti tawar': { carbs: 49, protein: 9, fat: 3.2 }, 'daging sapi': { carbs: 0, protein: 26, fat: 15 },
    'daging ayam': { carbs: 0, protein: 27, fat: 14 }, 'hati ayam': { carbs: 0, protein: 26, fat: 5 },
    'telur ayam': { carbs: 1.1, protein: 13, fat: 11 }, 'telur bebek': { carbs: 1.4, protein: 13, fat: 14 },
    'telur puyuh': { carbs: 0.4, protein: 13, fat: 11 }, 'ikan salmon': { carbs: 0, protein: 20, fat: 13 },
    'ikan kembung': { carbs: 0, protein: 21, fat: 10 }, 'ikan lele': { carbs: 0, protein: 18, fat: 10 },
    'tempe': { carbs: 9, protein: 19, fat: 11 }, 'tahu': { carbs: 1.9, protein: 8, fat: 5 }, 
    'brokoli': { carbs: 7, protein: 2.8, fat: 0.4 }, 'wortel': { carbs: 10, protein: 0.9, fat: 0.2 }, 
    'bayam': { carbs: 3.6, protein: 2.9, fat: 0.4 }, 'buncis': { carbs: 7, protein: 1.8, fat: 0.2 },
    'kacang hijau': { carbs: 63, protein: 24, fat: 1.2 }, 'alpukat': { carbs: 9, protein: 2, fat: 15 }, 
    'pisang': { carbs: 23, protein: 1.1, fat: 0.3 }, 'keju': { carbs: 1.3, protein: 25, fat: 33 },
    'santan': { carbs: 5.5, protein: 2.3, fat: 24 }, // Data per 100g, diasumsikan 1ml ~ 1g
    'minyak zaitun': { carbs: 0, protein: 0, fat: 100 }, 'mentega': { carbs: 0, protein: 0.9, fat: 81 },
};
const whoWeightForAge = {
    boys: { 0: { median: 3.3, sd_neg2: 2.5 }, 1: { median: 4.5, sd_neg2: 3.4 }, 2: { median: 5.6, sd_neg2: 4.4 }, 3: { median: 6.4, sd_neg2: 5.1 }, 4: { median: 7.0, sd_neg2: 5.7 }, 5: { median: 7.5, sd_neg2: 6.1 }, 6: { median: 7.9, sd_neg2: 6.4 }, 7: { median: 8.3, sd_neg2: 6.7 }, 8: { median: 8.6, sd_neg2: 7.0 }, 9: { median: 8.9, sd_neg2: 7.2 }, 10: { median: 9.2, sd_neg2: 7.5 }, 11: { median: 9.4, sd_neg2: 7.7 }, 12: { median: 9.6, sd_neg2: 7.8 }, 13: { median: 9.9, sd_neg2: 8.1 }, 14: { median: 10.1, sd_neg2: 8.3 }, 15: { median: 10.3, sd_neg2: 8.5 }, 16: { median: 10.5, sd_neg2: 8.7 }, 17: { median: 10.7, sd_neg2: 8.9 }, 18: { median: 10.9, sd_neg2: 9.1 }, 19: { median: 11.1, sd_neg2: 9.2 }, 20: { median: 11.3, sd_neg2: 9.4 }, 21: { median: 11.5, sd_neg2: 9.6 }, 22: { median: 11.8, sd_neg2: 9.8 }, 23: { median: 12.0, sd_neg2: 10.0 }, 24: { median: 12.2, sd_neg2: 10.1 } },
    girls: { 0: { median: 3.2, sd_neg2: 2.4 }, 1: { median: 4.2, sd_neg2: 3.2 }, 2: { median: 5.1, sd_neg2: 3.9 }, 3: { median: 5.8, sd_neg2: 4.5 }, 4: { median: 6.4, sd_neg2: 5.0 }, 5: { median: 6.9, sd_neg2: 5.4 }, 6: { median: 7.3, sd_neg2: 5.7 }, 7: { median: 7.6, sd_neg2: 6.0 }, 8: { median: 7.9, sd_neg2: 6.3 }, 9: { median: 8.2, sd_neg2: 6.5 }, 10: { median: 8.5, sd_neg2: 6.7 }, 11: { median: 8.7, sd_neg2: 6.9 }, 12: { median: 8.9, sd_neg2: 7.1 }, 13: { median: 9.2, sd_neg2: 7.3 }, 14: { median: 9.4, sd_neg2: 7.5 }, 15: { median: 9.6, sd_neg2: 7.7 }, 16: { median: 9.8, sd_neg2: 7.9 }, 17: { median: 10.0, sd_neg2: 8.1 }, 18: { median: 10.2, sd_neg2: 8.2 }, 19: { median: 10.4, sd_neg2: 8.4 }, 20: { median: 10.6, sd_neg2: 8.6 }, 21: { median: 10.9, sd_neg2: 8.8 }, 22: { median: 11.1, sd_neg2: 9.0 }, 23: { median: 11.3, sd_neg2: 9.2 }, 24: { median: 11.5, sd_neg2: 9.4 } }
};

// --- Helper Functions ---
// User's Firebase configuration for local development
const userFirebaseConfig = {
  apiKey: "AIzaSyCVOhVAMOJWBIiaqMSbn0OwtcUTMrexGgA",
  authDomain: "tumbuh-kembang-cia.firebaseapp.com",
  projectId: "tumbuh-kembang-cia",
  storageBucket: "tumbuh-kembang-cia.firebasestorage.app",
  messagingSenderId: "613467146113",
  appId: "1:613467146113:web:0f7b57787f40e277688a80"
};

// Use environment variables in Canvas, otherwise fall back to user's config
const firebaseConfig = typeof __firebase_config !== 'undefined' 
    ? JSON.parse(__firebase_config) 
    : userFirebaseConfig;

const appId = typeof __app_id !== 'undefined' 
    ? __app_id 
    : "tumbuh-kembang-cia";


const getAgeInMonths = (birthDate, measurementDate) => {
    const bd = new Date(birthDate); const md = new Date(measurementDate);
    let months = (md.getFullYear() - bd.getFullYear()) * 12;
    months -= bd.getMonth(); months += md.getMonth();
    return months <= 0 ? 0 : months;
};
const getWeightStatus = (gender, ageInMonths, weight) => {
    if (!gender || ageInMonths > 24) return { status: 'N/A', message: 'Data WHO hanya untuk 0-24 bulan.' };
    const standard = whoWeightForAge[gender]?.[Math.round(ageInMonths)];
    if (!standard) return { status: 'N/A', message: 'Data WHO tidak tersedia untuk usia ini.' };
    if (weight < standard.sd_neg2) return { status: 'Underweight', message: `Perhatian: Berat badan (${weight} kg) di bawah standar minimal (${standard.sd_neg2} kg) untuk anak ${gender === 'boys' ? 'laki-laki' : 'perempuan'} usia ${Math.round(ageInMonths)} bulan. Konsultasikan dengan dokter.` };
    return { status: 'Normal', message: `Berat badan dalam rentang normal.` };
};

// --- Komponen UI ---
const LoadingSpinner = () => (<div className="flex flex-col items-center justify-center h-screen bg-pink-50"><div className="w-16 h-16 border-4 border-pink-400 border-t-transparent border-solid rounded-full animate-spin"></div><p className="mt-4 text-lg text-pink-600">Memuat data...</p></div>);
const ErrorMessage = ({ message }) => (<div className="p-4 my-4 text-sm text-red-700 bg-red-100 rounded-lg" role="alert"><span className="font-medium">Error!</span> {message}</div>);
const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" onClick={onClose}><div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-lg mx-4" onClick={e => e.stopPropagation()}>{children}</div></div>);
};

// --- Komponen baris bahan makanan (RESPONSIVE) ---
const IngredientRow = ({ ingredient, index, onIngredientChange, onRemove, onSearch, dynamicNutritionDB, searchingIngredient }) => {
    const isKnown = dynamicNutritionDB[ingredient.name.toLowerCase()];
    const isSearching = searchingIngredient === ingredient.name;

    return (
        <div className="flex flex-col gap-2 p-3 border border-gray-200 rounded-lg mb-3 bg-gray-50 md:flex-row md:items-center">
            {/* Input Nama Bahan */}
            <input 
                type="text" 
                value={ingredient.name} 
                onChange={e => onIngredientChange(index, 'name', e.target.value)} 
                placeholder="Nama Bahan" 
                list="nutrition-list" 
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500 md:flex-1" 
            />
            {/* Grup untuk Jumlah, Satuan, dan Aksi */}
            <div className="flex items-center gap-2 w-full md:w-auto">
                <input 
                    type="number" 
                    value={ingredient.amount} 
                    onChange={e => onIngredientChange(index, 'amount', e.target.value)} 
                    placeholder="Jumlah" 
                    className="w-20 p-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" 
                />
                <select 
                    value={ingredient.unit} 
                    onChange={e => onIngredientChange(index, 'unit', e.target.value)} 
                    className="p-2 border border-gray-300 rounded-lg bg-white focus:ring-pink-500 focus:border-pink-500"
                >
                    <option value="g">g</option>
                    <option value="ml">ml</option>
                </select>
                <div className="flex-grow"></div> {/* Spacer */}
                {isSearching ? (
                     <div className="w-24 flex justify-center items-center"><div className="w-6 h-6 border-2 border-pink-400 border-t-transparent border-solid rounded-full animate-spin"></div></div>
                ) : !isKnown && ingredient.name ? (
                    <button type="button" onClick={() => onSearch(ingredient.name)} className="w-24 text-xs bg-purple-100 text-purple-700 font-semibold py-2 px-2 rounded-lg hover:bg-purple-200 transition-colors">Cari Gizi</button>
                ) : (
                   <div className="w-24"></div> // Placeholder
                )}
                <button type="button" onClick={() => onRemove(index)} className="text-red-500 hover:text-red-700 p-2 rounded-full hover:bg-red-100 transition-colors text-xl">&times;</button>
            </div>
        </div>
    );
};


// --- Komponen Fitur ---
function MpasiTracker({ db, userId }) {
    const [entries, setEntries] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [newEntry, setNewEntry] = useState({ date: new Date().toISOString().split('T')[0], ingredients: [{ name: '', amount: '', unit: 'g' }], reaction: '' });
    
    // State baru untuk database gizi yang dinamis
    const [dynamicNutritionDB, setDynamicNutritionDB] = useState(initialNutritionDB);
    const [searchingIngredient, setSearchingIngredient] = useState(null);

    const calculateNutrition = (ingredients) => {
        let total = { carbs: 0, protein: 0, fat: 0 };
        if (!Array.isArray(ingredients)) return total;
        // Simplification: assume 1g ~ 1ml for nutrition calculation.
        ingredients.forEach(item => {
            const food = dynamicNutritionDB[item.name.toLowerCase()];
            if (food) {
                total.carbs += (food.carbs / 100) * item.amount;
                total.protein += (food.protein / 100) * item.amount;
                total.fat += (food.fat / 100) * item.amount;
            }
        });
        return total;
    };

    // Fungsi baru untuk mencari gizi via AI
    const handleSearchNutrition = async (ingredientName) => {
        if (!ingredientName || dynamicNutritionDB[ingredientName.toLowerCase()]) return;
        setSearchingIngredient(ingredientName);
        setError(null);

        try {
            // This is the correct way to call the Netlify function from the client
            const response = await fetch(`/.netlify/functions/search-nutrition`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ingredientName })
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `Gagal mencari gizi. Server merespon dengan status ${response.status}`);
            }

            const result = await response.json();
            
            if (result.candidates && result.candidates.length > 0 && result.candidates[0].content.parts.length > 0) {
                const text = result.candidates[0].content.parts[0].text;
                const nutritionData = JSON.parse(text);
                setDynamicNutritionDB(prevDB => ({
                    ...prevDB,
                    [ingredientName.toLowerCase()]: nutritionData
                }));
            } else {
                throw new Error("Data gizi tidak ditemukan dari API.");
            }

        } catch (err) {
            console.error("Gagal mencari data gizi:", err);
            setError(`Gagal mencari data gizi untuk ${ingredientName}. Coba lagi.`);
        } finally {
            setSearchingIngredient(null);
        }
    };

    useEffect(() => {
        if (!db || !userId) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/foodLog`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setEntries(data); setIsLoading(false);
        }, (err) => { setError("Gagal mengambil data MPASI."); setIsLoading(false); });
        return unsubscribe;
    }, [db, userId]);

    const handleNewIngredientChange = (index, field, value) => {
        const updatedIngredients = newEntry.ingredients.map((item, i) => 
            i === index ? { ...item, [field]: value } : item
        );
        setNewEntry({ ...newEntry, ingredients: updatedIngredients });
    };
    const addNewIngredient = () => { setNewEntry({ ...newEntry, ingredients: [...newEntry.ingredients, { name: '', amount: '', unit: 'g' }] }); };
    const removeNewIngredient = (index) => { const updatedIngredients = newEntry.ingredients.filter((_, i) => i !== index); setNewEntry({ ...newEntry, ingredients: updatedIngredients }); };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validIngredients = newEntry.ingredients.filter(ing => ing.name && ing.amount > 0).map(ing => ({ name: ing.name, amount: parseFloat(ing.amount), unit: ing.unit }));
        if (validIngredients.length === 0) { alert("Harap masukkan setidaknya satu bahan makanan dengan jumlah yang valid."); return; }
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/foodLog`), { ...newEntry, ingredients: validIngredients, createdAt: serverTimestamp() });
            setNewEntry({ date: new Date().toISOString().split('T')[0], ingredients: [{ name: '', amount: '', unit: 'g' }], reaction: '' });
        } catch (err) { setError("Gagal menyimpan data."); }
    };

    const openEditModal = (entry) => { setCurrentItem({ ...entry, ingredients: entry.ingredients.map(ing => ({ ...ing })) }); setEditModalOpen(true); };
    const handleUpdate = async () => {
        if (!currentItem) return;
        const validIngredients = currentItem.ingredients.filter(ing => ing.name && ing.amount > 0).map(ing => ({ name: ing.name, amount: parseFloat(ing.amount), unit: ing.unit }));
        if (validIngredients.length === 0) { alert("Harap masukkan setidaknya satu bahan makanan."); return; }
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/foodLog`, currentItem.id);
            await updateDoc(docRef, { ...currentItem, ingredients: validIngredients });
            setEditModalOpen(false); setCurrentItem(null);
        } catch (err) { setError("Gagal memperbarui data."); }
    };

    const openDeleteModal = (entry) => { setCurrentItem(entry); setDeleteModalOpen(true); };
    const handleDelete = async () => {
        if (!currentItem) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/foodLog`, currentItem.id));
            setDeleteModalOpen(false); setCurrentItem(null);
        } catch (err) { setError("Gagal menghapus data."); }
    };
    
    const handleEditIngredientChange = (index, field, value) => {
        const updatedIngredients = currentItem.ingredients.map((item, i) => 
            i === index ? { ...item, [field]: value } : item
        );
        setCurrentItem({ ...currentItem, ingredients: updatedIngredients });
    };
    const addEditIngredient = () => { setCurrentItem({ ...currentItem, ingredients: [...currentItem.ingredients, { name: '', amount: '', unit: 'g' }] }); };
    const removeEditIngredient = (index) => {
        const updatedIngredients = currentItem.ingredients.filter((_, i) => i !== index);
        setCurrentItem({ ...currentItem, ingredients: updatedIngredients });
    };

    if (isLoading) return <div className="text-center p-4">Memuat catatan MPASI...</div>;

    return (
        <div className="p-4 md:p-6">
            <h2 className="text-3xl font-bold text-pink-800 mb-6 text-center">Catatan Menu MPASI</h2>
            {error && <ErrorMessage message={error} />}

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg mb-8 space-y-4">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Tanggal</label><input type="date" value={newEntry.date} onChange={e => setNewEntry({...newEntry, date: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" required /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Reaksi (jika ada)</label><input type="text" value={newEntry.reaction} onChange={e => setNewEntry({...newEntry, reaction: e.target.value})} placeholder="Contoh: Kemerahan" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" /></div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-2">Bahan Makanan</label>
                    {newEntry.ingredients.map((ing, index) => (
                        <IngredientRow key={index} ingredient={ing} index={index} onIngredientChange={handleNewIngredientChange} onRemove={removeNewIngredient} onSearch={handleSearchNutrition} dynamicNutritionDB={dynamicNutritionDB} searchingIngredient={searchingIngredient} />
                    ))}
                    <button type="button" onClick={addNewIngredient} className="text-sm text-pink-600 hover:text-pink-800 font-semibold">+ Tambah Bahan</button>
                </div>
                <button type="submit" className="w-full md:w-auto bg-pink-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-pink-700 transition-all duration-300 shadow-md hover:shadow-lg">Simpan Catatan</button>
            </form>

            <div className="space-y-4">
                {entries.map(entry => {
                    const nutrition = calculateNutrition(entry.ingredients);
                    return (
                        <div key={entry.id} className={`bg-white p-4 rounded-xl shadow-md border-l-4 transition-all hover:shadow-lg ${entry.reaction ? 'border-red-400' : 'border-green-400'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-gray-500 text-sm">{new Date(entry.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    <ul className="list-disc list-inside mt-1">{entry.ingredients.map((ing, i) => <li key={i} className="text-gray-700">{ing.name}: {ing.amount}{ing.unit}</li>)}</ul>
                                    {entry.reaction && <p className="text-sm text-red-600 font-semibold mt-1">Reaksi: {entry.reaction}</p>}
                                    <div className="text-xs text-gray-500 mt-2 flex flex-wrap gap-x-4 gap-y-1"><span>Karbo: {nutrition.carbs.toFixed(1)}g</span><span>Protein: {nutrition.protein.toFixed(1)}g</span><span>Lemak: {nutrition.fat.toFixed(1)}g</span></div>
                                </div>
                                <div className="flex space-x-1">
                                    <button onClick={() => openEditModal(entry)} className="text-gray-400 hover:text-pink-600 p-1 rounded-full hover:bg-pink-50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                    <button onClick={() => openDeleteModal(entry)} className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)}>
                {currentItem && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-pink-800">Edit Catatan MPASI</h3>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Tanggal</label><input type="date" value={currentItem.date} onChange={e => setCurrentItem({...currentItem, date: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" required /></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Reaksi (jika ada)</label><input type="text" value={currentItem.reaction} onChange={e => setCurrentItem({...currentItem, reaction: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" /></div>
                        <div>
                            <label className="block text-sm font-medium text-gray-600 mb-2">Bahan Makanan</label>
                            {currentItem.ingredients.map((ing, index) => (
                                <IngredientRow key={index} ingredient={ing} index={index} onIngredientChange={handleEditIngredientChange} onRemove={removeEditIngredient} onSearch={handleSearchNutrition} dynamicNutritionDB={dynamicNutritionDB} searchingIngredient={searchingIngredient} />
                            ))}
                            <button type="button" onClick={addEditIngredient} className="text-sm text-pink-600 hover:text-pink-800 font-semibold">+ Tambah Bahan</button>
                        </div>
                        <div className="flex justify-end gap-2"><button onClick={() => setEditModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button><button onClick={handleUpdate} className="bg-pink-600 text-white px-4 py-2 rounded-lg">Simpan Perubahan</button></div>
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                <h3 className="text-lg font-bold">Konfirmasi Hapus</h3><p>Anda yakin ingin menghapus catatan ini?</p>
                <div className="mt-4 flex justify-end space-x-2"><button onClick={() => setDeleteModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button><button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg">Hapus</button></div>
            </Modal>
            
            <datalist id="nutrition-list">{Object.keys(dynamicNutritionDB).map(food => <option key={food} value={food.charAt(0).toUpperCase() + food.slice(1)} />)}</datalist>
        </div>
    );
}

function GrowthTracker({ db, userId, childProfile }) {
    const [records, setRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isEditModalOpen, setEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setDeleteModalOpen] = useState(false);
    const [currentItem, setCurrentItem] = useState(null);
    const [newRecord, setNewRecord] = useState({ date: new Date().toISOString().split('T')[0], weight: '', height: '', headCircumference: '' });

    useEffect(() => {
        if (!db || !userId) return;
        const q = query(collection(db, `artifacts/${appId}/users/${userId}/growthRecords`));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            data.sort((a, b) => new Date(b.date) - new Date(a.date));
            setRecords(data); setIsLoading(false);
        }, (err) => { setError("Gagal mengambil data tumbuh kembang."); setIsLoading(false); });
        return unsubscribe;
    }, [db, userId]);

    const chartData = useMemo(() => {
        return [...records].sort((a, b) => new Date(a.date) - new Date(b.date)).map(rec => ({ name: new Date(rec.date).toLocaleDateString('id-ID', { month: 'short', day: 'numeric' }), Berat: rec.weight, Tinggi: rec.height, 'Lingkar Kepala': rec.headCircumference }));
    }, [records]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newRecord.date || !newRecord.weight || !newRecord.height || !newRecord.headCircumference) { alert("Semua kolom harus diisi."); return; }
        try {
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/growthRecords`), { ...newRecord, weight: parseFloat(newRecord.weight), height: parseFloat(newRecord.height), headCircumference: parseFloat(newRecord.headCircumference), createdAt: serverTimestamp() });
            setNewRecord({ date: new Date().toISOString().split('T')[0], weight: '', height: '', headCircumference: '' });
        } catch (err) { setError("Gagal menyimpan data."); }
    };

    const openEditModal = (record) => { setCurrentItem(record); setEditModalOpen(true); };
    const handleUpdate = async () => {
        if (!currentItem) return;
        try {
            const docRef = doc(db, `artifacts/${appId}/users/${userId}/growthRecords`, currentItem.id);
            await updateDoc(docRef, { ...currentItem, weight: parseFloat(currentItem.weight), height: parseFloat(currentItem.height), headCircumference: parseFloat(currentItem.headCircumference) });
            setEditModalOpen(false); setCurrentItem(null);
        } catch (err) { setError("Gagal memperbarui data."); }
    };

    const openDeleteModal = (record) => { setCurrentItem(record); setDeleteModalOpen(true); };
    const handleDelete = async () => {
        if (!currentItem) return;
        try {
            await deleteDoc(doc(db, `artifacts/${appId}/users/${userId}/growthRecords`, currentItem.id));
            setDeleteModalOpen(false); setCurrentItem(null);
        } catch (err) { setError("Gagal menghapus data."); }
    };

    if (isLoading) return <div className="text-center p-4">Memuat catatan tumbuh kembang...</div>;

    return (
        <div className="p-4 md:p-6">
            <h2 className="text-3xl font-bold text-pink-800 mb-6 text-center">Catatan Tumbuh Kembang</h2>
            {error && <ErrorMessage message={error} />}

            <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-lg mb-8">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Tanggal</label><input type="date" name="date" value={newRecord.date} onChange={e => setNewRecord({...newRecord, date: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" required /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Berat (kg)</label><input type="number" step="0.01" name="weight" value={newRecord.weight} onChange={e => setNewRecord({...newRecord, weight: e.target.value})} placeholder="Contoh: 8.5" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" required /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Tinggi (cm)</label><input type="number" step="0.1" name="height" value={newRecord.height} onChange={e => setNewRecord({...newRecord, height: e.target.value})} placeholder="Contoh: 70.5" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" required /></div>
                    <div><label className="block text-sm font-medium text-gray-600 mb-1">Lingkar Kepala (cm)</label><input type="number" step="0.1" name="headCircumference" value={newRecord.headCircumference} onChange={e => setNewRecord({...newRecord, headCircumference: e.target.value})} placeholder="Contoh: 45.2" className="w-full p-2 border border-gray-300 rounded-lg focus:ring-pink-500 focus:border-pink-500" required /></div>
                </div>
                <button type="submit" className="mt-4 w-full md:w-auto bg-pink-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-pink-700 transition-all duration-300 shadow-md hover:shadow-lg">Simpan Catatan</button>
            </form>

            {records.length > 0 && (
                <div className="bg-white p-4 rounded-xl shadow-lg mb-6">
                    <h3 className="text-xl font-bold text-pink-800 mb-4 text-center">Grafik Pertumbuhan</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend /><Line type="monotone" dataKey="Berat" stroke="#ec4899" strokeWidth={2} activeDot={{ r: 8 }} /><Line type="monotone" dataKey="Tinggi" stroke="#8b5cf6" strokeWidth={2} /><Line type="monotone" dataKey="Lingkar Kepala" stroke="#f59e0b" strokeWidth={2} /></LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="space-y-4">
                {records.map(record => {
                    const ageInMonths = getAgeInMonths(childProfile.birthDate, record.date);
                    const status = getWeightStatus(childProfile.gender, ageInMonths, record.weight);
                    return (
                        <div key={record.id} className={`bg-white p-4 rounded-xl shadow-md border-l-4 transition-all hover:shadow-lg ${status?.status === 'Underweight' ? 'border-red-400' : 'border-pink-400'}`}>
                            <div className="flex justify-between items-start">
                                <div>
                                    <p className="font-bold text-gray-800">{new Date(record.date).toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                    <p className="text-sm text-gray-600">Berat: <span className="font-semibold">{record.weight} kg</span> | Tinggi: <span className="font-semibold">{record.height} cm</span> | LK: <span className="font-semibold">{record.headCircumference} cm</span></p>
                                    {status && <p className={`text-sm mt-1 font-semibold ${status.status === 'Underweight' ? 'text-red-600' : 'text-green-600'}`}>{status.message}</p>}
                                </div>
                                <div className="flex space-x-1">
                                    <button onClick={() => openEditModal(record)} className="text-gray-400 hover:text-pink-600 p-1 rounded-full hover:bg-pink-50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" /><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" /></svg></button>
                                    <button onClick={() => openDeleteModal(record)} className="text-gray-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg></button>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
            
            <Modal isOpen={isEditModalOpen} onClose={() => setEditModalOpen(false)}>
                {currentItem && (
                    <div className="space-y-4">
                        <h3 className="text-lg font-bold text-pink-800">Edit Catatan Tumbuh Kembang</h3>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Tanggal</label><input type="date" value={currentItem.date} onChange={e => setCurrentItem({...currentItem, date: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" required /></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Berat (kg)</label><input type="number" step="0.01" value={currentItem.weight} onChange={e => setCurrentItem({...currentItem, weight: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" required /></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Tinggi (cm)</label><input type="number" step="0.1" value={currentItem.height} onChange={e => setCurrentItem({...currentItem, height: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" required /></div>
                        <div><label className="block text-sm font-medium text-gray-600 mb-1">Lingkar Kepala (cm)</label><input type="number" step="0.1" value={currentItem.headCircumference} onChange={e => setCurrentItem({...currentItem, headCircumference: e.target.value})} className="w-full p-2 border border-gray-300 rounded-lg" required /></div>
                        <div className="flex justify-end gap-2"><button onClick={() => setEditModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button><button onClick={handleUpdate} className="bg-pink-600 text-white px-4 py-2 rounded-lg">Simpan Perubahan</button></div>
                    </div>
                )}
            </Modal>
            
            <Modal isOpen={isDeleteModalOpen} onClose={() => setDeleteModalOpen(false)}>
                <h3 className="text-lg font-bold">Konfirmasi Hapus</h3><p>Anda yakin ingin menghapus catatan ini?</p>
                <div className="mt-4 flex justify-end space-x-2"><button onClick={() => setDeleteModalOpen(false)} className="bg-gray-200 px-4 py-2 rounded-lg">Batal</button><button onClick={handleDelete} className="bg-red-600 text-white px-4 py-2 rounded-lg">Hapus</button></div>
            </Modal>
        </div>
    );
}

export default function App() {
    const [view, setView] = useState('mpasi');
    const [db, setDb] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const childProfile = { gender: 'girls', birthDate: '2025-01-15' };

    useEffect(() => {
        try {
            const app = initializeApp(firebaseConfig);
            const authInstance = getAuth(app);
            const dbInstance = getFirestore(app);
            setDb(dbInstance);
            onAuthStateChanged(authInstance, async (user) => {
                if (user) {
                    setUserId(user.uid);
                } else {
                    const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
                    try {
                        if (token) {
                            await signInWithCustomToken(authInstance, token);
                        } else {
                            await signInAnonymously(authInstance);
                        }
                    } catch (error) { console.error("Auth failed:", error); }
                }
                setIsAuthReady(true);
            });
        } catch (error) { console.error("Firebase init error:", error); setIsAuthReady(true); }
    }, []);

    if (!isAuthReady) return <LoadingSpinner />;

    return (
        <div className="min-h-screen bg-pink-50 font-sans">
            <header className="bg-white/80 backdrop-blur-sm shadow-sm sticky top-0 z-10">
                <div className="container mx-auto px-4 md:px-6 py-4">
                    <div className="text-center mb-4">
                         <div className="flex justify-center items-center gap-4 mb-2">
                             <img 
                                src="https://i.imgur.com/eom5hCc.png" 
                                alt="Logo Bricia" 
                                className="h-14 w-14 rounded-full object-cover border-2 border-pink-200 shadow-md"
                                onError={(e) => { e.target.onerror = null; e.target.src='https://placehold.co/60x60/fce7f3/db2777?text=Cia'; }}
                             />
                            <div>
                                <h1 className="text-3xl font-bold text-pink-800">Tumbuh Kembang Bricia Elvania Charvi</h1>
                                <p className="text-sm text-gray-600 mt-1">Sukoharjo, 15 Januari 2025 - Perempuan</p>
                                <p className="text-xs text-gray-500">Dikelola oleh Ayah Nova dan Bunda Nia</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-center border-t border-gray-200 pt-3 space-x-2 md:space-x-4">
                        <button onClick={() => setView('mpasi')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${view === 'mpasi' ? 'bg-pink-100 text-pink-700' : 'text-gray-500 hover:bg-pink-50'}`}>Catatan MPASI</button>
                        <button onClick={() => setView('growth')} className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${view === 'growth' ? 'bg-pink-100 text-pink-700' : 'text-gray-500 hover:bg-pink-50'}`}>Tumbuh Kembang</button>
                    </div>
                </div>
            </header>

            <main className="container mx-auto px-4 md:px-6 py-6">
                {view === 'mpasi' ? <MpasiTracker db={db} userId={userId} /> : <GrowthTracker db={db} userId={userId} childProfile={childProfile} />}
            </main>
            
            <footer className="text-center py-5 mt-8 border-t border-gray-200">
                <a href="https://www.tiktok.com/@novano007" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-500 hover:text-pink-600 transition-colors">
                    &copy; 2025 @novano007
                </a>
            </footer>
        </div>
    );
}
