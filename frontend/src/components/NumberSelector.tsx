import { useState, useEffect } from 'react';
import './NumberSelector.css';

interface NumberSelectorProps {
  selectedNumber: number | null;
  onSelect: (number: number) => void;
  usedNumbers: number[];
}

export default function NumberSelector({ selectedNumber, onSelect, usedNumbers }: NumberSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);

  // Log para depuración
  useEffect(() => {
    console.log('🔢 NumberSelector - Números usados recibidos:', usedNumbers);
    console.log('🔢 NumberSelector - Tipo de array:', Array.isArray(usedNumbers));
    console.log('🔢 NumberSelector - Cantidad:', usedNumbers.length);
    if (usedNumbers.length > 0) {
      console.log('🔢 NumberSelector - Primer elemento:', usedNumbers[0], 'tipo:', typeof usedNumbers[0]);
    }
  }, [usedNumbers]);

  const numbers = Array.from({ length: 250 }, (_, i) => i + 1);
  const filteredNumbers = numbers.filter(num => 
    num.toString().includes(searchTerm) || 
    num.toString().padStart(2, '0').includes(searchTerm)
  );

  // Normalizar números usados a enteros una sola vez
  const normalizedUsedNumbers = usedNumbers.map(n => {
    if (typeof n === 'string') {
      const parsed = parseInt(n, 10);
      return isNaN(parsed) ? null : parsed;
    }
    const num = Number(n);
    return isNaN(num) ? null : num;
  }).filter((n): n is number => n !== null);

  console.log('🔢 Números usados normalizados:', normalizedUsedNumbers);

  const handleNumberClick = (num: number) => {
    if (normalizedUsedNumbers.includes(num)) {
      console.log('⚠️ Intento de seleccionar número ocupado:', num);
      return;
    }
    setShowAnimation(true);
    onSelect(num);
    setTimeout(() => setShowAnimation(false), 1000);
  };

  const isNumberUsed = (num: number): boolean => {
    const result = normalizedUsedNumbers.includes(num);
    if (result && num <= 20) {
      console.log(`🚫 Número ${num} está OCUPADO. Array normalizado:`, normalizedUsedNumbers);
    }
    return result;
  };

  return (
    <div className="number-selector-container">
      <div className="number-selector-header">
        <label>Selecciona tu número de competencia *</label>
        <input
          type="text"
          placeholder="Buscar número (ej: 01, 42, 150)..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="number-search"
        />
      </div>

      {selectedNumber && (
        <div className={`selected-number-display ${showAnimation ? 'animate' : ''}`}>
          <div className="selected-number-badge">
            <span className="number-label">Tu número:</span>
            <span className="number-value">{selectedNumber.toString().padStart(2, '0')}</span>
          </div>
        </div>
      )}

      {normalizedUsedNumbers.length > 0 && (
        <div style={{ marginBottom: '1rem', padding: '0.5rem', background: '#fff3cd', borderRadius: '8px', fontSize: '0.85rem' }}>
          ⚠️ Números ocupados: {normalizedUsedNumbers.sort((a, b) => a - b).join(', ')}
        </div>
      )}

      <div className="numbers-grid">
        {filteredNumbers.map((num) => {
          const isSelected = selectedNumber === num;
          const isUsed = isNumberUsed(num);
          
          return (
            <button
              key={num}
              type="button"
              className={`number-button ${isSelected ? 'selected' : ''} ${isUsed ? 'used' : ''}`}
              onClick={() => handleNumberClick(num)}
              disabled={isUsed}
              data-used={isUsed}
              data-number={num}
              title={isUsed ? `Número ${num.toString().padStart(2, '0')} ya está asignado a otro piloto` : `Seleccionar número ${num.toString().padStart(2, '0')}`}
            >
              {isUsed ? (
                <>
                  <span className="used-number-text">{num.toString().padStart(2, '0')}</span>
                  <span className="used-badge">Ocupado</span>
                </>
              ) : (
                num.toString().padStart(2, '0')
              )}
            </button>
          );
        })}
      </div>

      {normalizedUsedNumbers.length > 0 && (
        <div className="used-numbers-info">
          <small>Números ya asignados: {normalizedUsedNumbers.length} de 250</small>
        </div>
      )}
    </div>
  );
}
