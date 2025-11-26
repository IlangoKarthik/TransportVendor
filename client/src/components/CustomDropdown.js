import React, { useState, useRef, useEffect } from 'react';
import './CustomDropdown.css';

const CustomDropdown = ({ 
  id,
  name,
  value,
  options,
  placeholder = 'Select...',
  disabled = false,
  onChange,
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen]);

  const handleToggle = () => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  };

  const handleSelect = (optionValue) => {
    if (onChange) {
      const syntheticEvent = {
        target: {
          name: name,
          value: optionValue
        }
      };
      onChange(syntheticEvent);
    }
    setIsOpen(false);
  };

  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = (value && selectedOption) ? selectedOption.label : placeholder;

  return (
    <div className="custom-dropdown-container" ref={containerRef}>
      <div
        className={`custom-dropdown ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={handleToggle}
        ref={dropdownRef}
      >
        <span className={`custom-dropdown-value ${(!value || !selectedOption) ? 'placeholder' : ''}`}>
          {displayValue}
        </span>
        <span className="custom-dropdown-arrow">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L1 4H11L6 9Z" fill={disabled ? '#999' : '#666'} />
          </svg>
        </span>
      </div>
      
      {isOpen && !disabled && (
        <div className="custom-dropdown-menu">
          {options.map((option) => (
            <div
              key={option.value}
              className={`custom-dropdown-option ${value === option.value ? 'selected' : ''}`}
              onClick={() => handleSelect(option.value)}
            >
              {option.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;

