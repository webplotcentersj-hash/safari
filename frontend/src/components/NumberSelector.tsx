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

  const numbers = Array.from({ length: 250 }, (_, i) => i + 1);
  const filteredNumbers = numbers.filter(num => 
    num.toString().includes(searchTerm) || 
    num.toString().padStart(2, '0').includes(searchTerm)
  );

  const handleNumberClick = (num: number) => {
    if (usedNumbers.includes(num)) {
      return; // No permitir seleccionar números ya usados
    }
    setShowAnimation(true);
    onSelect(num);
    setTimeout(() => setShowAnimation(false), 1000);
  };

  const isNumberUsed = (num: number) => usedNumbers.includes(num);

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

      {usedNumbers.length > 0 && (
        <div className="used-numbers-info">
          <small>Números ya asignados: {usedNumbers.length} de 250</small>
        </div>
      )}
    </div>
  );
}






