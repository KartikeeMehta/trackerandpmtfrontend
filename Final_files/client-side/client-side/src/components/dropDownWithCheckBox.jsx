import React, { useState, useRef, useEffect } from "react";

const DropDownWithCheckBox = ({
  options = [],
  onChange,
  label = "Select Options",
  value,
}) => {
  const [selected, setSelected] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef();

  // Sync selected with value prop if provided
  useEffect(() => {
    if (Array.isArray(value)) {
      // Map value (array of ids) to option objects
      const selectedOptions = options.filter((opt) => value.includes(opt.id));
      setSelected(selectedOptions);
    }
  }, [value, options]);

  const toggleDropdown = () => setIsOpen((prev) => !prev);

  const handleCheckboxChange = (option) => {
    const exists = selected.find((item) => item.id === option.id);
    const updated = exists
      ? selected.filter((item) => item.id !== option.id)
      : [...selected, option];

    setSelected(updated);
    if (onChange) {
      onChange(updated);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full">
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <div className="relative w-full" ref={dropdownRef}>
        <button
          type="button"
          className="w-full px-2 py-2 border rounded-md bg-white text-left shadow-sm focus:outline-none flex items-center focus:border-blue-500 justify-between"
          onClick={toggleDropdown}
        >
          <span className="">
            {selected.length === 0
              ? "Select Member"
              : selected.map((s) => s.name).join(", ")}
          </span>
          <svg
            className={`w-4 h-4 transform transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {isOpen && (
          <div className="absolute z-10 mt-2 w-full bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
            {options.map((option) => (
              <label
                key={option.id}
                className="flex items-center px-4 py-2 hover:bg-gray-100 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selected.some((item) => item.id === option.id)}
                  onChange={() => handleCheckboxChange(option)}
                  className="mr-2 capitalize text-red-950"
                />
                {option.name}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DropDownWithCheckBox;
